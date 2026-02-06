import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStripe } from "@stripe/stripe-react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { PrimaryButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <View style={[styles.iconCircleLarge, { alignSelf: "center", marginBottom: 20, backgroundColor: colors.tint + "15" }]}>
        <IconSymbol name="phone.fill" size={56} color={colors.tint} />
      </View>
      
      <Text style={[typography.title1, { textAlign: "center", marginBottom: 8 }]}>Get your phone line</Text>
      <Text style={[typography.callout, { color: colors.icon, textAlign: "center", marginBottom: 32 }]}>
        Everything you need for your vintage phone
      </Text>

      {/* Plan Card - Enhanced */}
      <View style={[styles.cardLarge, { marginBottom: 24, borderWidth: 2, borderColor: colors.tint + "20" }]}>
        {/* Plan Header with Accent Background */}
        <View style={{ 
          alignItems: "center", 
          marginBottom: 24, 
          paddingBottom: 20,
          borderBottomWidth: 2,
          borderBottomColor: colors.tint + "15"
        }}>
          <View style={{
            backgroundColor: colors.tint + "10",
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 20,
            marginBottom: 12
          }}>
            <Text style={[typography.subheadMedium, { color: colors.tint, textTransform: "uppercase", letterSpacing: 1 }]}>
              {plan.name}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={[typography.largeTitle, { fontSize: 48, color: colors.tint, fontWeight: "700" }]}>
              {formatPrice(plan.priceCents)}
            </Text>
            <Text style={[typography.title3, { color: colors.icon, marginLeft: 6 }]}>
              /{plan.interval}
            </Text>
          </View>
          <Text style={[typography.caption, { color: colors.icon, marginTop: 4 }]}>
            {plan.description}
          </Text>
        </View>

        {/* Features - Enhanced with better spacing */}
        <View style={{ gap: 16 }}>
          {plan.features.map((feature, idx) => (
            <View key={idx} style={[styles.row, { gap: 12 }]}>
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: colors.success + "20",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <IconSymbol name="checkmark" size={16} color={colors.success} />
              </View>
              <Text style={[typography.body, { flex: 1 }]}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Promo Code Section */}
      <View style={{ marginBottom: 24 }}>
        <Input
          value={promoCode}
          onChangeText={(text: string) => {
            setPromoCode(text);
            setPromoApplied(false);
          }}
          placeholder="Enter promo code (optional)"
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!promoApplied}
          success={promoApplied}
          label="Have a promo code?"
          icon="ticket"
        />
        {promoApplied && (
          <Text style={[typography.caption, { color: colors.success, marginTop: -8, marginLeft: 4 }]}>
            ✓ Promo code will be applied at checkout
          </Text>
        )}
        {promoCode.trim() && !promoApplied && (
          <Text style={[typography.caption, { color: colors.icon, marginTop: -8, marginLeft: 4 }]}>
            Code will be validated when you subscribe
          </Text>
        )}
      </View>

      {/* Subscribe Button */}
      <PrimaryButton 
        title="Subscribe Now"
        onPress={handleSubscribe}
        disabled={subscribing}
        loading={subscribing}
        icon="creditcard.fill"
        fullWidth
      />

      {/* Terms */}
      <Text style={[typography.caption, { color: colors.icon, textAlign: "center", marginTop: 24 }]}>
        Cancel anytime. You'll be charged {formatPrice(plan.priceCents)}/{plan.interval}.
      </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
