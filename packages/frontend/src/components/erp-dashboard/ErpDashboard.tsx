/**
 * 물류 특화 경량 ERP 대시보드
 * 탭: 개요 | 거래처 | 전표 | 원가/마진
 */
import { useState, useEffect, useCallback } from 'react';
import type {
  PartnerData, VoucherData, SkuMarginData,
  VoucherStatsData, PartnerStatsData,
} from '../../api/erp-api';
import {
  getPartners, createPartner, getPartnerStats,
  getVouchers, createVoucher, confirmVoucher, getVoucherStats, getVoucherPdfUrl,
  getSkuMargins, updateSellingPrice,
} from '../../api/erp-api';

// ── Mock 데이터 ────────────────────────────────────────

const MOCK_PARTNER_STATS: PartnerStatsData = { suppliers: 8, customers: 12, both: 2, total: 22 };
const MOCK_VOUCHER_STATS: VoucherStatsData = { days: 30, totalPurchases: 15, totalSales: 23, purchaseAmount: 45600000, salesAmount: 78900000, pendingPurchases: 3, pendingSales: 2 };
const MOCK_PARTNERS: PartnerData[] = [
  { id: 'pt-1', companyId: 'c1', type: 'SUPPLIER', name: '(주)한진부품', code: 'SUP-001', bizNo: '123-45-67890', ceoName: '김공급', bizType: '제조업', bizCategory: '전자부품', address: '서울시 강남구', phone: '02-1234-5678', email: 'info@hanjin.co.kr', contactName: '이담당', paymentTerms: 'NET30', note: null, isActive: true, createdAt: '2026-01-15' },
  { id: 'pt-2', companyId: 'c1', type: 'CUSTOMER', name: 'CJ물류센터', code: 'CUS-001', bizNo: '234-56-78901', ceoName: '박고객', bizType: '물류업', bizCategory: '창고운영', address: '경기도 용인시', phone: '031-9876-5432', email: 'cj@cjlogistics.com', contactName: '최매니저', paymentTerms: 'NET60', note: null, isActive: true, createdAt: '2026-02-01' },
  { id: 'pt-3', companyId: 'c1', type: 'SUPPLIER', name: '영진포장', code: 'SUP-002', bizNo: '345-67-89012', ceoName: '정대표', bizType: '제조업', bizCategory: '포장재', address: '인천시 남동구', phone: '032-5555-6666', email: null, contactName: null, paymentTerms: 'COD', note: null, isActive: true, createdAt: '2026-02-10' },
];
const MOCK_VOUCHERS: VoucherData[] = [
  { id: 'v-1', siteId: 's1', type: 'PURCHASE', voucherNo: 'PUR-20260310-0001', partnerId: 'pt-1', status: 'CONFIRMED', voucherDate: '2026-03-10', dueDate: '2026-04-10', subtotal: 5000000, taxAmount: 500000, totalAmount: 5500000, referenceNo: 'GR-001', note: null, confirmedAt: '2026-03-10', createdAt: '2026-03-10', partner: { id: 'pt-1', name: '(주)한진부품', code: 'SUP-001' }, lines: [{ id: 'vl-1', lineNo: 1, sku: 'SKU-A100', itemName: '전자부품 A', qty: 100, unitPrice: 30000, amount: 3000000, taxAmount: 300000, note: null }, { id: 'vl-2', lineNo: 2, sku: 'SKU-B200', itemName: '커넥터 B', qty: 200, unitPrice: 10000, amount: 2000000, taxAmount: 200000, note: null }] },
  { id: 'v-2', siteId: 's1', type: 'SALES', voucherNo: 'SAL-20260312-0001', partnerId: 'pt-2', status: 'DRAFT', voucherDate: '2026-03-12', dueDate: null, subtotal: 8000000, taxAmount: 800000, totalAmount: 8800000, referenceNo: null, note: '긴급 출고', confirmedAt: null, createdAt: '2026-03-12', partner: { id: 'pt-2', name: 'CJ물류센터', code: 'CUS-001' }, lines: [{ id: 'vl-3', lineNo: 1, sku: 'SKU-A100', itemName: '전자부품 A', qty: 50, unitPrice: 50000, amount: 2500000, taxAmount: 250000, note: null }, { id: 'vl-4', lineNo: 2, sku: 'SKU-C300', itemName: '화학원료 C', qty: 30, unitPrice: 183333, amount: 5500000, taxAmount: 550000, note: null }] },
];
const MOCK_MARGINS: SkuMarginData[] = [
  { sku: 'SKU-A100', itemName: '전자부품 A', currentQty: 150, fifoCost: 30000, avgCost: 30000, sellingPrice: 50000, fifoMarginPct: 40, avgMarginPct: 40, fifoProfit: 20000, avgProfit: 20000 },
  { sku: 'SKU-B200', itemName: '커넥터 B', currentQty: 500, fifoCost: 10000, avgCost: 10500, sellingPrice: 18000, fifoMarginPct: 44.44, avgMarginPct: 41.67, fifoProfit: 8000, avgProfit: 7500 },
  { sku: 'SKU-C300', itemName: '화학원료 C', currentQty: 80, fifoCost: 120000, avgCost: 118000, sellingPrice: 183000, fifoMarginPct: 34.43, avgMarginPct: 35.52, fifoProfit: 63000, avgProfit: 65000 },
];

