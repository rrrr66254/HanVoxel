import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// 거래처 대시보드 Props
interface PartnerDashboardProps {
  onBack: () => void;
}

// 월별 매출/매입 추이 데이터 (12개월)
const monthlyTrendData = [
  { month: '1월', 매출: 3200, 매입: 2100 },
  { month: '2월', 매출: 3500, 매입: 2300 },
  { month: '3월', 매출: 3800, 매입: 2500 },
  { month: '4월', 매출: 3600, 매입: 2400 },
  { month: '5월', 매출: 4100, 매입: 2800 },
  { month: '6월', 매출: 3900, 매입: 2600 },
  { month: '7월', 매출: 4200, 매입: 2900 },
  { month: '8월', 매출: 4000, 매입: 2700 },
  { month: '9월', 매출: 4500, 매입: 3100 },
  { month: '10월', 매출: 4300, 매입: 3000 },
  { month: '11월', 매출: 4600, 매입: 3400 },
  { month: '12월', 매출: 4800, 매입: 3200 },
];

// 업체별 거래액 파이 차트 데이터 (Top 5)
const partnerPieData = [
  { name: '삼성전자 부품', value: 1850 },
  { name: '현대모비스', value: 1420 },
  { name: 'LG이노텍', value: 980 },
  { name: 'SK하이닉스', value: 760 },
  { name: '한화솔루션', value: 540 },
];

// 파이 차트 색상
const PIE_COLORS = [
  'var(--accent-blue)',
  'var(--accent-green)',
  'var(--accent-orange)',
  'var(--accent-purple)',
  'var(--accent-red)',
];

// 상위 매출처 Top 5
const topSalesPartners = [
  { rank: 1, name: '삼성전자 부품', amount: 1850, ratio: 38.5 },
  { rank: 2, name: '현대모비스', amount: 1420, ratio: 29.6 },
  { rank: 3, name: 'LG이노텍', amount: 680, ratio: 14.2 },
  { rank: 4, name: 'SK하이닉스', amount: 520, ratio: 10.8 },
  { rank: 5, name: '한화솔루션', amount: 330, ratio: 6.9 },
];

// 상위 매입처 Top 5
const topPurchasePartners = [
  { rank: 1, name: '포스코 강판', amount: 980, ratio: 30.6 },
  { rank: 2, name: '롯데케미칼', amount: 760, ratio: 23.8 },
  { rank: 3, name: '두산중공업', amount: 540, ratio: 16.9 },
  { rank: 4, name: '효성첨단소재', amount: 480, ratio: 15.0 },
  { rank: 5, name: '코오롱인더', amount: 440, ratio: 13.7 },
];

// 연체 업체 데이터
interface OverduePartner {
  name: string;
  amount: number;
  overdueDays: 30 | 60 | 90;
  lastPaymentDate: string;
}

const overduePartners: OverduePartner[] = [
  { name: '대한물류', amount: 450, overdueDays: 90, lastPaymentDate: '2025-12-15' },
  { name: '서울산업', amount: 320, overdueDays: 60, lastPaymentDate: '2026-01-20' },
  { name: '부산기계', amount: 180, overdueDays: 30, lastPaymentDate: '2026-02-10' },
  { name: '인천전자', amount: 250, overdueDays: 60, lastPaymentDate: '2026-01-05' },
];

// 금액 포맷 함수 (만원 단위)
const formatAmount = (value: number): string => {
  if (value >= 10000) {
    const억 = Math.floor(value / 10000);
    const 나머지 = value % 10000;
    if (나머지 === 0) return `${억}억`;
    return `${억}억 ${나머지.toLocaleString()}만`;
  }
  return `${value.toLocaleString()}만`;
};

// 연체 기간 색상 반환
const getOverdueSeverityColor = (days: 30 | 60 | 90): string => {
  switch (days) {
    case 30:
      return 'var(--accent-orange)';
    case 60:
      return 'var(--accent-orange)';
    case 90:
      return 'var(--accent-red)';
  }
};

// 연체 기간 배경색 반환
const getOverdueSeverityBg = (days: 30 | 60 | 90): string => {
  switch (days) {
    case 30:
      return 'rgba(243, 156, 18, 0.15)';
    case 60:
      return 'rgba(230, 126, 34, 0.15)';
    case 90:
      return 'rgba(231, 76, 60, 0.15)';
  }
};

// 커스텀 툴팁 컴포넌트 (Bar Chart)
const CustomBarTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
        {label}
      </p>
      {payload.map((entry, idx) => (
        <p key={idx} style={{ margin: 0, color: entry.color, fontSize: 13 }}>
          {entry.name}: ₩{entry.value.toLocaleString()}만
        </p>
      ))}
    </div>
  );
};

// 커스텀 툴팁 컴포넌트 (Pie Chart)
const CustomPieTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { name: string; value: number } }>;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0];
  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
        {data.payload.name}
      </p>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
        ₩{data.value.toLocaleString()}만
      </p>
    </div>
  );
};

