import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3, Target } from 'lucide-react';

// ── 목 데이터 ──
const MOCK_DAILY = [
  { date: '03-12', planned: 450, actual: 420 },
  { date: '03-13', planned: 450, actual: 435 },
  { date: '03-14', planned: 500, actual: 480 },
  { date: '03-15', planned: 500, actual: 510 },
  { date: '03-16', planned: 400, actual: 380 },
  { date: '03-17', planned: 450, actual: 425 },
  { date: '03-18', planned: 480, actual: 195 },
];

const MOCK_DEFECT_BY_PRODUCT = [
  { product: '서스펜션 암', rate: 4.0, count: 8 },
  { product: '실린더 헤드', rate: 3.8, count: 4 },
  { product: '브레이크 패드', rate: 1.7, count: 3 },
  { product: '엔진 밸브', rate: 0.8, count: 1 },
  { product: '크랭크샤프트', rate: 0.0, count: 0 },
];

const MOCK_OEE = [
  { name: '1호 프레스', oee: 82.5 },
  { name: '용접 라인 A', oee: 71.2 },
  { name: '도장 공정', oee: 45.0 },
  { name: '조립 라인 B', oee: 88.3 },
  { name: '검사 공정', oee: 92.1 },
  { name: '2호 프레스', oee: 0 },
];

const MOCK_DEFECT_REASONS = [
  { code: 'WEL', name: '용접불량', count: 6, pct: 37.5 },
  { code: 'DIM', name: '치수불량', count: 4, pct: 25.0 },
  { code: 'SUR', name: '표면결함', count: 3, pct: 18.8 },
  { code: 'MAT', name: '재료불량', count: 2, pct: 12.5 },
  { code: 'ASM', name: '조립오류', count: 1, pct: 6.2 },
];

type Period = 'week' | 'month' | 'lastMonth';

interface ProductionAnalyticsProps {
  onBack: () => void;
}

// ── 공통 스타일 ──
const card: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 8,
  padding: 20,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

// ── 불량률 색상 반환 ──
function defectColor(rate: number): string {
  if (rate > 5) return 'var(--accent-red)';
  if (rate >= 2) return 'var(--accent-orange)';
  return 'var(--accent-green)';
}

// ── OEE 색상 반환 ──
function oeeColor(oee: number): string {
  if (oee >= 85) return 'var(--accent-green)';
  if (oee >= 65) return 'var(--accent-orange)';
  return 'var(--accent-red)';
}

