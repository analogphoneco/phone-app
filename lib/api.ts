import { Platform } from "react-native";
import Constants from "expo-constants";

// Minimal helper to pick a reachable backend base URL depending on environment.
// - If expo `extra.api` is provided, that is used (recommended for devices).
// - On Android emulator, use 10.0.2.2 which routes to host machine.
// - Otherwise default to localhost (iOS simulator / web when running locally).
export function getApiBase(port = 4000) {
  const expoExtra = (Constants?.manifest?.extra ?? Constants?.expoConfig?.extra) as
    | Record<string, any>
    | undefined;

  if (expoExtra && typeof expoExtra.api === "string" && expoExtra.api.length > 0) {
    return expoExtra.api;
  }

  if (Platform.OS === "android") {
    // Android emulator (default Android Studio emulator) maps host localhost -> 10.0.2.2
    return `http://10.0.2.2:${port}`;
  }

  // iOS simulator and web usually can reach localhost
  return `http://localhost:${port}`;
}
