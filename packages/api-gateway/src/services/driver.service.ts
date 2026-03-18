import prisma from './prisma';

interface CreateDriverInput {
  partnerId?: string;
  name: string;
  phone: string;
  vehicleNo?: string;
  vehicleType?: string;
  note?: string;
}

export async function createDriver(input: CreateDriverInput) {
  return prisma.deliveryDriver.create({ data: input });
}

export async function listDrivers(
  opts: { partnerId?: string; search?: string; isActive?: boolean; page?: number; limit?: number } = {},
) {
  const { partnerId, search, isActive, page = 1, limit = 50 } = opts;

  const where: Record<string, unknown> = {};
  if (partnerId) where.partnerId = partnerId;
  if (typeof isActive === 'boolean') where.isActive = isActive;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { vehicleNo: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, drivers] = await Promise.all([
    prisma.deliveryDriver.count({ where }),
    prisma.deliveryDriver.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { partner: { select: { id: true, name: true, code: true } } },
    }),
  ]);

  return { drivers, total, page, limit };
}

export async function getDriver(id: string) {
  return prisma.deliveryDriver.findUnique({
    where: { id },
    include: { partner: { select: { id: true, name: true, code: true } } },
  });
}

export async function updateDriver(id: string, input: Partial<CreateDriverInput>) {
  const data: Record<string, unknown> = {};
  if (input.partnerId !== undefined) data.partnerId = input.partnerId;
  if (input.name !== undefined) data.name = input.name;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.vehicleNo !== undefined) data.vehicleNo = input.vehicleNo;
  if (input.vehicleType !== undefined) data.vehicleType = input.vehicleType;
  if (input.note !== undefined) data.note = input.note;

  return prisma.deliveryDriver.update({
    where: { id },
    data,
    include: { partner: { select: { id: true, name: true, code: true } } },
  });
}

export async function deleteDriver(id: string) {
  return prisma.deliveryDriver.update({
    where: { id },
    data: { isActive: false },
  });
}
