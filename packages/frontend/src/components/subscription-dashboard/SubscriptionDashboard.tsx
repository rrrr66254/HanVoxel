/**
 * 관리자 구독 현황 대시보드
 * - 다크 테마 UI (#0D1117 배경)
 * - 현재 플랜 정보 (ENTERPRISE 골드 그라디언트)
 * - 사용량 원형/바 게이지 (사이트/사용자/공간 객체)
 * - 결제 내역 테이블 (지브라 스트라이프)
 * - 플랜 비교 카드 3개 (Starter/Growth/Enterprise)
 * - KPI 카드 (3px 상단 컬러 라인 + lucide 아이콘)
 * - 플랜 변경/취소 액션 + 트라이얼 카운트다운
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Crown,
  CreditCard,
  Building2,
  Users,
  Box,
  Check,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Calendar,
  TrendingUp,
  Shield,
} from 'lucide-react';
import type {
  SubscriptionDetail,
  PaymentRecord,
  PlanData,
  UsageItem,
} from '../../api/billing-api';
import {
  getSubscription,
  getPayments,
  getPlans,
  cancelSubscription,
  createCheckout,
} from '../../api/billing-api';
import { MOCK_COMPANY_ID } from '../../constants/mock-ids';

// ── 테마 색상 상수 ────────────────────────────────────────
const COLORS = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  hoverRow: '#1C2128',
  goldFrom: '#D4A574',
  goldTo: '#B8860B',
} as const;

// ── Mock 데이터 ────────────────────────────────────────
const MOCK_SUBSCRIPTION: SubscriptionDetail = {
  companyId: MOCK_COMPANY_ID,
  companyName: '(주)한복셀 물류',
  planType: 'ENTERPRISE',
  planName: 'Enterprise',
  subscriptionStatus: 'active',
  billingInterval: 'monthly',
  currentPeriodEnd: new Date(Date.now() + 20 * 86400000).toISOString(),
  trialEndsAt: null,
  isTrialActive: false,
  daysRemaining: null,
  usage: {
    sites: { current: 7, max: 20 },
    users: { current: 45, max: 100 },
    objects: { current: 8234, max: 50000 },
  },
  pricing: { monthly: 1500000, yearly: 15000000 },
};

const MOCK_PAYMENTS: PaymentRecord[] = [
  {
    id: '1',
    stripeInvoiceId: 'in_mock1',
    amount: 1500000,
    currency: 'krw',
    status: 'paid',
    planCode: 'ENTERPRISE',
    billingInterval: 'monthly',
    periodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
    periodEnd: new Date().toISOString(),
    description: 'Enterprise 월간 구독',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: '2',
    stripeInvoiceId: 'in_mock2',
    amount: 1500000,
    currency: 'krw',
    status: 'paid',
    planCode: 'ENTERPRISE',
    billingInterval: 'monthly',
    periodStart: new Date(Date.now() - 60 * 86400000).toISOString(),
    periodEnd: new Date(Date.now() - 30 * 86400000).toISOString(),
    description: 'Enterprise 월간 구독',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: '3',
    stripeInvoiceId: 'in_mock3',
    amount: 1500000,
    currency: 'krw',
    status: 'paid',
    planCode: 'ENTERPRISE',
    billingInterval: 'monthly',
    periodStart: new Date(Date.now() - 90 * 86400000).toISOString(),
    periodEnd: new Date(Date.now() - 60 * 86400000).toISOString(),
    description: 'Enterprise 월간 구독',
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
];

// ── 플랜 비교 데이터 ────────────────────────────────────
const PLAN_COMPARISON = [
  {
    code: 'STARTER',
    name: 'Starter',
    price: 1500000,
    priceLabel: '150만원',
    description: '중소 창고 1곳 운영에 최적',
    features: [
      '3D 공간 가시화',
      '기본 WMS',
      '이상 탐지 알림',
      'SLA 모니터링',
      'QC 품질 검수',
      '사이트 1곳',
      '사용자 5명',
    ],
    borderStyle: `1px solid ${COLORS.border}`,
    highlight: false,
    gold: false,
  },
  {
    code: 'GROWTH',
    name: 'Growth',
    price: 4000000,
    priceLabel: '400만원',
    description: '중견기업 성장을 위한 최고의 선택',
    features: [
      'Starter 기능 전체 포함',
      '물류 경량 ERP',
      '동종업계 인텔리전스',
      '자동 발주 추천 엔진',
      '사이트 최대 5곳',
      '사용자 20명',
      '우선 기술 지원',
    ],
    borderStyle: '2px solid #3B82F6',
    highlight: true,
    gold: false,
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    price: 0,
    priceLabel: '커스텀',
    description: '대기업 멀티사이트 완전 통합',
    features: [
      'Growth 기능 전체 포함',
      'AI 레이아웃 어드바이저',
      '고객사 포털',
      'AGV/로봇 연동 API',
      '무제한 사이트',
      '무제한 사용자',
      '전담 기술 매니저',
    ],
    borderStyle: 'none',
    highlight: false,
    gold: true,
  },
];

const COMPANY_ID = MOCK_COMPANY_ID;

// ── 상태 라벨/컬러 매핑 ────────────────────────────────
const statusLabel: Record<string, string> = {
  trialing: '트라이얼',
  active: '활성',
  past_due: '결제 지연',
  canceled: '취소됨',
  unpaid: '미결제',
};
const statusDotColor: Record<string, string> = {
  trialing: '#3B82F6',
  active: '#10B981',
  past_due: '#F59E0B',
  canceled: '#EF4444',
  unpaid: '#EF4444',
};
const paymentStatusLabel: Record<string, string> = {
  paid: '결제 완료',
  failed: '결제 실패',
  refunded: '환불',
  pending: '대기 중',
};

// ── 애니메이션 카운터 훅 ────────────────────────────────
function useAnimatedCounter(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = null;
    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ── 원형 게이지 컴포넌트 ────────────────────────────────
function CircularGauge({
  current,
  max,
  label,
  icon: Icon,
  color,
}: {
  current: number;
  max: number;
  label: string;
  icon: typeof Building2;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const animatedCurrent = useAnimatedCounter(current);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const isNearLimit = pct >= 80;
  const gaugeColor = pct >= 90 ? '#EF4444' : pct >= 80 ? '#F59E0B' : color;

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl p-5"
      style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      {/* 원형 게이지 */}
      <div className="relative flex items-center justify-center">
        <svg width="100" height="100" className="-rotate-90">
          {/* 배경 원 */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={COLORS.border}
            strokeWidth="6"
          />
          {/* 진행 원 */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        {/* 중앙 아이콘 */}
        <div className="absolute flex flex-col items-center">
          <Icon size={18} style={{ color: gaugeColor }} />
          <span
            className="mt-0.5 text-lg font-bold"
            style={{ color: isNearLimit ? gaugeColor : '#E6EDF3' }}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* 라벨 */}
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: '#8B949E' }}>
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold" style={{ color: '#E6EDF3' }}>
          {animatedCurrent.toLocaleString()}
          <span style={{ color: '#484F58' }}> / </span>
          <span style={{ color: '#8B949E' }}>
            {max >= 99999 ? '무제한' : max.toLocaleString()}
          </span>
        </p>
      </div>
    </div>
  );
}