export function ProductionAnalytics({ onBack }: ProductionAnalyticsProps) {
  const [period, setPeriod] = useState<Period>('month');

  // ── KPI 카드 데이터 ──
  const kpis = useMemo(() => [
    { label: '이번 달 생산 달성률', value: '87.5%', trend: 2.1, up: true },
    { label: '평균 불량률', value: '2.3%', trend: 0.4, up: false },
    { label: '평균 OEE', value: '78.2%', trend: 1.8, up: true },
    { label: '납기 준수율', value: '94.1%', trend: 0.7, up: true },
    { label: '설비 가동률', value: '82.6%', trend: 1.2, up: false },
    { label: '작업자 1인당 생산량', value: '45.2개/일', trend: 3.5, up: true },
  ], []);

  // 일별 차트 최대값 계산
  const dailyMax = useMemo(
    () => Math.max(...MOCK_DAILY.flatMap(d => [d.planned, d.actual])),
    [],
  );

  // 불량률 최대값
  const maxDefectRate = useMemo(
    () => Math.max(...MOCK_DEFECT_BY_PRODUCT.map(d => d.rate), 1),
    [],
  );

  const periods: { key: Period; label: string }[] = [
    { key: 'week', label: '이번 주' },
    { key: 'month', label: '이번 달' },
    { key: 'lastMonth', label: '지난 달' },
  ];

  return (
    <div style={{ padding: 24, color: 'var(--text-primary)', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* ── 1. 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>생산 분석</h1>
        </div>

        {/* 기간 선택 */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', borderRadius: 6, padding: 3, border: '1px solid var(--border-default)' }}>
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '6px 14px', borderRadius: 4, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500,
                background: period === p.key ? 'var(--accent-blue)' : 'transparent',
                color: period === p.key ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. KPI 카드 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {kpis.map((k, i) => {
          // 불량률은 하락이 좋음
          const isPositive = i === 1 ? !k.up : k.up;
          return (
            <div key={k.label} style={{ ...card, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{k.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 700 }}>{k.value}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 2 }}>
                  {k.up ? '▲' : '▼'} {k.trend}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. 일별 생산량 vs 계획량 ── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={sectionTitle}>
          <BarChart3 size={16} style={{ color: 'var(--accent-blue)' }} />
          일별 생산량 vs 계획량
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MOCK_DAILY.map(d => {
            const planPct = (d.planned / dailyMax) * 100;
            const actualPct = (d.actual / dailyMax) * 100;
            const fillColor = d.actual >= d.planned ? 'var(--accent-green)' : 'var(--accent-orange)';
            return (
              <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 44, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>{d.date}</span>
                <div style={{ flex: 1, position: 'relative', height: 28 }}>
                  {/* 계획량 바 (외곽선) */}
                  <div style={{
                    position: 'absolute', top: 2, left: 0, height: 24,
                    width: `${planPct}%`, border: '1.5px dashed var(--accent-blue)',
                    borderRadius: 4, boxSizing: 'border-box', opacity: 0.6,
                  }} />
                  {/* 실적 바 */}
                  <div style={{
                    position: 'absolute', top: 4, left: 0, height: 20,
                    width: `${actualPct}%`, background: fillColor,
                    borderRadius: 3, opacity: 0.85, transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ width: 90, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                  {d.actual} / {d.planned}
                </div>
              </div>
            );
          })}
        </div>
        {/* 범례 */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 3, borderTop: '2px dashed var(--accent-blue)', display: 'inline-block' }} /> 계획
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 8, background: 'var(--accent-green)', borderRadius: 2, display: 'inline-block' }} /> 달성
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 8, background: 'var(--accent-orange)', borderRadius: 2, display: 'inline-block' }} /> 미달
          </span>
        </div>
      </div>

      {/* 2열 레이아웃: 불량률 + OEE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* ── 4. 품목별 불량률 ── */}
        <div style={card}>
          <div style={sectionTitle}>
            <Target size={16} style={{ color: 'var(--accent-orange)' }} />
            품목별 불량률 (Top 5)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MOCK_DEFECT_BY_PRODUCT.map(d => (
              <div key={d.product}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-primary)' }}>{d.product}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{d.rate}% ({d.count}건)</span>
                </div>
                <div style={{ height: 14, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${(d.rate / maxDefectRate) * 100}%`,
                    background: defectColor(d.rate), borderRadius: 3,
                    transition: 'width 0.3s', minWidth: d.rate > 0 ? 4 : 0,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. 작업장별 OEE ── */}
        <div style={card}>
          <div style={sectionTitle}>
            <BarChart3 size={16} style={{ color: 'var(--accent-green)' }} />
            작업장별 OEE 비교
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MOCK_OEE.map(d => (
              <div key={d.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-primary)' }}>{d.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{d.oee}%</span>
                </div>
                <div style={{ position: 'relative', height: 14, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                  {/* OEE 바 */}
                  <div style={{
                    height: '100%', width: `${d.oee}%`,
                    background: oeeColor(d.oee), borderRadius: 3,
                    transition: 'width 0.3s', minWidth: d.oee > 0 ? 4 : 0,
                  }} />
                  {/* 목표선 85% */}
                  <div style={{
                    position: 'absolute', top: 0, left: '85%', width: 2,
                    height: '100%', background: 'var(--text-muted)', opacity: 0.5,
                  }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 2, background: 'var(--text-muted)', display: 'inline-block' }} />
            목표 85%
          </div>
        </div>
      </div>

      {/* 2열 레이아웃: 불량 원인 + 병목 분석 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* ── 6. 불량 원인 분석 ── */}
        <div style={card}>
          <div style={sectionTitle}>
            <AlertTriangle size={16} style={{ color: 'var(--accent-red)' }} />
            불량 원인 분석
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOCK_DEFECT_REASONS.map(d => (
              <div key={d.code} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 36, fontSize: 11, fontWeight: 600,
                  color: 'var(--accent-blue)', background: 'var(--bg-hover)',
                  borderRadius: 3, padding: '2px 0', textAlign: 'center', flexShrink: 0,
                }}>
                  {d.code}
                </span>
                <span style={{ width: 64, fontSize: 13, color: 'var(--text-primary)', flexShrink: 0 }}>{d.name}</span>
                <div style={{ flex: 1, height: 14, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${d.pct}%`,
                    background: 'var(--accent-red)', borderRadius: 3,
                    opacity: 0.75, transition: 'width 0.3s',
                  }} />
                </div>
                <span style={{ width: 60, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                  {d.count}건 ({d.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 7. 병목 분석 ── */}
        <div style={{
          ...card,
          border: '1px solid var(--accent-orange)',
          background: 'var(--bg-secondary)',
        }}>
          <div style={sectionTitle}>
            <AlertTriangle size={16} style={{ color: 'var(--accent-orange)' }} />
            병목 분석
          </div>

          {/* 주요 병목 알림 */}
          <div style={{
            background: 'var(--bg-hover)', borderRadius: 6, padding: 16, marginBottom: 16,
            borderLeft: '4px solid var(--accent-orange)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-orange)', marginBottom: 6 }}>
              WO 평균 3.2시간 지연 — 용접 공정 병목
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              용접 라인 A의 OEE가 71.2%로 목표 대비 13.8%p 미달합니다.
              해당 공정에서 발생한 용접불량(6건)이 후속 공정 지연의 주요 원인입니다.
            </div>
          </div>

          {/* 권고 사항 */}
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>개선 권고</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <TrendingUp size={14} style={{ color: 'var(--accent-green)', marginTop: 2, flexShrink: 0 }} />
                <span>용접 치구 점검 주기를 2주 → 1주로 단축</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <TrendingUp size={14} style={{ color: 'var(--accent-green)', marginTop: 2, flexShrink: 0 }} />
                <span>야간조 용접 작업자 1명 추가 배치 검토</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <TrendingDown size={14} style={{ color: 'var(--accent-red)', marginTop: 2, flexShrink: 0 }} />
                <span>미조치 시 월 납기 준수율 90% 이하 예상</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
