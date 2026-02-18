import { VoIPNotifications } from './voip-notifications';

/**
 * Manages push notification registration for incoming call and voicemail alerts.
 * The analog phone rings on its own via Telnyx — this service just ensures
 * the app receives push notifications when calls/voicemails arrive.
 */
export class NotificationService {
  private static isInitialized = false;

  static async initialize() {
    if (this.isInitialized) return;

    console.log('[NotificationService] Initializing...');
    await VoIPNotifications.register();

    VoIPNotifications.setupHandlers(async (callData) => {
      console.log('[NotificationService] Incoming call notification:', callData);
    });

    this.isInitialized = true;
    console.log('[NotificationService] Initialized');
  }

  static shutdown() {
    this.isInitialized = false;
  }

  static async getStatus() {
    const pushToken = VoIPNotifications.getPushToken();
    return {
      initialized: this.isInitialized,
      pushNotificationsEnabled: !!pushToken,
    };
  }
}
