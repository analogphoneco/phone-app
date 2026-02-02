import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert } from "react-native";
import { getApiBase } from "../../lib/api";
import { getCredentials } from "../../lib/storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function PickNumber() {
  const colorScheme = useColorScheme();
  const { colors, typography, styles } = useAppStyles(colorScheme);
  
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const justSubscribed = String(params?.subscribed) === "1";

  useEffect(() => {
    (async () => {
      const creds = await getCredentials();
      const paramCustomer = String(params?.customerId || "") || null;
      const resolvedCustomer = creds?.customerId ?? paramCustomer;
      setCustomerId(resolvedCustomer ?? null);
      if (!creds && !paramCustomer) return;
      fetchNumbers();
    })();
  }, []);

  async function fetchNumbers() {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/telnyx/numbers?country=US&limit=20`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || JSON.stringify(data));
      setNumbers(Array.isArray(data.results) ? data.results : []);
    } catch (e: any) {
      Alert.alert("Error", e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(number: string) {
    if (!customerId) return Alert.alert("No account", "Please create an account first.");
    setPurchasing(number);
    try {
      // Step 1: Purchase the phone number
      const purchaseRes = await fetch(`${getApiBase()}/api/telnyx/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: number, customerId }),
      });
      const purchaseData = await purchaseRes.json();
      if (!purchaseRes.ok || purchaseData?.ok === false) {
        const errMsg = purchaseData?.error?.detail || purchaseData?.error?.message || 
          (typeof purchaseData?.error === "string" ? purchaseData.error : JSON.stringify(purchaseData?.error));
        throw new Error(errMsg || `Purchase failed (${purchaseRes.status})`);
      }

      // Step 2: Auto-provision SIP credential for the device
      const provRes = await fetch(`${getApiBase()}/api/telnyx/provision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, name: "Phone" }),
      });
      const provData = await provRes.json();
      if (!provRes.ok || provData?.ok === false) {
        console.warn("Auto-provision warning:", provData?.error);
        // Continue anyway - they can set up device later
      }

      // Go to setup complete screen with provisioning info
      router.push({ 
        pathname: "/setup/complete", 
        params: { 
          customerId, 
          phoneNumber: number,
          sipUsername: provData?.credential?.user_name || "",
          sipPassword: provData?.credential?.password || "",
        } 
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message || String(e));
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: 60 }]}>
      {justSubscribed && (
        <View style={styles.successBanner}>
          <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
          <Text style={[typography.subheadMedium, { color: colors.success }]}>Payment successful — now choose your number</Text>
        </View>
      )}

      <View style={[styles.center, { padding: 24, paddingTop: 16, gap: 8 }]}>
        <IconSymbol name="phone.badge.plus" size={32} color={colors.tint} />
        <Text style={[typography.title2, { marginTop: 8 }]}>Choose your number</Text>
        <Text style={[typography.callout, { color: colors.icon }]}>Select a phone number from the list below</Text>
      </View>

      {!customerId ? (
        <View style={[styles.center, { flex: 1, gap: 16, padding: 24 }]}>
          <Text style={[typography.callout, { color: colors.icon }]}>Please create an account first.</Text>
        </View>
      ) : loading ? (
        <View style={[styles.center, { flex: 1, gap: 16 }]}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[typography.callout, { color: colors.icon }]}>Loading available numbers...</Text>
        </View>
      ) : numbers.length > 0 ? (
        <FlatList
          data={numbers}
          keyExtractor={(i) => String(i?.id ?? i?.phone_number ?? Math.random())}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => {
            const phoneNumber = item?.phone_number || item?.phone_number_e164;
            const isPurchasing = purchasing === phoneNumber;
            return (
              <Pressable
                style={[styles.card, styles.row, isPurchasing && { opacity: 0.7 }]}
                onPress={() => handlePurchase(phoneNumber)}
                disabled={!!purchasing}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={typography.bodyMedium}>{phoneNumber}</Text>
                  {item?.locality && (
                    <Text style={typography.footnote}>{item.locality}, {item.administrative_area}</Text>
                  )}
                </View>
                {isPurchasing ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <IconSymbol name="plus.circle.fill" size={28} color={colors.tint} />
                )}
              </Pressable>
            );
          }}
        />
      ) : (
        <View style={[styles.center, { flex: 1, gap: 16, padding: 24 }]}>
          <IconSymbol name="phone.down" size={40} color={colors.icon} />
          <Text style={[typography.callout, { color: colors.icon, textAlign: "center" }]}>No numbers available right now</Text>
          <Pressable style={styles.buttonPrimary} onPress={fetchNumbers}>
            <Text style={typography.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
