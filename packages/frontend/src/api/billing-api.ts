const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

// ── 타입 ────────────────────────────────────────────────

export interface UsageItem {
  current: number;
  max: number;
}

export interface SubscriptionDetail {
  companyId: string;
  companyName: string;
  planType: string;
  planName: string;
  subscriptionStatus: string;
  billingInterval: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  isTrialActive: boolean;
  daysRemaining: number | null;
  usage: {
    sites: UsageItem;
    users: UsageItem;
    objects: UsageItem;
  };
  pricing: {
    monthly: number;
    yearly: number;
  };
}

export interface PaymentRecord {
  id: string;
  stripeInvoiceId: string | null;
  amount: number;
  currency: string;
  status: string;
  planCode: string;
  billingInterval: string;
  periodStart: string;
  periodEnd: string;
  description: string | null;
  createdAt: string;
}

export interface PlanData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxSites: number;
  maxUsers: number;
  maxObjects: number;
  trialDays: number;
  features: Record<string, boolean> | null;
  sortOrder: number;
}

// ── API 함수 ────────────────────────────────────────────

export async function getPlans(): Promise<PlanData[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/plans`);
    const json: ApiResponse<PlanData[]> = await res.json();
    return json.success && json.data ? json.data : [];
  } catch {
    return [];
  }
}

export async function getSubscription(companyId: string): Promise<SubscriptionDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/billing/subscription/${companyId}`);
    const json: ApiResponse<SubscriptionDetail> = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function getPayments(companyId: string, limit = 20): Promise<PaymentRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/billing/payments/${companyId}?limit=${limit}`);
    const json: ApiResponse<PaymentRecord[]> = await res.json();
    return json.success && json.data ? json.data : [];
  } catch {
    return [];
  }
}

export async function createCheckout(
  companyId: string,
  planCode: string,
  billingInterval: 'monthly' | 'yearly' = 'monthly',
): Promise<{ sessionId: string; url: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/billing/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, planCode, billingInterval }),
    });
    const json: ApiResponse<{ sessionId: string; url: string }> = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function cancelSubscription(companyId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/billing/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId }),
    });
    const json: ApiResponse<unknown> = await res.json();
    return json.success;
  } catch {
    return false;
  }
}

export async function upgradeSubscription(companyId: string, planCode: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/billing/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, planCode }),
    });
    const json: ApiResponse<unknown> = await res.json();
    return json.success;
  } catch {
    return false;
  }
}
