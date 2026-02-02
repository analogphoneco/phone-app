/**
 * Contacts integration for matching phone numbers to names
 */

import * as Contacts from 'expo-contacts';

let contactsCache: Map<string, string> | null = null;
let contactsPermissionGranted = false;

/**
 * Request permission to access contacts
 */
export async function requestContactsPermission(): Promise<boolean> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    contactsPermissionGranted = status === 'granted';
    return contactsPermissionGranted;
  } catch (error) {
    console.error('[Contacts] Permission request failed:', error);
    return false;
  }
}

/**
 * Check if we have contacts permission
 */
export async function hasContactsPermission(): Promise<boolean> {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    contactsPermissionGranted = status === 'granted';
    return contactsPermissionGranted;
  } catch (error) {
    console.error('[Contacts] Permission check failed:', error);
    return false;
  }
}

/**
 * Load all contacts and build a phone number -> name cache
 */
export async function loadContactsCache(): Promise<void> {
  if (!contactsPermissionGranted) {
    const granted = await requestContactsPermission();
    if (!granted) {
      console.log('[Contacts] Permission denied, cannot load contacts');
      return;
    }
  }

  try {
    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
      ],
    });

    // Build a map of normalized phone numbers to contact names
    const cache = new Map<string, string>();
    
    for (const contact of data) {
      const name = contact.name || 'Unknown';
      
      if (contact.phoneNumbers) {
        for (const phone of contact.phoneNumbers) {
          if (phone.number) {
            // Normalize phone number (remove spaces, dashes, parentheses)
            const normalized = normalizePhoneNumber(phone.number);
            cache.set(normalized, name);
          }
        }
      }
    }

    contactsCache = cache;
    console.log(`[Contacts] Loaded ${cache.size} phone numbers from ${data.length} contacts`);
  } catch (error) {
    console.error('[Contacts] Failed to load contacts:', error);
  }
}

/**
 * Normalize a phone number for comparison
 * Removes all non-digit characters except leading +
 */
function normalizePhoneNumber(phoneNumber: string): string {
  // Keep leading + for international numbers
  const hasPlus = phoneNumber.startsWith('+');
  const digits = phoneNumber.replace(/\D/g, '');
  
  // For US numbers, normalize to include country code
  if (!hasPlus && digits.length === 10) {
    return '+1' + digits;
  }
  
  return hasPlus ? '+' + digits : digits;
}

/**
 * Get contact name for a phone number
 */
export function getContactName(phoneNumber: string): string | null {
  if (!contactsCache) {
    return null;
  }

  const normalized = normalizePhoneNumber(phoneNumber);
  
  // Try exact match first
  if (contactsCache.has(normalized)) {
    return contactsCache.get(normalized)!;
  }

  // Try without country code (last 10 digits)
  if (normalized.length > 10) {
    const last10 = normalized.slice(-10);
    for (const [key, value] of contactsCache.entries()) {
      if (key.endsWith(last10)) {
        return value;
      }
    }
  }

  return null;
}

/**
 * Get contact name or return formatted phone number
 */
export function getContactNameOrNumber(phoneNumber: string): string {
  const name = getContactName(phoneNumber);
  return name || phoneNumber;
}

/**
 * Clear the contacts cache (useful for debugging or refreshing)
 */
export function clearContactsCache(): void {
  contactsCache = null;
}

/**
 * Check if contacts are loaded
 */
export function areContactsLoaded(): boolean {
  return contactsCache !== null && contactsCache.size > 0;
}
