import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStyles } from '@/constants/styles';
import { PrimaryButton, SecondaryButton, AccentButton, GhostButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ComponentShowcase() {
  const colorScheme = useColorScheme();
  const { colors, typography, styles } = useAppStyles(colorScheme);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('TEST100');
  const [loading, setLoading] = useState(false);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={[styles.iconCircleLarge, { alignSelf: 'center', backgroundColor: colors.tint + '15' }]}>
        <IconSymbol name="paintbrush.fill" size={56} color={colors.tint} />
      </View>
      <Text style={[typography.title1, { textAlign: 'center', marginTop: 20, marginBottom: 8 }]}>
        Component Showcase
      </Text>
      <Text style={[typography.callout, { color: colors.icon, textAlign: 'center', marginBottom: 32 }]}>
        All the new UI components
      </Text>

      {/* Buttons Section */}
      <Text style={[typography.sectionHeader, { marginBottom: 12 }]}>BUTTONS</Text>
      
      <View style={{ gap: 12, marginBottom: 32 }}>
        <PrimaryButton 
          title="Primary Button"
          onPress={() => alert('Primary pressed!')}
          icon="star.fill"
          fullWidth
        />
        
        <PrimaryButton 
          title="Loading State"
          onPress={() => {}}
          loading={true}
          fullWidth
        />
        
        <SecondaryButton 
          title="Secondary Button"
          onPress={() => alert('Secondary pressed!')}
          icon="gear"
          fullWidth
        />
        
        <AccentButton 
          title="Accent Button"
          onPress={() => alert('Accent pressed!')}
          icon="sparkles"
          fullWidth
        />
        
        <GhostButton 
          title="Ghost Button (Text Only)"
          onPress={() => alert('Ghost pressed!')}
          icon="info.circle"
        />
      </View>

      {/* Inputs Section */}
      <Text style={[typography.sectionHeader, { marginBottom: 12 }]}>INPUTS</Text>
      
      <View style={{ gap: 16, marginBottom: 32 }}>
        <Input
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          icon="envelope"
          keyboardType="email-address"
        />
        
        <Input
          label="Promo Code (Success State)"
          value={code}
          onChangeText={setCode}
          placeholder="Enter code"
          icon="ticket"
          success={true}
        />
        
        <Input
          label="Error State"
          value=""
          onChangeText={() => {}}
          placeholder="This has an error"
          icon="exclamationmark.triangle"
          error="This field is required"
        />
      </View>

      {/* Cards Section */}
      <Text style={[typography.sectionHeader, { marginBottom: 12 }]}>CARDS & BADGES</Text>
      
      <View style={[styles.cardLarge, { marginBottom: 16, borderWidth: 2, borderColor: colors.tint + '20' }]}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={{
            backgroundColor: colors.tint + '10',
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 20,
            marginBottom: 12
          }}>
            <Text style={[typography.subheadMedium, { color: colors.tint, textTransform: 'uppercase', letterSpacing: 1 }]}>
              ENHANCED CARD
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[typography.largeTitle, { fontSize: 48, color: colors.tint, fontWeight: '700' }]}>
              $24.99
            </Text>
            <Text style={[typography.title3, { color: colors.icon, marginLeft: 6 }]}>
              /month
            </Text>
          </View>
        </View>
        
        <View style={{ gap: 16 }}>
          <View style={[styles.row, { gap: 12 }]}>
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: colors.success + '20',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IconSymbol name="checkmark" size={16} color={colors.success} />
            </View>
            <Text style={typography.body}>Feature with circular badge</Text>
          </View>
          <View style={[styles.row, { gap: 12 }]}>
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: colors.success + '20',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IconSymbol name="checkmark" size={16} color={colors.success} />
            </View>
            <Text style={typography.body}>Another feature</Text>
          </View>
        </View>
      </View>

      {/* Typography */}
      <Text style={[typography.sectionHeader, { marginBottom: 12 }]}>TYPOGRAPHY</Text>
      <View style={[styles.card, { marginBottom: 32, gap: 8 }]}>
        <Text style={typography.largeTitle}>Large Title (32-48px)</Text>
        <Text style={typography.title1}>Title 1 (26px)</Text>
        <Text style={typography.title2}>Title 2 (22px)</Text>
        <Text style={typography.body}>Body (17px) - Standard text</Text>
        <Text style={[typography.caption, { color: colors.icon }]}>Caption (12px) - Metadata</Text>
      </View>

      {/* Instructions */}
      <View style={[styles.card, { backgroundColor: colors.successLight, marginBottom: 20 }]}>
        <Text style={[typography.subheadMedium, { marginBottom: 8 }]}>💡 Try These:</Text>
        <Text style={[typography.footnote, { marginBottom: 4 }]}>• Press and hold buttons (spring animation)</Text>
        <Text style={[typography.footnote, { marginBottom: 4 }]}>• Tap an input field (border animates)</Text>
        <Text style={[typography.footnote, { marginBottom: 4 }]}>• Notice the 48px price vs old 32px</Text>
        <Text style={[typography.footnote]}>• Circular checkmark badges vs plain icons</Text>
      </View>
    </ScrollView>
  );
}
