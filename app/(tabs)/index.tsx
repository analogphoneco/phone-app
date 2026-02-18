import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, RefreshControl, ScrollView, Alert } from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { getApiBase } from "../../lib/api";
import { getCredentials, clearCredentials, getApiKey } from "../../lib/storage";
import { getActiveSubscription } from "../../lib/subscription";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";

interface DeviceInfo {
  user_name?: string;
  phone_number?: string;
}

interface UsageStats {
  monthlyMinutes: { used: number; limit: number; percent: number };
  monthlyCalls: { used: number; limit: number; percent: number };
  activeCalls: number;
  hourlyCallsRemaining: number;
}

interface UsageAlert {
  id: number;
  alert_type: string;
  message: string;
  created_at: string;
  acknowledged: number;
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
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [usageAlerts, setUsageAlerts] = useState<UsageAlert[]>([]);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

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
        
        // Get API key for authenticated requests
        const apiKey = await getApiKey();
        const headers: HeadersInit = apiKey ? { "X-Api-Key": apiKey } : {};
        
        const res = await fetch(url, { headers });
        console.log("[Home] Device fetch status:", res.status);
        if (res.ok) {
          const data = await res.json();
          console.log("[Home] Device data:", JSON.stringify(data));
          setDevice(data.device || null);
          setHasStaleCreds(false);
          
          // Load usage stats for warnings
          loadUsageData(creds.customerId);
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

  const loadUsageData = async (custId: string) => {
    try {
      // Get active subscription
      const sub = await getActiveSubscription(custId);
      if (sub?.id) {
        setSubscriptionId(sub.id);
        
        // Get usage stats
        const res = await fetch(`${getApiBase()}/api/subscriptions/${sub.id}/usage`);
        if (res.ok) {
          const data = await res.json();
          setUsageStats(data.usage);
          setUsageAlerts(data.alerts || []);
        }
      }
    } catch (e) {
      console.log("[Home] Error loading usage data:", e);
    }
  };

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

      {/* Usage Warning Banner */}
      {usageStats && (usageStats.monthlyMinutes.percent >= 80 || usageStats.monthlyCalls.percent >= 80) && (
        <View style={{
          backgroundColor: colors.warning + '20',
          borderLeftWidth: 4,
          borderLeftColor: colors.warning,
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
        }}>
          <View style={styles.row}>
            <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.warning} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.subheadMedium, { color: colors.warning, marginBottom: 4 }]}>
                High Usage Alert
              </Text>
              {usageStats.monthlyMinutes.percent >= 80 && (
                <Text style={[typography.footnote, { color: colors.text, marginBottom: 4 }]}>
                  • {usageStats.monthlyMinutes.percent}% of monthly minutes used ({usageStats.monthlyMinutes.used} / {usageStats.monthlyMinutes.limit})
                </Text>
              )}
              {usageStats.monthlyCalls.percent >= 80 && (
                <Text style={[typography.footnote, { color: colors.text, marginBottom: 4 }]}>
                  • {usageStats.monthlyCalls.percent}% of monthly calls used ({usageStats.monthlyCalls.used} / {usageStats.monthlyCalls.limit})
                </Text>
              )}
              <Text style={[typography.caption, { color: colors.icon, marginTop: 4 }]}>
                Usage resets at the start of your next billing period
              </Text>
            </View>
          </View>
          <Pressable 
            style={[styles.buttonSecondary, { marginTop: 12, backgroundColor: colors.warning }]}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Text style={[typography.subheadMedium, { color: '#FFFFFF' }]}>View Details</Text>
          </Pressable>
        </View>
      )}

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
            {(() => {
              const cleaned = (device.phone_number || "").replace(/\D/g, "");
              const digits = cleaned.startsWith("1") ? cleaned.slice(1) : cleaned;
              if (digits.length === 10) {
                return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
              }
              return device.phone_number;
            })()}
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
            Sign in with your account or activate with a code
          </Text>
          <View style={{ gap: 12, width: '100%' }}>
            <Link href="/setup/create-account" asChild>
              <Pressable style={styles.buttonPrimary}>
                <Text style={typography.buttonText}>Log In</Text>
                <IconSymbol name="arrow.right" size={18} color="#fff" />
              </Pressable>
            </Link>
            <Pressable 
              style={styles.buttonSecondary}
              onPress={() => {
                // TODO: Link to Shopify store
                Alert.alert('Shop Hardware', 'Visit our online store to purchase hardware', [
                  { text: 'OK' }
                ]);
              }}
            >
              <Text style={[typography.buttonText, { color: colors.tint }]}>Buy Hardware</Text>
            </Pressable>
            <Link href="/setup/activate" asChild>
              <Pressable 
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                }}
              >
                <Text style={[typography.footnote, { color: colors.icon }]}>Have an activation code?</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      )}

      {isSetupComplete && (
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Text style={typography.sectionHeader}>Device Status</Text>
          </View>
          <View style={styles.card}>
            {/* Activation Status */}
            <View style={[styles.rowSpaced, { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.icon + "10" }]}>
              <View style={[styles.row, { gap: 12 }]}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.success + "15",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <IconSymbol name="checkmark.seal.fill" size={22} color={colors.success} />
                </View>
                <View>
                  <Text style={typography.bodyMedium}>Hardware Activated</Text>
                  <Text style={[typography.caption, { color: colors.icon }]}>
                    Device linked to account
                  </Text>
                </View>
              </View>
              <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
            </View>

            {/* Subscription Status */}
            {subscriptionId ? (
              <View style={[styles.rowSpaced, { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.icon + "10" }]}>
                <View style={[styles.row, { gap: 12 }]}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.success + "15",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <IconSymbol name="dollarsign.circle.fill" size={22} color={colors.success} />
                  </View>
                  <View>
                    <Text style={typography.bodyMedium}>Service Active</Text>
                    <Text style={[typography.caption, { color: colors.icon }]}>
                      Subscription is active
                    </Text>
                  </View>
                </View>
                <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
              </View>
            ) : (
              <View style={[styles.rowSpaced, { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.icon + "10" }]}>
                <View style={[styles.row, { gap: 12 }]}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.warning + "15",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <IconSymbol name="exclamationmark.circle.fill" size={22} color={colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={typography.bodyMedium}>No Active Subscription</Text>
                    <Text style={[typography.caption, { color: colors.icon }]}>
                      Subscribe to start making calls
                    </Text>
                  </View>
                </View>
                <Link href="/(tabs)/subscription" asChild>
                  <Pressable>
                    <IconSymbol name="arrow.right.circle.fill" size={24} color={colors.tint} />
                  </Pressable>
                </Link>
              </View>
            )}

            {/* SIP Credentials Status */}
            <View style={styles.row}>
              <View style={[styles.row, { gap: 12, flex: 1 }]}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.tint + "15",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <IconSymbol name="antenna.radiowaves.left.and.right" size={22} color={colors.tint} />
                </View>
                <View>
                  <Text style={typography.bodyMedium}>SIP Ready</Text>
                  <Text style={[typography.caption, { color: colors.icon }]}>
                    {device.user_name || "Credentials configured"}
                  </Text>
                </View>
              </View>
              <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
            </View>
          </View>
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
