/**
 * Enhanced Input Component - On-Brand Retro Style
 */

import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, ViewStyle, Animated } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStyles } from '@/constants/styles';
import { Elevation, Animation } from '@/constants/theme';
import { IconSymbol } from './icon-symbol';
import { SymbolViewProps } from 'expo-symbols';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  success?: boolean;
  icon?: SymbolViewProps['name'];
  containerStyle?: ViewStyle;
}

/**
 * Enhanced TextInput with label, error states, and animations
 */
export function Input({
  label,
  error,
  success,
  icon,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const colorScheme = useColorScheme();
  const { colors, typography } = useAppStyles(colorScheme);
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = React.useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: Animation.fast,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: Animation.fast,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.icon + '30', colors.tint],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[typography.subheadMedium, styles.label, { color: colors.text }]}>
          {label}
        </Text>
      )}
      <Animated.View
        style={[
          styles.inputContainer,
          { 
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : borderColor,
          },
          Elevation.sm,
          error && { borderWidth: 2 },
        ]}
      >
        {icon && (
          <IconSymbol 
            name={icon} 
            size={20} 
            color={isFocused ? colors.tint : colors.icon} 
          />
        )}
        <TextInput
          {...props}
          style={[
            styles.input,
            typography.body,
            { color: colors.text },
            icon && { paddingLeft: 0 },
            style,
          ]}
          placeholderTextColor={colors.icon}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {success && (
          <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
        )}
        {error && !success && (
          <IconSymbol name="exclamationmark.circle.fill" size={20} color={colors.error} />
        )}
      </Animated.View>
      {error && (
        <Text style={[typography.caption, styles.errorText, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    gap: 12,
    minHeight: 52,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 17,
  },
  errorText: {
    marginTop: 6,
    marginLeft: 4,
  },
});
