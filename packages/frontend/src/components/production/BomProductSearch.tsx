/**
 * BOM 제품 검색 컴포넌트
 *
 * - BOM 등록된 제품을 검색하여 자재 소요량 + 재고 충족 여부 표시
 * - 제품 선택 시 공정 목록 자동 생성
 * - 계획 수량 변경 시 자재 소요량 실시간 재계산
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Package, AlertTriangle, ExternalLink } from 'lucide-react';

// ── 타입 ──────────────────────────────────────────

export interface BomMaterial {
  materialSku: string;
  materialName: string;
  qtyPerUnit: number;
  totalRequired: number;  // qtyPerUnit * plannedQty
  currentStock: number;
  status: 'sufficient' | 'warning' | 'insufficient';
}

export interface BomProduct {
  sku: string;
  name: string;
  processCount: number;
  processes: string[];
  materials: BomMaterial[];
}

export interface BomProductSearchProps {
  siteId: string;
  onProductSelect: (product: BomProduct) => void;
  plannedQty: number;
  onQtyChange?: (qty: number) => void;
}

// ── 목업 데이터 ─────────────────────────────────────

const MOCK_BOM_PRODUCTS: Omit<BomProduct, 'materials'>[] = [
  {
    sku: 'SKU-A100', name: '스마트 선반 조립품', processCount: 4,
    processes: ['절단', '용접', '조립', '검사'],
  },
  {
    sku: 'SKU-B200', name: '물류 로봇 프레임', processCount: 3,
    processes: ['프레스', '용접', '도장'],
  },
  {
    sku: 'SKU-C300', name: '자동 분류기 모듈', processCount: 5,
    processes: ['PCB 조립', '배선', '펌웨어', '조립', '검사'],
  },
  {
    sku: 'SKU-D400', name: '컨베이어 벨트 유닛', processCount: 3,
    processes: ['절단', '조립', '검사'],
  },
  {
    sku: 'SKU-E500', name: 'AGV 구동 모듈', processCount: 4,
    processes: ['가공', '배선', '조립', '테스트'],
  },
  {
    sku: 'SKU-F600', name: '팔레타이저 암', processCount: 3,
    processes: ['주조', '가공', '조립'],
  },
];

// 제품별 자재 목업 (기본 수량 1개 기준)
const MOCK_MATERIALS: Record<string, Omit<BomMaterial, 'totalRequired' | 'status'>[]> = {
  'SKU-A100': [
    { materialSku: 'MAT-ST-01', materialName: '스틸 프레임 (1.2m)', qtyPerUnit: 4, currentStock: 500 },
    { materialSku: 'MAT-BT-02', materialName: 'M8 볼트 세트', qtyPerUnit: 12, currentStock: 2000 },
    { materialSku: 'MAT-PN-03', materialName: '선반 패널 (MDF)', qtyPerUnit: 3, currentStock: 80 },
    { materialSku: 'MAT-CT-04', materialName: '코너 브라켓', qtyPerUnit: 8, currentStock: 150 },
  ],
  'SKU-B200': [
    { materialSku: 'MAT-AL-10', materialName: '알루미늄 프로파일 (2m)', qtyPerUnit: 6, currentStock: 120 },
    { materialSku: 'MAT-MT-11', materialName: '구동 모터 (24V)', qtyPerUnit: 2, currentStock: 30 },
    { materialSku: 'MAT-WH-12', materialName: '옴니 휠', qtyPerUnit: 4, currentStock: 45 },
  ],
  'SKU-C300': [
    { materialSku: 'MAT-PCB-20', materialName: 'PCB 보드 (메인)', qtyPerUnit: 1, currentStock: 60 },
    { materialSku: 'MAT-SN-21', materialName: '적외선 센서', qtyPerUnit: 4, currentStock: 200 },
    { materialSku: 'MAT-CB-22', materialName: '케이블 하네스', qtyPerUnit: 2, currentStock: 150 },
    { materialSku: 'MAT-HS-23', materialName: '방열판', qtyPerUnit: 1, currentStock: 25 },
    { materialSku: 'MAT-CS-24', materialName: '외장 케이스', qtyPerUnit: 1, currentStock: 10 },
  ],
  'SKU-D400': [
    { materialSku: 'MAT-RB-30', materialName: '고무 벨트 (3m)', qtyPerUnit: 1, currentStock: 40 },
    { materialSku: 'MAT-RL-31', materialName: '구동 롤러', qtyPerUnit: 2, currentStock: 70 },
    { materialSku: 'MAT-FR-32', materialName: '프레임 레일', qtyPerUnit: 4, currentStock: 200 },
  ],
  'SKU-E500': [
    { materialSku: 'MAT-MT-11', materialName: '구동 모터 (24V)', qtyPerUnit: 4, currentStock: 30 },
    { materialSku: 'MAT-GR-40', materialName: '감속 기어박스', qtyPerUnit: 2, currentStock: 15 },
    { materialSku: 'MAT-EN-41', materialName: '엔코더 센서', qtyPerUnit: 4, currentStock: 50 },
    { materialSku: 'MAT-DV-42', materialName: '모터 드라이버', qtyPerUnit: 2, currentStock: 20 },
  ],
  'SKU-F600': [
    { materialSku: 'MAT-CS-50', materialName: '주조 암 하우징', qtyPerUnit: 1, currentStock: 8 },
    { materialSku: 'MAT-AC-51', materialName: '서보 액추에이터', qtyPerUnit: 3, currentStock: 18 },
    { materialSku: 'MAT-BG-52', materialName: '베어링 세트', qtyPerUnit: 6, currentStock: 100 },
  ],
};

// ── 자재 충족 상태 계산 ─────────────────────────────

function calcMaterialStatus(currentStock: number, totalRequired: number): 'sufficient' | 'warning' | 'insufficient' {
  if (totalRequired <= 0) return 'sufficient';
  if (currentStock >= totalRequired) return 'sufficient';
  if (currentStock >= totalRequired * 0.5) return 'warning';
  return 'insufficient';
}

// 자재 목록을 계획 수량 기반으로 계산
function buildMaterials(sku: string, plannedQty: number): BomMaterial[] {
  const rawMats = MOCK_MATERIALS[sku];
  if (!rawMats) return [];
  return rawMats.map((m) => {
    const totalRequired = m.qtyPerUnit * plannedQty;
    return {
      ...m,
      totalRequired,
      status: calcMaterialStatus(m.currentStock, totalRequired),
    };
  });
}

// ── API 호출 (목업 폴백 포함) ───────────────────────

async function fetchBomSearch(siteId: string, query: string): Promise<Omit<BomProduct, 'materials'>[]> {
  try {
    const res = await fetch(`/api/v1/bom/search?siteId=${encodeURIComponent(siteId)}&q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data?.length > 0) return json.data;
    }
  } catch { /* 목업 폴백 */ }

  // 목업 폴백: 로컬 검색
  const q = query.toLowerCase();
  return MOCK_BOM_PRODUCTS.filter(
    (p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
  );
}

