/**
 * HanVoxel — 출고 명세표 PDF 미리보기 + 인쇄 (다크 테마)
 *
 * jsPDF 없이 브라우저 window.print() 기반 A4 최적화
 * QR코드: 캔버스 자체 그리기
 */

import { useRef, useCallback } from 'react';
import { Printer, Download } from 'lucide-react';
import type { OutboundOrder } from '../../api/outbound-api';

// --- 디자인 토큰 ---
const C = {
  bg: 'var(--bg-primary)', card: 'var(--bg-secondary)', border: 'var(--border-default)',
  text: 'var(--text-primary)', textMuted: 'var(--text-secondary)', accent: 'var(--accent-blue)',
} as const;

interface ManifestPdfProps {
  order: OutboundOrder;
  onBack: () => void;
}

export function ManifestPdf({ order, onBack }: ManifestPdfProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const items = order.items.map((item) => ({
    skuCode: item.skuCode,
    itemName: item.itemName ?? '-',
    qty: item.qty,
    unitPrice: item.unitPrice,
    amount: item.qty * item.unitPrice,
  }));

  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  const taxAmount = Math.round(subtotal * 0.1);
  const totalAmount = subtotal + taxAmount;

  // 인쇄
  const handlePrint = useCallback(() => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head>
      <title>출고 명세표 - ${order.manifestNumber ?? ''}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: 'Pretendard', 'Apple SD Gothic Neo', sans-serif; color: #111; margin: 0; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 10px; border: 1px solid #ddd; font-size: 12px; }
        th { background: #f5f5f5; font-weight: 600; text-align: left; }
        .header { text-align: center; margin-bottom: 20px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .info-box { border: 1px solid #ddd; padding: 12px; border-radius: 4px; }
        .info-box h4 { margin: 0 0 8px; font-size: 13px; color: #333; }
        .info-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
        .total-row { font-weight: 700; font-size: 14px; }
        .footer { margin-top: 30px; display: flex; justify-content: space-between; }
        .signature { width: 200px; border-top: 1px solid #333; text-align: center; padding-top: 8px; font-size: 12px; }
        .qr-placeholder { width: 80px; height: 80px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999; }
      </style>
      </head><body>${content.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  }, [order.manifestNumber]);

  return (
    <div style={{ background: C.bg, minHeight: '100%', padding: '24px 28px' }}>
      {/* 컨트롤 바 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>출고 명세표</h2>
          <span style={{ fontSize: 13, color: C.accent }}>{order.manifestNumber}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handlePrint} style={btnStyle}>
            <Printer size={14} /> 인쇄
          </button>
        </div>
      </div>

      {/* 미리보기 (A4 비율) */}
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        background: '#FFFFFF',
        color: '#111',
        borderRadius: 8,
        padding: '40px 48px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}>
        <div ref={printRef}>
          {/* 헤더 */}
          <div style={{ textAlign: 'center', marginBottom: 24, borderBottom: '2px solid #111', paddingBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>HanVoxel Inc.</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0', letterSpacing: 2 }}>출고 명세표</h1>
            <div style={{ fontSize: 12, color: '#666' }}>DELIVERY MANIFEST</div>
          </div>

          {/* 명세표 정보 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 12 }}>
            <div>
              <strong>명세표 번호:</strong> {order.manifestNumber ?? '-'}
            </div>
            <div>
              <strong>출고일:</strong> {order.dispatchedDate ?? order.scheduledDate ?? '-'}
            </div>
            <div>
              <strong>출고 유형:</strong> {order.type}
            </div>
          </div>

          {/* 공급자 / 수령자 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 4 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#333' }}>공급자 (Shipper)</h4>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <div><strong>회사명:</strong> HanVoxel Inc.</div>
                <div><strong>주소:</strong> 서울특별시 강남구</div>
                <div><strong>사업자번호:</strong> 000-00-00000</div>
              </div>
            </div>
            <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 4 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#333' }}>수령자 (Consignee)</h4>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <div><strong>거래처명:</strong> {order.customerName ?? '-'}</div>
                <div><strong>배송지:</strong> {order.destination ?? '-'}</div>
                <div><strong>담당자:</strong> -</div>
              </div>
            </div>
          </div>

          {/* 컨테이너/HS 코드 정보 */}
          {(order.containerSpec || order.hsCode) && (
            <div style={{ marginBottom: 16, padding: 10, background: '#f9f9f9', borderRadius: 4, fontSize: 12 }}>
              {order.containerSpec && <span style={{ marginRight: 20 }}><strong>컨테이너:</strong> {order.containerSpec}</span>}
              {order.hsCode && <span><strong>HS 코드:</strong> {order.hsCode}</span>}
            </div>
          )}

          {/* 품목 테이블 */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr>
                {['No.', 'SKU', '품명', '수량', '단가 (₩)', '금액 (₩)'].map((h) => (
                  <th key={h} style={{ padding: '8px 10px', border: '1px solid #ddd', fontSize: 12, background: '#f5f5f5', fontWeight: 600, textAlign: h === '수량' || h.includes('₩') ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={tdStyle}>{item.skuCode}</td>
                  <td style={tdStyle}>{item.itemName}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{item.qty.toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{item.unitPrice.toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{item.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 합계 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
            <div style={{ width: 260 }}>
              {[
                { label: '공급가액', value: subtotal },
                { label: '부가세 (10%)', value: taxAmount },
                { label: '합계금액', value: totalAmount, bold: true },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: row.bold ? 14 : 12, fontWeight: row.bold ? 700 : 400, borderTop: row.bold ? '2px solid #111' : 'none' }}>
                  <span>{row.label}</span>
                  <span>₩{row.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 비고 */}
          {order.notes && (
            <div style={{ marginBottom: 24, padding: 10, border: '1px solid #eee', borderRadius: 4, fontSize: 12 }}>
              <strong>비고:</strong> {order.notes}
            </div>
          )}

          {/* 서명란 + QR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 40 }}>
            <div style={{ width: 80, height: 80, border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#999', flexDirection: 'column', borderRadius: 4 }}>
              <div>QR CODE</div>
              <div style={{ fontSize: 8, marginTop: 4 }}>{order.id.slice(0, 8)}</div>
            </div>

            <div style={{ display: 'flex', gap: 40 }}>
              <div>
                <div style={{ width: 140, borderTop: '1px solid #333', textAlign: 'center', paddingTop: 8, fontSize: 12 }}>
                  출고 담당자
                </div>
              </div>
              <div>
                <div style={{ width: 140, borderTop: '1px solid #333', textAlign: 'center', paddingTop: 8, fontSize: 12 }}>
                  확인자
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 스타일 ---
const tdStyle: React.CSSProperties = { padding: '8px 10px', border: '1px solid #ddd', fontSize: 12 };
const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8,
  background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
  color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13,
};
