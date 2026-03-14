/**
 * 플랜 업그레이드 유도 모달
 * - 플랜 제한 초과 시 또는 업그레이드 버튼 클릭 시 표시
 * - Starter → Growth → Enterprise 플랜 비교 + 결제 연동
 */
import { useState, useEffect } from 'react';
import type { PlanData } from '../../api/billing-api';
import { getPlans, createCheckout } from '../../api/billing-api';

// Mock 플랜 데이터 (오프라인/개발용)
const MOCK_PLANS: PlanData[] = [
  {
    id: 'p1', code: 'STARTER', name: 'Starter', description: '소규모 창고를 위한 무료 플랜',
    priceMonthly: 0, priceYearly: 0, maxSites: 1, maxUsers: 3, maxObjects: 500,
    trialDays: 14, features: { anomalyDetection: false, slaMonitoring: false, qcManagement: false, mobilePicking: false }, sortOrder: 0,
  },
  {
    id: 'p2', code: 'GROWTH', name: 'Growth', description: '중소 물류센터를 위한 성장 플랜',
    priceMonthly: 490000, priceYearly: 4900000, maxSites: 5, maxUsers: 20, maxObjects: 5000,
    trialDays: 14, features: { anomalyDetection: true, slaMonitoring: true, qcManagement: true, mobilePicking: true }, sortOrder: 1,
  },
  {
    id: 'p3', code: 'ENTERPRISE', name: 'Enterprise', description: '대규모 물류 운영을 위한 엔터프라이즈 플랜',
    priceMonthly: 1490000, priceYearly: 14900000, maxSites: 999, maxUsers: 999, maxObjects: 99999,
    trialDays: 14, features: { anomalyDetection: true, slaMonitoring: true, qcManagement: true, mobilePicking: true }, sortOrder: 2,
  },
];

const featureLabels: Record<string, string> = {
  anomalyDetection: '이상 탐지 알림',
  slaMonitoring: 'SLA 모니터링',
  qcManagement: '품질 검수 관리',
  mobilePicking: '모바일 피킹',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
  companyId?: string;
  /** 제한 초과 메시지 (ex: "사이트 제한 1개에 도달했습니다") */
  limitMessage?: string;
}

export function UpgradeModal({ isOpen, onClose, currentPlan = 'STARTER', companyId, limitMessage }: Props) {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const result = await getPlans();
      setPlans(result.length > 0 ? result : MOCK_PLANS);
    })();
  }, [isOpen]);

  const handleCheckout = async (planCode: string) => {
    if (!companyId) {
      alert('데모 모드에서는 결제가 지원되지 않습니다.');
      return;
    }
    setLoading(true);
    const result = await createCheckout(companyId, planCode, billingInterval);
    setLoading(false);
    if (result?.url) {
      window.location.href = result.url;
    } else {
      alert('결제 세션 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  if (!isOpen) return null;

  const formatPrice = (amount: number) => {
    if (amount === 0) return '무료';
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const displayPlans = plans.length > 0 ? plans : MOCK_PLANS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-4xl rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="border-b border-gray-800 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">플랜 업그레이드</h2>
              {limitMessage && (
                <p className="mt-1 text-sm text-red-400">{limitMessage}</p>
              )}
              {!limitMessage && (
                <p className="mt-1 text-sm text-gray-500">비즈니스에 맞는 플랜을 선택하세요</p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* 결제 주기 토글 */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                billingInterval === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              월간 결제
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                billingInterval === 'yearly' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              연간 결제 <span className="ml-1 text-xs text-green-400">17% 할인</span>
            </button>
          </div>
        </div>

        {/* 플랜 카드 */}
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
          {displayPlans.map((plan) => {
            const isCurrent = plan.code === currentPlan;
            const isPopular = plan.code === 'GROWTH';
            const price = billingInterval === 'yearly' ? plan.priceYearly : plan.priceMonthly;
            const monthlyEquivalent = billingInterval === 'yearly' && plan.priceYearly > 0
              ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;
            const features = (plan.features ?? {}) as Record<string, boolean>;

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border p-5 transition-colors ${
                  isPopular
                    ? 'border-blue-600 bg-blue-950/20'
                    : isCurrent
                      ? 'border-green-700/50 bg-green-950/10'
                      : 'border-gray-800 bg-gray-900/50'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-bold text-white">
                    인기
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-3 py-0.5 text-xs font-bold text-white">
                    현재 플랜
                  </span>
                )}

                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="mt-1 text-xs text-gray-500">{plan.description}</p>

                <div className="mt-4">
                  <span className="text-3xl font-bold text-white">
                    {price === 0 ? '무료' : formatPrice(monthlyEquivalent)}
                  </span>
                  {price > 0 && <span className="text-sm text-gray-500">/월</span>}
                  {billingInterval === 'yearly' && price > 0 && (
                    <div className="mt-0.5 text-xs text-gray-500">연 {formatPrice(price)} 청구</div>
                  )}
                </div>

                {/* 제한 */}
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>사이트</span>
                    <span className="font-medium text-white">{plan.maxSites >= 999 ? '무제한' : `${plan.maxSites}개`}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>사용자</span>
                    <span className="font-medium text-white">{plan.maxUsers >= 999 ? '무제한' : `${plan.maxUsers}명`}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>공간 객체</span>
                    <span className="font-medium text-white">{plan.maxObjects >= 99999 ? '무제한' : `${plan.maxObjects.toLocaleString()}개`}</span>
                  </div>
                </div>

                {/* 기능 */}
                <div className="mt-4 border-t border-gray-800 pt-3 space-y-1.5">
                  {Object.entries(featureLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {features[key] ? (
                        <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      )}
                      <span className={features[key] ? 'text-gray-300' : 'text-gray-600'}>{label}</span>
                    </div>
                  ))}
                </div>

                {/* 액션 */}
                <div className="mt-5">
                  {isCurrent ? (
                    <button disabled className="w-full rounded-lg bg-gray-800 py-2.5 text-sm font-medium text-gray-500">
                      현재 플랜
                    </button>
                  ) : plan.code === 'STARTER' ? (
                    <button disabled className="w-full rounded-lg bg-gray-800 py-2.5 text-sm font-medium text-gray-500">
                      무료 플랜
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCheckout(plan.code)}
                      disabled={loading}
                      className={`w-full rounded-lg py-2.5 text-sm font-bold text-white transition-colors ${
                        isPopular
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      } disabled:opacity-50`}
                    >
                      {loading ? '처리 중...' : '시작하기'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
