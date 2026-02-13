import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getApiKey, getCustomerId } from './storage';

const API_URL = 'https://analog-phone-backend-production.up.railway.app';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export class VoIPNotifications {
  private static pushToken: string | null = null;

  /**
   * Register for VoIP push notifications
   */
  static async register() {
    if (Platform.OS !== 'ios') {
      console.log('VoIP notifications only supported on iOS');
      return null;
    }

    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    this.pushToken = token;

    // Register token with backend
    await this.registerTokenWithBackend(token);

    return token;
  }

  /**
   * Register push token with backend
   */
  private static async registerTokenWithBackend(token: string) {
    try {
      const customerId = await getCustomerId();
      const apiKey = await getApiKey();

      if (!customerId || !apiKey) {
        console.error('Cannot register push token: missing credentials');
        return;
      }

      const response = await fetch(`${API_URL}/api/customers/${customerId}/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({ token, platform: Platform.OS }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to register push token: ${error}`);
      }

      console.log('Push token registered successfully');
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }

  /**
   * Handle incoming VoIP notification (incoming call)
   */
  static async handleIncomingCall(notification: any) {
    const callData = notification.request.content.data;
    
    // Call data should include:
    // - callId: Telnyx call session ID
    // - from: Caller's phone number
    // - to: Your phone number
    
    return callData;
  }

  /**
   * Setup notification handlers
   */
  static setupHandlers(onIncomingCall: (callData: any) => void) {
    // Handle notifications when app is foregrounded
    Notifications.addNotificationReceivedListener((notification) => {
      const callData = notification.request.content.data;
      if (callData.type === 'incoming_call') {
        console.log('Incoming call notification received:', callData);
        onIncomingCall(callData);
      }
    });

    // Handle notification taps
    Notifications.addNotificationResponseReceivedListener((response) => {
      const callData = response.notification.request.content.data;
      if (callData.type === 'incoming_call') {
        console.log('Incoming call notification tapped:', callData);
        onIncomingCall(callData);
      }
    });
  }

  /**
   * Get current push token
   */
  static getPushToken(): string | null {
    return this.pushToken;
  }
}
