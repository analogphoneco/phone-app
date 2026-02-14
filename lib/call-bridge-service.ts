import { VoIPNotifications } from './voip-notifications';

/**
 * Simple notification service for incoming call alerts
 * The analog phone rings on its own - this just provides notifications
 */
export class CallNotificationService {
  private static isInitialized = false;

  /**
   * Initialize push notifications for call alerts
   */
  static async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing call notification service...');

    // Register for push notifications
    await VoIPNotifications.register();

    // Setup notification handlers - just log the call
    VoIPNotifications.setupHandlers(async (callData) => {
      console.log('Incoming call notification:', callData);
      // Notification is automatically shown by iOS
      // Analog phone rings on its own via Telnyx
    });

    this.isInitialized = true;
    console.log('Call notification service initialized');
  }

  /**
   * Shutdown the service
   */
  static shutdown() {
    this.isInitialized = false;
  }

  /**
   * Check current status
   */
  static async getStatus() {
    const pushToken = VoIPNotifications.getPushToken();

    return {
      initialized: this.isInitialized,
      pushNotificationsEnabled: !!pushToken,
    };
  }
}

// Export with old name for backward compatibility
export const CallBridgeService = CallNotificationService;
