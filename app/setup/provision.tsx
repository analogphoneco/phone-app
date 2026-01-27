import React, { useEffect, useState } from "react";
import { View, Text, Button, Alert, Linking } from "react-native";
import { getApiBase } from "../../lib/api";
import { getCredentials } from "../../lib/storage";
import { useRouter } from 'expo-router';

export default function Provision() {
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const creds = await getCredentials();
      setCustomerId(creds?.customerId ?? null);
    })();
  }, []);

  const router = useRouter();

  function openProvision() {
    if (!customerId) return Alert.alert("No account", "Create an account first.");
    const url = `${getApiBase()}/provision/ht802/${encodeURIComponent(customerId)}.xml`;
    Linking.openURL(url).catch((e) => Alert.alert("Error", String(e)));
  }

  // fetch assigned phone number if present
  const [assigned, setAssigned] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      if (!customerId) return;
      try {
        const res = await fetch(`${getApiBase()}/api/devices/${encodeURIComponent(customerId)}`);
        const json = await res.json();
        if (res.ok && json?.device?.phone_number) setAssigned(json.device.phone_number);
      } catch (e) {
        // ignore
      }
    })();
  }, [customerId]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, marginBottom: 12 }}>Provision device</Text>
      {!customerId ? (
        <Text style={{ color: "#666" }}>Please create an account first.</Text>
      ) : (
        <>
          {assigned && (
            <Text style={{ marginBottom: 8, fontSize: 16 }}>Assigned number: {assigned}</Text>
          )}
          <Text style={{ marginBottom: 12 }}>Provisioning URL:</Text>
          <Text style={{ color: "#333", marginBottom: 12 }}>{`${getApiBase()}/provision/ht802/${customerId}.xml`}</Text>
          <Button title="Open provisioning URL" onPress={openProvision} />
          <View style={{ height: 12 }} />
          <Button title="Next" onPress={() => router.push({ pathname: "/setup/status" } as any)} />
        </>
      )}
    </View>
  );
}
