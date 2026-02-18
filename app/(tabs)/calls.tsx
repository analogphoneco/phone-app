import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";
import { getCustomerId, getApiKey } from "@/lib/storage";
import { getApiBase } from "@/lib/api";
import { useMissedCallBadge } from "@/lib/missed-call-badge-context";
import { 
  loadContactsCache, 
  getContactName, 
  hasContactsPermission,
  requestContactsPermission,
} from "@/lib/contacts";

interface CallRecord {
  id: string;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  status: "answered" | "missed" | "voicemail" | "busy" | "failed";
  duration_seconds: number;
  started_at: string;
  ended_at?: string;
  is_seen: number;
}

function formatPhoneNumber(num: string): string {
  const cleaned = num.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    const area = cleaned.slice(1, 4);
    const prefix = cleaned.slice(4, 7);
    const line = cleaned.slice(7);
    return `(${area}) ${prefix}-${line}`;
  }
  if (cleaned.length === 10) {
    const area = cleaned.slice(0, 3);
    const prefix = cleaned.slice(3, 6);
    const line = cleaned.slice(6);
    return `(${area}) ${prefix}-${line}`;
  }
  return num;
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CallsScreen() {
  const colorScheme = useColorScheme();
  const { colors, typography, styles } = useAppStyles(colorScheme);
  const { markAllSeen } = useMissedCallBadge();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  // Load contacts on mount
  useEffect(() => {
    (async () => {
      const hasPermission = await hasContactsPermission();
      if (hasPermission) {
        await loadContactsCache();
        setContactsLoaded(true);
      } else {
        const granted = await requestContactsPermission();
        if (granted) {
          await loadContactsCache();
          setContactsLoaded(true);
        }
      }
    })();
  }, []);

  const loadCalls = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      
      const cid = await getCustomerId();
      if (!cid) {
        setCustomerId(null);
        setCalls([]);
        return;
      }
      
      setCustomerId(cid);
      
      const apiKey = await getApiKey();
      const headers: HeadersInit = apiKey ? { "X-Api-Key": apiKey } : {};
      const res = await fetch(`${getApiBase()}/api/calls/${encodeURIComponent(cid)}`, { headers });
      
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      
      const data = await res.json();
      setCalls(data.calls || []);
    } catch (e) {
      console.log("[Calls] Error loading:", e);
      Alert.alert(
        "Unable to Load Calls",
        "Could not retrieve your call history. Please check your connection and try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCalls();
      // Mark all missed calls as seen when the tab is opened, clear badge
      markAllSeen();
    }, [loadCalls, markAllSeen])
  );

  const getCallIcon = (call: CallRecord) => {
    if (call.status === "missed") return "phone.down.fill";
    if (call.direction === "inbound") return "phone.arrow.down.left.fill";
    return "phone.arrow.up.right.fill";
  };

  const getCallColor = (call: CallRecord) => {
    if (call.status === "missed") return "#FF3B30";
    if (call.status === "voicemail") return colors.tint;
    return colors.text;
  };

  const getStatusLabel = (call: CallRecord) => {
    if (call.status === "missed") return "Missed";
    if (call.status === "voicemail") return "Voicemail";
    if (call.status === "busy") return "Busy";
    if (call.status === "failed") return "Failed";
    return "";
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[typography.callout, { color: colors.icon, marginTop: 16 }]}>
          Loading call history...
        </Text>
      </View>
    );
  }

  if (!customerId) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={typography.largeTitle}>Calls</Text>
          <View style={{ justifyContent: "center", alignItems: "center", marginTop: 60 }}>
            <IconSymbol name="phone.fill" size={64} color={colors.icon} />
            <Text style={[typography.title2, { marginTop: 16, textAlign: "center" }]}>
              No Account
            </Text>
            <Text style={[typography.callout, { color: colors.icon, marginTop: 8, textAlign: "center" }]}>
              Sign up to start making and receiving calls
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadCalls(true)}
          tintColor={colors.tint}
        />
      }
    >
      <Text style={typography.largeTitle}>Calls</Text>

      {calls.length === 0 ? (
        <View style={{ justifyContent: "center", alignItems: "center", marginTop: 60 }}>
          <IconSymbol name="phone.fill" size={64} color={colors.icon} />
          <Text style={[typography.title2, { marginTop: 16, textAlign: "center" }]}>
            No Call History
          </Text>
          <Text style={[typography.callout, { color: colors.icon, marginTop: 8, textAlign: "center" }]}>
            Your incoming and outgoing calls will appear here
          </Text>
        </View>
      ) : (
        <View style={[styles.section, { marginTop: 24 }]}>
          {calls.map((call, idx) => {
            const isInbound = call.direction === "inbound";
            const displayNumber = isInbound ? call.from_number : call.to_number;
            const callColor = getCallColor(call);
            const statusLabel = getStatusLabel(call);
            const contactName = getContactName(displayNumber);
            const displayName = contactName || formatPhoneNumber(displayNumber);
            const isUnseen = call.status === "missed" && !call.is_seen;

            return (
              <View key={call.id} style={{ backgroundColor: colors.surface }}>
                {idx > 0 && <View style={styles.divider} />}
                <Pressable
                  style={({ pressed }) => [
                    styles.row,
                    { paddingVertical: 12 },
                    pressed && { backgroundColor: colors.icon + "10" },
                    isUnseen && { backgroundColor: "#FF3B3010" },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    {/* Unseen dot */}
                    {isUnseen && (
                      <View style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: "#FF3B30", marginRight: 8,
                      }} />
                    )}
                    <IconSymbol
                      name={getCallIcon(call)}
                      size={24}
                      color={callColor}
                      style={{ marginRight: isUnseen ? 4 : 12 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        typography.subheadMedium,
                        { color: callColor },
                        isUnseen && { fontWeight: "700" },
                      ]}>
                        {displayName}
                      </Text>
                      {contactName && (
                        <Text style={[typography.footnote, { color: colors.icon, marginTop: 2 }]}>
                          {formatPhoneNumber(displayNumber)}
                        </Text>
                      )}
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                        <Text style={[typography.footnote, { color: colors.icon }]}>
                          {isInbound ? "Incoming" : "Outgoing"}
                        </Text>
                        {statusLabel && (
                          <>
                            <Text style={[typography.footnote, { color: colors.icon, marginHorizontal: 4 }]}>•</Text>
                            <Text style={[typography.footnote, { color: callColor, fontWeight: isUnseen ? "700" : "400" }]}>
                              {statusLabel}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[typography.footnote, { color: colors.icon }]}>
                        {formatRelativeTime(call.started_at)}
                      </Text>
                      <Text style={[typography.footnote, { color: colors.icon, marginTop: 2 }]}>
                        {formatDuration(call.duration_seconds)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
