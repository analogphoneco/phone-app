/**
 * Reusable Button Components - On-Brand 90s Retro Style
 */

import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, Animated } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStyles } from '@/constants/styles';
import { Elevation, Animation } from '@/constants/theme';
import { IconSymbol } from './icon-symbol';
import { SymbolViewProps } from 'expo-symbols';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: SymbolViewProps['name'];
  iconSize?: number;
  fullWidth?: boolean;
  style?: ViewStyle;
}

/**
 * Primary Button - Brand Red, High Emphasis
 * Use for main CTAs like "Subscribe", "Continue", "Confirm"
 */
export function PrimaryButton({ 
  title, 
  onPress, 
  disabled = false, 
  loading = false,
  icon,
  iconSize = 20,
  fullWidth = false,
  style 
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const { colors, typography } = useAppStyles(colorScheme);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      ...Animation.springConfig,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      ...Animation.springConfig,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && { width: '100%' }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.primaryButton,
          { backgroundColor: colors.tint },
          Elevation.lg,
          disabled && styles.disabled,
          fullWidth && { width: '100%' },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            {icon && <IconSymbol name={icon} size={iconSize} color="#fff" />}
            <Text style={[typography.buttonText, { color: '#fff' }]}>{title}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Secondary Button - Outlined, Medium Emphasis
 * Use for secondary actions like "Cancel", "Skip", "Back"
 */
export function SecondaryButton({ 
  title, 
  onPress, 
  disabled = false, 
  loading = false,
  icon,
  iconSize = 18,
  fullWidth = false,
  style 
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const { colors, typography } = useAppStyles(colorScheme);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      ...Animation.springConfig,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      ...Animation.springConfig,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && { width: '100%' }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.secondaryButton,
          { 
            backgroundColor: colors.surface,
            borderColor: colors.tint,
          },
          disabled && styles.disabled,
          fullWidth && { width: '100%' },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.tint} />
        ) : (
          <>
            {icon && <IconSymbol name={icon} size={iconSize} color={colors.tint} />}
            <Text style={[typography.buttonTextSmall, { color: colors.tint }]}>{title}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Accent Button - Film Yellow, Special Actions
 * Use for premium/special features like "Use Promo Code", "Share"
 */
export function AccentButton({ 
  title, 
  onPress, 
  disabled = false, 
  loading = false,
  icon,
  iconSize = 20,
  fullWidth = false,
  style 
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const { colors, typography } = useAppStyles(colorScheme);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      ...Animation.springConfig,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      ...Animation.springConfig,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && { width: '100%' }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.accentButton,
          { backgroundColor: colors.accent },
          Elevation.lg,
          disabled && styles.disabled,
          fullWidth && { width: '100%' },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#1A1A1A" />
        ) : (
          <>
            {icon && <IconSymbol name={icon} size={iconSize} color="#1A1A1A" />}
            <Text style={[typography.buttonText, { color: '#1A1A1A' }]}>{title}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Ghost Button - Text Only, Low Emphasis
 * Use for tertiary actions like "Learn More", "Not Now"
 */
export function GhostButton({ 
  title, 
  onPress, 
  disabled = false, 
  icon,
  iconSize = 18,
  style 
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const { colors, typography } = useAppStyles(colorScheme);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.ghostButton,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon && <IconSymbol name={icon} size={iconSize} color={colors.tint} />}
      <Text style={[typography.callout, { color: colors.tint }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    minHeight: 52,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
    minHeight: 52,
  },
  accentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    minHeight: 52,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  disabled: {
    opacity: 0.5,
  },
});
