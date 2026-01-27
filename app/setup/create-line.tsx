import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Alert,
} from "react-native";
import { getApiBase } from "../../lib/api";

function makeCustomerId() {
  return `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 10000)}`;
}

export default function CreateLine() {
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
      Alert.alert("Created", `Device created for customer ${customerId}`);
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
        placeholder="sip username"
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

      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Create account" onPress={handleCreate} />
      )}
    </View>
  );
}

