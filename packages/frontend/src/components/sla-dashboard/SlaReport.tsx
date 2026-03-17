import { useState, useMemo } from 'react';
import { FileText, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { SlaTargetData, SlaMetricData, SlaViolationData } from '../../api/sla-api';

const METRIC_LABELS: Record<string, string> = {
  delivery_on_time: '납기 준수율',
  misshipment_rate: '오배송률',
  picking_accuracy: '피킹 정확도',
  avg_processing_time: '평균 처리 시간',
};

/* 다크 테마 색상 (SlaDashboard와 동일) */
const C = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  text: '#C9D1D9',
  textMuted: '#8B949E',
  textDim: '#484F58',
  blue: '#2D7DD2',
  green: '#3FB950',
  greenBg: 'rgba(63,185,80,0.1)',
  red: '#F85149',
  redBg: 'rgba(248,81,73,0.1)',
  yellow: '#D29922',
  yellowBg: 'rgba(210,153,34,0.1)',
  row: '#161B22',
  rowAlt: '#1C2129',
};

interface SlaReportProps {
  target: SlaTargetData;
  metrics: SlaMetricData[];
  violations: SlaViolationData[];
}

export default function SlaReport({ target, metrics, violations }: SlaReportProps) {
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');

  // 기간 필터링
  const filteredMetrics = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    if (periodType === 'weekly') {
      cutoff.setDate(cutoff.getDate() - 7);
    } else {
      cutoff.setDate(cutoff.getDate() - 30);
    }
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return metrics.filter((m) => m.recordDate >= cutoffStr);
  }, [metrics, periodType]);

  const filteredViolations = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    if (periodType === 'weekly') {
      cutoff.setDate(cutoff.getDate() - 7);
    } else {
      cutoff.setDate(cutoff.getDate() - 30);
    }
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return violations.filter((v) => v.violationDate >= cutoffStr);
  }, [violations, periodType]);

  // 집계
  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
  const summary = useMemo(() => {
    if (filteredMetrics.length === 0) return null;
    const avgDelivery = avg(filteredMetrics.map((m) => m.deliveryOnTimeRate));
    const avgMisship = avg(filteredMetrics.map((m) => m.misshipmentRate));
    const avgPick = avg(filteredMetrics.map((m) => m.pickingAccuracy));
    const avgProc = avg(filteredMetrics.map((m) => m.avgProcessingTime));
    return {
      avgDelivery: Math.round(avgDelivery * 100) / 100,
      avgMisship: Math.round(avgMisship * 1000) / 1000,
      avgPick: Math.round(avgPick * 100) / 100,
      avgProc: Math.round(avgProc * 10) / 10,
      totalOrders: filteredMetrics.reduce((s, m) => s + m.totalOrders, 0),
      totalPicks: filteredMetrics.reduce((s, m) => s + m.totalPicks, 0),
      deliveryMet: avgDelivery >= target.deliveryOnTimeTarget,
      misshipMet: avgMisship <= target.misshipmentRateLimit,
      pickMet: avgPick >= target.pickingAccuracyTarget,
      procMet: avgProc <= target.avgProcessingTimeLimit,
    };
  }, [filteredMetrics, target]);

  // 달성 점수 (4 지표 × 25점)
  const overallScore = useMemo(() => {
    if (!summary) return 0;
    let score = 0;
    if (summary.deliveryMet) score += 25;
    else score += Math.max(0, 25 * summary.avgDelivery / target.deliveryOnTimeTarget);
    if (summary.misshipMet) score += 25;
    else score += Math.max(0, 25 * (1 - (summary.avgMisship - target.misshipmentRateLimit) / Math.max(target.misshipmentRateLimit, 0.1)));
    if (summary.pickMet) score += 25;
    else score += Math.max(0, 25 * summary.avgPick / target.pickingAccuracyTarget);
    if (summary.procMet) score += 25;
    else score += Math.max(0, 25 * target.avgProcessingTimeLimit / Math.max(summary.avgProc, 1));
    return Math.round(score * 10) / 10;
  }, [summary, target]);

  const handlePrint = () => { window.print(); };

  const scoreColor = overallScore >= 90 ? C.green : overallScore >= 70 ? C.yellow : C.red;
  const scoreBg = overallScore >= 90 ? C.greenBg : overallScore >= 70 ? C.yellowBg : C.redBg;
  const scoreLabel = overallScore >= 90 ? '우수' : overallScore >= 70 ? '보통' : '미달';

  const thStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 12, fontWeight: 600,
    color: C.textMuted, borderBottom: `1px solid ${C.border}`, textAlign: 'left',
  };
  const tdStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 13, color: C.text,
    borderBottom: `1px solid ${C.border}`,
  };

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* 기간 선택 + PDF */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 4, background: C.card, borderRadius: 10, padding: 3, border: `1px solid ${C.border}` }}>
          {(['weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodType(p)}
              style={{
                padding: '7px 18px', borderRadius: 8, border: 'none',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: periodType === p ? C.blue : 'transparent',
                color: periodType === p ? '#fff' : C.textMuted,
                transition: 'all 0.15s',
              }}
            >
              {p === 'weekly' ? '주간 리포트' : '월간 리포트'}
            </button>
          ))}
        </div>
        <button
          onClick={handlePrint}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            border: `1px solid ${C.border}`, background: C.card,
            color: C.text, fontSize: 13, cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = C.blue}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = C.border}
        >
          <Download size={14} />
          PDF 다운로드
        </button>
      </div>

      {/* 리포트 본문 */}
      <div style={{
        background: C.card, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: 28, display: 'flex', flexDirection: 'column', gap: 28,
      }}>
        {/* 리포트 헤더 */}
        <div style={{ textAlign: 'center', paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
            <FileText size={18} color={C.blue} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>
              SLA {periodType === 'weekly' ? '주간' : '월간'} 리포트
            </h2>
          </div>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>{target.name}</p>
          {filteredMetrics.length > 0 && (
            <p style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>
              기간: {filteredMetrics[0].recordDate} ~ {filteredMetrics[filteredMetrics.length - 1].recordDate}
              ({filteredMetrics.length}일)
            </p>
          )}
        </div>

        {/* 종합 점수 */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            textAlign: 'center', padding: '24px 48px', borderRadius: 16,
            background: scoreBg, border: `1px solid ${scoreColor}30`,
          }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
              {overallScore}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>종합 달성 점수 / 100</div>
            <div style={{
              display: 'inline-block', marginTop: 8,
              padding: '4px 14px', borderRadius: 20,
              background: `${scoreColor}20`, color: scoreColor,
              fontSize: 12, fontWeight: 600,
            }}>
              {scoreLabel}
            </div>
          </div>
        </div>

        {/* KPI 요약 */}
        {summary && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 12px' }}>KPI 요약</h3>
            <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    <th style={thStyle}>지표</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>목표</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>평균 실측</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>달성</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: '납기 준수율', target: `≥ ${target.deliveryOnTimeTarget}%`, actual: `${summary.avgDelivery}%`, met: summary.deliveryMet },
                    { label: '오배송률', target: `≤ ${target.misshipmentRateLimit}%`, actual: `${summary.avgMisship}%`, met: summary.misshipMet },
                    { label: '피킹 정확도', target: `≥ ${target.pickingAccuracyTarget}%`, actual: `${summary.avgPick}%`, met: summary.pickMet },
                    { label: '평균 처리 시간', target: `≤ ${target.avgProcessingTimeLimit}분`, actual: `${summary.avgProc}분`, met: summary.procMet },
                  ].map((row, i) => (
                    <tr key={row.label} style={{ background: i % 2 === 0 ? C.row : C.rowAlt }}>
                      <td style={tdStyle}>{row.label}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: C.textMuted }}>{row.target}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{row.actual}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: row.met ? C.greenBg : C.redBg,
                          color: row.met ? C.green : C.red,
                        }}>
                          {row.met ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {row.met ? '달성' : '미달'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 12, color: C.textMuted }}>
              <span>총 주문: {summary.totalOrders.toLocaleString()}건</span>
              <span>총 피킹: {summary.totalPicks.toLocaleString()}건</span>
            </div>
          </div>
        )}

        {/* 일별 KPI */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 12px' }}>일별 KPI</h3>
          <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    <th style={thStyle}>날짜</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>납기 준수율</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>오배송률</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>피킹 정확도</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>처리 시간</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>주문</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMetrics.map((m, i) => {
                    const dV = m.deliveryOnTimeRate < target.deliveryOnTimeTarget;
                    const mV = m.misshipmentRate > target.misshipmentRateLimit;
                    const pV = m.pickingAccuracy < target.pickingAccuracyTarget;
                    const tV = m.avgProcessingTime > target.avgProcessingTimeLimit;
                    return (
                      <tr key={m.id} style={{ background: i % 2 === 0 ? C.row : C.rowAlt }}>
                        <td style={{ ...tdStyle, fontSize: 12, color: C.textMuted }}>{m.recordDate}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: dV ? C.red : C.text, fontWeight: dV ? 600 : 400 }}>
                          {m.deliveryOnTimeRate.toFixed(1)}%
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: mV ? C.red : C.text, fontWeight: mV ? 600 : 400 }}>
                          {m.misshipmentRate.toFixed(2)}%
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: pV ? C.red : C.text, fontWeight: pV ? 600 : 400 }}>
                          {m.pickingAccuracy.toFixed(1)}%
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: tV ? C.red : C.text, fontWeight: tV ? 600 : 400 }}>
                          {m.avgProcessingTime.toFixed(0)}분
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: C.textMuted }}>{m.totalOrders}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 위반 목록 */}
        {filteredViolations.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={14} color={C.yellow} />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>
                SLA 위반
              </h3>
              <span style={{
                padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: C.redBg, color: C.red,
              }}>
                {filteredViolations.length}건
              </span>
            </div>
            <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    <th style={thStyle}>날짜</th>
                    <th style={thStyle}>지표</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>목표</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>실측</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>심각도</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredViolations.map((v, i) => (
                    <tr key={v.id} style={{ background: i % 2 === 0 ? C.row : C.rowAlt }}>
                      <td style={{ ...tdStyle, fontSize: 12, color: C.textMuted }}>{v.violationDate}</td>
                      <td style={tdStyle}>{METRIC_LABELS[v.metricName] ?? v.metricName}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: C.textMuted }}>{v.targetValue}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: C.red, fontWeight: 600 }}>{v.actualValue}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 600,
                          background: v.severity === 'critical' ? C.redBg : C.yellowBg,
                          color: v.severity === 'critical' ? C.red : C.yellow,
                        }}>
                          {v.severity === 'critical' ? '긴급' : '경고'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 600,
                          background: v.resolvedAt ? C.greenBg : C.redBg,
                          color: v.resolvedAt ? C.green : C.red,
                        }}>
                          {v.resolvedAt ? '해결' : '미해결'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div style={{
          textAlign: 'center', fontSize: 11, color: C.textDim,
          paddingTop: 16, borderTop: `1px solid ${C.border}`,
        }}>
          Generated by HanVoxel SLA Monitor — {new Date().toLocaleDateString('ko-KR')}
        </div>
      </div>
    </main>
  );
}
