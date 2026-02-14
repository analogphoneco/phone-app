import { WiFiDetection } from './wifi-detection';
import { VoIPNotifications } from './voip-notifications';
import { getApiKey, getCustomerId } from './storage';

const API_URL = 'https://analog-phone-backend-production.up.railway.app';

export class CallBridgeService {
  private static isInitialized = false;
  private static networkUnsubscribe: (() => void) | null = null;

  /**
   * Initialize the call bridging service
   */
  static async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing call bridge service...');

    // Register for VoIP notifications
    await VoIPNotifications.register();

    // Setup notification handlers
    VoIPNotifications.setupHandlers(async (callData) => {
      await this.handleIncomingCall(callData);
    });

    // Subscribe to network changes
    this.networkUnsubscribe = WiFiDetection.subscribe((isHome) => {
      console.log('Network changed. On home network:', isHome);
    });

    this.isInitialized = true;
    console.log('Call bridge service initialized');
  }

  /**
   * Shutdown the service
   */
  static shutdown() {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    this.isInitialized = false;
  }

  /**
   * Handle incoming call notification
   */
  private static async handleIncomingCall(callData: any) {
    console.log('Incoming call detected:', callData);

    // Check if on home WiFi - only bridge if at home
    const isHome = await WiFiDetection.isOnHomeNetwork();
    
    if (isHome) {
      console.log('On home network, initiating call bridge');
      // Trigger call bridge to ring analog phone
      await this.bridgeCall(callData);
    } else {
      console.log('Not on home network - call will ring analog phone directly, showing notification only');
    }
    
    // Note: Notification is shown regardless of location
    // This allows user to see missed calls when away from home
  }

  /**
   * Bridge the call to analog phone
   */
  private static async bridgeCall(callData: any) {
    try {
      const customerId = await getCustomerId();
      const apiKey = await getApiKey();

      if (!customerId || !apiKey) {
        console.error('Cannot bridge call: missing credentials');
        return;
      }

      const response = await fetch(`${API_URL}/api/bridge-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({
          customer_id: customerId,
          incoming_call_id: callData.call_id,
          from_number: callData.from,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to bridge call: ${error}`);
      }

      const result = await response.json();
      console.log('Call bridge initiated:', result);

    } catch (error) {
      console.error('Error bridging call:', error);
    }
  }

  /**
   * Check current status
   */
  static async getStatus() {
    const isHome = await WiFiDetection.isOnHomeNetwork();
    const homeNetwork = await WiFiDetection.getHomeNetwork();
    const pushToken = VoIPNotifications.getPushToken();

    return {
      initialized: this.isInitialized,
      onHomeNetwork: isHome,
      homeNetworkConfigured: !!homeNetwork,
      homeNetwork,
      pushNotificationsEnabled: !!pushToken,
    };
  }
}
