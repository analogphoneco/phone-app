import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function PrivacyPolicy() {
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
        <Text style={[typography.largeTitle, { marginBottom: 8 }]}>Privacy Policy</Text>
        <Text style={[typography.caption, { color: colors.icon, marginBottom: 24 }]}>
          Last updated: February 1, 2026
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>Information We Collect</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          We collect information you provide directly:{"\n"}
          • Name and email address{"\n"}
          • Payment information (processed securely by Stripe){"\n"}
          • Phone number assigned to your account{"\n"}
          • Call logs and usage data
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>How We Use Your Information</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          We use your information to:{"\n"}
          • Provide and maintain our phone service{"\n"}
          • Process payments and prevent fraud{"\n"}
          • Send important service updates{"\n"}
          • Improve our services{"\n"}
          • Comply with legal obligations
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>Information Sharing</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          We do not sell your personal information. We may share data with:{"\n"}
          • Service providers (Telnyx for calls, Stripe for payments){"\n"}
          • Law enforcement when legally required{"\n"}
          • Business partners with your consent
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>Call Data</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          We retain call metadata (numbers called, duration, timestamps) for billing and service improvement. We do not record or store the content of your phone calls.
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>Voicemail</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          Voicemail messages are stored securely and retained for 30 days after being played, or 90 days if unplayed. You can delete voicemails at any time.
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>Data Security</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          We use industry-standard encryption and security measures to protect your data. Your credentials are stored securely on your device using encrypted storage.
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>Your Rights</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          You have the right to:{"\n"}
          • Access your personal data{"\n"}
          • Correct inaccurate data{"\n"}
          • Delete your account and data{"\n"}
          • Export your data{"\n"}
          • Opt out of marketing communications
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>Data Retention</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          We retain your data while your account is active. After account deletion, we may retain certain data for legal compliance for up to 7 years.
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>Children's Privacy</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          Our services are not intended for children under 13. We do not knowingly collect information from children under 13.
        </Text>

        <Text style={[typography.title3, { marginBottom: 8 }]}>Contact Us</Text>
        <Text style={[typography.body, { color: colors.icon, marginBottom: 20, lineHeight: 22 }]}>
          For privacy questions or to exercise your rights, contact us at:{"\n"}
          privacy@analogphone.co
        </Text>
      </ScrollView>
    </View>
  );
}
