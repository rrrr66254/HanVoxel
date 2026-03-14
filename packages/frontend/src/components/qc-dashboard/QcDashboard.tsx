import { useState, useEffect, useCallback } from 'react';
import QcInspectionForm from './QcInspectionForm';
import QcSupplierScorecard from './QcSupplierScorecard';
import type { QcStatsData, InspectionData, SupplierData } from '../../api/qc-api';
import { getQcStats, getInspections, getSuppliers } from '../../api/qc-api';

// ── 목 데이터 ───────────────────────────────────────────

const MOCK_STATS: QcStatsData = {
  days: 30,
  totalInspections: 87,
  totalQty: 24500,
  totalDefect: 312,
  avgDefectRate: 1.27,
  inboundDefectRate: 1.45,
  outboundDefectRate: 0.82,
  defectsByType: [
    { type: 'DAMAGED', qty: 98 },
    { type: 'WRONG_QTY', qty: 72 },
    { type: 'PACKAGING', qty: 56 },
    { type: 'WRONG_ITEM', qty: 42 },
    { type: 'EXPIRED', qty: 28 },
    { type: 'CONTAMINATED', qty: 12 },
    { type: 'OTHER', qty: 4 },
  ],
  quarantineCount: 34,
};

const MOCK_SUPPLIERS: SupplierData[] = [
  { id: 's1', companyId: 'demo', name: '한국물류자재', code: 'SUP-001', contact: '02-1234-5678', email: null, grade: 'A', qualityScore: 94.2, isActive: true },
  { id: 's2', companyId: 'demo', name: '글로벌패키징', code: 'SUP-002', contact: null, email: null, grade: 'B', qualityScore: 82.5, isActive: true },
  { id: 's3', companyId: 'demo', name: '동아식품원료', code: 'SUP-003', contact: null, email: null, grade: 'C', qualityScore: 65.8, isActive: true },
  { id: 's4', companyId: 'demo', name: '세진전자부품', code: 'SUP-004', contact: null, email: null, grade: 'D', qualityScore: 42.1, isActive: true },
];

const MOCK_INSPECTIONS: InspectionData[] = [
  {
    id: 'i1', siteId: 'demo-site', supplierId: 's1', type: 'INBOUND', status: 'COMPLETED',
    totalQty: 500, passedQty: 497, defectQty: 3, defectRate: 0.6,
    referenceNo: 'GR-20260312-001', inspectorName: '김검수',
    inspectedAt: new Date(Date.now() - 86400000).toISOString(), note: null,
    supplier: MOCK_SUPPLIERS[0], items: [{ id: 'd1', defectType: 'DAMAGED', qty: 2, itemName: '박스 A', itemSku: 'SKU-001', quarantineLocationId: null, disposition: 'RETURNED', note: null }, { id: 'd2', defectType: 'PACKAGING', qty: 1, itemName: null, itemSku: null, quarantineLocationId: 'qz-1', disposition: 'QUARANTINED', note: null }],
  },
  {
    id: 'i2', siteId: 'demo-site', supplierId: 's4', type: 'INBOUND', status: 'COMPLETED',
    totalQty: 200, passedQty: 185, defectQty: 15, defectRate: 7.5,
    referenceNo: 'GR-20260311-003', inspectorName: '이품질',
    inspectedAt: new Date(Date.now() - 86400000 * 2).toISOString(), note: '불량 다수 발생',
    supplier: MOCK_SUPPLIERS[3], items: [{ id: 'd3', defectType: 'WRONG_ITEM', qty: 8, itemName: '부품 C', itemSku: 'SKU-055', quarantineLocationId: 'qz-1', disposition: 'QUARANTINED', note: null }, { id: 'd4', defectType: 'DAMAGED', qty: 7, itemName: '부품 D', itemSku: 'SKU-056', quarantineLocationId: 'qz-1', disposition: 'QUARANTINED', note: null }],
  },
  {
    id: 'i3', siteId: 'demo-site', supplierId: null, type: 'OUTBOUND', status: 'COMPLETED',
    totalQty: 350, passedQty: 347, defectQty: 3, defectRate: 0.86,
    referenceNo: 'GI-20260311-002', inspectorName: '박출고',
    inspectedAt: new Date(Date.now() - 86400000 * 2).toISOString(), note: null,
    supplier: null, items: [{ id: 'd5', defectType: 'WRONG_QTY', qty: 3, itemName: null, itemSku: null, quarantineLocationId: null, disposition: 'REWORKED', note: null }],
  },
];

const DEFECT_TYPE_LABELS: Record<string, string> = {
  DAMAGED: '파손',
  WRONG_ITEM: '오품',
  WRONG_QTY: '수량 불일치',
  EXPIRED: '유통기한 초과',
  CONTAMINATED: '오염',
  PACKAGING: '포장 불량',
  OTHER: '기타',
};

const GRADE_STYLES: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-green-100', text: 'text-green-700' },
  B: { bg: 'bg-blue-100', text: 'text-blue-700' },
  C: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  D: { bg: 'bg-red-100', text: 'text-red-700' },
};

type TabType = 'overview' | 'inspections' | 'suppliers' | 'new';

interface QcDashboardProps {
  onBack: () => void;
}

