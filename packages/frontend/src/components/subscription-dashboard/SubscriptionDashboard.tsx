/**
 * 관리자 구독 현황 대시보드
 * - 현재 플랜 정보 + 사용량 게이지
 * - 결제 내역 테이블
 * - 플랜 변경/취소 액션
 */
import { useState, useEffect, useCallback } from 'react';
import type { SubscriptionDetail, PaymentRecord, PlanData } from '../../api/billing-api';
import {
  getSubscription,
  getPayments,
  getPlans,
  cancelSubscription,
  createCheckout,
} from '../../api/billing-api';

// ── Mock 데이터 ────────────────────────────────────────

const MOCK_SUBSCRIPTION: SubscriptionDetail = {
  companyId: 'demo-company',
  companyName: '(주)한복셀 물류',
  planType: 'GROWTH',
  planName: 'Growth',
  subscriptionStatus: 'active',
  billingInterval: 'monthly',
  currentPeriodEnd: new Date(Date.now() + 20 * 86400000).toISOString(),
  trialEndsAt: null,
  isTrialActive: false,
  daysRemaining: null,
  usage: {
    sites: { current: 2, max: 5 },
    users: { current: 8, max: 20 },
    objects: { current: 1247, max: 5000 },
  },
  pricing: { monthly: 490000, yearly: 4900000 },
};

