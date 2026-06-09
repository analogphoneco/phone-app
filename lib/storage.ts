// Simple storage helper that prefers expo-secure-store. If it's not installed
// the functions will throw a helpful error instructing the developer to
// install the dependency (run `expo install expo-secure-store`).

export async function saveCredentials(payload: { customerId: string }) {
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

// ---- API Key Storage ----

export async function saveApiKey(apiKey: string) {
  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync("phone_api_key", apiKey);
  } catch (e) {
    console.warn("expo-secure-store not available. Install it with: expo install expo-secure-store");
    throw new Error("SecureStore not available. Run `expo install expo-secure-store`");
  }
}

export async function getApiKey(): Promise<string | null> {
  try {
    const SecureStore = await import("expo-secure-store");
    return await SecureStore.getItemAsync("phone_api_key");
  } catch (e) {
    console.warn("expo-secure-store not available. Install it with: expo install expo-secure-store");
    return null;
  }
}

export async function clearApiKey() {
  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.deleteItemAsync("phone_api_key");
  } catch (e) {
    console.warn("expo-secure-store not available. Install it with: expo install expo-secure-store");
  }
}

// ---- Customer ID Storage ----

export async function saveCustomerId(customerId: string) {
  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync("phone_customer_id", customerId);
  } catch (e) {
    console.warn("expo-secure-store not available. Install it with: expo install expo-secure-store");
    throw new Error("SecureStore not available. Run `expo install expo-secure-store`");
  }
}

export async function getCustomerId(): Promise<string | null> {
  try {
    const SecureStore = await import("expo-secure-store");
    // First try the dedicated customer ID key
    const customerId = await SecureStore.getItemAsync("phone_customer_id");
    if (customerId) return customerId;
    
    // Fall back to credentials for backward compatibility
    const raw = await SecureStore.getItemAsync("phone_credentials");
    if (raw) {
      const creds = JSON.parse(raw);
      return creds?.customerId || null;
    }
    return null;
  } catch (e) {
    console.warn("expo-secure-store not available. Install it with: expo install expo-secure-store");
    return null;
  }
}

export async function clearCustomerId() {
  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.deleteItemAsync("phone_customer_id");
  } catch (e) {
    console.warn("expo-secure-store not available. Install it with: expo install expo-secure-store");
  }
}
