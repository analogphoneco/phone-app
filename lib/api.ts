import { Platform } from "react-native";
import Constants from "expo-constants";
import { getApiKey, saveApiKey, getCustomerId } from "./storage";

// Minimal helper to pick a reachable backend base URL depending on environment.
// - iOS simulator: use localhost
// - Android emulator: use 10.0.2.2 which routes to host machine (or Railway)
// - Physical devices: use Railway production backend
export function getApiBase(port = 4000) {
  // Production: Always use Railway backend
  // For local development, comment this out and uncomment localhost below
  return "https://analog-phone-backend-production.up.railway.app";
  
  // Local development (uncomment when developing locally):
  // if (Platform.OS === "ios" && !Constants.isDevice) {
  //   return `http://127.0.0.1:${port}`;
  // }
  // return "https://analog-phone-backend-production.up.railway.app";
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
      // No credentials yet - user hasn't created account
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
      // Silently fail for invalid/expired keys (401/404) - user will re-authenticate
      // Only log actual errors (server issues, network problems, etc.)
      if (response.status !== 401 && response.status !== 403 && response.status !== 404) {
        const errorText = await response.text();
        console.error("Failed to refresh API key:", errorText);
      }
      return false;
    }
    
    const data = await response.json();
    if (data.ok && data.apiKey) {
      // Save refreshed key (even if it's the same key, expiration is extended)
      await saveApiKey(data.apiKey);
      return true;
    }
    
    return false;
  } catch (e) {
    console.error("Error checking/refreshing API key:", e);
    return false;
  }
}

/**
 * Get payment failures for a customer
 * Returns array of unresolved payment failures
 */
export async function getPaymentFailures(customerId: string): Promise<any[]> {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new Error("No API key found");
    }
    
    const response = await fetch(`${getApiBase()}/api/customers/${customerId}/payment-failures`, {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });
    
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to fetch payment failures");
    }
    
    return data.paymentFailures || [];
  } catch (e) {
    console.error("Error fetching payment failures:", e);
    return [];
  }
}

