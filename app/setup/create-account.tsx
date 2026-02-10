import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { getApiBase } from "../../lib/api";
import { saveCredentials, saveCustomerId, saveApiKey, clearCredentials } from "../../lib/storage";
import { useRouter, Link } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";
import { IconSymbol } from "@/components/ui/icon-symbol";

function makeCustomerId() {
  return `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 10000)}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function CreateAccount() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { colors, typography, styles } = useAppStyles(colorScheme);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    Alert.alert(
      "Reset Account",
      "This will clear your saved account and let you start fresh. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive",
          onPress: async () => {
            await clearCredentials();
            Alert.alert("Account Reset", "You can now create a new account.");
          }
        }
      ]
    );
  }

  async function handleCreate() {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return Alert.alert("Name Required", "Please enter your name to continue.");
    }
    if (trimmedName.length < 2) {
      return Alert.alert("Name Too Short", "Please enter your full name (at least 2 characters).");
    }
    if (trimmedName.length > 100) {
      return Alert.alert("Name Too Long", "Please enter a shorter name (maximum 100 characters).");
    }
    if (!trimmedEmail) {
      return Alert.alert("Email Required", "Please enter your email address.");
    }
    if (!isValidEmail(trimmedEmail)) {
      return Alert.alert("Invalid Email", "Please enter a valid email address (e.g., you@example.com).");
    }

    setLoading(true);
    try {
      // Health check
      try {
        const hc = new AbortController();
        const ht = setTimeout(() => hc.abort(), 3000);
        const hres = await fetch(`${getApiBase()}/api/health`, { signal: hc.signal });
        clearTimeout(ht);
        if (!hres.ok) {
          Alert.alert("Server unreachable", `Health check failed: ${hres.status}`);
          setLoading(false);
          return;
        }
      } catch {
        Alert.alert("Server unreachable", "Cannot reach server. Please check your connection.");
        setLoading(false);
        return;
      }

      const newCustomerId = makeCustomerId();
      
      // Create customer (or get existing if email already registered)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${getApiBase()}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: newCustomerId, 
          name: trimmedName, 
          email: trimmedEmail 
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create account");

      // Use the customer ID from the response (might be existing customer)
      const customerId = data.customer?.id || newCustomerId;
      
      // Save credentials locally
      await saveCredentials({ customerId, userName: trimmedName });
      await saveCustomerId(customerId);
      
      // Save API key if returned
      if (data.customer?.apiKey) {
        await saveApiKey(data.customer.apiKey);
      }

      // Try to auto-activate if there's a device for this email
      try {
        const activateRes = await fetch(`${getApiBase()}/api/activate-by-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail, customerId }),
        });
        const activateData = await activateRes.json();
        
        if (activateRes.ok && activateData.ok) {
          // Device auto-activated!
          Alert.alert(
            "Phone Activated! 🎉",
            `Your phone number ${activateData.device?.phoneNumber || ''} has been automatically activated!\n\nYou're all set!`,
            [{ text: "Go to Home", onPress: () => router.replace("/(tabs)") }]
          );
          return;
        }
      } catch (e) {
        // Auto-activation failed, continue with normal flow
        console.log('Auto-activation not available:', e);
      }

      // Check if this is a returning user with an existing subscription
      if (data.existing) {
        // Returning user - just go to home
        // The subscribe page will check for existing subscriptions and redirect if needed
        Alert.alert(
          "Welcome back!", 
          "Your account has been restored.",
          [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
        );
        return;
      }

      // New user - go to subscribe
      router.push({ pathname: "/setup/subscribe", params: { customerId } });
    } catch (e: any) {
      if (e?.name === "AbortError") {
        Alert.alert("Timeout", "The request timed out. Please try again.");
      } else {
        Alert.alert("Error", e?.message || String(e));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.screen} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]} 
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        <View style={[styles.iconCircleLarge, { alignSelf: "center", marginBottom: 24, marginTop: 24 }]}>
          <IconSymbol name="envelope.badge.person.crop" size={48} color={colors.tint} />
        </View>
        
        <Text style={[typography.title1, { textAlign: "center", marginBottom: 8 }]}>Welcome</Text>
        <Text style={[typography.callout, { color: colors.icon, textAlign: "center", marginBottom: 32 }]}>
          Enter your email to get started{"\n"}
          <Text style={{ fontSize: 14, color: colors.icon }}>
            Use the same email you used when ordering
          </Text>
        </Text>

        <View style={{ gap: 20 }}>
          <View style={{ gap: 8 }}>
            <Text style={typography.subheadMedium}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.icon}
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={typography.subheadMedium}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.icon}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
          </View>

          <Pressable 
            style={[styles.buttonPrimary, loading && styles.buttonDisabled, { marginTop: 12 }]} 
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={typography.buttonText}>Continue</Text>
                <IconSymbol name="arrow.right" size={18} color="#fff" />
              </>
            )}
          </Pressable>
        </View>

        <Text style={[typography.caption, { color: colors.icon, textAlign: "center", marginTop: 24, lineHeight: 20 }]}>
          By continuing, you agree to our{" "}
          <Link href="/legal/terms" asChild>
            <Text style={{ color: colors.tint, textDecorationLine: "underline" }}>Terms & Conditions</Text>
          </Link>
          {" "}and{" "}
          <Link href="/legal/privacy" asChild>
            <Text style={{ color: colors.tint, textDecorationLine: "underline" }}>Privacy Policy</Text>
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
