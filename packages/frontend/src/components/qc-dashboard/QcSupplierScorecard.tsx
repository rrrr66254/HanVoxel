import { useState, useEffect } from 'react';
import type { ScorecardData } from '../../api/qc-api';
import { getSupplierScorecard } from '../../api/qc-api';

const GRADE_COLORS: Record<string, { ring: string; text: string; bg: string }> = {
  A: { ring: 'border-green-500', text: 'text-green-700', bg: 'bg-green-50' },
  B: { ring: 'border-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  C: { ring: 'border-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50' },
  D: { ring: 'border-red-500', text: 'text-red-700', bg: 'bg-red-50' },
};

// 목 데이터
const MOCK_SCORECARD: ScorecardData = {
  supplierId: 'mock',
  months: 6,
  overallDefectRate: 1.35,
  grade: 'B',
  qualityScore: 76.5,
  monthlyData: [
    { month: '2025-10', totalQty: 3200, defectQty: 35, defectRate: 1.09, inspectionCount: 12 },
    { month: '2025-11', totalQty: 2800, defectQty: 42, defectRate: 1.5, inspectionCount: 10 },
    { month: '2025-12', totalQty: 3500, defectQty: 38, defectRate: 1.09, inspectionCount: 14 },
    { month: '2026-01', totalQty: 3100, defectQty: 55, defectRate: 1.77, inspectionCount: 11 },
    { month: '2026-02', totalQty: 3400, defectQty: 48, defectRate: 1.41, inspectionCount: 13 },
    { month: '2026-03', totalQty: 2600, defectQty: 32, defectRate: 1.23, inspectionCount: 9 },
  ],
};

interface QcSupplierScorecardProps {
  supplierId: string;
}

export default function QcSupplierScorecard({ supplierId }: QcSupplierScorecardProps) {
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await getSupplierScorecard(supplierId);
      setData(result ?? MOCK_SCORECARD);
      setLoading(false);
    })();
  }, [supplierId]);

  if (loading) return <div className="text-center text-gray-400 py-8">로딩 중...</div>;

  const scorecard = data ?? MOCK_SCORECARD;
  const gc = GRADE_COLORS[scorecard.grade] ?? GRADE_COLORS.B;

  return (
    <div className="space-y-6">
      {/* 등급 + 점수 헤더 */}
      <div className={`rounded-xl border-2 ${gc.ring} ${gc.bg} p-6 flex items-center gap-6`}>
        <div className={`w-20 h-20 rounded-full border-4 ${gc.ring} flex items-center justify-center`}>
          <span className={`text-3xl font-bold ${gc.text}`}>{scorecard.grade}</span>
        </div>
        <div>
          <div className="text-sm text-gray-500">품질 점수</div>
          <div className={`text-3xl font-bold ${gc.text}`}>{scorecard.qualityScore}<span className="text-sm font-normal text-gray-400">/100</span></div>
          <div className="text-sm text-gray-500 mt-1">평균 불량률: {scorecard.overallDefectRate}%</div>
        </div>
        <div className="ml-auto text-right text-sm text-gray-500">
          <div>분석 기간: {scorecard.months}개월</div>
          <div className="text-xs mt-1">
            등급 기준: A(&le;0.5%) B(&le;1.5%) C(&le;3%) D(&gt;3%)
          </div>
        </div>
      </div>

      {/* 월별 불량률 추이 */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">월별 불량률 추이</h3>
        <div className="space-y-3">
          {scorecard.monthlyData.map((m) => {
            const barWidth = Math.min(100, (m.defectRate / 5) * 100);
            const barColor = m.defectRate > 3 ? 'bg-red-500' : m.defectRate > 1.5 ? 'bg-yellow-500' : m.defectRate > 0.5 ? 'bg-blue-500' : 'bg-green-500';
            return (
              <div key={m.month} className="flex items-center gap-3">
                <div className="w-16 text-xs text-gray-500">{m.month}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${barWidth}%` }} />
                </div>
                <div className="w-20 text-xs text-right">
                  <span className="font-medium">{m.defectRate}%</span>
                  <span className="text-gray-400 ml-1">({m.defectQty}/{m.totalQty})</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 월별 상세 테이블 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">월</th>
              <th className="px-4 py-2 text-right">검수 횟수</th>
              <th className="px-4 py-2 text-right">총 수량</th>
              <th className="px-4 py-2 text-right">불량</th>
              <th className="px-4 py-2 text-right">불량률</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {scorecard.monthlyData.map((m) => (
              <tr key={m.month}>
                <td className="px-4 py-2">{m.month}</td>
                <td className="px-4 py-2 text-right">{m.inspectionCount}</td>
                <td className="px-4 py-2 text-right">{m.totalQty.toLocaleString()}</td>
                <td className="px-4 py-2 text-right text-red-600">{m.defectQty}</td>
                <td className={`px-4 py-2 text-right font-medium ${m.defectRate > 3 ? 'text-red-600' : m.defectRate > 1.5 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {m.defectRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
