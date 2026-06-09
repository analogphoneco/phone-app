import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getApiBase } from "@/lib/api";
import { getCredentials, getApiKey } from "@/lib/storage";
import { getActiveSubscription } from "@/lib/subscription";

/**
 * Setup Router
 * 
 * Checks device and subscription status, then routes to appropriate screen:
 * - No device → activate screen
 * - Device activated, no subscription → subscribe screen
 * - Everything done → main app
 */
export default function SetupHome() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [status, setStatus] = useState('Checking setup status...');

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const creds = await getCredentials();

      // No credentials = new user → create account or activate
      if (!creds?.customerId) {
        setStatus('New user detected...');
        router.replace("/setup/create-account");
        return;
      }

      // Check if they have an activated device
      setStatus('Checking device status...');
      const apiKey = await getApiKey();
      const headers: HeadersInit = apiKey ? { "X-Api-Key": apiKey } : {};
      const deviceRes = await fetch(
        `${getApiBase()}/api/devices/${encodeURIComponent(creds.customerId)}`,
        { headers }
      );

      if (deviceRes.ok) {
        const deviceData = await deviceRes.json();

        if (deviceData.device?.phone_number) {
          // Device activated — check for an active subscription
          setStatus('Checking subscription...');

          // First check device-level subscriptionStatus (fast, no extra API call)
          if (deviceData.device?.subscriptionStatus === 'active') {
            router.replace("/(tabs)");
            return;
          }

          // Fall back to full subscription lookup
          try {
            const sub = await getActiveSubscription(creds.customerId);
            if (sub && sub.status === 'active') {
              router.replace("/(tabs)");
              return;
            }
          } catch {
            // Subscription lookup failed — but if device is activated and
            // subscriptionStatus isn't explicitly 'canceled', let them through.
            // This covers household/multi-device scenarios where the second device
            // doesn't have a direct subscription record but the account is paid.
            if (deviceData.device?.subscriptionStatus !== 'canceled') {
              router.replace("/(tabs)");
              return;
            }
          }
          router.replace("/setup/subscribe");
          return;
        }
      }

      // No activated device found → needs activation
      setStatus('No device found...');
      router.replace("/setup/activate");

    } catch (error) {
      console.error('Setup check error:', error);
      // On error, go to activation screen (safest fallback)
      router.replace("/setup/activate");
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, gap: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.tint} />
      <Text style={{ fontSize: 17, color: colors.icon }}>{status}</Text>
    </View>
  );
}
