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
  TextInput,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AudioPlayer } from "@/components/audio-player";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStyles } from "@/constants/styles";
import { getCustomerId } from "@/lib/storage";
import { showError } from "@/lib/errors";
import {
  listVoicemails,
  markVoicemailAsListened,
  deleteVoicemail,
  getVoicemailRecordingUrl,
  getVoicemailGreeting,
  setVoicemailGreetingText,
  formatDuration,
  formatPhoneNumber,
  formatRelativeTime,
  type Voicemail,
  type VoicemailGreeting,
} from "@/lib/voicemail";
import {
  loadContactsCache,
  getContactName,
  hasContactsPermission,
  requestContactsPermission,
} from "@/lib/contacts";

export default function VoicemailScreen() {
  const colorScheme = useColorScheme();
  const { colors, typography, styles } = useAppStyles(colorScheme);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [voicemails, setVoicemails] = useState<Voicemail[]>([]);
  const [greeting, setGreeting] = useState<VoicemailGreeting | null>(null);
  const [editingGreeting, setEditingGreeting] = useState(false);
  const [greetingInput, setGreetingInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingGreeting, setSavingGreeting] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  // Load contacts on mount
  React.useEffect(() => {
    (async () => {
      const hasPermission = await hasContactsPermission();
      if (hasPermission) {
        await loadContactsCache();
        setContactsLoaded(true);
      } else {
        // Silently try to request permission
        const granted = await requestContactsPermission();
        if (granted) {
          await loadContactsCache();
          setContactsLoaded(true);
        }
      }
    })();
  }, []);

  const loadVoicemails = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      
      const cid = await getCustomerId();
      if (!cid) {
        setCustomerId(null);
        setVoicemails([]);
        setGreeting(null);
        return;
      }
      
      setCustomerId(cid);
      const { voicemails: vms } = await listVoicemails(cid);
      setVoicemails(vms);
      
      // Load greeting
      const greetingData = await getVoicemailGreeting(cid);
      setGreeting(greetingData);
      setGreetingInput(greetingData.greeting_text || "");
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

  const handleSaveGreeting = async () => {
    if (!customerId) return;
    
    try {
      setSavingGreeting(true);
      const updatedGreeting = await setVoicemailGreetingText(customerId, greetingInput.trim());
      setGreeting(updatedGreeting);
      setEditingGreeting(false);
      Alert.alert("Success", "Your voicemail greeting has been updated");
    } catch (e: unknown) {
      const error = showError(e);
      Alert.alert(error.title, error.message, error.buttons);
    } finally {
      setSavingGreeting(false);
    }
  };

  const handleCancelGreeting = () => {
    setGreetingInput(greeting?.greeting_text || "");
    setEditingGreeting(false);
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
              <View style={{ flex: 1 }}>
                {(() => {
                  const contactName = getContactName(vm.from_number);
                  const displayName = contactName || formatPhoneNumber(vm.from_number);
                  return (
                    <>
                      <ThemedText style={typography.subheadMedium}>
                        {displayName}
                      </ThemedText>
                      {contactName && (
                        <ThemedText style={[typography.footnote, { color: colors.icon, marginTop: 2 }]}>
                          {formatPhoneNumber(vm.from_number)}
                        </ThemedText>
                      )}
                    </>
                  );
                })()}
              </View>
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

            {/* Audio Player */}
            {vm.recording_url && (
              <View style={{ marginTop: 8 }}>
                <AudioPlayer
                  url={vm.recording_url}
                  colors={colors}
                  typography={typography}
                />
              </View>
            )}

            {/* Action buttons */}
            <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
              {/* Delete button */}
              <Pressable
                onPress={() => handleDelete(vm)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  backgroundColor: colors.surface,
                  gap: 6,
                }}
              >
                <IconSymbol name="trash" size={16} color={colors.error} />
                <Text style={[typography.footnote, { color: colors.error }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
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

        {/* Greeting Management */}
        <View style={[styles.section, { marginTop: 24 }]}>
          <View style={styles.sectionTitleContainer}>
            <Text style={typography.sectionHeader}>Your Greeting</Text>
            {!editingGreeting && (
              <Pressable onPress={() => setEditingGreeting(true)}>
                <IconSymbol name="pencil" size={18} color={colors.tint} />
              </Pressable>
            )}
          </View>
          <View style={styles.card}>
            {editingGreeting ? (
              <>
                <TextInput
                  value={greetingInput}
                  onChangeText={setGreetingInput}
                  placeholder="Enter your voicemail greeting..."
                  placeholderTextColor={colors.icon}
                  multiline
                  numberOfLines={3}
                  style={[
                    typography.callout,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.icon + "40",
                      borderRadius: 8,
                      padding: 12,
                      minHeight: 80,
                      textAlignVertical: "top",
                    },
                  ]}
                />
                <View style={{ flexDirection: "row", marginTop: 12, gap: 12 }}>
                  <Pressable
                    onPress={handleSaveGreeting}
                    disabled={savingGreeting || !greetingInput.trim()}
                    style={[
                      {
                        flex: 1,
                        backgroundColor: colors.tint,
                        padding: 12,
                        borderRadius: 8,
                        alignItems: "center",
                      },
                      (savingGreeting || !greetingInput.trim()) && { opacity: 0.5 },
                    ]}
                  >
                    {savingGreeting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={[typography.callout, { color: "#fff", fontWeight: "600" }]}>
                        Save
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleCancelGreeting}
                    disabled={savingGreeting}
                    style={{
                      flex: 1,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.icon + "40",
                      padding: 12,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={[typography.callout, { color: colors.text, fontWeight: "600" }]}>
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <IconSymbol name="quote.bubble" size={20} color={colors.icon} style={{ marginRight: 12, marginTop: 2 }} />
                  <ThemedText style={[typography.callout, { flex: 1 }]}>
                    {greeting?.greeting_text || "Please leave a message after the beep."}
                  </ThemedText>
                </View>
                <View style={[styles.divider, { marginVertical: 12 }]} />
                <ThemedText style={[typography.footnote, { color: colors.icon }]}>
                  This message will be played when callers reach your voicemail
                </ThemedText>
              </>
            )}
          </View>
        </View>

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
