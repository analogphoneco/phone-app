import { Platform } from "react-native";
import Constants from "expo-constants";

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
