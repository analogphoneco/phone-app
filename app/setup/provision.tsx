import React, { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, TextInput, Animated } from "react-native";
import * as Clipboard from "expo-clipboard";
import { getApiBase } from "../../lib/api";
import { getCredentials } from "../../lib/storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function Provision() {
  const colorScheme = useColorScheme();
  const { colors, typography, styles } = useAppStyles(colorScheme);
  
  const [loading, setLoading] = useState(false);
  const [sipCredential, setSipCredential] = useState<any | null>(null);
  const [credentialList, setCredentialList] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"list" | "create" | "display">("list");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const params = useLocalSearchParams();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const creds = await getCredentials();
      const paramCustomer = String(params?.customerId || "") || null;
      const resolvedCustomer = creds?.customerId ?? paramCustomer;
      setCustomerId(resolvedCustomer ?? null);
      if (resolvedCustomer) {
        await fetchCredentials(resolvedCustomer);
      }
    })();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [step]);

  async function fetchCredentials(custId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/telnyx/credentials?customerId=${encodeURIComponent(custId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || JSON.stringify(data));
      const list = Array.isArray(data.results) ? data.results : [];
      setCredentialList(list);
      setStep("list");
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCredential() {
    if (!customerId) return;
    if (!name.trim()) return Alert.alert("Name Required", "Please enter a name for this device.");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/telnyx/provision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || JSON.stringify(data));
      setSipCredential(data.credential);
      setStep("display");
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, field: string) {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function handleDone() {
    router.replace("/(tabs)");
  }

  if (!customerId) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: 60 }]}>
        <IconSymbol name="person.crop.circle.badge.exclamationmark" size={48} color={colors.icon} />
        <Text style={[typography.callout, { color: colors.icon, marginTop: 16 }]}>No account found</Text>
        <Text style={[typography.footnote, { color: colors.icon, marginTop: 8 }]}>Please create an account first</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: 60 }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[typography.callout, { color: colors.icon, marginTop: 16 }]}>Loading...</Text>
      </View>
    );
  }

  // List existing credentials
  if (step === "list") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 20 }}>
        <View style={[styles.center, { gap: 8 }]}>
          <IconSymbol name="phone.and.waveform" size={32} color={colors.tint} />
          <Text style={[typography.title2, { marginTop: 8 }]}>SIP Credentials</Text>
          <Text style={[typography.callout, { color: colors.icon }]}>Manage your device credentials</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={{ color: colors.error }}>{error}</Text>
          </View>
        )}

        {credentialList.length > 0 ? (
          <View style={{ gap: 12 }}>
            {credentialList.map((cred: any, idx: number) => (
              <View key={cred.id || idx} style={[styles.card, styles.row]}>
                <IconSymbol name="phone.fill" size={20} color={colors.tint} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={typography.bodyMedium}>{cred.name || `Credential ${idx + 1}`}</Text>
                  <Text style={typography.footnote}>{cred.sip_username || cred.user_name}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.card, styles.center, { padding: 32 }]}>
            <IconSymbol name="tray" size={32} color={colors.icon} />
            <Text style={[typography.callout, { color: colors.icon, marginTop: 8 }]}>No credentials yet</Text>
          </View>
        )}

        <Pressable style={styles.buttonPrimary} onPress={() => { setName(""); setStep("create"); }}>
          <IconSymbol name="plus" size={18} color="#fff" />
          <Text style={typography.buttonText}>Create New Credential</Text>
        </Pressable>

        <Pressable style={styles.buttonSecondary} onPress={handleDone}>
          <Text style={[typography.buttonText, { color: colors.tint }]}>Done</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // Create new credential
  if (step === "create") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 20 }}>
        <View style={[styles.center, { gap: 8 }]}>
          <IconSymbol name="plus.circle" size={32} color={colors.tint} />
          <Text style={[typography.title2, { marginTop: 8 }]}>New Credential</Text>
          <Text style={[typography.callout, { color: colors.icon }]}>Name this device (e.g., "Living Room ATA")</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={{ color: colors.error }}>{error}</Text>
          </View>
        )}

        <View style={{ gap: 8 }}>
          <Text style={typography.sectionHeader}>Device Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Living Room ATA"
            placeholderTextColor={colors.icon}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <Pressable style={styles.buttonPrimary} onPress={handleCreateCredential}>
          <Text style={typography.buttonText}>Create Credential</Text>
        </Pressable>

        <Pressable style={styles.buttonSecondary} onPress={() => setStep("list")}>
          <Text style={[typography.buttonText, { color: colors.tint }]}>Cancel</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // Display newly created credential
  if (step === "display" && sipCredential) {
    const fields = [
      { label: "SIP Server", value: "sip.telnyx.com", key: "server" },
      { label: "Username", value: sipCredential.user_name || sipCredential.sip_username, key: "username" },
      { label: "Password", value: sipCredential.password || "(hidden)", key: "password" },
    ];

    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 20 }}>
        <View style={styles.successBanner}>
          <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
          <Text style={[typography.subheadMedium, { color: colors.success }]}>Credential created!</Text>
        </View>

        <View style={[styles.center, { gap: 8 }]}>
          <Text style={[typography.title2]}>Your SIP Details</Text>
          <Text style={[typography.callout, { color: colors.icon }]}>Use these to configure your ATA device</Text>
        </View>

        <View style={{ gap: 12 }}>
          {fields.map((f) => (
            <View key={f.key} style={styles.card}>
              <Text style={typography.sectionHeader}>{f.label}</Text>
              <View style={[styles.row, { marginTop: 8 }]}>
                <Text style={[typography.mono, { flex: 1 }]}>{f.value}</Text>
                <Pressable onPress={() => copyToClipboard(f.value, f.key)} hitSlop={8}>
                  <IconSymbol 
                    name={copiedField === f.key ? "checkmark.circle.fill" : "doc.on.doc"} 
                    size={22} 
                    color={copiedField === f.key ? colors.success : colors.tint} 
                  />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.accent }]}>
          <View style={styles.row}>
            <IconSymbol name="lightbulb" size={20} color={colors.tint} />
            <Text style={[typography.bodyMedium, { color: colors.tint }]}>Pro Tip</Text>
          </View>
          <Text style={[typography.footnote, { marginTop: 8 }]}>
            If your ATA asks for a "domain" or "realm", use sip.telnyx.com
          </Text>
        </View>

        <Pressable style={styles.buttonPrimary} onPress={handleDone}>
          <Text style={typography.buttonText}>Done</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return null;
}
