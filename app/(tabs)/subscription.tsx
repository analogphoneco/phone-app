import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useStripe } from "@stripe/stripe-react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { showError } from "@/lib/errors";
import {
  listPlans,
  getActiveSubscription,
  createSubscription,
  cancelSubscription,
  reactivateSubscription,
  getBillingPortalUrl,
  formatPrice,
  isSubscriptionActive,
  isSubscriptionCanceling,
  getSubscriptionStatusText,
  getPaymentSheetParams,
  getSubscriptionPaymentSheetParams,
  syncSubscriptionFromStripe,
} from "@/lib/subscription";
import { getCustomerId } from "@/lib/storage";
import type { Plan, Subscription } from "@/types/subscription";

export default function SubscriptionScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [plansData, custId] = await Promise.all([
        listPlans(),
        getCustomerId(),
      ]);
      setPlans(plansData);
      setCustomerId(custId);

      if (custId) {
        const sub = await getActiveSubscription(custId);
        setSubscription(sub);
      }
    } catch (error) {
      console.error("Failed to load subscription data:", error);
      const err = showError(error);
      Alert.alert(err.title, err.message, err.buttons);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(planId: string) {
    if (!customerId) {
      Alert.alert("Error", "Please create an account first");
      router.push("/setup");
      return;
    }

    // Find the selected plan to get the price
    const selectedPlan = plans.find((p) => p.id === planId);
    if (!selectedPlan) {
      Alert.alert("Error", "Plan not found");
      return;
    }

    try {
      setActionLoading(true);

      // First, create the subscription (this creates a payment intent in Stripe)
      const newSub = await createSubscription({ customerId, planId });
      
      // Now get the payment sheet params from the subscription's payment intent
      const { paymentIntent, ephemeralKey, customer } =
        await getSubscriptionPaymentSheetParams(newSub.id);

      // Initialize the payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Analog Phone Co",
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          name: "Phone User",
        },
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // Present the payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === "Canceled") {
          // User canceled - subscription stays incomplete, they can pay later
          setSubscription(newSub);
          return;
        }
        throw new Error(presentError.message);
      }

      // Payment successful! Sync from Stripe to update status
      const updatedSub = await syncSubscriptionFromStripe(newSub.id);
      setSubscription(updatedSub);
      Alert.alert("Success", "Your subscription is now active!");
    } catch (error: any) {
      const err = showError(error);
      Alert.alert(err.title, err.message, err.buttons);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!subscription) return;

    Alert.alert(
      "Cancel Subscription",
      "Your subscription will remain active until the end of the billing period. Are you sure?",
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              const updated = await cancelSubscription(subscription.id, false);
              setSubscription(updated);
              Alert.alert(
                "Subscription Canceled",
                "Your subscription will end at the end of the current billing period."
              );
            } catch (error: any) {
              const err = showError(error);
              Alert.alert(err.title, err.message, err.buttons);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleReactivate() {
    if (!subscription) return;

    try {
      setActionLoading(true);
      const updated = await reactivateSubscription(subscription.id);
      setSubscription(updated);
      Alert.alert("Success", "Your subscription has been reactivated!");
    } catch (error: any) {
      const err = showError(error);
      Alert.alert(err.title, err.message, err.buttons);
    } finally {
      setActionLoading(false);
    }
  }

  async function openBillingPortal() {
    if (!customerId) return;

    try {
      setActionLoading(true);
      // Use a deep link or web URL that your app can handle
      const returnUrl = "phoneapp://settings/subscription";
      const url = await getBillingPortalUrl(customerId, returnUrl);
      await Linking.openURL(url);
    } catch (error: any) {
      const err = showError(error);
      Alert.alert(err.title, err.message, err.buttons);
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePayNow() {
    if (!customerId || !subscription) return;

    try {
      setActionLoading(true);

      // Get payment sheet params from the subscription's existing payment intent
      const { paymentIntent, ephemeralKey, customer } =
        await getSubscriptionPaymentSheetParams(subscription.id);

      // Initialize the payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Analog Phone Co",
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          name: "Phone User",
        },
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // Present the payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === "Canceled") {
          return;
        }
        throw new Error(presentError.message);
      }

      // Payment succeeded! Sync the subscription status from Stripe
      const updatedSub = await syncSubscriptionFromStripe(subscription.id);
      setSubscription(updatedSub);
      Alert.alert("Success", "Payment successful! Your subscription is now active.");
    } catch (error: any) {
      const err = showError(error);
      Alert.alert(err.title, err.message, err.buttons);
    } finally {
      setActionLoading(false);
    }
  }

  // Check if subscription needs payment
  const needsPayment = subscription && 
    (subscription.status === "incomplete" || subscription.status === "past_due");

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  const currentPlan = subscription
    ? plans.find((p) => p.id === subscription.plan_id)
    : null;

  return (
    <ThemedView style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Plan</Text>
        
        {/* Current Subscription Status */}
        {subscription && currentPlan ? (
          <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <ThemedText style={styles.cardTitle}>Current Plan</ThemedText>
            <ThemedText style={styles.planName}>{currentPlan.name}</ThemedText>
            <ThemedText style={styles.planPrice}>
              {formatPrice(currentPlan.price_cents, currentPlan.currency)}/
              {currentPlan.interval}
            </ThemedText>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isSubscriptionActive(subscription)
                  ? colors.success
                  : colors.warning,
              },
            ]}
          >
            <Text style={styles.statusText}>
              {getSubscriptionStatusText(subscription)}
            </Text>
          </View>

          {subscription.current_period_end && (
            <ThemedText style={styles.periodText}>
              {isSubscriptionCanceling(subscription)
                ? "Access until: "
                : "Renews: "}
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </ThemedText>
          )}

          <View style={styles.buttonRow}>
            {needsPayment ? (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.tint }]}
                onPress={handlePayNow}
                disabled={actionLoading}
              >
                <Text style={styles.buttonText}>Pay Now</Text>
              </TouchableOpacity>
            ) : isSubscriptionCanceling(subscription) ? (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.tint }]}
                onPress={handleReactivate}
                disabled={actionLoading}
              >
                <Text style={styles.buttonText}>Reactivate</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={actionLoading}
              >
                <Text style={styles.buttonText}>Cancel Plan</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
              onPress={openBillingPortal}
              disabled={actionLoading}
            >
              <Text style={styles.buttonText}>Manage Billing</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <ThemedText style={styles.cardTitle}>No Active Plan</ThemedText>
          <ThemedText style={styles.cardSubtitle}>
            Subscribe to get your phone number
          </ThemedText>
        </View>
      )}

      {/* Available Plans - only show if no active subscription */}
      {!subscription || !isSubscriptionActive(subscription) ? (
        <>
          <ThemedText style={styles.sectionTitle}>Choose a Plan</ThemedText>

          {plans.map((plan) => {
            const isCurrentPlan = subscription?.plan_id === plan.id;

            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  { backgroundColor: colors.cardBackground },
                  isCurrentPlan && styles.currentPlanCard,
                ]}
              >
                <View style={styles.planHeader}>
                  <ThemedText style={styles.planCardName}>{plan.name}</ThemedText>
                  <ThemedText style={styles.planCardPrice}>
                    {formatPrice(plan.price_cents, plan.currency)}/{plan.interval}
                  </ThemedText>
                </View>

                <ThemedText style={styles.planDescription}>
                  {plan.description}
                </ThemedText>

                <View style={styles.featureList}>
                  {plan.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureItem}>
                      <Text style={[styles.featureCheck, { color: colors.success }]}>
                        ✓
                      </Text>
                      <ThemedText style={styles.featureText}>{feature}</ThemedText>
                    </View>
                  ))}
                </View>

                {!isCurrentPlan && (
                  <TouchableOpacity
                    style={[styles.subscribeButton, { backgroundColor: colors.tint }]}
                    onPress={() => handleSubscribe(plan.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.subscribeButtonText}>Subscribe</Text>
                    )}
                  </TouchableOpacity>
                )}

                {isCurrentPlan && (
                  <View style={[styles.currentBadge, { backgroundColor: colors.tint }]}>
                    <Text style={styles.currentBadgeText}>Current Plan</Text>
                  </View>
                )}
              </View>
            );
          })}
        </>
      ) : null}
      </ScrollView>

      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  container: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  planName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  periodText: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#666",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  planCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  currentPlanCard: {
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  planCardName: {
    fontSize: 20,
    fontWeight: "700",
  },
  planCardPrice: {
    fontSize: 18,
    fontWeight: "600",
  },
  planDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  featureList: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featureCheck: {
    fontSize: 16,
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
  },
  subscribeButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  subscribeButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  currentBadge: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  currentBadgeText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
});
