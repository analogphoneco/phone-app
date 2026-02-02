/**
 * Subscription and billing API client for the Phone app.
 * Handles all subscription, plan, and billing-related API calls.
 */

import { getApiBase } from "./api";
import { getApiKey } from "./storage";
import type {
  Plan,
  Customer,
  Subscription,
  PhoneLine,
  PaymentMethod,
  Invoice,
  UsageSummary,
  PlansResponse,
  PlanResponse,
  CustomerResponse,
  SubscriptionResponse,
  SubscriptionsResponse,
  PhoneLinesResponse,
  PhoneLineResponse,
  PaymentMethodsResponse,
  InvoicesResponse,
  SetupIntentResponse,
  BillingPortalResponse,
  UsageResponse,
  ApiResponse,
} from "../types/subscription";

const API_BASE = getApiBase();

// ---- Helper Functions ----

async function getHeaders(): Promise<Record<string, string>> {
  const apiKey = await getApiKey();
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { "X-Api-Key": apiKey } : {}),
  };
}

async function fetchApi<T extends ApiResponse>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getHeaders();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return data as T;
}

// ---- Plans API ----

/**
 * List all available subscription plans
 */
export async function listPlans(): Promise<Plan[]> {
  const data = await fetchApi<PlansResponse>("/api/plans");
  return data.plans;
}

/**
 * Get a specific plan by ID
 */
export async function getPlan(planId: string): Promise<Plan> {
  const data = await fetchApi<PlanResponse>(`/api/plans/${planId}`);
  return data.plan;
}

/**
 * Create a new plan (admin only)
 */
export async function createPlan(params: {
  name: string;
  description?: string;
  priceCents: number;
  currency?: string;
  interval?: "month" | "year";
  features?: string[];
  phoneLinesIncluded?: number;
  minutesIncluded?: number;
  smsIncluded?: number;
}): Promise<Plan> {
  const data = await fetchApi<PlanResponse>("/api/plans", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return data.plan;
}

/**
 * Update a plan (admin only)
 */
export async function updatePlan(
  planId: string,
  updates: Partial<{
    name: string;
    description: string;
    features: string[];
    phoneLinesIncluded: number;
    active: boolean;
  }>
): Promise<Plan> {
  const data = await fetchApi<PlanResponse>(`/api/plans/${planId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return data.plan;
}

/**
 * Deactivate a plan (admin only)
 */
export async function deactivatePlan(planId: string): Promise<Plan> {
  const data = await fetchApi<PlanResponse>(`/api/plans/${planId}`, {
    method: "DELETE",
  });
  return data.plan;
}

// ---- Customers API ----

/**
 * Create a new customer
 */
export async function createCustomer(params: {
  id?: string;
  email: string;
  name: string;
}): Promise<Customer> {
  const data = await fetchApi<CustomerResponse>("/api/customers", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return data.customer;
}

/**
 * Get a customer by ID
 */
export async function getCustomer(customerId: string): Promise<Customer> {
  const data = await fetchApi<CustomerResponse>(`/api/customers/${customerId}`);
  return data.customer;
}

/**
 * Update a customer
 */
export async function updateCustomer(
  customerId: string,
  updates: Partial<{ email: string; name: string }>
): Promise<Customer> {
  const data = await fetchApi<CustomerResponse>(`/api/customers/${customerId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return data.customer;
}

/**
 * Get a setup intent for adding a payment method
 * Returns a client secret for use with Stripe.js
 */
export async function getSetupIntent(customerId: string): Promise<string> {
  const data = await fetchApi<SetupIntentResponse>(
    `/api/customers/${customerId}/setup-intent`,
    { method: "POST" }
  );
  return data.clientSecret;
}

/**
 * Get payment sheet parameters for in-app payment
 * Returns params needed to initialize Stripe PaymentSheet
 */
export async function getPaymentSheetParams(
  customerId: string,
  amount: number,
  currency: string = "usd"
): Promise<{
  paymentIntent: string;
  ephemeralKey: string;
  customer: string;
  publishableKey: string;
}> {
  const headers = await getHeaders();
  const response = await fetch(
    `${API_BASE}/api/customers/${customerId}/payment-sheet`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        amount,
        currency,
        apiVersion: "2024-12-18.acacia", // Match your Stripe SDK version
      }),
    }
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to get payment sheet params");
  }
  return {
    paymentIntent: data.paymentIntent,
    ephemeralKey: data.ephemeralKey,
    customer: data.customer,
    publishableKey: data.publishableKey,
  };
}

