import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { getApiBase } from '../../lib/api';
import { saveCredentials } from '../../lib/storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStyles } from '@/constants/styles';
import { IconSymbol } from '@/components/ui/icon-symbol';

/**
 * Hardware Activation Screen
 * 
 * Customer enters activation code from their hardware package
 * Links Shopify order to app account
 * Retrieves SIP credentials and phone number
 */
export default function ActivateScreen() {
  const colorScheme = useColorScheme();
  const { colors, typography, styles } = useAppStyles(colorScheme);
  const router = useRouter();
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const formatActivationCode = (text: string) => {
    // Format as: AP-XXXX-XXXXXX
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6, 12)}`;
  };

  const handleActivate = async () => {
    if (!code || code.length < 10) {
      Alert.alert('Invalid Code', 'Please enter a valid activation code');
      return;
    }

    setLoading(true);

    try {
      // Get customer ID from storage (or generate if first time)
      const { getCredentials } = await import('../../lib/storage');
      let creds = await getCredentials();
      
      if (!creds?.customerId) {
        // Generate a customer ID if they don't have one yet
        const newCustomerId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        creds = { customerId: newCustomerId, userName: 'User' };
      }

      const response = await fetch(`${getApiBase()}/api/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activationCode: code.replace(/[^A-Z0-9]/g, ''),
          customerId: creds.customerId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Activation failed');
      }

      // Save expanded credentials - the storage expects customerId and userName
      // We'll store everything else in a separate key or extend the interface
      await saveCredentials({
        customerId: creds.customerId,
        userName: creds.userName || 'User',
      });
      
      // Store device details separately for now
      const SecureStore = await import('expo-secure-store');
      await SecureStore.setItemAsync('phone_device', JSON.stringify({
        sipUsername: data.device.sipUsername,
        sipPassword: data.device.sipPassword,
        phoneNumber: data.device.phoneNumber,
        activationCode: code,
        activated: true,
        activatedAt: data.device.activatedAt,
      }));

      Alert.alert(
        'Device Activated! 🎉',
        `Your phone number: ${data.device.phoneNumber}\n\nNext: Choose a service plan to start making calls.`,
        [
          {
            text: 'Choose Plan',
            onPress: () => router.replace('/setup/subscribe'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Activation error:', error);
      Alert.alert(
        'Activation Failed',
        error.message || 'Could not activate device. Please check your code and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.tint + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <IconSymbol name="checkmark.seal.fill" size={48} color={colors.tint} />
            </View>
            <Text style={[typography.title1, { textAlign: 'center', marginBottom: 8 }]}>
              Activate Your Device
            </Text>
            <Text style={[typography.body, { textAlign: 'center', color: colors.icon }]}>
              Enter the activation code from your hardware package
            </Text>
          </View>

          {/* Code Input */}
          <View style={{ marginBottom: 24 }}>
            <Text style={[typography.sectionHeader, { marginBottom: 8 }]}>Activation Code</Text>
            <TextInput
              value={code}
              onChangeText={(text) => setCode(formatActivationCode(text))}
              placeholder="AP-1234-ABC123"
              placeholderTextColor={colors.icon}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={14} // AP-XXXX-XXXXXX
              style={[
                styles.input,
                {
                  fontSize: 18,
                  fontWeight: '600',
                  letterSpacing: 2,
                  textAlign: 'center',
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                },
              ]}
            />
            <Text style={[typography.caption, { marginTop: 8, color: colors.icon }]}>
              Format: AP-XXXX-XXXXXX
            </Text>
          </View>

          {/* Activate Button */}
          <Pressable
            onPress={handleActivate}
            disabled={loading || code.length < 10}
            style={({ pressed }) => [
              styles.buttonPrimary,
              {
                opacity: pressed ? 0.8 : loading || code.length < 10 ? 0.5 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={typography.buttonText}>Activate Device</Text>
            )}
          </Pressable>

          {/* Help Text */}
          <View
            style={{
              marginTop: 32,
              padding: 16,
              backgroundColor: colors.cardBackground,
              borderRadius: 12,
            }}
          >
            <Text style={[typography.sectionHeader, { marginBottom: 8 }]}>Where to find your code:</Text>
            <Text style={[typography.body, { color: colors.icon, lineHeight: 20 }]}>
              • Check the activation card in your hardware box{'\n'}
              • Look for the code starting with "AP-"{'\n'}
              • Contact support if you can't find it
            </Text>
          </View>

          {/* Skip Link (for testing/existing users) */}
          <Pressable
            onPress={() => router.back()}
            style={{ marginTop: 24, padding: 12, alignItems: 'center' }}
          >
            <Text style={[typography.body, { color: colors.tint }]}>
              ← Back
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
