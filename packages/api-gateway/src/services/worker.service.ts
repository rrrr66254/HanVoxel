/**
 * 작업자 관리 서비스
 *
 * - 작업자 CRUD (사번 자동 생성)
 * - 기술/자격 마스터 관리
 * - 작업자별 자격증 관리
 * - 교대 근무 스케줄 관리
 * - 작업자 실적 조회
 * - 기술 기반 작업자 추천
 */
import prisma from './prisma';
import { Prisma } from '@prisma/client';

// ── 타입 ──────────────────────────────────────────

interface CreateWorkerInput {
  siteId: string;
  name: string;
  phone?: string;
  email?: string;
  department?: string;
  position?: string;
  skills?: Prisma.JsonValue;
  hourlyWage?: number;
  shiftType?: string;
  joinedAt?: string;
}

interface UpdateWorkerInput {
  name?: string;
  phone?: string;
  email?: string;
  department?: string;
  position?: string;
  skills?: Prisma.JsonValue;
  hourlyWage?: number;
  shiftType?: string;
  joinedAt?: string;
  isActive?: boolean;
}

interface CreateSkillInput {
  name: string;
  category?: string;
  expiresRequired?: boolean;
  description?: string;
}

interface AddCertInput {
  skillId: string;
  acquiredAt: string;
  expiresAt?: string;
  certNo?: string;
  certFileUrl?: string;
}

interface ScheduleEntryInput {
  workerId: string;
  workDate: string;
  shift: string;
  workCenterId?: string;
}

// ── 사번 자동 생성 ────────────────────────────────