const MOCK_PAYMENTS: PaymentRecord[] = [
  { id: '1', stripeInvoiceId: 'in_mock1', amount: 490000, currency: 'krw', status: 'paid', planCode: 'GROWTH', billingInterval: 'monthly', periodStart: new Date(Date.now() - 30 * 86400000).toISOString(), periodEnd: new Date().toISOString(), description: 'Growth 월간 구독', createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: '2', stripeInvoiceId: 'in_mock2', amount: 490000, currency: 'krw', status: 'paid', planCode: 'GROWTH', billingInterval: 'monthly', periodStart: new Date(Date.now() - 60 * 86400000).toISOString(), periodEnd: new Date(Date.now() - 30 * 86400000).toISOString(), description: 'Growth 월간 구독', createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: '3', stripeInvoiceId: 'in_mock3', amount: 490000, currency: 'krw', status: 'paid', planCode: 'GROWTH', billingInterval: 'monthly', periodStart: new Date(Date.now() - 90 * 86400000).toISOString(), periodEnd: new Date(Date.now() - 60 * 86400000).toISOString(), description: 'Growth 월간 구독', createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
];

const COMPANY_ID = 'demo-company';

const statusLabel: Record<string, string> = {
  trialing: '트라이얼',
  active: '활성',
  past_due: '결제 지연',
  canceled: '취소됨',
  unpaid: '미결제',
};
const statusColor: Record<string, string> = {
  trialing: 'bg-blue-600',
  active: 'bg-green-600',
  past_due: 'bg-yellow-600',
  canceled: 'bg-red-600',
  unpaid: 'bg-red-600',
};
const paymentStatusLabel: Record<string, string> = {
  paid: '결제 완료',
  failed: '결제 실패',
  refunded: '환불',
  pending: '대기 중',
};

interface Props {
  onBack: () => void;
  onUpgrade: () => void;
}

export function SubscriptionDashboard({ onBack, onUpgrade }: Props) {
  const [sub, setSub] = useState<SubscriptionDetail | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subResult, payResult] = await Promise.all([
        getSubscription(COMPANY_ID),
        getPayments(COMPANY_ID),
      ]);
      setSub(subResult ?? MOCK_SUBSCRIPTION);
      setPayments(payResult.length > 0 ? payResult : MOCK_PAYMENTS);
    } catch {
      setSub(MOCK_SUBSCRIPTION);
      setPayments(MOCK_PAYMENTS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCancel = async () => {
    const success = await cancelSubscription(COMPANY_ID);
    if (success) {
      setCancelConfirm(false);
      loadData();
    } else {
      alert('구독 취소에 실패했습니다.');
    }
  };

  const formatPrice = (amount: number) => new Intl.NumberFormat('ko-KR').format(amount) + '원';
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('ko-KR');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
        로딩 중...
      </div>
    );
  }

  const s = sub ?? MOCK_SUBSCRIPTION;
  const usagePercent = (item: { current: number; max: number }) =>
    item.max > 0 ? Math.min(100, Math.round((item.current / item.max) * 100)) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <button onClick={onBack} className="text-gray-400 hover:text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-lg font-bold">구독 관리</h1>
            <p className="text-xs text-gray-500">{s.companyName}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {/* 현재 플랜 카드 */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{s.planName}</h2>
                <span className={`rounded-full px-3 py-0.5 text-xs font-bold text-white ${statusColor[s.subscriptionStatus] ?? 'bg-gray-600'}`}>
                  {statusLabel[s.subscriptionStatus] ?? s.subscriptionStatus}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {s.billingInterval === 'yearly' ? '연간' : '월간'} 결제
                {s.currentPeriodEnd && ` / 다음 결제: ${formatDate(s.currentPeriodEnd)}`}
              </p>
              {s.isTrialActive && s.daysRemaining != null && (
                <p className="mt-1 text-sm text-blue-400">트라이얼 {s.daysRemaining}일 남음</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">
                {s.pricing.monthly === 0 ? '무료' : formatPrice(
                  s.billingInterval === 'yearly' ? Math.round(s.pricing.yearly / 12) : s.pricing.monthly,
                )}
              </div>
              <div className="text-xs text-gray-500">
                {s.pricing.monthly > 0 ? '/월' : ''}
                {s.billingInterval === 'yearly' && s.pricing.yearly > 0 && ` (연 ${formatPrice(s.pricing.yearly)})`}
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="mt-5 flex gap-3">
            <button
              onClick={onUpgrade}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              플랜 변경
            </button>
            {s.subscriptionStatus === 'active' && s.planType !== 'STARTER' && (
              <button
                onClick={() => setCancelConfirm(true)}
                className="rounded-lg border border-red-700/50 bg-red-900/20 px-5 py-2.5 text-sm text-red-400 hover:bg-red-900/40"
              >
                구독 취소
              </button>
            )}
          </div>
        </div>

        {/* 사용량 */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-300">리소스 사용량</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {([
              { label: '사이트', item: s.usage.sites },
              { label: '사용자', item: s.usage.users },
              { label: '공간 객체', item: s.usage.objects },
            ] as const).map(({ label, item }) => {
              const pct = usagePercent(item);
              const isNearLimit = pct >= 80;
              return (
                <div key={label} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-400">{label}</span>
                    <span className={`text-lg font-bold ${isNearLimit ? 'text-yellow-400' : 'text-white'}`}>
                      {item.current.toLocaleString()} <span className="text-xs text-gray-500">/ {item.max >= 999 ? '무제한' : item.max.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 90 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-right text-xs text-gray-600">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 결제 내역 */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-300">결제 내역</h3>
          {payments.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">결제 내역이 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                    <th className="pb-2 pr-4">날짜</th>
                    <th className="pb-2 pr-4">설명</th>
                    <th className="pb-2 pr-4">기간</th>
                    <th className="pb-2 pr-4 text-right">금액</th>
                    <th className="pb-2 text-right">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-800/50">
                      <td className="py-3 pr-4 text-gray-400">{formatDate(p.createdAt)}</td>
                      <td className="py-3 pr-4">{p.description ?? `${p.planCode} 구독`}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500">
                        {formatDate(p.periodStart)} ~ {formatDate(p.periodEnd)}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">{formatPrice(p.amount)}</td>
                      <td className="py-3 text-right">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          p.status === 'paid' ? 'bg-green-900/30 text-green-400'
                            : p.status === 'failed' ? 'bg-red-900/30 text-red-400'
                              : 'bg-gray-800 text-gray-400'
                        }`}>
                          {paymentStatusLabel[p.status] ?? p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 취소 확인 모달 */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-gray-800 bg-gray-950 p-6">
            <h3 className="text-lg font-bold text-white">구독을 취소하시겠습니까?</h3>
            <p className="mt-2 text-sm text-gray-400">
              현재 결제 기간이 끝나면 구독이 해지됩니다. 해지 후에는 Starter(무료) 플랜으로 전환됩니다.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700"
              >
                구독 취소
              </button>
              <button
                onClick={() => setCancelConfirm(false)}
                className="flex-1 rounded-lg border border-gray-700 py-2.5 text-sm text-gray-400 hover:text-white"
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
