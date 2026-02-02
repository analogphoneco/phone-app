import { Platform } from "react-native";
import Constants from "expo-constants";
import { getApiKey, saveApiKey, getCustomerId } from "./storage";

// Minimal helper to pick a reachable backend base URL depending on environment.
// - iOS simulator: always use 127.0.0.1 (most reliable)
// - Android emulator: use 10.0.2.2 which routes to host machine
// - Physical devices / other: use expo `extra.api` if provided, else localhost
export function getApiBase(port = 4000) {
  // iOS simulator: always use 127.0.0.1 directly (extra.api is for physical devices)
  if (Platform.OS === "ios" && !Constants.isDevice) {
    return `http://127.0.0.1:${port}`;
  }

  // Android emulator: use special IP that maps to host localhost
  if (Platform.OS === "android" && !Constants.isDevice) {
    return `http://10.0.2.2:${port}`;
  }

  // Physical devices: use extra.api if configured
  const expoExtra = (Constants?.manifest?.extra ?? Constants?.expoConfig?.extra) as
    | Record<string, any>
    | undefined;

  if (expoExtra && typeof expoExtra.api === "string" && expoExtra.api.length > 0) {
    return expoExtra.api;
  }

  // Fallback to production backend for physical devices
  if (Constants.isDevice) {
    return "https://analog-phone-backend-production.up.railway.app";
  }

  // Last resort fallback
  return `http://localhost:${port}`;
}

/**
 * Check if API key is close to expiration and refresh if needed
 * Returns true if key is valid/refreshed, false if expired or error
 */
export async function checkAndRefreshApiKey(): Promise<boolean> {
  try {
    const apiKey = await getApiKey();
    const customerId = await getCustomerId();
    
    if (!apiKey || !customerId) {
      console.log("No API key or customer ID found");
      return false;
    }
    
    // Check if key will expire within 7 days
    // (Backend returns expires_at in customer response, but we store just the key)
    // So we'll call the refresh endpoint to check/extend expiration
    const response = await fetch(`${getApiBase()}/api/customers/${customerId}/refresh-key`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      console.error("Failed to refresh API key:", await response.text());
      return false;
    }
    
    const data = await response.json();
    if (data.ok && data.apiKey) {
      // Save refreshed key (even if it's the same key, expiration is extended)
      await saveApiKey(data.apiKey);
      console.log("API key refreshed successfully, expires:", data.expiresAt);
      return true;
    }
    
    return false;
  } catch (e) {
    console.error("Error checking/refreshing API key:", e);
    return false;
  }
}
