import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStripe } from "@stripe/stripe-react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getApiBase } from "../../lib/api";
import { getCustomerId, getApiKey } from "../../lib/storage";
import { parseError } from "../../lib/errors";

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
  const [promoCode, setPromoCode] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);

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
      // Get API key
      const apiKey = await getApiKey();
      if (!apiKey) {
        throw new Error("Not authenticated. Please restart the app.");
      }

      const headers = {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      };

      // Step 1: Create subscription (creates payment intent)
      const subRes = await fetch(`${getApiBase()}/api/subscriptions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          customerId, 
          planId: plan.id,
          ...(promoCode.trim() ? { promoCode: promoCode.trim() } : {})
        }),
      });
      const subData = await subRes.json();
      
      // If customer already has a subscription, check if it's active
      if (!subRes.ok || !subData.ok) {
        if (subData.error?.includes("already has an active subscription") || 
            subData.error?.includes("has no Stripe subscription")) {
          // Check subscription status
          const checkRes = await fetch(`${getApiBase()}/api/customers/${customerId}/subscriptions`, { headers });
          const checkData = await checkRes.json();
          const activeSub = checkData.subscriptions?.find((s: any) => 
            (s.status === "active" || s.status === "trialing") && s.stripe_subscription_id
          );
          
          if (activeSub) {
            // Already subscribed! Go to pick number
            router.push({ pathname: "/setup/pick-number", params: { customerId, subscribed: "1" } });
            return;
          }
          
          // Incomplete subscription exists - need to delete it on backend
          // For now, show a helpful error
          Alert.alert(
            "Account Issue",
            "Your account has an incomplete subscription. Please contact support or create a new account.",
            [{ text: "OK" }]
          );
          return;
        }
        throw new Error(subData.error || "Failed to create subscription");
      }
      
      const subscriptionId = subData.subscription?.id;
      
      // Step 2: Get payment sheet params (need to pass Stripe API version)
      const sheetRes = await fetch(`${getApiBase()}/api/subscriptions/${subscriptionId}/payment-sheet`, {
        method: "POST",
        headers,
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
      await fetch(`${getApiBase()}/api/subscriptions/${subscriptionId}/sync`, { 
        method: "POST",
        headers 
      });

      // Success! Go to pick number
      router.push({ pathname: "/setup/pick-number", params: { customerId, subscribed: "1" } });
      
    } catch (e: any) {
      console.error("[Subscribe] Payment error:", e);
      console.error("[Subscribe] Error details:", {
        message: e?.message,
        code: e?.code,
        stack: e?.stack
      });
      
      const error = parseError(e);
      
      // Show error with option to retry
      Alert.alert(
        error.title,
        error.message,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: error.action || "Try Again", 
            onPress: () => {
              // Retry subscription
              setTimeout(() => handleSubscribe(), 500);
            }
          }
        ]
      );
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
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ScrollView 
        style={styles.screen} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <Pressable 
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={20} color={colors.tint} />
          <Text style={[typography.callout, { color: colors.tint, marginLeft: 4 }]}>Back</Text>
        </Pressable>

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

      {/* Promo Code Section */}
      <View style={{ marginBottom: 24 }}>
        <Text style={[typography.subheadMedium, { marginBottom: 8 }]}>Have a promo code?</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={promoCode}
            onChangeText={(text) => {
              setPromoCode(text);
              setPromoApplied(false);
            }}
            placeholder="Enter code"
            placeholderTextColor={colors.icon}
            style={[styles.input, { flex: 1 }]}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!promoApplied}
          />
          {promoApplied && (
            <View style={{ 
              justifyContent: "center", 
              alignItems: "center",
              paddingHorizontal: 12,
              backgroundColor: colors.success + "20",
              borderRadius: 8
            }}>
              <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
            </View>
          )}
        </View>
        {promoApplied && (
          <Text style={[typography.caption, { color: colors.success, marginTop: 8 }]}>
            ✓ Promo code will be applied at checkout
          </Text>
        )}
        {promoCode.trim() && !promoApplied && (
          <Text style={[typography.caption, { color: colors.icon, marginTop: 8 }]}>
            Code will be validated when you subscribe
          </Text>
        )}
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
          <Text style={typography.buttonText}>Subscribe</Text>
        )}
      </Pressable>

      {/* Terms */}
      <Text style={[typography.caption, { color: colors.icon, textAlign: "center", marginTop: 24 }]}>
        Cancel anytime. You'll be charged {formatPrice(plan.priceCents)}/{plan.interval}.
      </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
