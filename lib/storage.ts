// Simple storage helper that prefers expo-secure-store. If it's not installed
// the functions will throw a helpful error instructing the developer to
// install the dependency (run `expo install expo-secure-store`).

export async function saveCredentials(payload: { customerId: string; userName: string }) {
  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync("phone_credentials", JSON.stringify(payload));
  } catch (e) {
    console.warn("expo-secure-store not available. Install it with: expo install expo-secure-store");
    throw new Error("SecureStore not available. Run `expo install expo-secure-store`");
  }
}

export async function getCredentials() {
  try {
    const SecureStore = await import("expo-secure-store");
    const raw = await SecureStore.getItemAsync("phone_credentials");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("expo-secure-store not available. Install it with: expo install expo-secure-store");
    return null;
  }
}

export async function clearCredentials() {
  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.deleteItemAsync("phone_credentials");
  } catch (e) {
    console.warn("expo-secure-store not available. Install it with: expo install expo-secure-store");
  }
}
