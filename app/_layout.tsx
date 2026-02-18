import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import 'react-native-reanimated';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_300Light,
} from '@expo-google-fonts/inter';
import { StripeProvider } from '@stripe/stripe-react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ErrorBoundary } from '@/components/error-boundary';
import { checkAndRefreshApiKey } from '@/lib/api';
import { CallBridgeService } from '@/lib/call-bridge-service';
import { VoicemailBadgeProvider } from '@/lib/voicemail-badge-context';
import { MissedCallBadgeProvider } from '@/lib/missed-call-badge-context';

const STRIPE_PUBLISHABLE_KEY = 'pk_live_51SvSglGpYTutwIm7beYnJcGNNSxxNnQLltR2ZU24R4lp4s0mUsQr3cKdgOSxuhddGUlfzSao11YoNiaCLSv8xBEB004z5ssKE3';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  
  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Check and refresh API key on app start
  useEffect(() => {
    checkAndRefreshApiKey().catch(() => {
      // Silently fail - user might not have an account yet
      // or key might be invalid/expired (they'll need to re-authenticate)
    });

    // Initialize call bridging service
    CallBridgeService.initialize().catch((error) => {
      console.error('Failed to initialize call bridge service:', error);
    });

    return () => {
      CallBridgeService.shutdown();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <VoicemailBadgeProvider>
        <MissedCallBadgeProvider>
          <StripeProvider 
            publishableKey={STRIPE_PUBLISHABLE_KEY}
            merchantIdentifier="merchant.com.analogphone.app"
          >
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="setup" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </StripeProvider>
        </MissedCallBadgeProvider>
      </VoicemailBadgeProvider>
    </ErrorBoundary>
  );
}
