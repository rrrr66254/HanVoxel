/**
 * 전표 서비스 — 매입/매출 전표 생성 + 원가 연동 + PDF 생성
 */
import prisma from './prisma';
import { Prisma } from '@prisma/client';
import { updateSkuCostOnPurchase, updateSkuCostOnSales } from './cost.service';

// ── 전표 번호 자동 생성 ────────────────────────────────

async function generateVoucherNo(type: string): Promise<string> {
  const prefix = type === 'PURCHASE' ? 'PUR' : 'SAL';
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // 오늘 해당 타입 전표 수 + 1
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);
  const count = await prisma.voucher.count({
    where: {
      type,
      createdAt: { gte: startOfDay, lt: endOfDay },
    },
  });

  return `${prefix}-${dateStr}-${String(count + 1).padStart(4, '0')}`;
}

// ── CRUD ────────────────────────────────────────────────

interface VoucherLineInput {
  sku: string;
  itemName: string;
  qty: number;
  unitPrice: number;
  taxAmount?: number;
  note?: string;
}

interface CreateVoucherInput {
  siteId: string;
  type: string;
  partnerId: string;
  voucherDate: string;
  dueDate?: string;
  referenceNo?: string;
  note?: string;
  lines: VoucherLineInput[];
}

export async function createVoucher(data: CreateVoucherInput) {
  const voucherNo = await generateVoucherNo(data.type);

  // 금액 계산
  const lines = data.lines.map((line, idx) => {
    const amount = line.qty * line.unitPrice;
    const taxAmount = line.taxAmount ?? Math.round(amount * 0.1); // 부가세 10%
    return {
      lineNo: idx + 1,
      sku: line.sku,
      itemName: line.itemName,
      qty: line.qty,
      unitPrice: line.unitPrice,
      amount,
      taxAmount,
      note: line.note,
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const taxAmount = lines.reduce((s, l) => s + l.taxAmount, 0);
  const totalAmount = subtotal + taxAmount;

  const voucher = await prisma.voucher.create({
    data: {
      siteId: data.siteId,
      type: data.type,
      voucherNo,
      partnerId: data.partnerId,
      voucherDate: new Date(data.voucherDate),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      referenceNo: data.referenceNo,
      note: data.note,
      subtotal,
      taxAmount,
      totalAmount,
      lines: { create: lines },
    },
    include: { lines: true, partner: true },
  });

  return voucher;
}

export async function confirmVoucher(id: string) {
  const voucher = await prisma.voucher.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!voucher) throw new Error('전표를 찾을 수 없습니다');
  if (voucher.status !== 'DRAFT') throw new Error('확정 가능한 상태가 아닙니다');

  // 원가 업데이트
  for (const line of voucher.lines) {
    if (voucher.type === 'PURCHASE') {
      await updateSkuCostOnPurchase(voucher.siteId, line.sku, line.itemName, line.qty, line.unitPrice);
    } else {
      await updateSkuCostOnSales(voucher.siteId, line.sku, line.qty);
    }
  }

  return prisma.voucher.update({
    where: { id },
    data: { status: 'CONFIRMED', confirmedAt: new Date() },
    include: { lines: true, partner: true },
  });
}

export async function cancelVoucher(id: string) {
  return prisma.voucher.update({
    where: { id },
    data: { status: 'CANCELED' },
    include: { lines: true, partner: true },
  });
}

export async function getVouchers(
  siteId: string,
  options?: { type?: string; status?: string; partnerId?: string; from?: string; to?: string; limit?: number; offset?: number },
) {
  const where: Prisma.VoucherWhereInput = { siteId };
  if (options?.type) where.type = options.type;
  if (options?.status) where.status = options.status;
  if (options?.partnerId) where.partnerId = options.partnerId;
  if (options?.from || options?.to) {
    where.voucherDate = {};
    if (options?.from) where.voucherDate.gte = new Date(options.from);
    if (options?.to) where.voucherDate.lte = new Date(options.to);
  }

  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      include: { partner: { select: { id: true, name: true, code: true } }, lines: true },
      orderBy: { voucherDate: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    prisma.voucher.count({ where }),
  ]);
  return { vouchers, total };
}

export async function getVoucherById(id: string) {
  return prisma.voucher.findUnique({
    where: { id },
    include: { partner: true, lines: { orderBy: { lineNo: 'asc' } } },
  });
}

// ── 전표 통계 ──────────────────────────────────────────

export async function getVoucherStats(siteId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const vouchers = await prisma.voucher.findMany({
    where: { siteId, voucherDate: { gte: since }, status: { not: 'CANCELED' } },
  });

  const purchases = vouchers.filter((v) => v.type === 'PURCHASE');
  const sales = vouchers.filter((v) => v.type === 'SALES');

  return {
    days,
    totalPurchases: purchases.length,
    totalSales: sales.length,
    purchaseAmount: purchases.reduce((s, v) => s + v.totalAmount, 0),
    salesAmount: sales.reduce((s, v) => s + v.totalAmount, 0),
    pendingPurchases: purchases.filter((v) => v.status === 'DRAFT').length,
    pendingSales: sales.filter((v) => v.status === 'DRAFT').length,
  };
}

// ── PDF HTML 생성 ──────────────────────────────────────

export async function generateVoucherPdfHtml(id: string, docType: 'purchase_order' | 'delivery_note') {
  const voucher = await getVoucherById(id);
  if (!voucher) throw new Error('전표를 찾을 수 없습니다');

  const isOrder = docType === 'purchase_order';
  const title = isOrder ? '발 주 서' : '납품확인서';
  const formatPrice = (n: number) => n.toLocaleString('ko-KR');
  const formatDate = (d: Date) => d.toLocaleDateString('ko-KR');

  const lineRows = voucher.lines.map((l) => `
    <tr>
      <td>${l.lineNo}</td>
      <td>${l.sku}</td>
      <td>${l.itemName}</td>
      <td class="right">${l.qty}</td>
      <td class="right">${formatPrice(l.unitPrice)}</td>
      <td class="right">${formatPrice(l.amount)}</td>
      <td class="right">${formatPrice(l.taxAmount)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>${title} — ${voucher.voucherNo}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif; font-size: 12px; color: #333; }
    h1 { text-align: center; font-size: 24px; margin-bottom: 5px; letter-spacing: 8px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
    .info-box { border: 1px solid #ddd; padding: 12px; border-radius: 4px; }
    .info-box h3 { font-size: 13px; color: #666; margin: 0 0 8px 0; }
    .info-row { display: flex; margin: 3px 0; }
    .info-label { width: 80px; color: #666; flex-shrink: 0; }
    .info-value { font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th { background: #f5f5f5; border: 1px solid #ddd; padding: 8px; font-size: 11px; }
    td { border: 1px solid #ddd; padding: 6px 8px; }
    .right { text-align: right; }
    .total-row { background: #f9f9f9; font-weight: 700; }
    .footer { margin-top: 30px; display: flex; justify-content: space-between; }
    .stamp-box { width: 120px; height: 60px; border: 1px solid #ccc; text-align: center; line-height: 60px; color: #999; }
    .note { margin-top: 15px; padding: 10px; border: 1px solid #eee; border-radius: 4px; color: #555; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="subtitle">문서번호: ${voucher.voucherNo} | 일자: ${formatDate(voucher.voucherDate)}</div>

  <div class="info-grid">
    <div class="info-box">
      <h3>${isOrder ? '발주처 (공급자)' : '공급자'}</h3>
      <div class="info-row"><span class="info-label">업체명</span><span class="info-value">${voucher.partner.name}</span></div>
      <div class="info-row"><span class="info-label">코드</span><span class="info-value">${voucher.partner.code}</span></div>
      ${voucher.partner.bizNo ? `<div class="info-row"><span class="info-label">사업자번호</span><span class="info-value">${voucher.partner.bizNo}</span></div>` : ''}
      ${voucher.partner.ceoName ? `<div class="info-row"><span class="info-label">대표자</span><span class="info-value">${voucher.partner.ceoName}</span></div>` : ''}
      ${voucher.partner.phone ? `<div class="info-row"><span class="info-label">연락처</span><span class="info-value">${voucher.partner.phone}</span></div>` : ''}
    </div>
    <div class="info-box">
      <h3>전표 정보</h3>
      <div class="info-row"><span class="info-label">유형</span><span class="info-value">${voucher.type === 'PURCHASE' ? '매입' : '매출'}</span></div>
      <div class="info-row"><span class="info-label">상태</span><span class="info-value">${voucher.status === 'CONFIRMED' ? '확정' : voucher.status === 'CANCELED' ? '취소' : '임시'}</span></div>
      ${voucher.dueDate ? `<div class="info-row"><span class="info-label">납기일</span><span class="info-value">${formatDate(voucher.dueDate)}</span></div>` : ''}
      ${voucher.referenceNo ? `<div class="info-row"><span class="info-label">참조번호</span><span class="info-value">${voucher.referenceNo}</span></div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px">No</th>
        <th style="width:100px">SKU</th>
        <th>품명</th>
        <th style="width:60px">수량</th>
        <th style="width:90px">단가</th>
        <th style="width:100px">공급가</th>
        <th style="width:80px">부가세</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="5" class="right">합계</td>
        <td class="right">${formatPrice(voucher.subtotal)}</td>
        <td class="right">${formatPrice(voucher.taxAmount)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="5" class="right">총액 (VAT 포함)</td>
        <td colspan="2" class="right" style="font-size:14px">${formatPrice(voucher.totalAmount)}원</td>
      </tr>
    </tfoot>
  </table>

  ${voucher.note ? `<div class="note"><strong>비고:</strong> ${voucher.note}</div>` : ''}

  <div class="footer">
    <div>
      <p>위와 같이 ${isOrder ? '발주' : '납품을 확인'}합니다.</p>
      <p style="color:#999; font-size:10px">HanVoxel Logistics ERP</p>
    </div>
    <div>
      <div class="stamp-box">(인)</div>
    </div>
  </div>
</body>
</html>`;
}
