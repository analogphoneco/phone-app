import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStripe } from "@stripe/stripe-react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getApiBase } from "../../lib/api";
import { getCustomerId } from "../../lib/storage";

interface Plan {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  interval: string;
  features: string[];
}

export default function Subscribe() {
  const colorScheme = useColorScheme();
  const { colors, typography, styles } = useAppStyles(colorScheme);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Get customer ID
      const paramCustomer = String(params?.customerId || "");
      const storedCustomer = await getCustomerId();
      const custId = paramCustomer || storedCustomer;
      setCustomerId(custId);

      // Load plans (we only have one)
      const res = await fetch(`${getApiBase()}/api/plans`);
      const data = await res.json();
      if (data.ok && data.plans?.length > 0) {
        const p = data.plans[0];
        setPlan({
          id: p.id,
          name: p.name,
          description: p.description,
          priceCents: p.price_cents || p.priceCents,
          currency: p.currency,
          interval: p.interval,
          features: p.features || [],
        });
      }
    } catch (e) {
      console.error("Failed to load plan:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe() {
    if (!customerId || !plan) {
      Alert.alert("Error", "Missing customer or plan information");
      return;
    }

    setSubscribing(true);
    try {
      // Step 1: Create subscription (creates payment intent)
      const subRes = await fetch(`${getApiBase()}/api/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, planId: plan.id }),
      });
      const subData = await subRes.json();
      if (!subRes.ok || !subData.ok) {
        throw new Error(subData.error || "Failed to create subscription");
      }
      
      const subscriptionId = subData.subscription?.id;
      
      // Step 2: Get payment sheet params (need to pass Stripe API version)
      const sheetRes = await fetch(`${getApiBase()}/api/subscriptions/${subscriptionId}/payment-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiVersion: "2023-10-16" }),
      });
      const sheetData = await sheetRes.json();
      if (!sheetRes.ok || !sheetData.ok) {
        throw new Error(sheetData.error || "Failed to get payment details");
      }

      // Step 3: Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Analog Phone Co",
        customerId: sheetData.customer,
        customerEphemeralKeySecret: sheetData.ephemeralKey,
        paymentIntentClientSecret: sheetData.paymentIntent,
        defaultBillingDetails: { name: "" },
        // Apple Pay disabled - requires merchant ID setup in Apple Developer account
        // applePay: { merchantCountryCode: "US" },
        // googlePay: { merchantCountryCode: "US", testEnv: true },
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // Step 4: Present payment sheet
      const { error: presentError } = await presentPaymentSheet();
      
      if (presentError) {
        if (presentError.code === "Canceled") {
          // User cancelled - that's ok
          return;
        }
        throw new Error(presentError.message);
      }

      // Step 5: Sync subscription status
      await fetch(`${getApiBase()}/api/subscriptions/${subscriptionId}/sync`, { method: "POST" });

      // Success! Go to pick number
      router.push({ pathname: "/setup/pick-number", params: { customerId, subscribed: "1" } });
      
    } catch (e: any) {
      Alert.alert("Payment Failed", e?.message || "Unable to process payment");
    } finally {
      setSubscribing(false);
    }
  }

  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.screenCentered]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[typography.callout, { color: colors.icon, marginTop: 16 }]}>Loading plan...</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={[styles.screen, styles.screenCentered]}>
        <IconSymbol name="exclamationmark.triangle" size={48} color={colors.error} />
        <Text style={[typography.callout, { color: colors.icon, marginTop: 16 }]}>No plan available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={[styles.iconCircleLarge, { alignSelf: "center", marginBottom: 24 }]}>
        <IconSymbol name="creditcard.fill" size={48} color={colors.tint} />
      </View>
      
      <Text style={[typography.title1, { textAlign: "center", marginBottom: 8 }]}>Choose your plan</Text>
      <Text style={[typography.callout, { color: colors.icon, textAlign: "center", marginBottom: 32 }]}>
        Get your own phone number with all the features you need
      </Text>

      {/* Plan Card */}
      <View style={[styles.cardLarge, { marginBottom: 24 }]}>
        {/* Plan Header */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Text style={typography.title2}>{plan.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 8 }}>
            <Text style={[typography.largeTitle, { color: colors.tint }]}>
              {formatPrice(plan.priceCents)}
            </Text>
            <Text style={[typography.callout, { color: colors.icon, marginLeft: 4 }]}>
              /{plan.interval}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.icon + "20", marginBottom: 20 }} />

        {/* Features */}
        <View style={{ gap: 12 }}>
          {plan.features.map((feature, idx) => (
            <View key={idx} style={styles.row}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
              <Text style={typography.body}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Subscribe Button */}
      <Pressable 
        style={[styles.buttonPrimary, subscribing && styles.buttonDisabled]} 
        onPress={handleSubscribe}
        disabled={subscribing}
      >
        {subscribing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <IconSymbol name="apple.logo" size={20} color="#fff" />
            <Text style={typography.buttonText}>Subscribe with Apple Pay</Text>
          </>
        )}
      </Pressable>

      {/* Terms */}
      <Text style={[typography.caption, { color: colors.icon, textAlign: "center", marginTop: 24 }]}>
        Cancel anytime. You'll be charged {formatPrice(plan.priceCents)}/{plan.interval}.
      </Text>
    </ScrollView>
  );
}
