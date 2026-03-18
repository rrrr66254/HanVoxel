/**
 * 거래처 관리 서비스 — 공급업체/고객사 CRUD + 거래 이력 + 계좌/첨부/담당자
 */
import prisma from './prisma';
import { Prisma } from '@prisma/client';

// ── CRUD ────────────────────────────────────────────────

interface CreatePartnerInput {
  companyId: string;
  type: string;
  name: string;
  code: string;
  bizNo?: string;
  ceoName?: string;
  bizType?: string;
  bizCategory?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  mainPhone?: string;
  fax?: string;
  zipCode?: string;
  addressDetail?: string;
  deliveryAddress?: string;
  deliveryMemo?: string;
  paymentTerms?: string;
  creditLimit?: number;
  currency?: string;
  taxType?: string;
  leadTimeDays?: number;
  minOrderQty?: number;
  qualityGrade?: string;
  memo?: string;
  note?: string;
  tags?: Prisma.JsonValue;
}

export async function createPartner(data: CreatePartnerInput) {
  return prisma.partner.create({ data });
}

export async function updatePartner(id: string, data: Partial<CreatePartnerInput>) {
  return prisma.partner.update({ where: { id }, data });
}

export async function getPartners(
  companyId: string,
  options?: { type?: string; search?: string; limit?: number; offset?: number },
) {
  const where: Prisma.PartnerWhereInput = { companyId, isActive: true };
  if (options?.type) where.type = options.type;
  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { code: { contains: options.search, mode: 'insensitive' } },
      { bizNo: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [partners, total] = await Promise.all([
    prisma.partner.findMany({
      where,
      orderBy: { name: 'asc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
      include: {
        contacts: { where: { isPrimary: true }, take: 1 },
        transactionSummaries: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 1,
        },
      },
    }),
    prisma.partner.count({ where }),
  ]);
  return { partners, total };
}

export async function getPartnerById(id: string) {
  return prisma.partner.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
      bankAccounts: { orderBy: { isPrimary: 'desc' } },
      attachments: { orderBy: { uploadedAt: 'desc' } },
      transactionSummaries: {
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 12,
      },
    },
  });
}

// ── 거래 이력 ──────────────────────────────────────────

export async function getPartnerHistory(partnerId: string, limit = 20) {
  return prisma.voucher.findMany({
    where: { partnerId },
    include: { lines: true },
    orderBy: { voucherDate: 'desc' },
    take: limit,
  });
}

// ── 거래처 통계 ────────────────────────────────────────

export async function getPartnerStats(companyId: string) {
  const [suppliers, customers, both] = await Promise.all([
    prisma.partner.count({ where: { companyId, type: 'SUPPLIER', isActive: true } }),
    prisma.partner.count({ where: { companyId, type: 'CUSTOMER', isActive: true } }),
    prisma.partner.count({ where: { companyId, type: 'BOTH', isActive: true } }),
  ]);
  return { suppliers, customers, both, total: suppliers + customers + both };
}

// ── 업체 비활성화 (소프트 삭제) ──────────────────────────

export async function deletePartner(id: string) {
  return prisma.partner.update({ where: { id }, data: { isActive: false } });
}

// ── 자동완성 검색 (이름/코드/사업자번호) ─────────────────