export async function generateEmployeeNo(): Promise<string> {
  const prefix = 'EMP-';

  // 마지막 사번 조회
  const last = await prisma.worker.findFirst({
    where: { employeeNo: { startsWith: prefix } },
    orderBy: { employeeNo: 'desc' },
    select: { employeeNo: true },
  });

  let seq = 1;
  if (last) {
    const lastSeq = parseInt(last.employeeNo.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(3, '0')}`;
}

// ── 작업자 생성 ────────────────────────────────────

export async function createWorker(input: CreateWorkerInput) {
  const employeeNo = await generateEmployeeNo();

  return prisma.worker.create({
    data: {
      siteId: input.siteId,
      employeeNo,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      department: input.department ?? null,
      position: input.position ?? null,
      skills: input.skills ?? [],
      hourlyWage: input.hourlyWage ?? 0,
      shiftType: input.shiftType ?? 'DAY',
      joinedAt: input.joinedAt ? new Date(input.joinedAt) : null,
    },
    include: { skillCerts: { include: { skill: true } } },
  });
}

// ── 작업자 목록 조회 ──────────────────────────────

export async function listWorkers(
  opts: {
    siteId?: string;
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const { siteId, department, search, page = 1, limit = 20 } = opts;

  const where: Record<string, unknown> = {};
  if (siteId) where.siteId = siteId;
  if (department) where.department = department;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { employeeNo: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, workers] = await Promise.all([
    prisma.worker.count({ where }),
    prisma.worker.findMany({
      where,
      include: { skillCerts: { include: { skill: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { workers, total, page, limit };
}

// ── 작업자 상세 조회 ──────────────────────────────

export async function getWorkerById(id: string) {
  return prisma.worker.findUnique({
    where: { id },
    include: {
      skillCerts: { include: { skill: true } },
      schedules: { orderBy: { workDate: 'desc' }, take: 30 },
      performances: { orderBy: { workDate: 'desc' }, take: 30 },
    },
  });
}

// ── 작업자 수정 ────────────────────────────────────

export async function updateWorker(id: string, input: UpdateWorkerInput) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.email !== undefined) data.email = input.email;
  if (input.department !== undefined) data.department = input.department;
  if (input.position !== undefined) data.position = input.position;
  if (input.skills !== undefined) data.skills = input.skills;
  if (input.hourlyWage !== undefined) data.hourlyWage = input.hourlyWage;
  if (input.shiftType !== undefined) data.shiftType = input.shiftType;
  if (input.joinedAt !== undefined) data.joinedAt = new Date(input.joinedAt);
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return prisma.worker.update({
    where: { id },
    data,
    include: { skillCerts: { include: { skill: true } } },
  });
}

// ── 작업자 실적 조회 ──────────────────────────────

export async function getWorkerPerformance(
  workerId: string,
  from: string,
  to: string,
) {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const performances = await prisma.workerPerformance.findMany({
    where: {
      workerId,
      workDate: { gte: fromDate, lte: toDate },
    },
    orderBy: { workDate: 'asc' },
  });

  // 집계 통계
  const totalProduced = performances.reduce((sum, p) => sum + p.producedQty, 0);
  const totalDefect = performances.reduce((sum, p) => sum + p.defectQty, 0);
  const totalWorkHours = performances.reduce((sum, p) => sum + p.workHours, 0);
  const avgEfficiency = performances.length > 0
    ? performances.reduce((sum, p) => sum + p.efficiencyRate, 0) / performances.length
    : 0;

  return {
    summary: {
      totalDays: performances.length,
      totalProduced,
      totalDefect,
      defectRate: totalProduced > 0 ? (totalDefect / totalProduced) * 100 : 0,
      totalWorkHours,
      avgEfficiency: Math.round(avgEfficiency * 100) / 100,
    },
    daily: performances,
  };
}

// ── 주간 스케줄 조회 ──────────────────────────────

export async function getWeeklySchedule(siteId: string, weekStart: string) {
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const schedules = await prisma.workerSchedule.findMany({
    where: {
      worker: { siteId },
      workDate: { gte: startDate, lte: endDate },
    },
    include: {
      worker: { select: { id: true, name: true, employeeNo: true, department: true } },
    },
    orderBy: [{ workDate: 'asc' }, { worker: { name: 'asc' } }],
  });

  return schedules;
}

// ── 스케줄 생성/갱신 ──────────────────────────────

export async function upsertSchedules(entries: ScheduleEntryInput[]) {
  const results = [];

  for (const entry of entries) {
    const result = await prisma.workerSchedule.upsert({
      where: {
        workerId_workDate: {
          workerId: entry.workerId,
          workDate: new Date(entry.workDate),
        },
      },
      create: {
        workerId: entry.workerId,
        workDate: new Date(entry.workDate),
        shift: entry.shift,
        workCenterId: entry.workCenterId ?? null,
      },
      update: {
        shift: entry.shift,
        workCenterId: entry.workCenterId ?? null,
      },
      include: {
        worker: { select: { id: true, name: true, employeeNo: true } },
      },
    });
    results.push(result);
  }

  return results;
}

// ── 기술 기반 작업자 추천 ──────────────────────────

export async function suggestWorkers(
  siteId: string,
  skill: string,
  workCenterId?: string,
) {
  // 해당 기술 자격증을 보유한 활성 작업자 조회
  const workers = await prisma.worker.findMany({
    where: {
      siteId,
      isActive: true,
      skillCerts: {
        some: {
          skill: { name: { contains: skill, mode: 'insensitive' } },
          // 만료되지 않은 자격증만
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } },
          ],
        },
      },
    },
    include: {
      skillCerts: { include: { skill: true } },
      schedules: {
        where: { workDate: { gte: new Date() } },
        orderBy: { workDate: 'asc' },
        take: 7,
      },
    },
    orderBy: { name: 'asc' },
  });

  // 작업장 배정 여부로 우선순위 정렬
  if (workCenterId) {
    workers.sort((a, b) => {
      const aAssigned = a.schedules.some((s) => s.workCenterId === workCenterId);
      const bAssigned = b.schedules.some((s) => s.workCenterId === workCenterId);
      if (aAssigned && !bAssigned) return -1;
      if (!aAssigned && bAssigned) return 1;
      return 0;
    });
  }

  return workers;
}

// ── 기술/자격 마스터 목록 ──────────────────────────

export async function listSkills() {
  return prisma.workerSkill.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { certs: true } } },
  });
}

// ── 기술/자격 마스터 생성 ──────────────────────────

export async function createSkill(input: CreateSkillInput) {
  return prisma.workerSkill.create({
    data: {
      name: input.name,
      category: input.category ?? null,
      expiresRequired: input.expiresRequired ?? false,
      description: input.description ?? null,
    },
  });
}

// ── 작업자 자격증 추가 ────────────────────────────

export async function addCert(workerId: string, input: AddCertInput) {
  return prisma.workerSkillCert.create({
    data: {
      workerId,
      skillId: input.skillId,
      acquiredAt: new Date(input.acquiredAt),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      certNo: input.certNo ?? null,
      certFileUrl: input.certFileUrl ?? null,
    },
    include: { skill: true },
  });
}
