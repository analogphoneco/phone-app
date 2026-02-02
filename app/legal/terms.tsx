import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function TermsAndConditions() {
  const colorScheme = useColorScheme();
  const { colors, typography, styles } = useAppStyles(colorScheme);
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={[styles.rowSpaced, { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.row}>
          <IconSymbol name="chevron.left" size={20} color={colors.tint} />
          <Text style={[typography.body, { color: colors.tint, marginLeft: 4 }]}>Back</Text>
        </Pressable>
      </View>
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={[typography.largeTitle, { marginBottom: 8 }]}>Terms & Conditions</Text>
        <Text style={[typography.caption, { color: colors.icon, marginBottom: 24 }]}>
          Last updated: February 1, 2026
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>1. Acceptance of Terms</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          By accessing or using Analog Phone Co's services, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>2. Service Description</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          Analog Phone Co provides Voice over Internet Protocol (VoIP) telephone services that allow you to make and receive phone calls using an internet connection and compatible hardware device.
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>3. Subscription & Billing</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          • Monthly subscription fees are billed in advance{"\n"}
          • You may cancel your subscription at any time{"\n"}
          • Refunds are provided on a pro-rata basis for unused service{"\n"}
          • We reserve the right to change pricing with 30 days notice
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>4. Acceptable Use</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          You agree not to use our services for:{"\n"}
          • Illegal activities or fraud{"\n"}
          • Harassment or threatening communications{"\n"}
          • Automated calling or robocalling{"\n"}
          • Any activity that interferes with our network
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>5. Emergency Services (911)</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          VoIP services have limitations for emergency calls. 911 calls may not work during power or internet outages. You should maintain an alternative means of reaching emergency services.
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>6. Service Availability</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          While we strive for 99.9% uptime, we do not guarantee uninterrupted service. Service may be affected by internet connectivity, power outages, or maintenance windows.
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>7. Limitation of Liability</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          Analog Phone Co shall not be liable for any indirect, incidental, special, or consequential damages arising from use of our services. Our total liability is limited to the amount paid for services in the preceding 12 months.
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>8. Termination</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          We may suspend or terminate your account for violation of these terms. You may terminate your account at any time through the app settings.
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>9. Changes to Terms</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>10. Contact</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          For questions about these terms, please contact us at support@analogphone.co
        </Text>
      </ScrollView>
    </View>
  );
}