export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ onBack }) => {
  // KPI 카드 데이터
  const kpiCards = [
    {
      title: '이번 달 총 매출액',
      value: '₩4,800만',
      change: '+12%',
      isPositive: true,
      icon: TrendingUp,
      color: 'var(--accent-blue)',
    },
    {
      title: '이번 달 총 매입액',
      value: '₩3,200만',
      change: '-5%',
      isPositive: true, // 매입 감소는 긍정적
      icon: TrendingDown,
      color: 'var(--accent-green)',
    },
    {
      title: '미수금 합계',
      value: '₩1,200만',
      change: '',
      isPositive: false,
      icon: DollarSign,
      color: 'var(--accent-orange)',
    },
    {
      title: '미지급금 합계',
      value: '₩800만',
      change: '',
      isPositive: false,
      icon: CreditCard,
      color: 'var(--accent-purple)',
    },
  ];

  return (
    <div style={{ padding: 24, background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
          거래처 대시보드
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          매출/매입 현황 및 거래처별 분석
        </p>
      </div>

      {/* KPI 카드 4개 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {kpiCards.map((card, idx) => {
          const IconComponent = card.icon;
          return (
            <div
              key={idx}
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 12,
                padding: '20px 20px',
                border: '1px solid var(--border-muted)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                  {card.title}
                </p>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: `${card.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconComponent size={16} style={{ color: card.color }} />
                </div>
              </div>
              <p
                style={{
                  margin: 0,
                  marginTop: 8,
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                {card.value}
              </p>
              {card.change && (
                <p
                  style={{
                    margin: 0,
                    marginTop: 4,
                    fontSize: 12,
                    color: card.isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
                    fontWeight: 500,
                  }}
                >
                  전월 대비 {card.change}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Row 2: 차트 영역 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* 월별 매출/매입 추이 Bar Chart */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid var(--border-muted)',
          }}
        >
          <h3 style={{ margin: 0, marginBottom: 16, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            월별 매출/매입 추이
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTrendData} barGap={2}>
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border-muted)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v.toLocaleString()}`}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
              />
              <Bar dataKey="매출" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} barSize={14} />
              <Bar dataKey="매입" fill="var(--accent-orange)" radius={[4, 4, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 업체별 거래액 Pie Chart */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid var(--border-muted)',
          }}
        >
          <h3 style={{ margin: 0, marginBottom: 16, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            업체별 거래액
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={partnerPieData}
                cx="50%"
                cy="50%"
                outerRadius={95}
                innerRadius={55}
                dataKey="value"
                nameKey="name"
                paddingAngle={3}
              >
                {partnerPieData.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value: string) => (
                  <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: 테이블 영역 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* 상위 매출처 Top 5 */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid var(--border-muted)',
          }}
        >
          <h3 style={{ margin: 0, marginBottom: 16, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            상위 매출처 Top 5
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['순위', '업체명', '거래액', '비중(%)'].map((header) => (
                  <th
                    key={header}
                    style={{
                      textAlign: header === '업체명' ? 'left' : 'center',
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      borderBottom: '1px solid var(--border-muted)',
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topSalesPartners.map((partner) => (
                <tr
                  key={partner.rank}
                  style={{ borderBottom: '1px solid var(--border-muted)' }}
                >
                  <td
                    style={{
                      textAlign: 'center',
                      padding: '10px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--accent-blue)',
                    }}
                  >
                    {partner.rank}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                    }}
                  >
                    {partner.name}
                  </td>
                  <td
                    style={{
                      textAlign: 'center',
                      padding: '10px 12px',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                    }}
                  >
                    ₩{formatAmount(partner.amount)}
                  </td>
                  <td
                    style={{
                      textAlign: 'center',
                      padding: '10px 12px',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {partner.ratio}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 상위 매입처 Top 5 */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid var(--border-muted)',
          }}
        >
          <h3 style={{ margin: 0, marginBottom: 16, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            상위 매입처 Top 5
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['순위', '업체명', '매입액', '비중(%)'].map((header) => (
                  <th
                    key={header}
                    style={{
                      textAlign: header === '업체명' ? 'left' : 'center',
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      borderBottom: '1px solid var(--border-muted)',
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topPurchasePartners.map((partner) => (
                <tr
                  key={partner.rank}
                  style={{ borderBottom: '1px solid var(--border-muted)' }}
                >
                  <td
                    style={{
                      textAlign: 'center',
                      padding: '10px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--accent-orange)',
                    }}
                  >
                    {partner.rank}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                    }}
                  >
                    {partner.name}
                  </td>
                  <td
                    style={{
                      textAlign: 'center',
                      padding: '10px 12px',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                    }}
                  >
                    ₩{formatAmount(partner.amount)}
                  </td>
                  <td
                    style={{
                      textAlign: 'center',
                      padding: '10px 12px',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {partner.ratio}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4: 연체 업체 경고 목록 */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 12,
          padding: 20,
          border: '1px solid var(--border-muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <AlertTriangle size={18} style={{ color: 'var(--accent-red)' }} />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            연체 업체 경고 목록
          </h3>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {overduePartners.map((partner, idx) => {
            const severityColor = getOverdueSeverityColor(partner.overdueDays);
            const severityBg = getOverdueSeverityBg(partner.overdueDays);
            return (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-primary)',
                  borderRadius: 10,
                  padding: 16,
                  border: `1px solid ${severityColor}40`,
                  borderLeft: `4px solid ${severityColor}`,
                }}
              >
                {/* 업체명 + 연체 기간 배지 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {partner.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: severityColor,
                      background: severityBg,
                      padding: '3px 8px',
                      borderRadius: 12,
                    }}
                  >
                    {partner.overdueDays === 90 ? '90일+' : `${partner.overdueDays}일`}
                  </span>
                </div>
                {/* 연체 금액 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <DollarSign size={14} style={{ color: severityColor }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: severityColor }}>
                    ₩{formatAmount(partner.amount)}
                  </span>
                </div>
                {/* 마지막 결제일 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    마지막 결제: {partner.lastPaymentDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
