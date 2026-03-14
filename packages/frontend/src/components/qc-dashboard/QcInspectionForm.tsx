import { useState } from 'react';
import type { SupplierData } from '../../api/qc-api';
import { createInspection } from '../../api/qc-api';

const DEFECT_TYPES = [
  { value: 'DAMAGED', label: '파손' },
  { value: 'WRONG_ITEM', label: '오품' },
  { value: 'WRONG_QTY', label: '수량 불일치' },
  { value: 'EXPIRED', label: '유통기한 초과' },
  { value: 'CONTAMINATED', label: '오염' },
  { value: 'PACKAGING', label: '포장 불량' },
  { value: 'OTHER', label: '기타' },
];

interface DefectEntry {
  defectType: string;
  qty: number;
  itemName: string;
  disposition: string;
}

interface QcInspectionFormProps {
  suppliers: SupplierData[];
  onCreated: () => void;
}

export default function QcInspectionForm({ suppliers, onCreated }: QcInspectionFormProps) {
  const [form, setForm] = useState({
    type: 'INBOUND' as 'INBOUND' | 'OUTBOUND',
    supplierId: '',
    totalQty: 0,
    defectQty: 0,
    referenceNo: '',
    inspectorName: '',
    note: '',
  });
  const [defects, setDefects] = useState<DefectEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const addDefect = () => {
    setDefects([...defects, { defectType: 'DAMAGED', qty: 1, itemName: '', disposition: 'QUARANTINED' }]);
  };

  const updateDefect = (idx: number, field: string, value: string | number) => {
    setDefects(defects.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const removeDefect = (idx: number) => {
    setDefects(defects.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (form.totalQty <= 0) return;
    setSaving(true);
    const defectItems = defects.map((d) => ({
      defectType: d.defectType,
      qty: d.qty,
      itemName: d.itemName || undefined,
      disposition: d.disposition,
    }));
    const totalDefect = defects.reduce((s, d) => s + d.qty, 0);
    await createInspection({
      siteId: 'demo-site',
      supplierId: form.supplierId || undefined,
      type: form.type,
      totalQty: form.totalQty,
      passedQty: form.totalQty - totalDefect,
      defectQty: totalDefect,
      referenceNo: form.referenceNo || undefined,
      inspectorName: form.inspectorName || undefined,
      note: form.note || undefined,
      defectItems: defectItems.length > 0 ? defectItems : undefined,
    });
    setSaving(false);
    onCreated();
  };

  return (
    <main className="max-w-2xl mx-auto px-6 py-6">
      <div className="bg-white rounded-xl border p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-800">새 검수 기록</h2>

        {/* 기본 정보 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">검수 유형</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'INBOUND' | 'OUTBOUND' })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="INBOUND">입고 검수</option>
              <option value="OUTBOUND">출고 검수</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">공급업체</label>
            <select
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">선택 안 함</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">총 검수 수량</label>
            <input type="number" min={0} value={form.totalQty}
              onChange={(e) => setForm({ ...form, totalQty: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">전표 번호</label>
            <input type="text" value={form.referenceNo}
              onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
              placeholder="GR-20260314-001"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">검수자</label>
            <input type="text" value={form.inspectorName}
              onChange={(e) => setForm({ ...form, inspectorName: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* 불량 항목 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600">불량 항목</h3>
            <button onClick={addDefect} className="text-xs text-blue-600 hover:text-blue-800">+ 불량 추가</button>
          </div>
          {defects.length === 0 ? (
            <div className="text-xs text-gray-400 p-3 border rounded-lg text-center">불량 항목이 없습니다</div>
          ) : (
            <div className="space-y-3">
              {defects.map((d, idx) => (
                <div key={idx} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                  <div className="flex items-center gap-2">
                    <select value={d.defectType} onChange={(e) => updateDefect(idx, 'defectType', e.target.value)}
                      className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm">
                      {DEFECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <input type="number" min={1} value={d.qty}
                      onChange={(e) => updateDefect(idx, 'qty', parseInt(e.target.value) || 1)}
                      className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-right" placeholder="수량"
                    />
                    <select value={d.disposition} onChange={(e) => updateDefect(idx, 'disposition', e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-sm">
                      <option value="QUARANTINED">격리</option>
                      <option value="RETURNED">반품</option>
                      <option value="DISPOSED">폐기</option>
                      <option value="REWORKED">재작업</option>
                    </select>
                    <button onClick={() => removeDefect(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  </div>
                  <input type="text" value={d.itemName}
                    onChange={(e) => updateDefect(idx, 'itemName', e.target.value)}
                    placeholder="상품명 / SKU (선택)"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 비고 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
          <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>

        {/* 요약 + 저장 */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-gray-500">
            불량 {defects.reduce((s, d) => s + d.qty, 0)}건 /
            불량률 {form.totalQty > 0 ? ((defects.reduce((s, d) => s + d.qty, 0) / form.totalQty) * 100).toFixed(1) : '0.0'}%
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || form.totalQty <= 0}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '검수 완료'}
          </button>
        </div>
      </div>
    </main>
  );
}
