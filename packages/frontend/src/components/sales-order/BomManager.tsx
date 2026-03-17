/**
 * HanVoxel — BOM 관리 (다크 테마)
 *
 * 기능:
 *   - 완성품별 소요 자재 등록/수정
 *   - 자재 1개당 소요량 설정
 *   - BOM 목록 표시
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  ArrowLeft,
  Plus,
  X,
  Search,
} from 'lucide-react';
import type { BomItem } from '../../api/sales-order-api';

// --- 디자인 토큰 ---
const C = {
  bg: '#0D1117', card: '#161B22', border: '#30363D',
  text: '#C9D1D9', textMuted: '#8B949E', accent: '#58A6FF',
  green: '#10B981', yellow: '#F59E0B', red: '#EF4444',
  purple: '#8B5CF6',
} as const;

// --- Mock 데이터 ---
const MOCK_BOM: BomItem[] = [
  { id: 'b1', siteId: 'demo', productSku: 'SKU-2891', materialSku: 'MAT-ST-001', qtyPerUnit: 2, unit: 'kg', leadTimeDays: 7, notes: '철판' },
  { id: 'b2', siteId: 'demo', productSku: 'SKU-2891', materialSku: 'MAT-BT-001', qtyPerUnit: 8, unit: '개', leadTimeDays: 3, notes: '볼트' },
  { id: 'b3', siteId: 'demo', productSku: 'SKU-2891', materialSku: 'MAT-PT-001', qtyPerUnit: 0.1, unit: 'L', leadTimeDays: 5, notes: '도료' },
  { id: 'b4', siteId: 'demo', productSku: 'SKU-4501', materialSku: 'MAT-LI-001', qtyPerUnit: 0.5, unit: 'kg', leadTimeDays: 14, notes: '리튬 원료' },
  { id: 'b5', siteId: 'demo', productSku: 'SKU-4501', materialSku: 'MAT-NI-001', qtyPerUnit: 1, unit: 'kg', leadTimeDays: 10, notes: '니켈 분말' },
  { id: 'b6', siteId: 'demo', productSku: 'SKU-4501', materialSku: 'MAT-CO-001', qtyPerUnit: 0.2, unit: 'kg', leadTimeDays: 12, notes: '코발트 분말' },
];

interface BomManagerProps {
  onBack: () => void;
}

export function BomManager({ onBack }: BomManagerProps) {
  const [bom, setBom] = useState<BomItem[]>([]);
  const [searchSku, setSearchSku] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const loadBom = useCallback(async () => {
    try {
      const { getBom } = await import('../../api/sales-order-api');
      if (searchSku) {
        const items = await getBom('demo', searchSku);
        if (items.length > 0) { setBom(items); return; }
      }
    } catch { /* mock */ }
    if (searchSku) {
      setBom(MOCK_BOM.filter((b) => b.productSku.toLowerCase().includes(searchSku.toLowerCase())));
    } else {
      setBom(MOCK_BOM);
    }
  }, [searchSku]);

  useEffect(() => { loadBom(); }, [loadBom]);

  // 완성품별 그룹핑
  const grouped = bom.reduce<Record<string, BomItem[]>>((acc, item) => {
    if (!acc[item.productSku]) acc[item.productSku] = [];
    acc[item.productSku].push(item);
    return acc;
  }, {});

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.text, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '24px 28px', background: C.bg, minHeight: '100%' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4 }}>
            <ArrowLeft size={20} />
          </button>
          <Wrench size={22} style={{ color: C.accent }} />
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0 }}>BOM 관리</h2>
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8,
          background: C.accent, color: '#fff', border: 'none',
          cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          <Plus size={16} /> BOM 등록
        </button>
      </div>

      {/* 검색 */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
        <input
          value={searchSku}
          onChange={(e) => setSearchSku(e.target.value)}
          placeholder="완성품 SKU로 검색..."
          style={{ ...inputStyle, paddingLeft: 32, width: 300 }}
        />
      </div>

      {/* BOM 목록 (그룹별) */}
      {Object.entries(grouped).map(([productSku, items]) => (
        <div key={productSku} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${C.accent}22`, color: C.accent, fontWeight: 600 }}>완성품</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{productSku}</span>
            <span style={{ fontSize: 11, color: C.textMuted }}>— 자재 {items.length}종</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#1C2128' }}>
                {['자재 SKU', '자재명', '소요량/단위', '단위', '리드타임'].map((h) => (
                  <th key={h} style={{ padding: '6px 12px', textAlign: 'left', color: C.textMuted, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}20` }}>
                  <td style={{ padding: '8px 12px', color: C.text, fontWeight: 600 }}>{item.materialSku}</td>
                  <td style={{ padding: '8px 12px', color: C.text }}>{item.notes ?? '—'}</td>
                  <td style={{ padding: '8px 12px', color: C.accent, fontWeight: 600 }}>{item.qtyPerUnit}</td>
                  <td style={{ padding: '8px 12px', color: C.textMuted }}>{item.unit}</td>
                  <td style={{ padding: '8px 12px', color: C.textMuted }}>{item.leadTimeDays}일</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <div style={{ textAlign: 'center', color: C.textMuted, padding: 60, fontSize: 14 }}>
          BOM 데이터가 없습니다
        </div>
      )}

      {/* BOM 등록 모달 */}
      {showAdd && (
        <AddBomModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); loadBom(); }} />
      )}
    </div>
  );
}

