import React, { useState } from "react";
import { View, Text, TextInput, Button, ActivityIndicator, Alert } from "react-native";
import { getApiBase } from "../../lib/api";
import { saveCredentials } from "../../lib/storage";
import { useRouter } from "expo-router";

function makeCustomerId() {
  return `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 10000)}`;
}

export default function CreateAccount() {
  const router = useRouter();
  const [customerId] = useState(makeCustomerId);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!userName || !password) return Alert.alert("Please enter user name and password");
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/devices/${encodeURIComponent(customerId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_name: userName, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || JSON.stringify(data));

      // persist credentials securely for later steps
      try {
        await saveCredentials({ customerId, userName });
      } catch (e: any) {
        // If saving fails, still succeed but warn developer
        console.warn("Failed to persist credentials:", e?.message || e);
      }

      // move user forward to the pick-number screen
      try {
        // pass a small flag so PickNumber can show a confirmation banner immediately
        // also pass the generated customerId so the next screen can proceed even if
        // secure storage failed to persist credentials (helps in simulators/providers)
        router.push({ pathname: "/setup/pick-number", params: { justCreated: "1", customerId } });
      } catch (e) {
        // fallback: show alert instructing user to proceed
        Alert.alert("Account created", "Your account was created. Next: pick a phone number.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, marginBottom: 12 }}>Create account</Text>

      <Text style={{ marginBottom: 6 }}>User name</Text>
      <TextInput
        value={userName}
        onChangeText={setUserName}
        placeholder="username"
        style={{ borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 12 }}
        autoCapitalize="none"
      />

      <Text style={{ marginBottom: 6 }}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="password"
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 12 }}
      />

      {loading ? <ActivityIndicator /> : <Button title="Create account" onPress={handleCreate} />}
    </View>
  );
}
