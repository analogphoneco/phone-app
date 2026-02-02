import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";
import { getCustomerId } from "@/lib/storage";
import { showError } from "@/lib/errors";
import {
  listVoicemails,
  markVoicemailAsListened,
  deleteVoicemail,
  formatDuration,
  formatPhoneNumber,
  formatRelativeTime,
  type Voicemail,
} from "@/lib/voicemail";

export default function VoicemailScreen() {
  const colorScheme = useColorScheme();
  const { colors, typography, styles } = useAppStyles(colorScheme);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [voicemails, setVoicemails] = useState<Voicemail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadVoicemails = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      
      const cid = await getCustomerId();
      if (!cid) {
        setCustomerId(null);
        setVoicemails([]);
        return;
      }
      
      setCustomerId(cid);
      const { voicemails: vms } = await listVoicemails(cid);
      setVoicemails(vms);
    } catch (e) {
      console.log("[Voicemail] Error loading:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVoicemails();
    }, [loadVoicemails])
  );

  const handleDelete = (vm: Voicemail) => {
    Alert.alert("Delete Voicemail", "Are you sure you want to delete this voicemail?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteVoicemail(vm.id);
            setVoicemails((prev) => prev.filter((v) => v.id !== vm.id));
          } catch (e: unknown) {
            const error = showError(e);
            Alert.alert(error.title, error.message, error.buttons);
          }
        },
      },
    ]);
  };

  const renderVoicemail = ({ item: vm }: { item: Voicemail }) => {
    return (
      <View
        style={[
          styles.card,
          { marginBottom: 12 },
          vm.is_new ? { borderLeftWidth: 3, borderLeftColor: colors.tint } : null,
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Voicemail icon */}
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: vm.is_new ? colors.tint : colors.icon + "30",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <IconSymbol
              name="phone.badge.waveform"
              size={24}
              color="#fff"
            />
          </View>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText style={[typography.subheadMedium, { flex: 1 }]}>
                {formatPhoneNumber(vm.from_number)}
              </ThemedText>
              {vm.is_new ? (
                <View
                  style={{
                    backgroundColor: colors.tint,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
                    NEW
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", marginTop: 4 }}>
              <ThemedText style={[typography.footnote, { color: colors.icon }]}>
                {formatRelativeTime(vm.created_at)}
              </ThemedText>
              {vm.duration_seconds > 0 && (
                <ThemedText style={[typography.footnote, { color: colors.icon, marginLeft: 12 }]}>
                  {formatDuration(vm.duration_seconds)}
                </ThemedText>
              )}
            </View>
            {vm.transcription && (
              <ThemedText
                style={[typography.footnote, { marginTop: 6, fontStyle: "italic" }]}
                numberOfLines={2}
              >
                "{vm.transcription}"
              </ThemedText>
            )}
          </View>

          {/* Delete button */}
          <Pressable
            onPress={() => handleDelete(vm)}
            style={{ padding: 8, marginLeft: 8 }}
          >
            <IconSymbol name="trash" size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (!customerId) {
    return (
      <ThemedView style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <IconSymbol name="phone.badge.waveform" size={48} color={colors.icon} />
        <ThemedText style={[typography.callout, { color: colors.icon, marginTop: 16 }]}>
          Sign in to view voicemail
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadVoicemails(true)}
            tintColor={colors.tint}
          />
        }
      >
        <Text style={typography.largeTitle}>Voicemail</Text>

        {/* Voicemail List (if any) */}
        {voicemails.length > 0 && (
          <View style={[styles.section, { marginTop: 24 }]}>
            <View style={styles.sectionTitleContainer}>
              <Text style={typography.sectionHeader}>Messages</Text>
            </View>
            {voicemails.map((vm) => renderVoicemail({ item: vm }))}
          </View>
        )}

        {/* Instructions */}
        <View style={[styles.section, { marginTop: 24 }]}>
          <View style={styles.sectionTitleContainer}>
            <Text style={typography.sectionHeader}>Check Voicemail on Phone</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.tint,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>1</Text>
              </View>
              <ThemedText style={[typography.callout, { flex: 1 }]}>
                Pick up your phone handset
              </ThemedText>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.tint,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>2</Text>
              </View>
              <ThemedText style={[typography.callout, { flex: 1 }]}>
                Dial *98 to access voicemail
              </ThemedText>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.tint,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>3</Text>
              </View>
              <ThemedText style={[typography.callout, { flex: 1 }]}>
                Enter your PIN when prompted
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Status */}
        <View style={[styles.section, { marginTop: 24 }]}>
          <View style={styles.sectionTitleContainer}>
            <Text style={typography.sectionHeader}>Status</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.row}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
              <ThemedText style={[typography.callout, { marginLeft: 12 }]}>
                Voicemail is enabled on your line
              </ThemedText>
            </View>
          </View>
        </View>

        {voicemails.length === 0 && (
          <ThemedText style={[typography.footnote, { color: colors.icon, textAlign: "center", marginTop: 32, paddingHorizontal: 24 }]}>
            No voicemails yet. When callers leave messages, they'll appear here too.
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}
