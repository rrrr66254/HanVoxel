/**
 * 거래처 관리 서비스 — 공급업체/고객사 CRUD + 거래 이력
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
  paymentTerms?: string;
  note?: string;
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
    ];
  }

  const [partners, total] = await Promise.all([
    prisma.partner.findMany({
      where,
      orderBy: { name: 'asc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    prisma.partner.count({ where }),
  ]);
  return { partners, total };
}

export async function getPartnerById(id: string) {
  return prisma.partner.findUnique({ where: { id } });
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