const SITE_ID = 'site-demo';
const COMPANY_ID = 'company-demo';

type TabKey = 'overview' | 'partners' | 'vouchers' | 'margins';

const statusLabel: Record<string, string> = { DRAFT: '임시', CONFIRMED: '확정', CANCELED: '취소' };
const statusColor: Record<string, string> = { DRAFT: 'bg-yellow-600', CONFIRMED: 'bg-green-600', CANCELED: 'bg-red-600' };
const typeLabel: Record<string, string> = { PURCHASE: '매입', SALES: '매출', SUPPLIER: '공급업체', CUSTOMER: '고객사', BOTH: '양쪽' };

const formatPrice = (n: number) => new Intl.NumberFormat('ko-KR').format(n);
const formatDate = (s: string) => new Date(s).toLocaleDateString('ko-KR');

interface Props { onBack: () => void }

export function ErpDashboard({ onBack }: Props) {
  const [tab, setTab] = useState<TabKey>('overview');
  const [partnerStats, setPartnerStats] = useState<PartnerStatsData | null>(null);
  const [voucherStats, setVoucherStats] = useState<VoucherStatsData | null>(null);
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
  const [margins, setMargins] = useState<SkuMarginData[]>([]);
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [voucherFilter, setVoucherFilter] = useState<string>('all');
  const [showNewPartner, setShowNewPartner] = useState(false);
  const [showNewVoucher, setShowNewVoucher] = useState(false);

  const loadOverview = useCallback(async () => {
    const [ps, vs] = await Promise.all([getPartnerStats(COMPANY_ID), getVoucherStats(SITE_ID)]);
    setPartnerStats(ps ?? MOCK_PARTNER_STATS);
    setVoucherStats(vs ?? MOCK_VOUCHER_STATS);
  }, []);

  const loadPartners = useCallback(async () => {
    const typeParam = partnerFilter !== 'all' ? partnerFilter : undefined;
    const result = await getPartners(COMPANY_ID, { type: typeParam });
    setPartners(result.partners.length > 0 ? result.partners : MOCK_PARTNERS);
  }, [partnerFilter]);

  const loadVouchers = useCallback(async () => {
    const typeParam = voucherFilter !== 'all' ? voucherFilter : undefined;
    const result = await getVouchers(SITE_ID, { type: typeParam });
    setVouchers(result.vouchers.length > 0 ? result.vouchers : MOCK_VOUCHERS);
  }, [voucherFilter]);

  const loadMargins = useCallback(async () => {
    const result = await getSkuMargins(SITE_ID);
    setMargins(result.length > 0 ? result : MOCK_MARGINS);
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { if (tab === 'partners') loadPartners(); }, [tab, loadPartners]);
  useEffect(() => { if (tab === 'vouchers') loadVouchers(); }, [tab, loadVouchers]);
  useEffect(() => { if (tab === 'margins') loadMargins(); }, [tab, loadMargins]);

  const handleConfirmVoucher = async (id: string) => {
    await confirmVoucher(id);
    loadVouchers();
    loadOverview();
  };

  const ps = partnerStats ?? MOCK_PARTNER_STATS;
  const vs = voucherStats ?? MOCK_VOUCHER_STATS;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <button onClick={onBack} className="text-gray-400 hover:text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-bold">물류 ERP</h1>
        </div>
        {/* 탭 */}
        <div className="mx-auto mt-3 flex max-w-6xl gap-1">
          {([['overview', '개요'], ['partners', '거래처'], ['vouchers', '전표'], ['margins', '원가/마진']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-6">
        {/* ── 개요 탭 ──────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* KPI 카드 */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{ps.total}</div>
                <div className="text-xs text-gray-500">거래처</div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{vs.totalSales + vs.totalPurchases}</div>
                <div className="text-xs text-gray-500">전표 (30일)</div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
                <div className="text-2xl font-bold text-orange-400">{formatPrice(vs.purchaseAmount)}</div>
                <div className="text-xs text-gray-500">매입액</div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{formatPrice(vs.salesAmount)}</div>
                <div className="text-xs text-gray-500">매출액</div>
              </div>
            </div>

            {/* 미확정 전표 */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-300">미확정 전표</h3>
              <div className="flex gap-6">
                <div><span className="text-lg font-bold text-yellow-400">{vs.pendingPurchases}</span> <span className="text-xs text-gray-500">매입 대기</span></div>
                <div><span className="text-lg font-bold text-yellow-400">{vs.pendingSales}</span> <span className="text-xs text-gray-500">매출 대기</span></div>
              </div>
            </div>

            {/* 거래처 분류 */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-300">거래처 현황</h3>
              <div className="flex gap-6">
                <div><span className="text-lg font-bold text-blue-400">{ps.suppliers}</span> <span className="text-xs text-gray-500">공급업체</span></div>
                <div><span className="text-lg font-bold text-green-400">{ps.customers}</span> <span className="text-xs text-gray-500">고객사</span></div>
                {ps.both > 0 && <div><span className="text-lg font-bold text-purple-400">{ps.both}</span> <span className="text-xs text-gray-500">양쪽</span></div>}
              </div>
            </div>

            {/* 매출-매입 바 */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-300">매출/매입 비율</h3>
              <div className="flex h-5 overflow-hidden rounded-full">
                {vs.salesAmount > 0 && <div className="bg-green-600" style={{ width: `${(vs.salesAmount / (vs.salesAmount + vs.purchaseAmount)) * 100}%` }} />}
                {vs.purchaseAmount > 0 && <div className="bg-orange-600" style={{ width: `${(vs.purchaseAmount / (vs.salesAmount + vs.purchaseAmount)) * 100}%` }} />}
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>매출 {formatPrice(vs.salesAmount)}원</span>
                <span>매입 {formatPrice(vs.purchaseAmount)}원</span>
              </div>
            </div>
          </div>
        )}

        {/* ── 거래처 탭 ────────────────────────────────── */}
        {tab === 'partners' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {['all', 'SUPPLIER', 'CUSTOMER', 'BOTH'].map((key) => (
                  <button key={key} onClick={() => setPartnerFilter(key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${partnerFilter === key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                    {key === 'all' ? '전체' : typeLabel[key]}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowNewPartner(!showNewPartner)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">
                + 거래처 추가
              </button>
            </div>

            {/* 간이 거래처 추가 폼 */}
            {showNewPartner && <NewPartnerForm onCreated={() => { setShowNewPartner(false); loadPartners(); loadOverview(); }} />}

            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-800 bg-gray-900 text-left text-xs text-gray-500">
                  <th className="p-3">유형</th><th className="p-3">코드</th><th className="p-3">거래처명</th>
                  <th className="p-3">사업자번호</th><th className="p-3">연락처</th><th className="p-3">결제조건</th>
                </tr></thead>
                <tbody>{partners.map((p) => (
                  <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${p.type === 'SUPPLIER' ? 'bg-blue-600' : p.type === 'CUSTOMER' ? 'bg-green-600' : 'bg-purple-600'}`}>{typeLabel[p.type]}</span></td>
                    <td className="p-3 font-mono text-xs">{p.code}</td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 text-gray-400">{p.bizNo ?? '—'}</td>
                    <td className="p-3 text-gray-400">{p.phone ?? '—'}</td>
                    <td className="p-3 text-gray-400">{p.paymentTerms ?? '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
              {partners.length === 0 && <p className="p-6 text-center text-gray-500">거래처가 없습니다</p>}
            </div>
          </div>
        )}

        {/* ── 전표 탭 ──────────────────────────────────── */}
        {tab === 'vouchers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {['all', 'PURCHASE', 'SALES'].map((key) => (
                  <button key={key} onClick={() => setVoucherFilter(key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${voucherFilter === key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                    {key === 'all' ? '전체' : typeLabel[key]}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowNewVoucher(!showNewVoucher)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">
                + 전표 생성
              </button>
            </div>

            {showNewVoucher && <NewVoucherForm partners={partners.length > 0 ? partners : MOCK_PARTNERS} onCreated={() => { setShowNewVoucher(false); loadVouchers(); loadOverview(); }} />}

            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-800 bg-gray-900 text-left text-xs text-gray-500">
                  <th className="p-3">전표번호</th><th className="p-3">유형</th><th className="p-3">거래처</th>
                  <th className="p-3">일자</th><th className="p-3 text-right">총액</th><th className="p-3">상태</th><th className="p-3">액션</th>
                </tr></thead>
                <tbody>{vouchers.map((v) => (
                  <tr key={v.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="p-3 font-mono text-xs">{v.voucherNo}</td>
                    <td className="p-3"><span className={`text-xs ${v.type === 'PURCHASE' ? 'text-orange-400' : 'text-green-400'}`}>{typeLabel[v.type]}</span></td>
                    <td className="p-3">{v.partner?.name ?? '—'}</td>
                    <td className="p-3 text-gray-400">{formatDate(v.voucherDate)}</td>
                    <td className="p-3 text-right font-medium">{formatPrice(v.totalAmount)}원</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${statusColor[v.status] ?? 'bg-gray-600'}`}>{statusLabel[v.status]}</span></td>
                    <td className="p-3 space-x-1">
                      {v.status === 'DRAFT' && (
                        <button onClick={() => handleConfirmVoucher(v.id)} className="rounded bg-green-700/30 px-2 py-0.5 text-[10px] text-green-400 hover:bg-green-700/50">확정</button>
                      )}
                      <button onClick={() => window.open(getVoucherPdfUrl(v.id, v.type === 'PURCHASE' ? 'purchase_order' : 'delivery_note'), '_blank')} className="rounded bg-gray-700/30 px-2 py-0.5 text-[10px] text-gray-400 hover:text-white">PDF</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
              {vouchers.length === 0 && <p className="p-6 text-center text-gray-500">전표가 없습니다</p>}
            </div>
          </div>
        )}

        {/* ── 원가/마진 탭 ─────────────────────────────── */}
        {tab === 'margins' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-300">SKU별 마진율 조회</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-800 bg-gray-900 text-left text-xs text-gray-500">
                  <th className="p-3">SKU</th><th className="p-3">품명</th><th className="p-3 text-right">재고</th>
                  <th className="p-3 text-right">FIFO 원가</th><th className="p-3 text-right">이동평균</th>
                  <th className="p-3 text-right">판매가</th><th className="p-3 text-right">마진율(FIFO)</th><th className="p-3 text-right">마진액</th>
                </tr></thead>
                <tbody>{margins.map((m) => (
                  <tr key={m.sku} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="p-3 font-mono text-xs">{m.sku}</td>
                    <td className="p-3">{m.itemName}</td>
                    <td className="p-3 text-right">{m.currentQty}</td>
                    <td className="p-3 text-right text-gray-400">{formatPrice(m.fifoCost)}원</td>
                    <td className="p-3 text-right text-gray-400">{formatPrice(m.avgCost)}원</td>
                    <td className="p-3 text-right font-medium">{formatPrice(m.sellingPrice)}원</td>
                    <td className="p-3 text-right">
                      <span className={`font-bold ${m.fifoMarginPct >= 30 ? 'text-green-400' : m.fifoMarginPct >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {m.fifoMarginPct}%
                      </span>
                    </td>
                    <td className="p-3 text-right text-emerald-400">{formatPrice(m.fifoProfit)}원</td>
                  </tr>
                ))}</tbody>
              </table>
              {margins.length === 0 && <p className="p-6 text-center text-gray-500">원가 데이터가 없습니다</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 간이 거래처 추가 폼 ────────────────────────────────

function NewPartnerForm({ onCreated }: { onCreated: () => void }) {
  const [type, setType] = useState('SUPPLIER');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [bizNo, setBizNo] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('NET30');

  const handleSubmit = async () => {
    if (!name || !code) return;
    await createPartner({ companyId: COMPANY_ID, type, name, code, bizNo: bizNo || undefined, phone: phone || undefined, paymentTerms });
    onCreated();
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
      <h4 className="text-sm font-bold">신규 거래처</h4>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm">
          <option value="SUPPLIER">공급업체</option><option value="CUSTOMER">고객사</option><option value="BOTH">양쪽</option>
        </select>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="코드 (ex: SUP-003)" className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="거래처명" className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" />
        <input value={bizNo} onChange={(e) => setBizNo(e.target.value)} placeholder="사업자번호" className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처" className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" />
        <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm">
          <option value="COD">COD (현금)</option><option value="NET30">NET30</option><option value="NET60">NET60</option><option value="NET90">NET90</option>
        </select>
        <button onClick={handleSubmit} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">저장</button>
      </div>
    </div>
  );
}

// ── 간이 전표 생성 폼 ──────────────────────────────────

function NewVoucherForm({ partners, onCreated }: { partners: PartnerData[]; onCreated: () => void }) {
  const [type, setType] = useState('PURCHASE');
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? '');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState([{ sku: '', itemName: '', qty: 1, unitPrice: 0 }]);

  const addLine = () => setLines([...lines, { sku: '', itemName: '', qty: 1, unitPrice: 0 }]);
  const updateLine = (idx: number, field: string, value: string | number) => {
    const next = [...lines];
    (next[idx] as Record<string, string | number>)[field] = value;
    setLines(next);
  };

  const handleSubmit = async () => {
    if (!partnerId || lines.some((l) => !l.sku || !l.itemName)) return;
    await createVoucher({ siteId: SITE_ID, type, partnerId, voucherDate, lines });
    onCreated();
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
      <h4 className="text-sm font-bold">신규 전표</h4>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm">
          <option value="PURCHASE">매입</option><option value="SALES">매출</option>
        </select>
        <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm">
          {partners.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
        </select>
        <input type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm" />
      </div>
      {/* 항목 */}
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-2">
            <input value={line.sku} onChange={(e) => updateLine(idx, 'sku', e.target.value)} placeholder="SKU" className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs" />
            <input value={line.itemName} onChange={(e) => updateLine(idx, 'itemName', e.target.value)} placeholder="품명" className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs" />
            <input type="number" value={line.qty} onChange={(e) => updateLine(idx, 'qty', parseInt(e.target.value) || 0)} placeholder="수량" className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs" />
            <input type="number" value={line.unitPrice} onChange={(e) => updateLine(idx, 'unitPrice', parseInt(e.target.value) || 0)} placeholder="단가" className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs" />
          </div>
        ))}
        <button onClick={addLine} className="text-xs text-blue-400 hover:text-blue-300">+ 항목 추가</button>
      </div>
      <button onClick={handleSubmit} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">전표 생성</button>
    </div>
  );
}
