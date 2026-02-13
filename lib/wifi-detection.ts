import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HOME_WIFI_KEY = '@home_wifi_ssid';
const HOME_IP_PREFIX_KEY = '@home_ip_prefix';

export class WiFiDetection {
  private static homeSSID: string | null = null;

  /**
   * Set the home WiFi network SSID
   */
  static async setHomeNetwork(ssid: string) {
    console.log('[WiFiDetection] Setting home network:', ssid);
    this.homeSSID = ssid;
    try {
      await AsyncStorage.setItem(HOME_WIFI_KEY, ssid);
      console.log('[WiFiDetection] Saved to AsyncStorage');
      
      // Verify it was saved
      const verify = await AsyncStorage.getItem(HOME_WIFI_KEY);
      console.log('[WiFiDetection] Verification read:', verify);
      
      if (verify !== ssid) {
        console.error('[WiFiDetection] VERIFICATION FAILED! Expected:', ssid, 'Got:', verify);
      }
    } catch (error) {
      console.error('[WiFiDetection] Error saving to AsyncStorage:', error);
      throw error;
    }
  }

  /**
   * Get the configured home WiFi SSID
   */
  static async getHomeNetwork(): Promise<string | null> {
    // Always read from AsyncStorage to ensure we have the latest value
    const stored = await AsyncStorage.getItem(HOME_WIFI_KEY);
    console.log('[WiFiDetection] Read from AsyncStorage:', stored);
    
    // Update cache
    this.homeSSID = stored;
    
    return this.homeSSID;
  }

  /**
   * Check if currently connected to home WiFi
   */
  static async isOnHomeNetwork(): Promise<boolean> {
    const homeSSID = await this.getHomeNetwork();
    if (!homeSSID) return false;

    const state = await NetInfo.fetch();
    
    // Check if on WiFi
    if (state.type !== 'wifi') return false;
    
    // Check if it's the home network
    // Note: iOS doesn't easily expose SSID, but we can use other indicators
    const currentSSID = (state.details as any)?.ssid;
    
    if (currentSSID === homeSSID) {
      return true;
    }

    // Fallback: check if on a known home IP range (more reliable on iOS)
    const ipAddress = (state.details as any)?.ipAddress;
    const homeIPPrefix = await AsyncStorage.getItem(HOME_IP_PREFIX_KEY);
    
    if (ipAddress && homeIPPrefix && ipAddress.startsWith(homeIPPrefix)) {
      return true;
    }

    return false;
  }

  /**
   * Subscribe to network changes
   */
  static subscribe(callback: (isHome: boolean) => void) {
    return NetInfo.addEventListener(async (state) => {
      const isHome = await this.isOnHomeNetwork();
      callback(isHome);
    });
  }

  /**
   * Auto-detect and save home network (call when user is at home)
   */
  static async detectAndSaveHomeNetwork() {
    const state = await NetInfo.fetch();
    
    if (state.type === 'wifi') {
      const ssid = (state.details as any)?.ssid;
      const ipAddress = (state.details as any)?.ipAddress;
      
      // Always save SOMETHING - use "Unknown" if SSID not available
      const ssidToSave = ssid || 'Unknown';
      console.log('[WiFiDetection] Saving SSID:', ssidToSave);
      await this.setHomeNetwork(ssidToSave);
      
      // Save IP prefix for fallback detection
      if (ipAddress) {
        const prefix = ipAddress.split('.').slice(0, 3).join('.');
        await AsyncStorage.setItem(HOME_IP_PREFIX_KEY, prefix);
      }
      
      return { ssid: ssidToSave, ipAddress };
    }
    
    return null;
  }

  /**
   * Clear home network configuration
   */
  static async clearHomeNetwork() {
    this.homeSSID = null;
    await AsyncStorage.removeItem(HOME_WIFI_KEY);
    await AsyncStorage.removeItem(HOME_IP_PREFIX_KEY);
  }
}
