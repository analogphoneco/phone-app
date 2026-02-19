import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Animated,
} from "react-native";
import { Audio } from "expo-av";
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from "expo-router";
import { Swipeable } from "react-native-gesture-handler";
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
  getNewVoicemailCount,
  getVoicemailGreeting,
  setVoicemailGreetingText,
  setVoicemailGreetingAudio,
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
import { useVoicemailBadge } from "@/lib/voicemail-badge-context";

export default function VoicemailScreen() {
  const colorScheme = useColorScheme();
  const { colors, typography, styles } = useAppStyles(colorScheme);
  const { refreshCount, decrement } = useVoicemailBadge();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [voicemails, setVoicemails] = useState<Voicemail[]>([]);
  const [greeting, setGreeting] = useState<VoicemailGreeting | null>(null);
  const [editingGreeting, setEditingGreeting] = useState(false);
  const [greetingInput, setGreetingInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingGreeting, setSavingGreeting] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  // Recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      // Sync badge count with server
      await refreshCount();
      
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
  }, [refreshCount]);

  useFocusEffect(
    useCallback(() => {
      loadVoicemails();
      // Clear the iOS app icon badge when voicemail tab is opened
      Notifications.setBadgeCountAsync(0).catch(() => {});
    }, [loadVoicemails])
  );

  const handleMarkAsListened = useCallback(async (vm: Voicemail) => {
    if (!vm.is_new) return;
    try {
      await markVoicemailAsListened(vm.id);
      setVoicemails((prev) =>
        prev.map((v) => (v.id === vm.id ? { ...v, is_new: 0 } : v))
      );
      decrement();
      // Sync system badge count after marking as read
      const cid = await getCustomerId();
      if (cid) {
        const remaining = await getNewVoicemailCount(cid);
        Notifications.setBadgeCountAsync(remaining).catch(() => {});
      }
    } catch (e) {
      console.log("[Voicemail] Error marking as listened:", e);
    }
  }, [decrement]);

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
    // Clean up any in-progress recording
    if (recording) {
      recording.stopAndUnloadAsync().catch(() => {});
      setRecording(null);
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    setRecordingUri(null);
    if (previewSound) {
      previewSound.unloadAsync().catch(() => {});
      setPreviewSound(null);
    }
    setIsPlayingPreview(false);
  };

  const handleStartRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert("Microphone Access", "Please allow microphone access to record a greeting.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setRecordingSeconds(0);
      setRecordingUri(null);
      if (previewSound) {
        await previewSound.unloadAsync();
        setPreviewSound(null);
        setIsPlayingPreview(false);
      }
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      Alert.alert("Recording Error", "Could not start recording. Please try again.");
    }
  };

  const handleStopRecording = async () => {
    if (!recording) return;
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecordingUri(uri ?? null);
      setRecording(null);
      setIsRecording(false);
    } catch (e) {
      Alert.alert("Recording Error", "Could not stop recording. Please try again.");
    }
  };

  const handlePreviewRecording = async () => {
    if (!recordingUri) return;
    try {
      if (isPlayingPreview && previewSound) {
        await previewSound.stopAsync();
        setIsPlayingPreview(false);
        return;
      }
      if (previewSound) {
        await previewSound.unloadAsync();
        setPreviewSound(null);
      }
      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri });
      setPreviewSound(sound);
      setIsPlayingPreview(true);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setIsPlayingPreview(false);
          sound.unloadAsync().catch(() => {});
          setPreviewSound(null);
        }
      });
    } catch (e) {
      Alert.alert("Playback Error", "Could not play recording.");
    }
  };

  const handleSaveAudioGreeting = async () => {
    if (!customerId || !recordingUri) return;
    try {
      setUploadingAudio(true);
      // Read file as base64
      const response = await fetch(recordingUri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Strip data URL prefix
          resolve(result.split(',')[1] ?? result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const updatedGreeting = await setVoicemailGreetingAudio(customerId, base64, "audio/m4a");
      setGreeting(updatedGreeting);
      setEditingGreeting(false);
      setRecordingUri(null);
      setRecordingSeconds(0);
      Alert.alert("Saved", "Your recorded greeting is now active.");
    } catch (e: unknown) {
      const error = showError(e);
      Alert.alert(error.title, error.message, error.buttons);
    } finally {
      setUploadingAudio(false);
    }
  };

  const renderVoicemail = ({ item: vm }: { item: Voicemail }) => {
    const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const scale = dragX.interpolate({
        inputRange: [0, 80],
        outputRange: [0.5, 1],
        extrapolate: 'clamp',
      });
      return (
        <View style={{ width: 80, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.success }}>
          <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
            <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
              {vm.is_new ? 'Read' : 'Unread'}
            </Text>
          </Animated.View>
        </View>
      );
    };

    return (
      <Swipeable
        key={vm.id}
        renderLeftActions={renderLeftActions}
        onSwipeableLeftOpen={() => handleMarkAsListened(vm)}
        friction={2}
        leftThreshold={60}
      >
        <View
          style={[
            styles.card,
            { marginBottom: 12, backgroundColor: colors.surface },
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
              <IconSymbol name="phone.badge.waveform" size={24} color="#fff" />
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

              {/* Audio Player - marks as listened when played */}
              {vm.recording_url && (
                <View style={{ marginTop: 8 }}>
                  <AudioPlayer
                    url={vm.recording_url}
                    colors={colors}
                    typography={typography}
                    onPlay={() => handleMarkAsListened(vm)}
                  />
                </View>
              )}

              {/* Swipe hint for new voicemails */}
              {vm.is_new && (
                <Text style={{ fontSize: 10, color: colors.icon, marginTop: 6, fontStyle: 'italic' }}>
                  ← Swipe right to mark as read
                </Text>
              )}
            </View>
          </View>
        </View>
      </Swipeable>
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
                {/* Recording section */}
                <Text style={[typography.footnote, { color: colors.icon, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                  Record Your Voice
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  {/* Record / Stop button */}
                  <Pressable
                    onPress={isRecording ? handleStopRecording : handleStartRecording}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: isRecording ? '#FF3B30' : colors.tint,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <IconSymbol
                      name={isRecording ? "stop.fill" : "mic.fill"}
                      size={22}
                      color="#fff"
                    />
                  </Pressable>

                  {isRecording ? (
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.callout, { color: '#FF3B30', fontWeight: '600' }]}>
                        Recording… {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                      </Text>
                      <Text style={[typography.footnote, { color: colors.icon }]}>Tap stop when done</Text>
                    </View>
                  ) : recordingUri ? (
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.callout, { color: colors.text, fontWeight: '600' }]}>
                        Recorded ({Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')})
                      </Text>
                      <Text style={[typography.footnote, { color: colors.icon }]}>Tap mic to re-record</Text>
                    </View>
                  ) : (
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.callout, { color: colors.text }]}>Tap to record</Text>
                      <Text style={[typography.footnote, { color: colors.icon }]}>Up to 3 minutes</Text>
                    </View>
                  )}

                  {/* Preview button */}
                  {recordingUri && !isRecording && (
                    <Pressable
                      onPress={handlePreviewRecording}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.icon + '40',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <IconSymbol
                        name={isPlayingPreview ? "pause.fill" : "play.fill"}
                        size={16}
                        color={colors.tint}
                      />
                    </Pressable>
                  )}
                </View>

                {/* Save recorded greeting button */}
                {recordingUri && !isRecording && (
                  <Pressable
                    onPress={handleSaveAudioGreeting}
                    disabled={uploadingAudio}
                    style={[
                      {
                        backgroundColor: colors.tint,
                        padding: 12,
                        borderRadius: 8,
                        alignItems: 'center',
                        marginBottom: 16,
                      },
                      uploadingAudio && { opacity: 0.5 },
                    ]}
                  >
                    {uploadingAudio ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={[typography.callout, { color: '#fff', fontWeight: '600' }]}>
                        Use This Recording
                      </Text>
                    )}
                  </Pressable>
                )}

                <View style={[styles.divider, { marginBottom: 16 }]} />

                {/* Text greeting section */}
                <Text style={[typography.footnote, { color: colors.icon, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                  Or Type a Greeting (Text-to-Speech)
                </Text>
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
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.tint,
                        padding: 12,
                        borderRadius: 8,
                        alignItems: "center",
                      },
                      (savingGreeting || !greetingInput.trim()) && { opacity: 0.5 },
                    ]}
                  >
                    {savingGreeting ? (
                      <ActivityIndicator color={colors.tint} />
                    ) : (
                      <Text style={[typography.callout, { color: colors.tint, fontWeight: "600" }]}>
                        Save Text
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleCancelGreeting}
                    disabled={savingGreeting || uploadingAudio}
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
                  <IconSymbol
                    name={greeting?.greeting_url ? "waveform" : "quote.bubble"}
                    size={20}
                    color={colors.icon}
                    style={{ marginRight: 12, marginTop: 2 }}
                  />
                  <ThemedText style={[typography.callout, { flex: 1 }]}>
                    {greeting?.greeting_url
                      ? "Custom recorded greeting"
                      : (greeting?.greeting_text || "Please leave a message after the beep.")}
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
