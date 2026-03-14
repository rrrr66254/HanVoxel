// SaaS 요금제
export interface Plan {
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
  isActive: boolean;
}

// 회사 구독 상태
export interface CompanySubscription {
  planType: string;
  trialEndsAt: string | null;
  isTrialActive: boolean;
  daysRemaining: number | null;
}
