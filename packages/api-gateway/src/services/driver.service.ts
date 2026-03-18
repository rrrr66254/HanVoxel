/**
 * 배송 기사 관리 서비스 — 기사 CRUD + 입출고 배정
 */
import prisma from './prisma';

// ── 기사 목록 ────────────────────────────────────────────

export async function getDrivers(siteId: string) {
  return prisma.deliveryDriver.findMany({
    where: { siteId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

// ── 기사 상세 ────────────────────────────────────────────

export async function getDriverById(id: string) {
  return prisma.deliveryDriver.findUnique({ where: { id } });
}

// ── 기사 등록 ────────────────────────────────────────────

interface CreateDriverInput {
  siteId: string;
  name: string;
  phone: string;
  carrierCompany?: string;
  vehicleNo?: string;
  vehicleType?: string;
  isRegular?: boolean;
  memo?: string;
}

export async function createDriver(data: CreateDriverInput) {
  return prisma.deliveryDriver.create({ data });
}

// ── 기사 수정 ────────────────────────────────────────────

export async function updateDriver(
  id: string,
  data: Partial<Omit<CreateDriverInput, 'siteId'>>,
) {
  return prisma.deliveryDriver.update({ where: { id }, data });
}

// ── 기사 비활성화 ────────────────────────────────────────

export async function deleteDriver(id: string) {
  return prisma.deliveryDriver.update({
    where: { id },
    data: { isActive: false },
  });
}

// ── 입고에 기사 배정 ─────────────────────────────────────

interface AssignDriverInput {
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  carrierCompany?: string;
  vehicleNo?: string;
}

export async function assignDriverToInbound(
  orderId: string,
  data: AssignDriverInput,
) {
  return prisma.inboundOrder.update({
    where: { id: orderId },
    data: {
      driverId: data.driverId ?? null,
      driverName: data.driverName ?? null,
      driverPhone: data.driverPhone ?? null,
      carrierCompany: data.carrierCompany ?? null,
      vehicleNo: data.vehicleNo ?? null,
    },
  });
}

// ── 출고에 기사 배정 ─────────────────────────────────────

export async function assignDriverToOutbound(
  orderId: string,
  data: AssignDriverInput,
) {
  return prisma.outboundOrder.update({
    where: { id: orderId },
    data: {
      driverId: data.driverId ?? null,
      driverName: data.driverName ?? null,
      driverPhone: data.driverPhone ?? null,
      carrierCompany: data.carrierCompany ?? null,
      vehicleNo: data.vehicleNo ?? null,
    },
  });
}

// ── 입고 상세 (items, driver 포함) ───────────────────────

export async function getInboundOrderDetail(id: string) {
  return prisma.inboundOrder.findUnique({
    where: { id },
    include: { items: true, driver: true },
  });
}

// ── 출고 상세 (items, driver 포함) ───────────────────────

export async function getOutboundOrderDetail(id: string) {
  return prisma.outboundOrder.findUnique({
    where: { id },
    include: { items: true, driver: true },
  });
}
