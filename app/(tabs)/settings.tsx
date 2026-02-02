import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Alert, Linking, ActivityIndicator } from "react-native";
import { getApiBase } from "../../lib/api";
import { getCredentials, clearCredentials } from "../../lib/storage";
import { useRouter, useFocusEffect } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";
import Constants from "expo-constants";
import { getActiveSubscription } from "@/lib/subscription";

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

interface SubscriptionStatus {
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const { colors, typography, styles } = useAppStyles(colorScheme);
  const router = useRouter();
  
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [usageExpanded, setUsageExpanded] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  const loadData = useCallback(async () => {
    try {
      const creds = await getCredentials();
      console.log("[Settings] getCredentials returned:", JSON.stringify(creds));
      if (creds?.customerId) {
        setCustomerId(creds.customerId);
        const res = await fetch(`${getApiBase()}/api/devices/${encodeURIComponent(creds.customerId)}`);
        console.log("[Settings] Device fetch status:", res.status);
        if (res.ok) {
          const data = await res.json();
          console.log("[Settings] Device data:", JSON.stringify(data));
          setDevice(data.device || null);
        } else {
          setDevice(null);
        }
        
        // Get subscription for usage stats
        try {
          const sub = await getActiveSubscription(creds.customerId);
          setSubscriptionId(sub?.id || null);
          if (sub) {
            setSubscriptionStatus({
              status: sub.status || 'unknown',
              currentPeriodEnd: sub.current_period_end || undefined,
              cancelAtPeriodEnd: sub.cancel_at_period_end || false,
            });
          } else {
            setSubscriptionStatus(null);
          }
        } catch {
          setSubscriptionId(null);
          setSubscriptionStatus(null);
        }
      } else {
        setCustomerId(null);
        setDevice(null);
        setSubscriptionId(null);
      }
    } catch (e) {
      console.log("[Settings] Error loading data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load usage stats when expanded
  const loadUsageStats = useCallback(async () => {
    if (!subscriptionId) return;
    setUsageLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/subscriptions/${subscriptionId}/usage`);
      if (res.ok) {
        const data = await res.json();
        setUsageStats(data.usage);
      }
    } catch (e) {
      console.log("[Settings] Error loading usage:", e);
    } finally {
      setUsageLoading(false);
    }
  }, [subscriptionId]);

  const toggleUsage = useCallback(() => {
    const newExpanded = !usageExpanded;
    setUsageExpanded(newExpanded);
    if (newExpanded && !usageStats) {
      loadUsageStats();
    }
  }, [usageExpanded, usageStats, loadUsageStats]);

  // Load data on mount and when tab is focused
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await clearCredentials();
          setCustomerId(null);
          setDevice(null);
          router.replace("/");
        },
      },
    ]);
  }

  async function handleResetForTesting() {
    Alert.alert(
      "Reset App", 
      "This will clear all local data and let you test the signup flow again. Continue?", 
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await clearCredentials();
            setCustomerId(null);
            setDevice(null);
            setSubscriptionId(null);
            setUsageStats(null);
            router.replace("/setup");
          },
        },
      ]
    );
  }

  function openProvisioningUrl() {
    if (!customerId) return;
    const url = `${getApiBase()}/provision/ht802/${encodeURIComponent(customerId)}.xml`;
    Linking.openURL(url).catch((e) => Alert.alert("Error", String(e)));
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <Text style={typography.largeTitle}>Settings</Text>

      {/* Payment Warning Banner */}
      {subscriptionStatus && (subscriptionStatus.status === 'past_due' || subscriptionStatus.status === 'unpaid') && (
        <View style={{
          backgroundColor: colors.error + '20',
          borderLeftWidth: 4,
          borderLeftColor: colors.error,
          padding: 16,
          borderRadius: 8,
          marginTop: 24,
          marginBottom: 8,
        }}>
          <View style={styles.row}>
            <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.error} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.subheadMedium, { color: colors.error, marginBottom: 4 }]}>
                Payment Issue
              </Text>
              <Text style={[typography.footnote, { color: colors.text }]}>
                There was a problem with your last payment. Please update your payment method to continue service.
              </Text>
            </View>
          </View>
          <Pressable 
            style={[styles.buttonSecondary, { marginTop: 12, backgroundColor: colors.error }]}
            onPress={() => {
              // TODO: Open Stripe billing portal
              Alert.alert("Update Payment", "Payment update feature coming soon. Please contact support.");
            }}
          >
            <Text style={[typography.subheadMedium, { color: '#FFFFFF' }]}>Update Payment Method</Text>
          </Pressable>
        </View>
      )}

      {/* Account Section */}
      <View style={[styles.section, { marginTop: 24 }]}>
        <View style={styles.sectionTitleContainer}>
          <Text style={typography.sectionHeader}>Account</Text>
        </View>
        {loading ? (
          <View style={styles.card}>
            <Text style={[typography.callout, { color: colors.icon, textAlign: "center" }]}>Loading...</Text>
          </View>
        ) : customerId && device ? (
          <View style={styles.card}>
            <View style={styles.row}>
              <IconSymbol name="person.fill" size={20} color={colors.icon} />
              <Text style={[typography.callout, { marginLeft: 12, flex: 1 }]}>Username</Text>
              <Text style={[typography.callout, { color: colors.icon }]}>{device.user_name || "—"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <IconSymbol name="phone.fill" size={20} color={colors.icon} />
              <Text style={[typography.callout, { marginLeft: 12, flex: 1 }]}>Phone Number</Text>
              <Text style={[typography.callout, { color: colors.icon }]}>{device.phone_number || "—"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <IconSymbol name="number" size={20} color={colors.icon} />
              <Text style={[typography.callout, { marginLeft: 12, flex: 1 }]}>Account ID</Text>
              <Text style={[typography.mono, { color: colors.icon }]}>{customerId.slice(0, 16)}...</Text>
            </View>
          </View>
        ) : customerId ? (
          <View style={styles.card}>
            <View style={styles.row}>
              <IconSymbol name="number" size={20} color={colors.icon} />
              <Text style={[typography.callout, { marginLeft: 12, flex: 1 }]}>Account ID</Text>
              <Text style={[typography.mono, { color: colors.icon }]}>{customerId.slice(0, 16)}...</Text>
            </View>
            <View style={styles.divider} />
            <Text style={[typography.footnote, { color: colors.icon, marginTop: 8 }]}>
              No phone connected yet. Complete setup to add a phone number.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={[typography.callout, { color: colors.icon, textAlign: "center", marginBottom: 16 }]}>
              No account configured
            </Text>
            <Pressable style={styles.buttonPrimary} onPress={() => router.push("/setup")}>
              <Text style={typography.buttonText}>Set Up Account</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Device Setup Section */}
      {customerId && (
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Text style={typography.sectionHeader}>Phone Setup</Text>
          </View>
          <View style={styles.card}>
            <Text style={[typography.footnote, { marginBottom: 12, lineHeight: 20 }]}>
              Use this link to connect your phone device automatically.
            </Text>
            <Pressable style={styles.buttonSecondary} onPress={openProvisioningUrl}>
              <IconSymbol name="link" size={18} color={colors.tint} />
              <Text style={[typography.subheadMedium, { color: colors.tint }]}>Open Setup Link</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Actions Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <Text style={typography.sectionHeader}>Actions</Text>
        </View>
        <View style={styles.card}>
          <Pressable style={[styles.row, { paddingVertical: 8 }]} onPress={loadData}>
            <IconSymbol name="arrow.clockwise" size={20} color={colors.tint} />
            <Text style={[typography.callout, { marginLeft: 12, color: colors.tint }]}>Refresh Data</Text>
          </Pressable>
          {customerId && (
            <>
              <View style={styles.divider} />
              <Pressable style={[styles.row, { paddingVertical: 8 }]} onPress={handleSignOut}>
                <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={colors.error} />
                <Text style={[typography.callout, { marginLeft: 12, color: colors.error }]}>Sign Out</Text>
              </Pressable>
            </>
          )}
          <View style={styles.divider} />
          <Pressable style={[styles.row, { paddingVertical: 8 }]} onPress={handleResetForTesting}>
            <IconSymbol name="arrow.counterclockwise" size={20} color={colors.icon} />
            <Text style={[typography.callout, { marginLeft: 12, color: colors.icon }]}>Reset for Testing</Text>
          </Pressable>
        </View>
      </View>

      {/* Usage & Billing Section - collapsible, subtle */}
      {subscriptionId && (
        <View style={styles.section}>
          <Pressable onPress={toggleUsage}>
            <View style={[styles.row, { paddingVertical: 4 }]}>
              <Text style={[typography.sectionHeader, { flex: 1 }]}>Usage & Billing</Text>
              <IconSymbol 
                name={usageExpanded ? "chevron.up" : "chevron.down"} 
                size={16} 
                color={colors.icon} 
              />
            </View>
          </Pressable>
          
          {usageExpanded && (
            <View style={[styles.card, { marginTop: 8 }]}>
              {usageLoading ? (
                <ActivityIndicator size="small" color={colors.icon} />
              ) : usageStats ? (
                <>
                  <View style={styles.row}>
                    <Text style={[typography.footnote, { flex: 1, color: colors.icon }]}>Minutes this month</Text>
                    <Text style={[typography.footnote, { color: colors.icon }]}>
                      {usageStats.monthlyMinutes.used.toLocaleString()} / {usageStats.monthlyMinutes.limit.toLocaleString()}
                    </Text>
                  </View>
                  <View style={{ 
                    height: 4, 
                    backgroundColor: colors.icon + '30', 
                    borderRadius: 2, 
                    marginTop: 6,
                    marginBottom: 12,
                    overflow: 'hidden'
                  }}>
                    <View style={{ 
                      height: '100%', 
                      width: `${Math.min(usageStats.monthlyMinutes.percent, 100)}%`,
                      backgroundColor: usageStats.monthlyMinutes.percent > 80 ? colors.warning : colors.tint,
                      borderRadius: 2,
                    }} />
                  </View>
                  
                  <View style={styles.row}>
                    <Text style={[typography.footnote, { flex: 1, color: colors.icon }]}>Calls this month</Text>
                    <Text style={[typography.footnote, { color: colors.icon }]}>
                      {usageStats.monthlyCalls.used} / {usageStats.monthlyCalls.limit}
                    </Text>
                  </View>
                  <View style={{ 
                    height: 4, 
                    backgroundColor: colors.icon + '30', 
                    borderRadius: 2, 
                    marginTop: 6,
                    overflow: 'hidden'
                  }}>
                    <View style={{ 
                      height: '100%', 
                      width: `${Math.min(usageStats.monthlyCalls.percent, 100)}%`,
                      backgroundColor: usageStats.monthlyCalls.percent > 80 ? colors.warning : colors.tint,
                      borderRadius: 2,
                    }} />
                  </View>
                  
                  <View style={styles.divider} />
                  
                  <View style={[styles.row, { marginTop: 12 }]}>
                    <Text style={[typography.footnote, { flex: 1, color: colors.icon }]}>Subscription</Text>
                    <Text style={[typography.footnote, { color: colors.icon }]}>
                      $4.99/month
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[typography.footnote, { flex: 1, color: colors.icon }]}>Phone Number</Text>
                    <Text style={[typography.footnote, { color: colors.icon }]}>
                      $1.50/month
                    </Text>
                  </View>
                  <View style={[styles.row, { marginTop: 4 }]}>
                    <Text style={[typography.callout, { flex: 1, fontWeight: '600' }]}>Total</Text>
                    <Text style={[typography.callout, { fontWeight: '600' }]}>
                      $6.49/month
                    </Text>
                  </View>
                  
                  <Text style={[typography.caption, { color: colors.icon, marginTop: 12, textAlign: 'center' }]}>
                    Usage resets at the start of each billing period
                  </Text>
                </>
              ) : (
                <Text style={[typography.footnote, { color: colors.icon, textAlign: 'center' }]}>
                  Unable to load usage data
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* About Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <Text style={typography.sectionHeader}>About</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={[typography.callout, { flex: 1 }]}>Version</Text>
            <Text style={[typography.callout, { color: colors.icon }]}>
              {Constants.expoConfig?.version || "1.0.0"}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={[typography.callout, { flex: 1 }]}>API Server</Text>
            <Text style={[typography.mono, { color: colors.icon }]}>{getApiBase()}</Text>
          </View>
        </View>
      </View>

      {/* Legal Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <Text style={typography.sectionHeader}>Legal</Text>
        </View>
        <View style={styles.card}>
          <Pressable style={[styles.row, { paddingVertical: 8 }]} onPress={() => router.push("/legal/terms")}>
            <IconSymbol name="doc.text" size={20} color={colors.icon} />
            <Text style={[typography.callout, { marginLeft: 12, flex: 1 }]}>Terms & Conditions</Text>
            <IconSymbol name="chevron.right" size={16} color={colors.icon} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={[styles.row, { paddingVertical: 8 }]} onPress={() => router.push("/legal/privacy")}>
            <IconSymbol name="hand.raised" size={20} color={colors.icon} />
            <Text style={[typography.callout, { marginLeft: 12, flex: 1 }]}>Privacy Policy</Text>
            <IconSymbol name="chevron.right" size={16} color={colors.icon} />
          </Pressable>
        </View>
      </View>

      {/* Account Actions */}
      {customerId && (
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [
              styles.buttonSecondary,
              { borderColor: "#FF3B30", marginBottom: 12 },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleSignOut}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="#FF3B30" />
            <Text style={[typography.buttonText, { color: "#FF3B30", marginLeft: 8 }]}>
              Logout
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
