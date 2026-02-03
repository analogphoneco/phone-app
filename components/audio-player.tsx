/**
 * Audio player component for voicemail playback
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface AudioPlayerProps {
  url: string | null;
  colors: any;
  typography: any;
}

export function AudioPlayer({ url, colors, typography }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [position, setPosition] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadSound = async () => {
    if (!url) {
      setError('Recording URL not available');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Configure audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Create and load sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsLoading(false);
    } catch (e) {
      console.error('[AudioPlayer] Failed to load audio:', e);
      setError('Failed to load audio');
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis);
      setPosition(status.positionMillis);
      setIsPlaying(status.isPlaying);

      // Auto-reset when finished
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    } else if (status.error) {
      console.error('[AudioPlayer] Playback error:', status.error);
      setError('Playback error');
    }
  };

  const togglePlayPause = async () => {
    if (!sound) {
      await loadSound();
      return;
    }

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        // If at the end, replay from start
        if (duration && position >= duration - 100) {
          await sound.setPositionAsync(0);
        }
        await sound.playAsync();
      }
    } catch (e) {
      console.error('[AudioPlayer] Play/pause error:', e);
      setError('Playback error');
    }
  };

  const seekTo = async (value: number) => {
    if (sound && duration) {
      try {
        const newPosition = (value / 100) * duration;
        await sound.setPositionAsync(newPosition);
      } catch (e) {
        console.error('[AudioPlayer] Seek error:', e);
      }
    }
  };

  const formatTime = (millis: number | null) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (position / duration) * 100 : 0;

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={[typography.footnote, { color: colors.error }]}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Play/Pause Button */}
      <Pressable
        onPress={togglePlayPause}
        disabled={isLoading}
        style={[
          styles.playButton,
          { backgroundColor: colors.tint },
          isLoading && { opacity: 0.5 },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <IconSymbol
            name={isPlaying ? 'pause.fill' : 'play.fill'}
            size={20}
            color="#fff"
          />
        )}
      </Pressable>

      {/* Progress Bar and Time */}
      <View style={styles.progressContainer}>
        {/* Progress Bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.icon + '30' }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%`, backgroundColor: colors.tint },
            ]}
          />
        </View>

        {/* Time Display */}
        <View style={styles.timeContainer}>
          <Text style={[typography.footnote, { color: colors.icon }]}>
            {formatTime(position)}
          </Text>
          <Text style={[typography.footnote, { color: colors.icon }]}>
            {formatTime(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    gap: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