export default function QcDashboard({ onBack }: QcDashboardProps) {
  const [tab, setTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<QcStatsData | null>(null);
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [s, { inspections: ins }, sups] = await Promise.all([
      getQcStats('demo-site'),
      getInspections('demo-site', { limit: 50 }),
      getSuppliers('demo-company'),
    ]);
    setStats(s ?? MOCK_STATS);
    setInspections(ins.length > 0 ? ins : MOCK_INSPECTIONS);
    setSuppliers(sups.length > 0 ? sups : MOCK_SUPPLIERS);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-400">로딩 중...</div>;
  }

  const currentStats = stats ?? MOCK_STATS;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-700 text-sm">&larr; 돌아가기</button>
            <h1 className="text-xl font-bold text-gray-800">품질 검수 관리 (QC)</h1>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([['overview', '대시보드'], ['inspections', '검수 내역'], ['suppliers', '공급업체'], ['new', '새 검수']] as const).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  tab === t ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 새 검수 입력 */}
      {tab === 'new' && (
        <QcInspectionForm
          suppliers={suppliers}
          onCreated={() => { fetchData(); setTab('inspections'); }}
        />
      )}

      {/* 공급업체 스코어카드 */}
      {tab === 'suppliers' && (
        <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
          {selectedSupplier ? (
            <div>
              <button onClick={() => setSelectedSupplier(null)} className="text-sm text-gray-500 hover:text-gray-700 mb-4">&larr; 공급업체 목록</button>
              <QcSupplierScorecard supplierId={selectedSupplier} />
            </div>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-gray-600">공급업체 품질 등급</h2>
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">공급업체</th>
                      <th className="px-4 py-2 text-left">코드</th>
                      <th className="px-4 py-2 text-center">등급</th>
                      <th className="px-4 py-2 text-right">품질 점수</th>
                      <th className="px-4 py-2 text-center">상세</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {suppliers.map((s) => {
                      const gs = GRADE_STYLES[s.grade] ?? GRADE_STYLES.B;
                      return (
                        <tr key={s.id}>
                          <td className="px-4 py-2.5 font-medium">{s.name}</td>
                          <td className="px-4 py-2.5 text-gray-500">{s.code}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gs.bg} ${gs.text}`}>{s.grade}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium">{s.qualityScore}</td>
                          <td className="px-4 py-2.5 text-center">
                            <button onClick={() => setSelectedSupplier(s.id)} className="text-blue-600 hover:text-blue-800 text-xs">스코어카드</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      )}

      {/* 검수 내역 */}
      {tab === 'inspections' && (
        <main className="max-w-6xl mx-auto px-6 py-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">최근 검수 내역</h2>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">일시</th>
                  <th className="px-4 py-2 text-center">유형</th>
                  <th className="px-4 py-2 text-left">공급업체</th>
                  <th className="px-4 py-2 text-right">총 수량</th>
                  <th className="px-4 py-2 text-right">불량</th>
                  <th className="px-4 py-2 text-right">불량률</th>
                  <th className="px-4 py-2 text-left">전표번호</th>
                  <th className="px-4 py-2 text-left">검수자</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inspections.map((insp) => (
                  <tr key={insp.id}>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">
                      {insp.inspectedAt ? new Date(insp.inspectedAt).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        insp.type === 'INBOUND' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {insp.type === 'INBOUND' ? '입고' : '출고'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{insp.supplier?.name ?? '-'}</td>
                    <td className="px-4 py-2.5 text-right">{insp.totalQty.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-red-600 font-medium">{insp.defectQty}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${insp.defectRate > 3 ? 'text-red-600' : insp.defectRate > 1 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {insp.defectRate.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{insp.referenceNo ?? '-'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{insp.inspectorName ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {/* 대시보드 개요 */}
      {tab === 'overview' && (
        <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* KPI 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-500">총 검수</div>
              <div className="text-2xl font-bold text-gray-800">{currentStats.totalInspections}<span className="text-xs text-gray-400 ml-1">건</span></div>
              <div className="text-xs text-gray-400 mt-1">최근 {currentStats.days}일</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-500">평균 불량률</div>
              <div className={`text-2xl font-bold ${currentStats.avgDefectRate > 3 ? 'text-red-600' : currentStats.avgDefectRate > 1 ? 'text-yellow-600' : 'text-green-600'}`}>
                {currentStats.avgDefectRate.toFixed(2)}<span className="text-xs text-gray-400 ml-1">%</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">검수 {currentStats.totalQty.toLocaleString()}개</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-500">입고 불량률 / 출고 불량률</div>
              <div className="text-lg font-bold text-gray-800">
                {currentStats.inboundDefectRate.toFixed(2)}%
                <span className="text-gray-300 mx-1">/</span>
                {currentStats.outboundDefectRate.toFixed(2)}%
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-500">격리 재고</div>
              <div className="text-2xl font-bold text-orange-600">{currentStats.quarantineCount}<span className="text-xs text-gray-400 ml-1">건</span></div>
            </div>
          </div>

          {/* 불량 유형 분포 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-3">불량 유형 분포</h2>
            <div className="bg-white rounded-xl border p-4">
              <div className="space-y-2">
                {currentStats.defectsByType.map((d) => {
                  const pct = currentStats.totalDefect > 0 ? (d.qty / currentStats.totalDefect) * 100 : 0;
                  return (
                    <div key={d.type} className="flex items-center gap-3">
                      <div className="w-24 text-xs text-gray-600 truncate">{DEFECT_TYPE_LABELS[d.type] ?? d.type}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-16 text-xs text-gray-500 text-right">{d.qty}건 ({pct.toFixed(1)}%)</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 공급업체 등급 요약 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-3">공급업체 등급 현황</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {suppliers.slice(0, 4).map((s) => {
                const gs = GRADE_STYLES[s.grade] ?? GRADE_STYLES.B;
                return (
                  <div key={s.id} className="bg-white rounded-xl border p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${gs.bg} ${gs.text}`}>
                      {s.grade}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{s.name}</div>
                      <div className="text-xs text-gray-400">점수 {s.qualityScore}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
