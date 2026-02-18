import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useVoicemailBadge } from '@/lib/voicemail-badge-context';
import { useMissedCallBadge } from '@/lib/missed-call-badge-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { unreadCount, refreshCount } = useVoicemailBadge();
  const { unseenCount, refreshCount: refreshMissed } = useMissedCallBadge();

  // Poll for new counts every 60 seconds while app is open
  React.useEffect(() => {
    refreshCount();
    refreshMissed();
    const interval = setInterval(() => {
      refreshCount();
      refreshMissed();
    }, 60_000);
    return () => clearInterval(interval);
  }, [refreshCount, refreshMissed]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.icon,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.icon + '25',
          borderTopWidth: 1,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 64,
          // Subtle vintage shadow
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
          marginTop: 4,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="calls"
        options={{
          title: 'Calls',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="phone.badge.waveform.fill" color={color} />
          ),
          tabBarBadge: unseenCount > 0 ? unseenCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF3B30',
            color: '#fff',
            fontSize: 11,
            fontWeight: '700',
          },
        }}
      />

      <Tabs.Screen
        name="voicemail"
        options={{
          title: 'Voicemail',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="recordingtape" color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.tint,
            color: '#fff',
            fontSize: 11,
            fontWeight: '700',
          },
        }}
      />

      <Tabs.Screen
        name="subscription"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="dollarsign.circle.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="slider.horizontal.3" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