async function fetchProductionCheck(siteId: string, sku: string, qty: number): Promise<BomMaterial[]> {
  try {
    const res = await fetch(`/api/v1/bom/${encodeURIComponent(sku)}/production-check?siteId=${encodeURIComponent(siteId)}&qty=${qty}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data?.length > 0) return json.data;
    }
  } catch { /* 목업 폴백 */ }

  return buildMaterials(sku, qty);
}

// ── 스타일 ─────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 12,
};

const searchWrapStyle: React.CSSProperties = {
  position: 'relative',
};

const searchInputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px 8px 36px', borderRadius: 6,
  border: '1px solid var(--border-default)', background: 'var(--bg-primary)',
  color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box',
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
  color: 'var(--text-muted)', pointerEvents: 'none',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
  background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
  borderRadius: 6, marginTop: 4, maxHeight: 220, overflowY: 'auto',
  boxShadow: '0 4px 16px rgba(0,0,0,.2)',
};

const dropdownItemStyle: React.CSSProperties = {
  padding: '10px 14px', cursor: 'pointer', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  borderBottom: '1px solid var(--border-muted)',
};

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: 12,
};

const thStyle: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'left', fontWeight: 600,
  color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-default)',
  background: 'var(--bg-primary)', fontSize: 11,
};

const tdStyle: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '1px solid var(--border-muted)',
  color: 'var(--text-primary)',
};

const statusIconMap: Record<BomMaterial['status'], { icon: string; color: string; label: string }> = {
  sufficient:   { icon: '\u2705', color: 'var(--accent-green)', label: '충분' },
  warning:      { icon: '\u26A0\uFE0F', color: 'var(--accent-orange)', label: '부족 우려' },
  insufficient: { icon: '\u274C', color: 'var(--accent-red)', label: '부족' },
};

const selectedProductStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 12px', borderRadius: 6,
  background: 'var(--bg-primary)', border: '1px solid var(--accent-blue)',
  fontSize: 13,
};

const noBomWarningStyle: React.CSSProperties = {
  padding: '16px', borderRadius: 8,
  background: 'rgba(251,146,60,.08)', border: '1px solid var(--accent-orange)',
  display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
  color: 'var(--accent-orange)',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6,
};

// ── 컴포넌트 ───────────────────────────────────────

export function BomProductSearch({ siteId, onProductSelect, plannedQty, onQtyChange }: BomProductSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Omit<BomProduct, 'materials'>[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<BomProduct | null>(null);
  const [materials, setMaterials] = useState<BomMaterial[]>([]);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 검색 디바운스
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await fetchBomSearch(siteId, value.trim());
      setResults(data);
      setShowDropdown(data.length > 0);
      setLoading(false);
    }, 300);
  }, [siteId]);

  // 수량 변경 시 자재 재계산
  useEffect(() => {
    if (!selected) return;

    let cancelled = false;
    (async () => {
      const mats = await fetchProductionCheck(siteId, selected.sku, plannedQty);
      if (!cancelled) {
        setMaterials(mats);
        // 부모에게 업데이트된 제품 정보 전달
        onProductSelect({ ...selected, materials: mats });
      }
    })();

    return () => { cancelled = true; };
    // onProductSelect는 의도적으로 의존성에서 제외 (무한 루프 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, selected?.sku, plannedQty]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 제품 선택 핸들러
  const handleSelect = async (product: Omit<BomProduct, 'materials'>) => {
    setShowDropdown(false);
    setQuery('');

    const mats = await fetchProductionCheck(siteId, product.sku, plannedQty);
    const fullProduct: BomProduct = { ...product, materials: mats };

    setSelected(fullProduct);
    setMaterials(mats);
    onProductSelect(fullProduct);
  };

  // 선택 해제
  const handleClear = () => {
    setSelected(null);
    setMaterials([]);
    setQuery('');
  };

  const hasBom = materials.length > 0;

  return (
    <div style={containerStyle}>
      {/* 섹션 라벨 */}
      <div style={sectionLabelStyle}>BOM 제품 검색</div>

      {/* 선택된 제품 표시 또는 검색 입력 */}
      {selected ? (
        <div style={selectedProductStyle}>
          <Package size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selected.name}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({selected.sku})</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 'auto' }}>
            공정 {selected.processCount}개
          </span>
          <button
            onClick={handleClear}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', padding: 2, display: 'flex',
            }}
          >
            &times;
          </button>
        </div>
      ) : (
        <div ref={wrapperRef} style={searchWrapStyle}>
          <Search size={16} style={searchIconStyle} />
          <input
            style={searchInputStyle}
            placeholder="제품 SKU 또는 이름으로 검색..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          />
          {loading && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>
              검색중...
            </span>
          )}

          {/* 검색 결과 드롭다운 */}
          {showDropdown && (
            <div style={dropdownStyle}>
              {results.map((p) => (
                <div
                  key={p.sku}
                  style={dropdownItemStyle}
                  onMouseDown={() => handleSelect(p)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-primary)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.sku}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    공정 {p.processCount}개
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 수량 입력 (onQtyChange가 제공된 경우) */}
      {selected && onQtyChange && (
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
            계획 수량
          </label>
          <input
            type="number"
            min={1}
            value={plannedQty}
            onChange={(e) => onQtyChange(Math.max(1, Number(e.target.value) || 1))}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 6,
              border: '1px solid var(--border-default)', background: 'var(--bg-primary)',
              color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* 자재 소요량 테이블 */}
      {selected && hasBom && (
        <div>
          <div style={sectionLabelStyle}>자재 소요량 ({materials.length}건)</div>
          <div style={{ borderRadius: 8, border: '1px solid var(--border-default)', overflow: 'hidden' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>자재명</th>
                  <th style={thStyle}>SKU</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>단위수량</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>총 소요량</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>현재 재고</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const si = statusIconMap[m.status];
                  return (
                    <tr key={m.materialSku}>
                      <td style={tdStyle}>{m.materialName}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 11 }}>{m.materialSku}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{m.qtyPerUnit}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{m.totalRequired.toLocaleString()}</td>
                      <td style={{
                        ...tdStyle, textAlign: 'right', fontWeight: 600,
                        color: m.status === 'sufficient' ? 'var(--accent-green)' : m.status === 'warning' ? 'var(--accent-orange)' : 'var(--accent-red)',
                      }}>
                        {m.currentStock.toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span title={si.label} style={{ color: si.color, fontSize: 14 }}>{si.icon}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BOM 미등록 경고 */}
      {selected && !hasBom && (
        <div style={noBomWarningStyle}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>BOM이 등록되지 않은 제품입니다</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              자재 소요량을 확인하려면 BOM을 먼저 등록해주세요.
            </div>
          </div>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); /* BOM 등록 페이지 이동 */ }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              color: 'var(--accent-blue)', fontSize: 12, fontWeight: 600,
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            BOM 등록하러 가기 <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* 공정 목록 미리보기 */}
      {selected && selected.processes.length > 0 && (
        <div>
          <div style={sectionLabelStyle}>공정 목록</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {selected.processes.map((proc, i) => (
              <React.Fragment key={i}>
                <span style={{
                  padding: '4px 10px', borderRadius: 4, fontSize: 12,
                  background: 'var(--bg-primary)', border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}>
                  {i + 1}. {proc}
                </span>
                {i < selected.processes.length - 1 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>&rarr;</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