export async function searchPartners(companyId: string, q: string) {
  return prisma.partner.findMany({
    where: {
      companyId,
      isActive: true,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { bizNo: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 10,
    orderBy: { name: 'asc' },
  });
}

// ── 거래 실적 집계 조회 ──────────────────────────────────

export async function getPartnerTransactionSummary(partnerId: string) {
  return prisma.partnerTransactionSummary.findMany({
    where: { partnerId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 12,
  });
}

// ── 거래액 랭킹 (상위 매출/매입처) ───────────────────────

export async function getPartnerRanking(
  companyId: string,
  type: 'SUPPLIER' | 'CUSTOMER',
  limit = 10,
) {
  const voucherType = type === 'SUPPLIER' ? 'PURCHASE' : 'SALES';

  const partners = await prisma.partner.findMany({
    where: { companyId, type: { in: [type, 'BOTH'] }, isActive: true },
    include: {
      vouchers: {
        where: { type: voucherType, status: 'CONFIRMED' },
        select: { totalAmount: true },
      },
    },
  });

  const ranked = partners
    .map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      type: p.type,
      qualityGrade: p.qualityGrade,
      totalAmount: p.vouchers.reduce((sum, v) => sum + v.totalAmount, 0),
      voucherCount: p.vouchers.length,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);

  return ranked;
}

// ── 대시보드 통계 (매출/매입 합계, 미수금, 미지급금) ──────

export async function getPartnerDashboardStats(companyId: string) {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const partnerIds = (
    await prisma.partner.findMany({
      where: { companyId, isActive: true },
      select: { id: true },
    })
  ).map((p) => p.id);

  if (partnerIds.length === 0) {
    return {
      currentMonth: { sales: 0, purchase: 0 },
      previousMonth: { sales: 0, purchase: 0 },
      outstanding: { receivable: 0, payable: 0 },
    };
  }

  const [currentVouchers, prevVouchers] = await Promise.all([
    prisma.voucher.groupBy({
      by: ['type'],
      where: {
        partnerId: { in: partnerIds },
        status: 'CONFIRMED',
        voucherDate: { gte: currentMonthStart },
      },
      _sum: { totalAmount: true },
    }),
    prisma.voucher.groupBy({
      by: ['type'],
      where: {
        partnerId: { in: partnerIds },
        status: 'CONFIRMED',
        voucherDate: { gte: prevMonthStart, lt: currentMonthStart },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  const sumByType = (rows: typeof currentVouchers, t: string) =>
    rows.find((r) => r.type === t)?._sum.totalAmount ?? 0;

  const [receivableAgg, payableAgg] = await Promise.all([
    prisma.voucher.aggregate({
      where: {
        partnerId: { in: partnerIds },
        type: 'SALES',
        status: 'CONFIRMED',
        dueDate: { lt: now },
      },
      _sum: { totalAmount: true },
    }),
    prisma.voucher.aggregate({
      where: {
        partnerId: { in: partnerIds },
        type: 'PURCHASE',
        status: 'CONFIRMED',
        dueDate: { lt: now },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    currentMonth: {
      sales: sumByType(currentVouchers, 'SALES'),
      purchase: sumByType(currentVouchers, 'PURCHASE'),
    },
    previousMonth: {
      sales: sumByType(prevVouchers, 'SALES'),
      purchase: sumByType(prevVouchers, 'PURCHASE'),
    },
    outstanding: {
      receivable: receivableAgg._sum.totalAmount ?? 0,
      payable: payableAgg._sum.totalAmount ?? 0,
    },
  };
}

// ── 담당자 CRUD ──────────────────────────────────────────

interface CreatePartnerContactInput {
  partnerId: string;
  name: string;
  department?: string;
  position?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export async function createPartnerContact(data: CreatePartnerContactInput) {
  return prisma.partnerContact.create({ data });
}

export async function getPartnerContacts(partnerId: string) {
  return prisma.partnerContact.findMany({
    where: { partnerId },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });
}

export async function updatePartnerContact(
  id: string,
  data: Partial<Omit<CreatePartnerContactInput, 'partnerId'>>,
) {
  return prisma.partnerContact.update({ where: { id }, data });
}

export async function deletePartnerContact(id: string) {
  return prisma.partnerContact.delete({ where: { id } });
}

// ── 계좌 CRUD ──────────────────────────────────────────

interface CreateBankAccountInput {
  partnerId: string;
  bankName: string;
  accountNo: string;
  accountHolder: string;
  isPrimary?: boolean;
}

export async function createBankAccount(data: CreateBankAccountInput) {
  return prisma.partnerBankAccount.create({ data });
}

export async function getBankAccounts(partnerId: string) {
  return prisma.partnerBankAccount.findMany({
    where: { partnerId },
    orderBy: { isPrimary: 'desc' },
  });
}

export async function updateBankAccount(
  id: string,
  data: Partial<Omit<CreateBankAccountInput, 'partnerId'>>,
) {
  return prisma.partnerBankAccount.update({ where: { id }, data });
}

export async function deleteBankAccount(id: string) {
  return prisma.partnerBankAccount.delete({ where: { id } });
}

// ── 첨부파일 CRUD ──────────────────────────────────────

interface CreateAttachmentInput {
  partnerId: string;
  fileType: string;
  fileName: string;
  fileUrl: string;
}

export async function createAttachment(data: CreateAttachmentInput) {
  return prisma.partnerAttachment.create({ data });
}

export async function getAttachments(partnerId: string) {
  return prisma.partnerAttachment.findMany({
    where: { partnerId },
    orderBy: { uploadedAt: 'desc' },
  });
}

export async function deleteAttachment(id: string) {
  return prisma.partnerAttachment.delete({ where: { id } });
}
