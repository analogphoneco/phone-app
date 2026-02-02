import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Share, Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getApiBase } from "../../lib/api";

export default function SetupComplete() {
  const colorScheme = useColorScheme();
  const { colors, typography, styles } = useAppStyles(colorScheme);
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const phoneNumber = String(params?.phoneNumber || "");
  const customerId = String(params?.customerId || "");
  const sipUsername = String(params?.sipUsername || "");
  const sipPassword = String(params?.sipPassword || "");
  
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Provisioning URL for auto-config
  const provisionUrl = `${getApiBase()}/provision/ht802/${customerId}.xml`;

  async function copyToClipboard(text: string, field: string) {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function shareCredentials() {
    try {
      await Share.share({
        message: `Phone Setup\n\nServer: sip.telnyx.com\nUsername: ${sipUsername}\nPassword: ${sipPassword}\n\nEasy Setup Link: ${provisionUrl}`,
      });
    } catch (e) {
      // User cancelled
    }
  }

  function handleDone() {
    router.replace("/(tabs)");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Success Icon */}
      <View style={[styles.iconCircleLarge, { alignSelf: "center", marginBottom: 24, backgroundColor: colors.success + "20" }]}>
        <IconSymbol name="checkmark.circle.fill" size={48} color={colors.success} />
      </View>
      
      <Text style={[typography.title1, { textAlign: "center", marginBottom: 8 }]}>You're all set!</Text>
      <Text style={[typography.callout, { color: colors.icon, textAlign: "center", marginBottom: 32 }]}>
        Your Analog number is ready. Connect your phone below.
      </Text>

      {/* Phone Number Card */}
      <View style={[styles.cardLarge, { marginBottom: 24 }]}>
        <View style={[styles.row, { marginBottom: 16 }]}>
          <IconSymbol name="phone.fill" size={24} color={colors.tint} />
          <Text style={typography.title3}>Your Number</Text>
        </View>
        <Text style={[typography.largeTitle, { textAlign: "center", color: colors.tint }]}>
          {phoneNumber}
        </Text>
      </View>

      {/* Device Setup Section */}
      <Text style={[typography.sectionHeader, { marginBottom: 12 }]}>CONNECT YOUR PHONE</Text>
      
      {/* Option 1: Easy setup */}
      <View style={[styles.card, { marginBottom: 16 }]}>
        <View style={[styles.row, { marginBottom: 12 }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accent + "20" }]}>
            <IconSymbol name="qrcode" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyMedium}>Easy Setup Link</Text>
            <Text style={[typography.caption, { color: colors.icon }]}>Copy this link to set up your device automatically</Text>
          </View>
        </View>
        <Pressable 
          style={[styles.cardInset, styles.row]} 
          onPress={() => copyToClipboard(provisionUrl, "url")}
        >
          <Text style={[typography.footnote, { flex: 1, fontFamily: "Menlo" }]} numberOfLines={1}>
            {provisionUrl}
          </Text>
          <IconSymbol 
            name={copiedField === "url" ? "checkmark" : "doc.on.doc"} 
            size={18} 
            color={copiedField === "url" ? colors.success : colors.tint} 
          />
        </Pressable>
      </View>

      {/* Option 2: Manual credentials */}
      <View style={[styles.card, { marginBottom: 24 }]}>
        <View style={[styles.row, { marginBottom: 12 }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.tint + "20" }]}>
            <IconSymbol name="key.fill" size={20} color={colors.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyMedium}>Manual Setup</Text>
            <Text style={[typography.caption, { color: colors.icon }]}>Or enter these settings by hand</Text>
          </View>
        </View>
        
        <View style={{ gap: 12 }}>
          {/* SIP Server */}
          <View style={styles.cardInset}>
            <Text style={[typography.caption, { color: colors.icon, marginBottom: 4 }]}>Server</Text>
            <Pressable style={styles.row} onPress={() => copyToClipboard("sip.telnyx.com", "server")}>
              <Text style={[typography.body, { flex: 1 }]}>sip.telnyx.com</Text>
              <IconSymbol 
                name={copiedField === "server" ? "checkmark" : "doc.on.doc"} 
                size={16} 
                color={copiedField === "server" ? colors.success : colors.icon} 
              />
            </Pressable>
          </View>

          {/* Username */}
          <View style={styles.cardInset}>
            <Text style={[typography.caption, { color: colors.icon, marginBottom: 4 }]}>Username</Text>
            <Pressable style={styles.row} onPress={() => copyToClipboard(sipUsername, "username")}>
              <Text style={[typography.body, { flex: 1 }]} numberOfLines={1}>{sipUsername}</Text>
              <IconSymbol 
                name={copiedField === "username" ? "checkmark" : "doc.on.doc"} 
                size={16} 
                color={copiedField === "username" ? colors.success : colors.icon} 
              />
            </Pressable>
          </View>

          {/* Password */}
          <View style={styles.cardInset}>
            <Text style={[typography.caption, { color: colors.icon, marginBottom: 4 }]}>Password</Text>
            <View style={styles.row}>
              <Pressable style={{ flex: 1 }} onPress={() => copyToClipboard(sipPassword, "password")}>
                <Text style={[typography.body, { flex: 1 }]} numberOfLines={1}>
                  {showPassword ? sipPassword : "••••••••••••"}
                </Text>
              </Pressable>
              <Pressable onPress={() => setShowPassword(!showPassword)} style={{ marginRight: 8 }}>
                <IconSymbol 
                  name={showPassword ? "eye.slash" : "eye"} 
                  size={16} 
                  color={colors.icon} 
                />
              </Pressable>
              <IconSymbol 
                name={copiedField === "password" ? "checkmark" : "doc.on.doc"} 
                size={16} 
                color={copiedField === "password" ? colors.success : colors.icon} 
              />
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <Pressable style={[styles.buttonSecondary, { marginBottom: 12 }]} onPress={shareCredentials}>
        <IconSymbol name="square.and.arrow.up" size={18} color={colors.tint} />
        <Text style={[typography.buttonText, { color: colors.tint }]}>Share Setup Info</Text>
      </Pressable>

      <Pressable style={styles.buttonPrimary} onPress={handleDone}>
        <Text style={typography.buttonText}>Done</Text>
        <IconSymbol name="checkmark" size={18} color="#fff" />
      </Pressable>

      {/* Help text */}
      <View style={[styles.center, { marginTop: 24, padding: 16 }]}>
        <Text style={[typography.caption, { color: colors.icon, textAlign: "center" }]}>
          Need help? Copy the easy setup link into your device's settings, or enter the server, username, and password manually.
        </Text>
      </View>
    </ScrollView>
  );
}
