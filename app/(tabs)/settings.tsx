import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Alert, Linking, ActivityIndicator } from "react-native";
import { getApiBase, checkAndRefreshApiKey, getPaymentFailures } from "../../lib/api";
import { getCredentials, clearCredentials, getCustomerId, getApiKey } from "../../lib/storage";
import { useRouter, useFocusEffect } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";
import Constants from "expo-constants";
import { getActiveSubscription, getBillingPortalUrl } from "@/lib/subscription";
import { WiFiDetection } from "@/lib/wifi-detection";
import { VoIPNotifications } from "@/lib/voip-notifications";
import { CallBridgeService } from "@/lib/call-bridge-service";
import NetInfo from '@react-native-community/netinfo';

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

interface ApiKeyStatus {
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
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
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [paymentFailures, setPaymentFailures] = useState<any[]>([]);
  const [homeWiFiConfigured, setHomeWiFiConfigured] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<string>('');
  const [callBridgeStatus, setCallBridgeStatus] = useState<any>(null);

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
        
        // Check API key expiration
        await checkApiKeyExpiration(creds.customerId);
        
        // Check payment failures
        const failures = await getPaymentFailures(creds.customerId);
        setPaymentFailures(failures);
      } else {
        setCustomerId(null);
        setDevice(null);
        setSubscriptionId(null);
        setPaymentFailures([]);
      }
    } catch (e) {
      console.log("[Settings] Error loading data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check API key expiration status
  const checkApiKeyExpiration = async (custId: string) => {
    try {
      const res = await fetch(`${getApiBase()}/api/customers/${custId}`, {
        headers: {
          'x-api-key': await getApiKey() || '',
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        const apiKey = data.customer?.apiKey;
        const apiKeyExpiration = data.customer?.apiKeyExpiration;
        
        if (apiKeyExpiration) {
          const expiresAt = new Date(apiKeyExpiration);
          const now = new Date();
          const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
          
          setApiKeyStatus({
            expiresAt: apiKeyExpiration,
            daysUntilExpiry,
            isExpiringSoon,
          });
        } else {
          setApiKeyStatus(null);
        }
      }
    } catch (e) {
      console.log("[Settings] Error checking API key expiration:", e);
      setApiKeyStatus(null);
    }
  };

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
      checkCallBridgeStatus();
    }, [loadData])
  );

  // Check call bridge configuration status
  const checkCallBridgeStatus = async () => {
    const homeSSID = await WiFiDetection.getHomeNetwork();
    console.log('[checkCallBridgeStatus] homeSSID:', homeSSID, 'configured:', !!homeSSID);
    setHomeWiFiConfigured(!!homeSSID);
    
    const netInfo = await NetInfo.fetch();
    if (netInfo.type === 'wifi' && (netInfo.details as any)?.ssid) {
      setCurrentNetwork((netInfo.details as any).ssid);
    }

    const status = await CallBridgeService.getStatus();
    setCallBridgeStatus(status);
  };

  const configureHomeWiFi = async () => {
    console.log('[configureHomeWiFi] Starting...');
    try {
      const network = await WiFiDetection.detectAndSaveHomeNetwork();
      console.log('[configureHomeWiFi] Saved network:', network);
      
      if (network) {
        // Ensure save completes and cache is set
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Double-check the value was saved by reading it back
        const savedSSID = await WiFiDetection.getHomeNetwork();
        console.log('[configureHomeWiFi] Verified saved SSID:', savedSSID);
        
        // Force update the state AFTER verification
        const isConfigured = !!savedSSID;
        console.log('[configureHomeWiFi] Setting homeWiFiConfigured to:', isConfigured);
        setHomeWiFiConfigured(isConfigured);
        if (network.ssid) {
          setCurrentNetwork(network.ssid);
        }
        
        // Also update the call bridge status
        const status = await CallBridgeService.getStatus();
        console.log('[configureHomeWiFi] Call bridge status:', status);
        setCallBridgeStatus(status);
        
        Alert.alert(
          'Home Network Configured',
          `Your home WiFi "${network.ssid || 'Unknown'}" has been saved. Your analog phone will now ring when you receive calls at home.\n\nDebug: savedSSID=${savedSSID}, configured=${isConfigured}`
        );
      } else {
        Alert.alert(
          'Not on WiFi',
          'Please connect to your home WiFi network first, then try again.'
        );
      }
    } catch (error) {
      console.error('[configureHomeWiFi] Error:', error);
      Alert.alert(
        'Error',
        `Failed to configure WiFi: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const enableCallBridging = async () => {
    try {
      console.log('[enableCallBridging] Starting...');
      // Register for push notifications
      const token = await VoIPNotifications.register();
      console.log('[enableCallBridging] Token received:', token ? 'YES' : 'NO');
      
      if (token) {
        await checkCallBridgeStatus();
        Alert.alert(
          'Call Bridging Enabled',
          `Your analog phone will now ring when you receive calls at home!\n\nDebug: token=${token.substring(0, 20)}...`
        );
      } else {
        console.log('[enableCallBridging] No token - permissions denied or failed');
        Alert.alert(
          'Setup Required',
          'Please enable notifications in your iPhone settings to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } catch (error) {
      console.error('[enableCallBridging] Error:', error);
      Alert.alert(
        'Error',
        `Failed to enable call bridging: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

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

  async function openBillingPortal() {
    if (!customerId) return;
    
    try {
      const returnUrl = "analogphone://settings"; // Deep link back to settings
      const url = await getBillingPortalUrl(customerId, returnUrl);
      
      if (url) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Could not generate billing portal URL. Please try again.");
      }
    } catch (e: any) {
      console.error("Error opening billing portal:", e);
      Alert.alert("Error", e.message || "Could not open billing portal. Please try again.");
    }
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
            onPress={openBillingPortal}
          >
            <Text style={[typography.subheadMedium, { color: '#FFFFFF' }]}>Update Payment Method</Text>
          </Pressable>
        </View>
      )}

      {/* Payment Failure Warning Banner */}
      {paymentFailures.length > 0 && (
        <View style={{
          backgroundColor: colors.error + '20',
          borderLeftWidth: 4,
          borderLeftColor: colors.error,
          padding: 16,
          borderRadius: 8,
          marginTop: 8,
          marginBottom: 8,
        }}>
          <View style={styles.row}>
            <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.error} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.subheadMedium, { color: colors.error, marginBottom: 4 }]}>
                Payment Failed
              </Text>
              {paymentFailures.map((failure, index) => {
                const gracePeriodEnds = new Date(failure.grace_period_ends);
                const daysRemaining = Math.ceil((gracePeriodEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <Text key={index} style={[typography.footnote, { color: colors.text, marginTop: index > 0 ? 8 : 0 }]}>
                    {failure.attempt_count > 1 ? `${failure.attempt_count} payment attempts failed. ` : 'Your payment failed. '}
                    {daysRemaining > 0 
                      ? `Update your payment method within ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} to avoid service interruption.`
                      : 'Your service may be suspended. Update payment method immediately.'}
                  </Text>
                );
              })}
            </View>
          </View>
          <Pressable 
            style={[styles.buttonSecondary, { marginTop: 12, backgroundColor: colors.error }]}
            onPress={openBillingPortal}
          >
            <Text style={[typography.subheadMedium, { color: '#FFFFFF' }]}>Update Payment Method</Text>
          </Pressable>
        </View>
      )}

      {/* Session Expiration Warning Banner */}
      {apiKeyStatus?.isExpiringSoon && apiKeyStatus.daysUntilExpiry !== null && (
        <View style={{
          backgroundColor: colors.warning + '20',
          borderLeftWidth: 4,
          borderLeftColor: colors.warning,
          padding: 16,
          borderRadius: 8,
          marginTop: subscriptionStatus && (subscriptionStatus.status === 'past_due' || subscriptionStatus.status === 'unpaid') ? 8 : 24,
          marginBottom: 8,
        }}>
          <View style={styles.row}>
            <IconSymbol name="clock.badge.exclamationmark.fill" size={24} color={colors.warning} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.subheadMedium, { color: colors.warning, marginBottom: 4 }]}>
                Session Expiring Soon
              </Text>
              <Text style={[typography.footnote, { color: colors.text }]}>
                Your session will expire in {apiKeyStatus.daysUntilExpiry} {apiKeyStatus.daysUntilExpiry === 1 ? 'day' : 'days'}. 
                {apiKeyStatus.daysUntilExpiry <= 1 ? ' Refresh now to stay signed in.' : ' Open the app to refresh automatically.'}
              </Text>
            </View>
          </View>
          <Pressable 
            style={[styles.buttonSecondary, { marginTop: 12, backgroundColor: colors.warning }]}
            onPress={async () => {
              const success = await checkAndRefreshApiKey();
              if (success) {
                Alert.alert("Session Refreshed", "Your session has been extended for another 90 days.");
                if (customerId) {
                  await checkApiKeyExpiration(customerId);
                }
              } else {
                Alert.alert("Refresh Failed", "Could not refresh your session. Please try signing out and back in.");
              }
            }}
          >
            <Text style={[typography.subheadMedium, { color: '#FFFFFF' }]}>Refresh Session Now</Text>
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

      {/* Call Bridging Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <Text style={typography.sectionHeader}>Call Bridging</Text>
        </View>
        <Text style={[typography.footnote, { color: colors.icon, marginBottom: 12 }]}>
          Ring your analog phone when you receive calls at home
        </Text>
        <View style={styles.card}>
          {!homeWiFiConfigured ? (
            <>
              <View style={{ paddingVertical: 8 }}>
                <Text style={[typography.callout, { marginBottom: 8 }]}>
                  Setup Required
                </Text>
                <Text style={[typography.footnote, { color: colors.icon, marginBottom: 12 }]}>
                  Connect to your home WiFi network, then tap the button below to configure call bridging.
                </Text>
                <Pressable 
                  style={[styles.buttonPrimary, { backgroundColor: colors.tint }]}
                  onPress={configureHomeWiFi}
                >
                  <IconSymbol name="wifi" size={20} color="#FFFFFF" />
                  <Text style={[typography.subheadMedium, { color: '#FFFFFF', marginLeft: 8 }]}>
                    Configure Home WiFi
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={{ paddingVertical: 8 }}>
                <View style={[styles.row, { marginBottom: 12 }]}>
                  <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
                  <Text style={[typography.callout, { marginLeft: 8, color: colors.success }]}>
                    Home WiFi Configured
                  </Text>
                </View>
                {currentNetwork && (
                  <Text style={[typography.footnote, { color: colors.icon, marginBottom: 8 }]}>
                    Network: {currentNetwork}
                  </Text>
                )}
                {callBridgeStatus && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[typography.footnote, { color: colors.icon }]}>
                      Status: {callBridgeStatus.onHomeNetwork ? '✓ On home network' : '○ Away from home'}
                    </Text>
                    <Text style={[typography.footnote, { color: colors.icon }]}>
                      Notifications: {callBridgeStatus.pushNotificationsEnabled ? '✓ Enabled' : '○ Not enabled'}
                    </Text>
                  </View>
                )}
                {!callBridgeStatus?.pushNotificationsEnabled && (
                  <Pressable 
                    style={[styles.buttonPrimary, { backgroundColor: colors.tint }]}
                    onPress={enableCallBridging}
                  >
                    <IconSymbol name="bell.badge" size={20} color="#FFFFFF" />
                    <Text style={[typography.subheadMedium, { color: '#FFFFFF', marginLeft: 8 }]}>
                      Enable Call Bridging
                    </Text>
                  </Pressable>
                )}
                {callBridgeStatus?.pushNotificationsEnabled && (
                  <View>
                    <View style={[styles.row, { backgroundColor: colors.success + '20', padding: 12, borderRadius: 8, marginBottom: 12 }]}>
                      <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
                      <Text style={[typography.subheadMedium, { marginLeft: 8, color: colors.success }]}>
                        Call Bridging Active
                      </Text>
                    </View>
                    <Pressable 
                      style={[styles.row, { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.icon + '30' }]}
                      onPress={async () => {
                        Alert.alert(
                          'Disable Notifications',
                          'You can re-enable call bridging notifications at any time from Settings.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'Disable', 
                              style: 'destructive',
                              onPress: async () => {
                                // Note: iOS doesn't allow programmatically disabling notifications
                                // User needs to do this in iOS Settings
                                Alert.alert(
                                  'Manage Notifications',
                                  'To disable push notifications, please go to:\n\niPhone Settings → Analog Phone → Notifications\n\nand turn off Allow Notifications.',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    { 
                                      text: 'Open Settings',
                                      onPress: () => Linking.openSettings()
                                    }
                                  ]
                                );
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <IconSymbol name="bell.slash" size={20} color={colors.icon} />
                      <Text style={[typography.callout, { marginLeft: 12, color: colors.icon }]}>
                        Disable Notifications
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
              <View style={styles.divider} />
              <Pressable 
                style={[styles.row, { paddingVertical: 8 }]} 
                onPress={async () => {
                  Alert.alert(
                    'Reset Home WiFi',
                    'This will clear your home WiFi configuration. You\'ll need to set it up again.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Reset', 
                        style: 'destructive',
                        onPress: async () => {
                          await WiFiDetection.clearHomeNetwork();
                          await checkCallBridgeStatus();
                        }
                      }
                    ]
                  );
                }}
              >
                <IconSymbol name="arrow.counterclockwise" size={20} color={colors.icon} />
                <Text style={[typography.callout, { marginLeft: 12, color: colors.icon }]}>
                  Reset Configuration
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <Text style={typography.sectionHeader}>Actions</Text>
        </View>
        <View style={styles.card}>
          {customerId && (
            <Pressable style={[styles.row, { paddingVertical: 8 }]} onPress={handleSignOut}>
              <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={colors.error} />
              <Text style={[typography.callout, { marginLeft: 12, color: colors.error }]}>Sign Out</Text>
            </Pressable>
          )}
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
                  
                  {/* Manage Billing Button */}
                  <Pressable 
                    style={[styles.buttonSecondary, { marginTop: 16 }]}
                    onPress={openBillingPortal}
                  >
                    <IconSymbol name="creditcard" size={18} color={colors.tint} style={{ marginRight: 8 }} />
                    <Text style={[typography.subheadMedium, { color: colors.tint }]}>Manage Billing</Text>
                  </Pressable>
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