// ── KPI 카드 컴포넌트 ───────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  topColor,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
  topColor: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-5"
      style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      {/* 3px 상단 컬러 라인 */}
      <div
        className="absolute left-0 right-0 top-0 h-[3px]"
        style={{ backgroundColor: topColor }}
      />
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${topColor}15` }}
        >
          <Icon size={20} style={{ color: topColor }} />
        </div>
        <div>
          <p className="text-xs" style={{ color: '#8B949E' }}>
            {label}
          </p>
          <p className="text-lg font-bold" style={{ color: '#E6EDF3' }}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ───────────────────────────────────────
interface SubscriptionDashboardProps {
  onBack: () => void;
  onUpgrade: () => void;
}

export function SubscriptionDashboard({ onBack, onUpgrade }: SubscriptionDashboardProps) {
  const [sub, setSub] = useState<SubscriptionDetail | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  // 데이터 로드
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 구독 취소 핸들러
  const handleCancel = async () => {
    const success = await cancelSubscription(COMPANY_ID);
    if (success) {
      setCancelConfirm(false);
      loadData();
    } else {
      alert('구독 취소에 실패했습니다.');
    }
  };

  // 포맷 유틸
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('ko-KR').format(amount) + '원';
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('ko-KR');

  // 로딩 화면
  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: COLORS.bg }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: `${COLORS.border}`, borderTopColor: 'transparent' }}
          />
          <span style={{ color: '#8B949E' }}>로딩 중...</span>
        </div>
      </div>
    );
  }

  const s = sub ?? MOCK_SUBSCRIPTION;
  const isEnterprise = s.planType === 'ENTERPRISE';

  // 다음 결제일까지 남은 일수
  const daysUntilRenewal = s.currentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(s.currentPeriodEnd).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg, color: '#E6EDF3' }}>
      {/* ── 헤더 ── */}
      <header
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{
          backgroundColor: `${COLORS.bg}E6`,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{ color: '#8B949E' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#E6EDF3')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8B949E')}
          >
            <ArrowLeft size={18} />
            <span>돌아가기</span>
          </button>
          <div className="ml-2">
            <h1 className="text-lg font-bold" style={{ color: '#E6EDF3' }}>
              구독 관리
            </h1>
            <p className="text-xs" style={{ color: '#484F58' }}>
              {s.companyName}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 p-6">
        {/* ── 트라이얼 카운트다운 배너 ── */}
        {s.isTrialActive && s.daysRemaining != null && (
          <div
            className="flex items-center gap-3 rounded-xl px-5 py-4"
            style={{
              background: 'linear-gradient(135deg, #1E3A5F 0%, #0D1117 100%)',
              border: '1px solid #1E4976',
            }}
          >
            <Sparkles size={20} style={{ color: '#60A5FA' }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: '#93C5FD' }}>
                트라이얼 기간 진행 중
              </p>
              <p className="text-xs" style={{ color: '#6B8BB2' }}>
                {s.daysRemaining}일 후 유료 플랜으로 전환됩니다. 지금 업그레이드하면 추가 혜택을 받을 수 있습니다.
              </p>
            </div>
            <div
              className="flex h-12 w-12 flex-col items-center justify-center rounded-full"
              style={{ backgroundColor: '#1E4976' }}
            >
              <span className="text-lg font-bold" style={{ color: '#60A5FA' }}>
                {s.daysRemaining}
              </span>
              <span className="text-[10px]" style={{ color: '#6B8BB2' }}>
                일
              </span>
            </div>
          </div>
        )}

        {/* ── KPI 카드 행 ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={Crown}
            label="현재 플랜"
            value={s.planName}
            topColor={isEnterprise ? '#D4A574' : '#3B82F6'}
          />
          <KpiCard
            icon={CreditCard}
            label="월 결제액"
            value={
              s.pricing.monthly === 0
                ? '커스텀'
                : formatPrice(
                    s.billingInterval === 'yearly'
                      ? Math.round(s.pricing.yearly / 12)
                      : s.pricing.monthly,
                  )
            }
            topColor="#10B981"
          />
          <KpiCard
            icon={Calendar}
            label="다음 결제일"
            value={s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : '-'}
            topColor="#8B5CF6"
          />
          <KpiCard
            icon={TrendingUp}
            label="갱신까지"
            value={`${daysUntilRenewal}일`}
            topColor="#F59E0B"
          />
        </div>

        {/* ── 현재 플랜 카드 (골드 그라디언트) ── */}
        <div
          className="relative overflow-hidden rounded-2xl p-6"
          style={
            isEnterprise
              ? {
                  background: `linear-gradient(135deg, ${COLORS.goldFrom} 0%, ${COLORS.goldTo} 100%)`,
                }
              : {
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                }
          }
        >
          {/* 장식: 배경 패턴 */}
          {isEnterprise && (
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <div
                className="absolute -right-10 -top-10 h-40 w-40 rounded-full"
                style={{ backgroundColor: '#FFFFFF' }}
              />
              <div
                className="absolute -bottom-20 -left-10 h-60 w-60 rounded-full"
                style={{ backgroundColor: '#FFFFFF' }}
              />
            </div>
          )}

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                {isEnterprise && <Crown size={28} style={{ color: '#FFF8E7' }} />}
                <h2
                  className="text-2xl font-bold"
                  style={{ color: isEnterprise ? '#FFF8E7' : '#E6EDF3' }}
                >
                  {s.planName}
                </h2>
                {/* 상태 뱃지 */}
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: isEnterprise ? 'rgba(255,255,255,0.2)' : `${statusDotColor[s.subscriptionStatus] ?? '#6B7280'}20`,
                    color: isEnterprise ? '#FFF8E7' : statusDotColor[s.subscriptionStatus] ?? '#6B7280',
                  }}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: isEnterprise
                        ? '#FFF8E7'
                        : statusDotColor[s.subscriptionStatus] ?? '#6B7280',
                    }}
                  />
                  {statusLabel[s.subscriptionStatus] ?? s.subscriptionStatus}
                </span>
              </div>
              <p
                className="mt-2 text-sm"
                style={{ color: isEnterprise ? 'rgba(255,248,231,0.7)' : '#8B949E' }}
              >
                {s.billingInterval === 'yearly' ? '연간' : '월간'} 결제
                {s.currentPeriodEnd && ` / 다음 결제: ${formatDate(s.currentPeriodEnd)}`}
              </p>
            </div>
            <div className="text-right">
              <div
                className="text-3xl font-bold"
                style={{ color: isEnterprise ? '#FFF8E7' : '#E6EDF3' }}
              >
                {s.pricing.monthly === 0
                  ? '커스텀'
                  : formatPrice(
                      s.billingInterval === 'yearly'
                        ? Math.round(s.pricing.yearly / 12)
                        : s.pricing.monthly,
                    )}
              </div>
              <div
                className="text-xs"
                style={{ color: isEnterprise ? 'rgba(255,248,231,0.6)' : '#484F58' }}
              >
                {s.pricing.monthly > 0 ? '/월' : ''}
                {s.billingInterval === 'yearly' &&
                  s.pricing.yearly > 0 &&
                  ` (연 ${formatPrice(s.pricing.yearly)})`}
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="relative mt-5 flex gap-3">
            <button
              onClick={onUpgrade}
              className="rounded-lg px-5 py-2.5 text-sm font-bold transition-all"
              style={
                isEnterprise
                  ? {
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: '#FFF8E7',
                      backdropFilter: 'blur(4px)',
                    }
                  : { backgroundColor: '#3B82F6', color: '#FFFFFF' }
              }
              onMouseEnter={(e) => {
                if (isEnterprise) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
                } else {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }
              }}
              onMouseLeave={(e) => {
                if (isEnterprise) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                } else {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }
              }}
            >
              플랜 변경
            </button>
            {s.subscriptionStatus === 'active' && s.planType !== 'STARTER' && (
              <button
                onClick={() => setCancelConfirm(true)}
                className="rounded-lg px-5 py-2.5 text-sm transition-all"
                style={
                  isEnterprise
                    ? {
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        color: 'rgba(255,248,231,0.7)',
                        border: '1px solid rgba(255,248,231,0.2)',
                      }
                    : {
                        backgroundColor: 'rgba(239,68,68,0.1)',
                        color: '#F87171',
                        border: '1px solid rgba(239,68,68,0.3)',
                      }
                }
                onMouseEnter={(e) => {
                  if (isEnterprise) {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.3)';
                  } else {
                    e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isEnterprise) {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.2)';
                  } else {
                    e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)';
                  }
                }}
              >
                구독 취소
              </button>
            )}
          </div>
        </div>

        {/* ── 사용량 게이지 ── */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
        >
          <div className="mb-5 flex items-center gap-2">
            <Shield size={16} style={{ color: '#8B949E' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#8B949E' }}>
              리소스 사용량
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <CircularGauge
              current={s.usage.sites.current}
              max={s.usage.sites.max}
              label="사이트"
              icon={Building2}
              color="#3B82F6"
            />
            <CircularGauge
              current={s.usage.users.current}
              max={s.usage.users.max}
              label="사용자"
              icon={Users}
              color="#8B5CF6"
            />
            <CircularGauge
              current={s.usage.objects.current}
              max={s.usage.objects.max}
              label="공간 객체"
              icon={Box}
              color="#10B981"
            />
          </div>
        </div>

        {/* ── 결제 내역 테이블 ── */}
        <div
          className="overflow-hidden rounded-2xl"
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-2 px-6 py-4">
            <CreditCard size={16} style={{ color: '#8B949E' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#8B949E' }}>
              결제 내역
            </h3>
          </div>

          {payments.length === 0 ? (
            /* 빈 상태 */
            <div className="flex flex-col items-center gap-3 py-12">
              <CreditCard size={40} style={{ color: '#30363D' }} />
              <p className="text-sm" style={{ color: '#484F58' }}>
                결제 내역이 없습니다
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: COLORS.card }}>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      style={{ color: '#484F58', borderBottom: `1px solid ${COLORS.border}` }}
                    >
                      날짜
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      style={{ color: '#484F58', borderBottom: `1px solid ${COLORS.border}` }}
                    >
                      설명
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      style={{ color: '#484F58', borderBottom: `1px solid ${COLORS.border}` }}
                    >
                      기간
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider"
                      style={{ color: '#484F58', borderBottom: `1px solid ${COLORS.border}` }}
                    >
                      금액
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider"
                      style={{ color: '#484F58', borderBottom: `1px solid ${COLORS.border}` }}
                    >
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, idx) => (
                    <tr
                      key={p.id}
                      className="transition-colors"
                      style={{
                        backgroundColor: idx % 2 === 0 ? 'transparent' : '#0D1117',
                        borderBottom: `1px solid ${COLORS.border}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.hoverRow;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          idx % 2 === 0 ? 'transparent' : '#0D1117';
                      }}
                    >
                      <td className="whitespace-nowrap px-6 py-4" style={{ color: '#8B949E' }}>
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="px-6 py-4" style={{ color: '#E6EDF3' }}>
                        {p.description ?? `${p.planCode} 구독`}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs" style={{ color: '#484F58' }}>
                        {formatDate(p.periodStart)} ~ {formatDate(p.periodEnd)}
                      </td>
                      <td
                        className="whitespace-nowrap px-6 py-4 text-right font-medium"
                        style={{ color: '#E6EDF3' }}
                      >
                        {formatPrice(p.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor:
                              p.status === 'paid'
                                ? 'rgba(16,185,129,0.1)'
                                : p.status === 'failed'
                                  ? 'rgba(239,68,68,0.1)'
                                  : 'rgba(139,148,158,0.1)',
                            color:
                              p.status === 'paid'
                                ? '#34D399'
                                : p.status === 'failed'
                                  ? '#F87171'
                                  : '#8B949E',
                          }}
                        >
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

        {/* ── 플랜 비교 카드 ── */}
        <div>
          <div className="mb-5 flex items-center gap-2">
            <Sparkles size={16} style={{ color: '#8B949E' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#8B949E' }}>
              플랜 비교
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {PLAN_COMPARISON.map((plan) => {
              const isCurrent = s.planType === plan.code;
              return (
                <div
                  key={plan.code}
                  className="relative flex flex-col overflow-hidden rounded-2xl p-6"
                  style={{
                    backgroundColor: COLORS.card,
                    border: plan.gold ? 'none' : plan.borderStyle,
                    // 골드 그라디언트 보더 (Enterprise)
                    ...(plan.gold
                      ? {
                          backgroundImage: `linear-gradient(${COLORS.card}, ${COLORS.card}), linear-gradient(135deg, ${COLORS.goldFrom}, ${COLORS.goldTo})`,
                          backgroundOrigin: 'border-box',
                          backgroundClip: 'padding-box, border-box',
                          border: '2px solid transparent',
                        }
                      : {}),
                  }}
                >
                  {/* 현재 플랜 표시 */}
                  {isCurrent && (
                    <div
                      className="absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        backgroundColor: plan.gold ? `${COLORS.goldFrom}20` : '#3B82F620',
                        color: plan.gold ? COLORS.goldFrom : '#3B82F6',
                      }}
                    >
                      현재 플랜
                    </div>
                  )}

                  {/* 플랜 아이콘 + 이름 */}
                  <div className="mb-4 flex items-center gap-2">
                    {plan.gold ? (
                      <Crown size={20} style={{ color: COLORS.goldFrom }} />
                    ) : plan.highlight ? (
                      <Sparkles size={20} style={{ color: '#3B82F6' }} />
                    ) : (
                      <Box size={20} style={{ color: '#8B949E' }} />
                    )}
                    <h4
                      className="text-lg font-bold"
                      style={{
                        color: plan.gold ? COLORS.goldFrom : '#E6EDF3',
                      }}
                    >
                      {plan.name}
                    </h4>
                  </div>

                  {/* 가격 */}
                  <div className="mb-1">
                    <span
                      className="text-3xl font-bold"
                      style={{ color: '#E6EDF3' }}
                    >
                      {plan.price === 0 ? '커스텀' : plan.priceLabel}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm" style={{ color: '#484F58' }}>
                        /월
                      </span>
                    )}
                  </div>
                  <p className="mb-5 text-xs" style={{ color: '#8B949E' }}>
                    {plan.description}
                  </p>

                  {/* 기능 목록 */}
                  <ul className="mb-6 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check
                          size={16}
                          className="mt-0.5 shrink-0"
                          style={{
                            color: plan.gold
                              ? COLORS.goldFrom
                              : plan.highlight
                                ? '#3B82F6'
                                : '#8B949E',
                          }}
                        />
                        <span style={{ color: '#C9D1D9' }}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA 버튼 */}
                  <button
                    onClick={onUpgrade}
                    disabled={isCurrent}
                    className="w-full rounded-lg py-2.5 text-sm font-bold transition-all disabled:cursor-default disabled:opacity-40"
                    style={
                      isCurrent
                        ? {
                            backgroundColor: COLORS.border,
                            color: '#484F58',
                          }
                        : plan.gold
                          ? {
                              background: `linear-gradient(135deg, ${COLORS.goldFrom}, ${COLORS.goldTo})`,
                              color: '#FFFFFF',
                            }
                          : plan.highlight
                            ? { backgroundColor: '#3B82F6', color: '#FFFFFF' }
                            : {
                                backgroundColor: 'transparent',
                                color: '#E6EDF3',
                                border: `1px solid ${COLORS.border}`,
                              }
                    }
                    onMouseEnter={(e) => {
                      if (!isCurrent) {
                        if (plan.gold) {
                          e.currentTarget.style.opacity = '0.9';
                        } else if (plan.highlight) {
                          e.currentTarget.style.backgroundColor = '#2563EB';
                        } else {
                          e.currentTarget.style.borderColor = '#8B949E';
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrent) {
                        if (plan.gold) {
                          e.currentTarget.style.opacity = '1';
                        } else if (plan.highlight) {
                          e.currentTarget.style.backgroundColor = '#3B82F6';
                        } else {
                          e.currentTarget.style.borderColor = COLORS.border;
                        }
                      }
                    }}
                  >
                    {isCurrent ? '현재 이용 중' : plan.gold ? '문의하기' : '선택하기'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 취소 확인 모달 ── */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            className="mx-4 w-full max-w-md overflow-hidden rounded-2xl"
            style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            {/* 모달 상단 경고 바 */}
            <div
              className="h-1"
              style={{ backgroundColor: '#EF4444' }}
            />
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}
                >
                  <AlertCircle size={20} style={{ color: '#F87171' }} />
                </div>
                <h3 className="text-lg font-bold" style={{ color: '#E6EDF3' }}>
                  구독을 취소하시겠습니까?
                </h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#8B949E' }}>
                현재 결제 기간이 끝나면 구독이 해지됩니다. 해지 후에는
                Starter(무료) 플랜으로 전환됩니다.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white transition-colors"
                  style={{ backgroundColor: '#DC2626' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#B91C1C';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#DC2626';
                  }}
                >
                  구독 취소
                </button>
                <button
                  onClick={() => setCancelConfirm(false)}
                  className="flex-1 rounded-lg py-2.5 text-sm transition-colors"
                  style={{ color: '#8B949E', border: `1px solid ${COLORS.border}` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#8B949E';
                    e.currentTarget.style.color = '#E6EDF3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = COLORS.border;
                    e.currentTarget.style.color = '#8B949E';
                  }}
                >
                  돌아가기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