/**
 * Get payment sheet parameters for an existing subscription (for incomplete payments)
 * Returns params needed to initialize Stripe PaymentSheet with the subscription's payment intent
 */
export async function getSubscriptionPaymentSheetParams(
  subscriptionId: string
): Promise<{
  paymentIntent: string;
  ephemeralKey: string;
  customer: string;
  publishableKey: string;
}> {
  const headers = await getHeaders();
  const response = await fetch(
    `${API_BASE}/api/subscriptions/${subscriptionId}/payment-sheet`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        apiVersion: "2024-12-18.acacia",
      }),
    }
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to get subscription payment sheet params");
  }
  return {
    paymentIntent: data.paymentIntent,
    ephemeralKey: data.ephemeralKey,
    customer: data.customer,
    publishableKey: data.publishableKey,
  };
}

/**
 * Sync subscription status from Stripe after payment completes
 */
export async function syncSubscriptionFromStripe(
  subscriptionId: string
): Promise<Subscription> {
  const data = await fetchApi<SubscriptionResponse>(
    `/api/subscriptions/${subscriptionId}/sync`,
    { method: "POST" }
  );
  return data.subscription;
}

/**
 * Get a Stripe Checkout Session URL for subscription payment
 * Opens in browser for easy payment without native SDK
 */
export async function getCheckoutSessionUrl(
  customerId: string,
  planId: string
): Promise<string> {
  const headers = await getHeaders();
  const response = await fetch(
    `${API_BASE}/api/customers/${customerId}/checkout-session`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ planId }),
    }
  );
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to create checkout session");
  }
  return data.url;
}

/**
 * List payment methods for a customer
 */
export async function listPaymentMethods(
  customerId: string
): Promise<PaymentMethod[]> {
  const data = await fetchApi<PaymentMethodsResponse>(
    `/api/customers/${customerId}/payment-methods`
  );
  return data.paymentMethods;
}

/**
 * Set the default payment method for a customer
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<void> {
  await fetchApi(`/api/customers/${customerId}/default-payment-method`, {
    method: "POST",
    body: JSON.stringify({ paymentMethodId }),
  });
}

/**
 * Get the Stripe billing portal URL for a customer
 */
export async function getBillingPortalUrl(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const data = await fetchApi<BillingPortalResponse>(
    `/api/customers/${customerId}/billing-portal`,
    {
      method: "POST",
      body: JSON.stringify({ returnUrl }),
    }
  );
  return data.url;
}

/**
 * List invoices for a customer
 */
export async function listInvoices(
  customerId: string,
  limit = 10
): Promise<Invoice[]> {
  const data = await fetchApi<InvoicesResponse>(
    `/api/customers/${customerId}/invoices?limit=${limit}`
  );
  return data.invoices;
}

// ---- Subscriptions API ----

/**
 * Create a new subscription
 */
