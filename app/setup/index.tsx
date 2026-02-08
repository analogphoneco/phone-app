import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getApiBase } from "@/lib/api";
import { getCredentials } from "@/lib/storage";

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
      const response = await fetch(`${getApiBase()}/api/customer/${creds.customerId}/device`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.device) {
          // Device exists - check subscription status
          setStatus('Device found! Checking subscription...');
          
          // TODO: Check Stripe subscription status
          // For now, if they have a device, assume they need to subscribe
          router.replace("/setup/subscribe");
          return;
        }
      }

      // No device found → needs activation
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
