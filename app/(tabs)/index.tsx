import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, RefreshControl, ScrollView, Alert } from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { getApiBase } from "../../lib/api";
import { getCredentials, clearCredentials } from "../../lib/storage";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";

interface DeviceInfo {
  user_name?: string;
  phone_number?: string;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { colors, typography, styles } = useAppStyles(colorScheme);
  const router = useRouter();
  
  const [backendStatus, setBackendStatus] = useState<"loading" | "connected" | "error">("loading");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasStaleCreds, setHasStaleCreds] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/health`);
      setBackendStatus(res.ok ? "connected" : "error");
    } catch {
      setBackendStatus("error");
    }

    try {
      const creds = await getCredentials();
      console.log("[Home] getCredentials returned:", JSON.stringify(creds));
      if (creds?.customerId) {
        setCustomerId(creds.customerId);
        setUserName(creds.userName || null);
        const url = `${getApiBase()}/api/devices/${encodeURIComponent(creds.customerId)}`;
        console.log("[Home] Fetching device from:", url);
        const res = await fetch(url);
        console.log("[Home] Device fetch status:", res.status);
        if (res.ok) {
          const data = await res.json();
          console.log("[Home] Device data:", JSON.stringify(data));
          setDevice(data.device || null);
          setHasStaleCreds(false);
        } else {
          console.log("[Home] Device fetch failed:", res.status);
          setDevice(null);
          // Mark as stale if we have creds but device not found
          setHasStaleCreds(true);
        }
      } else {
        console.log("[Home] No credentials found");
        setCustomerId(null);
        setUserName(null);
        setDevice(null);
        setHasStaleCreds(false);
      }
    } catch (e) {
      console.log("[Home] Error loading data:", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStartFresh = async () => {
    await clearCredentials();
    setCustomerId(null);
    setUserName(null);
    setDevice(null);
    setHasStaleCreds(false);
    router.push("/setup");
  };

  const isSetupComplete = customerId && device?.phone_number;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
    >
      <View style={[styles.rowSpaced, { marginBottom: 32 }]}>
        <Text style={typography.largeTitle}>Analog</Text>
        <View style={[styles.statusBadge, { 
          borderWidth: 1, 
          borderColor: backendStatus === "connected" ? colors.success + "30" : colors.error + "30",
        }]}>
          <View style={[
            styles.statusDot, 
            backendStatus === "connected" ? styles.statusDotSuccess : styles.statusDotError
          ]} />
          <Text style={[typography.caption, { fontWeight: "600" }]}>
            {backendStatus === "loading" ? "..." : backendStatus === "connected" ? "Online" : "Offline"}
          </Text>
        </View>
      </View>

      {isSetupComplete ? (
        <View style={[styles.cardLarge, styles.center, { marginBottom: 24 }]}>
          {/* Retro dial inspired design */}
          <View style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: colors.tint + "15",
            borderWidth: 3,
            borderColor: colors.tint + "30",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.surface,
              borderWidth: 2,
              borderColor: colors.tint + "20",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <IconSymbol name="phone.fill" size={36} color={colors.tint} />
            </View>
          </View>
          <Text style={[typography.title1, { letterSpacing: 2, marginBottom: 4 }]}>
            {device.phone_number}
          </Text>
          <Text style={[typography.callout, { color: colors.icon, marginBottom: 16 }]}>
            {userName || "Your phone"}
          </Text>
          <View style={[styles.row, { 
            gap: 8, 
            backgroundColor: colors.success + "15",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }]}>
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.success,
            }} />
            <Text style={[typography.subheadMedium, { color: colors.success }]}>
              Ready
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.cardLarge, styles.center, { marginBottom: 24 }]}>
          {/* Not set up state */}
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: colors.icon + "10",
            borderWidth: 2,
            borderColor: colors.icon + "20",
            borderStyle: "dashed",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}>
            <IconSymbol name="phone.badge.plus" size={40} color={colors.icon} />
          </View>
          <Text style={[typography.title2, { marginBottom: 8 }]}>
            Get Started
          </Text>
          <Text style={[typography.callout, { color: colors.icon, textAlign: "center", marginBottom: 24, lineHeight: 22 }]}>
            Set up your Analog phone line to start making calls
          </Text>
          {hasStaleCreds ? (
            <Pressable style={styles.buttonPrimary} onPress={handleStartFresh}>
              <Text style={typography.buttonText}>Start Fresh</Text>
              <IconSymbol name="arrow.right" size={18} color="#fff" />
            </Pressable>
          ) : (
            <Link href="/setup" asChild>
              <Pressable style={styles.buttonPrimary}>
                <Text style={typography.buttonText}>Set Up Phone</Text>
                <IconSymbol name="arrow.right" size={18} color="#fff" />
              </Pressable>
            </Link>
          )}
        </View>
      )}

      {isSetupComplete && (
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Text style={typography.sectionHeader}>Quick Actions</Text>
          </View>
          <View style={[styles.row, { gap: 12 }]}>
            <Link href="/setup/provision" asChild>
              <Pressable style={[styles.card, styles.center, { flex: 1, paddingVertical: 20, gap: 10 }]}>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.accent + "20",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <IconSymbol name="antenna.radiowaves.left.and.right" size={22} color={colors.accent} />
                </View>
                <Text style={typography.subheadMedium}>Provision</Text>
              </Pressable>
            </Link>
            <Link href="/(tabs)/settings" asChild>
              <Pressable style={[styles.card, styles.center, { flex: 1, paddingVertical: 20, gap: 10 }]}>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.tint + "15",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <IconSymbol name="slider.horizontal.3" size={22} color={colors.tint} />
                </View>
                <Text style={typography.subheadMedium}>Settings</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      )}

      <View style={{ paddingTop: 16, paddingBottom: 8 }}>
        <Text style={[typography.footnote, { textAlign: "center", lineHeight: 20 }]}>
          {isSetupComplete
            ? "Pick up your phone to place a call"
            : "Get your own phone number in minutes"}
        </Text>
      </View>
    </ScrollView>
  );
}
