import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Button, ActivityIndicator, Alert } from "react-native";
import { getApiBase } from "../../lib/api";
import { getCredentials } from "../../lib/storage";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function PickNumber() {
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const router = useRouter();
  // read search params to decide whether to show a just-created banner and to
  // accept a fallback customerId when secure storage isn't available.
  const params = useLocalSearchParams();
  const justCreated = String(params?.justCreated) === "1";

  useEffect(() => {
    (async () => {
      const creds = await getCredentials();
      // allow fallback to customerId passed via search params (router navigation)
      const paramCustomer = String(params?.customerId || "") || null;
      const resolvedCustomer = creds?.customerId ?? paramCustomer;
      setCustomerId(resolvedCustomer ?? null);
      if (!creds && !paramCustomer) return; // nothing to fetch against
      setLoading(true);
      try {
        const res = await fetch(`${getApiBase()}/api/telnyx/numbers?country=US&limit=20`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || JSON.stringify(data));
        setNumbers(Array.isArray(data.results) ? data.results : []);
      } catch (e: any) {
        Alert.alert("Error", e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  

  async function handlePurchase(number: string) {
    if (!customerId) return Alert.alert("No account", "Please create an account first.");
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/telnyx/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: number, customerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || JSON.stringify(data));
      Alert.alert("Success", `Number ${number} purchased/claimed.`);
      // navigate to provisioning step so user can finish setup
      try {
        const router = useRouter();
        router.push("/setup/provision");
      } catch (e) {
        // ignore
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, marginBottom: 12 }}>Pick a number</Text>
      {justCreated && (
        <View style={{ padding: 10, backgroundColor: "#e6ffed", borderRadius: 8, marginBottom: 12 }}>
          <Text style={{ color: "#027a2a" }}>Account created — you can now pick a number.</Text>
        </View>
      )}
      {!customerId && <Text style={{ color: "#666" }}>Please create an account first.</Text>}

      {loading ? (
        <ActivityIndicator />
      ) : numbers.length > 0 ? (
        <FlatList
          data={numbers}
          keyExtractor={(i) => String(i?.id ?? i?.phone_number ?? Math.random())}
          renderItem={({ item }) => (
            <View style={{ padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 16 }}>{item?.phone_number || item?.phone_number_e164 || JSON.stringify(item)}</Text>
              <Button title="Purchase" onPress={() => handlePurchase(item?.phone_number || item?.phone_number_e164)} />
            </View>
          )}
        />
      ) : (
        <View style={{ padding: 12 }}>
          <Text style={{ color: "#666", marginBottom: 8 }}>No numbers available right now.</Text>
          <Button title="Retry" onPress={() => {
            // simple retry: re-run effect by toggling loading and fetching again
            (async () => {
              setLoading(true);
              try {
                const res = await fetch(`${getApiBase()}/api/telnyx/numbers?country=US&limit=20`);
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || JSON.stringify(data));
                setNumbers(Array.isArray(data.results) ? data.results : []);
              } catch (e: any) {
                Alert.alert("Error", e?.message || String(e));
              } finally {
                setLoading(false);
              }
            })();
          }} />
        </View>
      )}
    </View>
  );
}