export async function createSubscription(params: {
  customerId: string;
  planId: string;
}): Promise<Subscription> {
  const data = await fetchApi<SubscriptionResponse>("/api/subscriptions", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return data.subscription;
}

/**
 * Get a subscription by ID
 */
export async function getSubscription(subscriptionId: string): Promise<Subscription> {
  const data = await fetchApi<SubscriptionResponse>(
    `/api/subscriptions/${subscriptionId}`
  );
  return data.subscription;
}

/**
 * Get the active subscription for a customer
 */
export async function getActiveSubscription(
  customerId: string
): Promise<Subscription | null> {
  try {
    const data = await fetchApi<SubscriptionResponse>(
      `/api/customers/${customerId}/subscription`
    );
    return data.subscription;
  } catch (error) {
    // No active subscription
    return null;
  }
}

/**
 * List all subscriptions for a customer
 */
export async function listSubscriptions(customerId: string): Promise<Subscription[]> {
  const data = await fetchApi<SubscriptionsResponse>(
    `/api/customers/${customerId}/subscriptions`
  );
  return data.subscriptions;
}

/**
 * Change the plan for a subscription
 */
export async function changePlan(
  subscriptionId: string,
  planId: string
): Promise<Subscription> {
  const data = await fetchApi<SubscriptionResponse>(
    `/api/subscriptions/${subscriptionId}/change-plan`,
    {
      method: "POST",
      body: JSON.stringify({ planId }),
    }
  );
  return data.subscription;
}

/**
 * Cancel a subscription
 * @param immediately - If true, cancel immediately. If false, cancel at period end.
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<Subscription> {
  const data = await fetchApi<SubscriptionResponse>(
    `/api/subscriptions/${subscriptionId}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ immediately }),
    }
  );
  return data.subscription;
}

/**
 * Reactivate a subscription that was set to cancel at period end
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Subscription> {
  const data = await fetchApi<SubscriptionResponse>(
    `/api/subscriptions/${subscriptionId}/reactivate`,
    { method: "POST" }
  );
  return data.subscription;
}

// ---- Phone Lines API ----

/**
 * List phone lines for a subscription
 */
export async function listPhoneLines(subscriptionId: string): Promise<PhoneLine[]> {
  const data = await fetchApi<PhoneLinesResponse>(
    `/api/subscriptions/${subscriptionId}/phone-lines`
  );
  return data.phoneLines;
}

/**
 * Provision a new phone line for a subscription
 */
export async function provisionPhoneLine(
  subscriptionId: string,
  phoneNumber: string
): Promise<PhoneLine> {
  const data = await fetchApi<PhoneLineResponse>(
    `/api/subscriptions/${subscriptionId}/phone-lines`,
    {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    }
  );
  return data.phoneLine;
}

/**
 * Get a phone line by ID
 */
export async function getPhoneLine(lineId: string): Promise<PhoneLine> {
  const data = await fetchApi<PhoneLineResponse>(`/api/phone-lines/${lineId}`);
  return data.phoneLine;
}

/**
 * Suspend a phone line
 */
export async function suspendPhoneLine(lineId: string): Promise<PhoneLine> {
  const data = await fetchApi<PhoneLineResponse>(
    `/api/phone-lines/${lineId}/suspend`,
    { method: "POST" }
  );
  return data.phoneLine;
}

/**
 * Release (delete) a phone line
 */
export async function releasePhoneLine(lineId: string): Promise<PhoneLine> {
  const data = await fetchApi<PhoneLineResponse>(`/api/phone-lines/${lineId}`, {
    method: "DELETE",
  });
  return data.phoneLine;
}

// ---- Usage API ----

/**
 * Get usage summary for a subscription
 */
export async function getUsageSummary(
  subscriptionId: string,
  startDate?: string,
  endDate?: string
): Promise<{ usage: UsageSummary; period: { start: string; end: string } }> {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await fetchApi<UsageResponse>(
    `/api/subscriptions/${subscriptionId}/usage${query}`
  );
  return { usage: data.usage, period: data.period };
}

/**
 * Record usage for a subscription (usually called by backend/webhooks)
 */
export async function recordUsage(
  subscriptionId: string,
  params: {
    phoneLineId?: string;
    type: "call" | "sms" | "mms";
    direction?: "inbound" | "outbound";
    quantity?: number;
    unit?: string;
  }
): Promise<void> {
  await fetchApi(`/api/subscriptions/${subscriptionId}/usage`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ---- Utility Functions ----

/**
 * Format a price in cents to a display string
 */
export function formatPrice(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Check if a subscription is active (usable)
 */
export function isSubscriptionActive(subscription: Subscription): boolean {
  return ["active", "trialing"].includes(subscription.status);
}

/**
 * Check if a subscription will be canceled
 */
export function isSubscriptionCanceling(subscription: Subscription): boolean {
  return subscription.cancel_at_period_end && subscription.status !== "canceled";
}

/**
 * Get a human-readable subscription status
 */
export function getSubscriptionStatusText(subscription: Subscription): string {
  if (subscription.status === "canceled") return "Canceled";
  if (subscription.cancel_at_period_end) return "Canceling at period end";
  if (subscription.status === "past_due") return "Payment overdue";
  if (subscription.status === "trialing") return "Trial";
  if (subscription.status === "active") return "Active";
  if (subscription.status === "incomplete") return "Payment required";
  return subscription.status;
}
