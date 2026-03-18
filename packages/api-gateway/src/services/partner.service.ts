import prisma from './prisma';

// ── 거래처 CRUD ─────────────────────────────────

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

export async function createPartner(input: CreatePartnerInput) {
  return prisma.partner.create({
    data: {
      companyId: input.companyId,
      type: input.type,
      name: input.name,
      code: input.code,
      bizNo: input.bizNo,
      ceoName: input.ceoName,
      bizType: input.bizType,
      bizCategory: input.bizCategory,
      address: input.address,
      phone: input.phone,
      email: input.email,
      contactName: input.contactName,
      paymentTerms: input.paymentTerms,
      note: input.note,
    },
    include: { contacts: true, bankAccounts: true, transactionSummary: true },
  });
}

export async function listPartners(
  companyId: string,
  opts: { type?: string; search?: string; isActive?: boolean; page?: number; limit?: number } = {},
) {
  const { type, search, isActive, page = 1, limit = 20 } = opts;

  const where: Record<string, unknown> = { companyId };
  if (type) where.type = type;
  if (typeof isActive === 'boolean') where.isActive = isActive;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { bizNo: { contains: search } },
    ];
  }

  const [total, partners] = await Promise.all([
    prisma.partner.count({ where }),
    prisma.partner.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { transactionSummary: true },
    }),
  ]);

  return { partners, total, page, limit };
}

export async function getPartner(id: string) {
  return prisma.partner.findUnique({
    where: { id },
    include: {
      contacts: true,
      bankAccounts: true,
      attachments: true,
      transactionSummary: true,
      drivers: true,
    },
  });
}

export async function updatePartner(id: string, input: Partial<CreatePartnerInput>) {
  const data: Record<string, unknown> = {};
  if (input.type !== undefined) data.type = input.type;
  if (input.name !== undefined) data.name = input.name;
  if (input.code !== undefined) data.code = input.code;
  if (input.bizNo !== undefined) data.bizNo = input.bizNo;
  if (input.ceoName !== undefined) data.ceoName = input.ceoName;
  if (input.bizType !== undefined) data.bizType = input.bizType;
  if (input.bizCategory !== undefined) data.bizCategory = input.bizCategory;
  if (input.address !== undefined) data.address = input.address;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.email !== undefined) data.email = input.email;
  if (input.contactName !== undefined) data.contactName = input.contactName;
  if (input.paymentTerms !== undefined) data.paymentTerms = input.paymentTerms;
  if (input.note !== undefined) data.note = input.note;

  return prisma.partner.update({
    where: { id },
    data,
    include: { contacts: true, bankAccounts: true, transactionSummary: true },
  });
}

export async function deletePartner(id: string) {
  return prisma.partner.update({
    where: { id },
    data: { isActive: false },
  });
}

// ── 담당자 CRUD ─────────────────────────────────

interface ContactInput {
  partnerId: string;
  name: string;
  department?: string;
  position?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export async function addContact(input: ContactInput) {
  return prisma.partnerContact.create({ data: input });
}

export async function updateContact(id: string, input: Partial<ContactInput>) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.department !== undefined) data.department = input.department;
  if (input.position !== undefined) data.position = input.position;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.email !== undefined) data.email = input.email;
  if (input.isPrimary !== undefined) data.isPrimary = input.isPrimary;
  return prisma.partnerContact.update({ where: { id }, data });
}

export async function deleteContact(id: string) {
  return prisma.partnerContact.delete({ where: { id } });
}

// ── 계좌 CRUD ───────────────────────────────────

interface BankAccountInput {
  partnerId: string;
  bankName: string;
  accountNo: string;
  holder: string;
  isPrimary?: boolean;
}

export async function addBankAccount(input: BankAccountInput) {
  return prisma.partnerBankAccount.create({ data: input });
}

export async function deleteBankAccount(id: string) {
  return prisma.partnerBankAccount.delete({ where: { id } });
}

// ── 거래 요약 갱신 ──────────────────────────────

export async function refreshTransactionSummary(partnerId: string) {
  const inboundAgg = await prisma.inboundOrder.aggregate({
    where: { vendorId: partnerId },
    _count: { id: true },
  });
  const inboundItems = await prisma.inboundItem.findMany({
    where: { inboundOrder: { vendorId: partnerId } },
    select: { expectedQty: true, unitPrice: true },
  });
  const totalPurchase = inboundItems.reduce(
    (sum, it) => sum + BigInt(it.expectedQty) * BigInt(it.unitPrice), BigInt(0),
  );

  const outboundAgg = await prisma.outboundOrder.aggregate({
    where: { customerName: { not: null } },
    _count: { id: true },
  });
  const outboundItems = await prisma.outboundItem.findMany({
    where: { outboundOrder: { customerName: { not: null } } },
    select: { qty: true, unitPrice: true },
  });
  const totalSales = outboundItems.reduce(
    (sum, it) => sum + BigInt(it.qty) * BigInt(it.unitPrice), BigInt(0),
  );

  return prisma.partnerTransactionSummary.upsert({
    where: { partnerId },
    create: {
      partnerId,
      totalInbound: inboundAgg._count.id,
      totalOutbound: outboundAgg._count.id,
      totalPurchase,
      totalSales,
      lastTransactionAt: new Date(),
    },
    update: {
      totalInbound: inboundAgg._count.id,
      totalOutbound: outboundAgg._count.id,
      totalPurchase,
      totalSales,
      lastTransactionAt: new Date(),
    },
  });
}
