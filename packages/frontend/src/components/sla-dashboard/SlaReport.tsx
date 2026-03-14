import { useState, useMemo } from 'react';
import type { SlaTargetData, SlaMetricData, SlaViolationData } from '../../api/sla-api';

const METRIC_LABELS: Record<string, string> = {
  delivery_on_time: '납기 준수율',
  misshipment_rate: '오배송률',
  picking_accuracy: '피킹 정확도',
  avg_processing_time: '평균 처리 시간',
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

  const handlePrint = () => {
    window.print();
  };

  const periodLabel = periodType === 'weekly' ? '주간' : '월간';

  return (
    <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      {/* 기간 선택 + 출력 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setPeriodType('weekly')}
            className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
              periodType === 'weekly'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            주간 리포트
          </button>
          <button
            onClick={() => setPeriodType('monthly')}
            className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
              periodType === 'monthly'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            월간 리포트
          </button>
        </div>
        <button
          onClick={handlePrint}
          className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          PDF 다운로드
        </button>
      </div>

      {/* 리포트 본문 (print 영역) */}
      <div className="bg-white rounded-xl border p-8 print:shadow-none print:border-none print:rounded-none space-y-8">
        {/* 리포트 헤더 */}
        <div className="text-center border-b pb-6">
          <h2 className="text-xl font-bold text-gray-800">SLA {periodLabel} 리포트</h2>
          <p className="text-sm text-gray-500 mt-1">{target.name}</p>
          {filteredMetrics.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              기간: {filteredMetrics[0].recordDate} ~ {filteredMetrics[filteredMetrics.length - 1].recordDate}
              ({filteredMetrics.length}일)
            </p>
          )}
        </div>

        {/* 종합 점수 */}
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className={`text-5xl font-bold ${
              overallScore >= 90 ? 'text-green-600' : overallScore >= 70 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {overallScore}
            </div>
            <div className="text-sm text-gray-500 mt-1">종합 달성 점수 / 100</div>
            <div className={`text-xs mt-1 px-3 py-1 rounded-full inline-block ${
              overallScore >= 90 ? 'bg-green-100 text-green-700' : overallScore >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
            }`}>
              {overallScore >= 90 ? '우수' : overallScore >= 70 ? '보통' : '미달'}
            </div>
          </div>
        </div>

        {/* KPI 요약 테이블 */}
        {summary && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-3">KPI 요약</h3>
            <table className="w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left border">지표</th>
                  <th className="px-4 py-2 text-right border">목표</th>
                  <th className="px-4 py-2 text-right border">평균 실측</th>
                  <th className="px-4 py-2 text-center border">달성</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2 border">납기 준수율</td>
                  <td className="px-4 py-2 text-right border">&ge; {target.deliveryOnTimeTarget}%</td>
                  <td className="px-4 py-2 text-right border font-medium">{summary.avgDelivery}%</td>
                  <td className={`px-4 py-2 text-center border font-medium ${summary.deliveryMet ? 'text-green-600' : 'text-red-600'}`}>
                    {summary.deliveryMet ? '달성' : '미달'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border">오배송률</td>
                  <td className="px-4 py-2 text-right border">&le; {target.misshipmentRateLimit}%</td>
                  <td className="px-4 py-2 text-right border font-medium">{summary.avgMisship}%</td>
                  <td className={`px-4 py-2 text-center border font-medium ${summary.misshipMet ? 'text-green-600' : 'text-red-600'}`}>
                    {summary.misshipMet ? '달성' : '미달'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border">피킹 정확도</td>
                  <td className="px-4 py-2 text-right border">&ge; {target.pickingAccuracyTarget}%</td>
                  <td className="px-4 py-2 text-right border font-medium">{summary.avgPick}%</td>
                  <td className={`px-4 py-2 text-center border font-medium ${summary.pickMet ? 'text-green-600' : 'text-red-600'}`}>
                    {summary.pickMet ? '달성' : '미달'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border">평균 처리 시간</td>
                  <td className="px-4 py-2 text-right border">&le; {target.avgProcessingTimeLimit}분</td>
                  <td className="px-4 py-2 text-right border font-medium">{summary.avgProc}분</td>
                  <td className={`px-4 py-2 text-center border font-medium ${summary.procMet ? 'text-green-600' : 'text-red-600'}`}>
                    {summary.procMet ? '달성' : '미달'}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="flex gap-6 mt-3 text-xs text-gray-500">
              <span>총 주문: {summary.totalOrders.toLocaleString()}건</span>
              <span>총 피킹: {summary.totalPicks.toLocaleString()}건</span>
            </div>
          </div>
        )}

        {/* 일별 KPI */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-3">일별 KPI</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1.5 text-left border">날짜</th>
                  <th className="px-2 py-1.5 text-right border">납기 준수율</th>
                  <th className="px-2 py-1.5 text-right border">오배송률</th>
                  <th className="px-2 py-1.5 text-right border">피킹 정확도</th>
                  <th className="px-2 py-1.5 text-right border">처리 시간</th>
                  <th className="px-2 py-1.5 text-right border">주문</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetrics.map((m) => {
                  const dViolation = m.deliveryOnTimeRate < target.deliveryOnTimeTarget;
                  const mViolation = m.misshipmentRate > target.misshipmentRateLimit;
                  const pViolation = m.pickingAccuracy < target.pickingAccuracyTarget;
                  const tViolation = m.avgProcessingTime > target.avgProcessingTimeLimit;
                  return (
                    <tr key={m.id}>
                      <td className="px-2 py-1.5 border">{m.recordDate}</td>
                      <td className={`px-2 py-1.5 text-right border ${dViolation ? 'text-red-600 font-medium' : ''}`}>
                        {m.deliveryOnTimeRate.toFixed(1)}%
                      </td>
                      <td className={`px-2 py-1.5 text-right border ${mViolation ? 'text-red-600 font-medium' : ''}`}>
                        {m.misshipmentRate.toFixed(2)}%
                      </td>
                      <td className={`px-2 py-1.5 text-right border ${pViolation ? 'text-red-600 font-medium' : ''}`}>
                        {m.pickingAccuracy.toFixed(1)}%
                      </td>
                      <td className={`px-2 py-1.5 text-right border ${tViolation ? 'text-red-600 font-medium' : ''}`}>
                        {m.avgProcessingTime.toFixed(0)}분
                      </td>
                      <td className="px-2 py-1.5 text-right border text-gray-500">{m.totalOrders}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 위반 목록 */}
        {filteredViolations.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-3">
              SLA 위반 ({filteredViolations.length}건)
            </h3>
            <table className="w-full text-xs border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-1.5 text-left border">날짜</th>
                  <th className="px-3 py-1.5 text-left border">지표</th>
                  <th className="px-3 py-1.5 text-right border">목표</th>
                  <th className="px-3 py-1.5 text-right border">실측</th>
                  <th className="px-3 py-1.5 text-center border">심각도</th>
                  <th className="px-3 py-1.5 text-center border">상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredViolations.map((v) => (
                  <tr key={v.id}>
                    <td className="px-3 py-1.5 border">{v.violationDate}</td>
                    <td className="px-3 py-1.5 border">{METRIC_LABELS[v.metricName] ?? v.metricName}</td>
                    <td className="px-3 py-1.5 text-right border">{v.targetValue}</td>
                    <td className="px-3 py-1.5 text-right border text-red-600 font-medium">{v.actualValue}</td>
                    <td className="px-3 py-1.5 text-center border">
                      {v.severity === 'critical' ? '긴급' : '경고'}
                    </td>
                    <td className="px-3 py-1.5 text-center border">
                      {v.resolvedAt ? '해결' : '미해결'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 푸터 */}
        <div className="text-center text-xs text-gray-400 pt-4 border-t">
          Generated by HanVoxel SLA Monitor &mdash; {new Date().toLocaleDateString('ko-KR')}
        </div>
      </div>
    </main>
  );
}