// --- BOM 등록 모달 ---
function AddBomModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [productSku, setProductSku] = useState('');
  const [materialSku, setMaterialSku] = useState('');
  const [qtyPerUnit, setQtyPerUnit] = useState(0);
  const [unit, setUnit] = useState('개');
  const [leadTimeDays, setLeadTimeDays] = useState(0);
  const [notes, setNotes] = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    background: '#0D1117', border: '1px solid #30363D', borderRadius: 6,
    color: '#C9D1D9', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#8B949E', marginBottom: 4, display: 'block' };

  const handleSubmit = async () => {
    if (!productSku || !materialSku || !qtyPerUnit) return;
    try {
      const { createBomItem } = await import('../../api/sales-order-api');
      await createBomItem({ siteId: 'demo', productSku, materialSku, qtyPerUnit, unit, leadTimeDays, notes: notes || undefined });
    } catch { /* mock */ }
    onCreated();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 14, padding: 28, width: 500 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ color: '#C9D1D9', margin: 0, fontSize: 16 }}>BOM 등록</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8B949E', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div><label style={labelStyle}>완성품 SKU *</label><input value={productSku} onChange={(e) => setProductSku(e.target.value)} style={inputStyle} placeholder="SKU-2891" /></div>
          <div><label style={labelStyle}>자재 SKU *</label><input value={materialSku} onChange={(e) => setMaterialSku(e.target.value)} style={inputStyle} placeholder="MAT-ST-001" /></div>
          <div><label style={labelStyle}>소요량/단위 *</label><input type="number" value={qtyPerUnit || ''} onChange={(e) => setQtyPerUnit(Number(e.target.value))} style={inputStyle} placeholder="2" /></div>
          <div><label style={labelStyle}>단위</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} style={inputStyle}>
              <option value="개">개</option><option value="kg">kg</option><option value="L">L</option><option value="m">m</option><option value="EA">EA</option>
            </select>
          </div>
          <div><label style={labelStyle}>리드타임 (일)</label><input type="number" value={leadTimeDays || ''} onChange={(e) => setLeadTimeDays(Number(e.target.value))} style={inputStyle} /></div>
          <div><label style={labelStyle}>자재명/메모</label><input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} placeholder="철판" /></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 6, background: 'transparent', border: '1px solid #30363D', color: '#8B949E', cursor: 'pointer', fontSize: 13 }}>취소</button>
          <button onClick={handleSubmit} style={{ padding: '8px 18px', borderRadius: 6, background: '#58A6FF', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>등록</button>
        </div>
      </div>
    </div>
  );
}
