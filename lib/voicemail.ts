/**
 * Voicemail API client for the Phone app.
 */

import { getApiBase } from "./api";
import { getApiKey } from "./storage";

// ---- Types ----

export interface Voicemail {
  id: string;
  customer_id: string;
  phone_line_id: string | null;
  from_number: string;
  to_number: string | null;
  call_control_id: string;
  recording_url: string | null;
  duration_seconds: number;
  transcription: string | null;
  is_new: number;
  created_at: string;
}

export interface VoicemailGreeting {
  id?: string;
  customer_id?: string;
  greeting_url: string | null;
  greeting_text: string | null;
  created_at?: string;
  updated_at?: string;
}

// ---- Helper Functions ----

async function getHeaders(): Promise<Record<string, string>> {
  const apiKey = await getApiKey();
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { "X-Api-Key": apiKey } : {}),
  };
}

// ---- Voicemail API ----

/**
 * List voicemails for a customer
 */
export async function listVoicemails(
  customerId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ voicemails: Voicemail[]; newCount: number }> {
  const { limit = 50, offset = 0 } = options;
  const headers = await getHeaders();
  const apiBase = getApiBase();
  const response = await fetch(
    `${apiBase}/api/customers/${customerId}/voicemails?limit=${limit}&offset=${offset}`,
    { headers }
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to fetch voicemails");
  }
  return { voicemails: data.voicemails, newCount: data.newCount };
}

/**
 * Get new voicemail count
 */
export async function getNewVoicemailCount(customerId: string): Promise<number> {
  const headers = await getHeaders();
  const apiBase = getApiBase();
  const response = await fetch(
    `${apiBase}/api/customers/${customerId}/voicemails/count`,
    { headers }
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to get voicemail count");
  }
  return data.count;
}

/**
 * Get a single voicemail
 */
export async function getVoicemail(voicemailId: string): Promise<Voicemail> {
  const headers = await getHeaders();
  const apiBase = getApiBase();
  const response = await fetch(
    `${apiBase}/api/voicemails/${voicemailId}`,
    { headers }
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Voicemail not found");
  }
  return data.voicemail;
}

/**
 * Mark a voicemail as listened
 */
export async function markVoicemailAsListened(voicemailId: string): Promise<Voicemail> {
  const headers = await getHeaders();
  const apiBase = getApiBase();
  const response = await fetch(
    `${apiBase}/api/voicemails/${voicemailId}/listened`,
    { method: "POST", headers }
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to mark voicemail as listened");
  }
  return data.voicemail;
}

/**
 * Mark all voicemails as listened
 */
export async function markAllVoicemailsAsListened(customerId: string): Promise<void> {
  const headers = await getHeaders();
  const apiBase = getApiBase();
  const response = await fetch(
    `${apiBase}/api/customers/${customerId}/voicemails/mark-all-listened`,
    { method: "POST", headers }
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to mark voicemails as listened");
  }
}

/**
 * Delete a voicemail
 */
export async function deleteVoicemail(voicemailId: string): Promise<void> {
  const headers = await getHeaders();
  const apiBase = getApiBase();
  const response = await fetch(
    `${apiBase}/api/voicemails/${voicemailId}`,
    { method: "DELETE", headers }
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to delete voicemail");
  }
}

/**
 * Download voicemail recording
 * Returns the recording URL that can be opened with Linking or downloaded
 */
export async function getVoicemailRecordingUrl(voicemailId: string): Promise<string | null> {
  const headers = await getHeaders();
  const apiBase = getApiBase();
  const response = await fetch(
    `${apiBase}/api/voicemails/${voicemailId}`,
    { headers }
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to get voicemail");
  }
  return data.voicemail?.recording_url || null;
}

/**
 * Get voicemail greeting
 */
export async function getVoicemailGreeting(customerId: string): Promise<VoicemailGreeting> {
  const headers = await getHeaders();
  const apiBase = getApiBase();
  const response = await fetch(
    `${apiBase}/api/customers/${customerId}/voicemail-greeting`,
    { headers }
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to get greeting");
  }
  return data.greeting;
}

/**
 * Update voicemail greeting text
 */
export async function setVoicemailGreetingText(
  customerId: string,
  greetingText: string
): Promise<VoicemailGreeting> {
  const headers = await getHeaders();
  const apiBase = getApiBase();
  const response = await fetch(
    `${apiBase}/api/customers/${customerId}/voicemail-greeting`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ greetingText }),
    }
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to update greeting");
  }
  return data.greeting;
}

// ---- Formatting Helpers ----

/**
 * Format duration in seconds to mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(number: string): string {
  // Remove any non-digit characters except +
  const cleaned = number.replace(/[^\d+]/g, "");
  
  // Format US numbers
  if (cleaned.startsWith("+1") && cleaned.length === 12) {
    return `(${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return number;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}
