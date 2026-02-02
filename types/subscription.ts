/**
 * Subscription and billing types for the Phone app.
 */

// ---- Plans ----

export interface Plan {
  id: string;
  name: string;
  description: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  price_cents: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  phone_lines_included: number;
  minutes_included: number; // 0 = unlimited
  sms_included: number; // 0 = unlimited
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Customers ----

export interface Customer {
  id: string;
  email: string;
  name: string;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Subscriptions ----

export type SubscriptionStatus =
  | "pending"
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  // Only present when subscription requires payment confirmation
  clientSecret?: string;
}

// ---- Phone Lines ----

export type PhoneLineStatus = "pending" | "active" | "suspended" | "released";

export interface PhoneLine {
  id: string;
  subscription_id: string;
  phone_number: string;
  telnyx_connection_id: string | null;
  telnyx_phone_number_id: string | null;
  status: PhoneLineStatus;
  created_at: string;
  updated_at: string;
}

// ---- Usage ----

export interface UsageSummary {
  call?: number;
  sms?: number;
  mms?: number;
  [key: string]: number | undefined;
}

// ---- Payment Methods ----

export interface PaymentMethod {
  id: string;
  type: "card";
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

// ---- Invoices ----

export interface Invoice {
  id: string;
  number: string | null;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  amount_due: number;
  amount_paid: number;
  currency: string;
  period_start: number;
  period_end: number;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

// ---- API Response Types ----

export interface ApiResponse<T = unknown> {
  ok: boolean;
  error?: string;
  [key: string]: T | boolean | string | undefined;
}

export interface PlansResponse extends ApiResponse {
  plans: Plan[];
}

export interface PlanResponse extends ApiResponse {
  plan: Plan;
}

export interface CustomerResponse extends ApiResponse {
  customer: Customer;
}

export interface SubscriptionResponse extends ApiResponse {
  subscription: Subscription;
}

export interface SubscriptionsResponse extends ApiResponse {
  subscriptions: Subscription[];
}

export interface PhoneLinesResponse extends ApiResponse {
  phoneLines: PhoneLine[];
}

export interface PhoneLineResponse extends ApiResponse {
  phoneLine: PhoneLine;
}

export interface PaymentMethodsResponse extends ApiResponse {
  paymentMethods: PaymentMethod[];
}

export interface InvoicesResponse extends ApiResponse {
  invoices: Invoice[];
}

export interface SetupIntentResponse extends ApiResponse {
  clientSecret: string;
}

export interface BillingPortalResponse extends ApiResponse {
  url: string;
}

export interface UsageResponse extends ApiResponse {
  usage: UsageSummary;
  period: {
    start: string;
    end: string;
  };
}
