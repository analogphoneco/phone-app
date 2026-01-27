import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Link } from "expo-router";
import { getApiBase } from "../../lib/api";

const API = getApiBase(); // picks host based on platform / expo config

export default function HomeScreen() {
  const [status, setStatus] = useState<string>("Loading...");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/health`);
        await res.json();
        setStatus("✅ Connected to backend");
      } catch (e: any) {
        setStatus(`❌ ${e?.message || "Failed to reach backend"}`);
      }
    })();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        gap: 16,
      }}
    >
      <Text style={{ fontSize: 20 }}>{status}</Text>
      <Text style={{ fontSize: 12, color: "#666" }}>{`API: ${API}`}</Text>

      {/* Step 4: Start setup */}
      <Link href="/setup" asChild>
        <Pressable
          style={{
            marginTop: 12,
            paddingVertical: 14,
            paddingHorizontal: 18,
            borderWidth: 1,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600" }}>
            Start phone setup
          </Text>
        </Pressable>
      </Link>

      {/* Dialpad removed from app */}
    </View>
  );
}
