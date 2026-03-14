import prisma from './prisma';
import { Prisma } from '@prisma/client';

// 프리셋 카테고리 전체 조회
export async function getAllCategories() {
  return prisma.presetCategory.findMany({
    orderBy: { sortOrder: 'asc' },
  });
}

// 특정 카테고리의 프리셋 목록 조회
export async function getPresetsByCategory(categoryId: string) {
  return prisma.spatialPreset.findMany({
    where: { categoryId },
    include: { category: true },
    orderBy: { code: 'asc' },
  });
}

// 전체 프리셋 조회 (필터 옵션)
export async function getPresets(filters: {
  categoryId?: string;
  region?: string;
}) {
  return prisma.spatialPreset.findMany({
    where: {
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.region && { region: filters.region }),
    },
    include: { category: true },
    orderBy: { code: 'asc' },
  });
}

// 프리셋 단건 조회
export async function getPresetByCode(code: string) {
  return prisma.spatialPreset.findUnique({
    where: { code },
    include: { category: true },
  });
}

// 프리셋 생성 (내 프리셋으로 저장)
export async function createPreset(data: {
  categoryId: string;
  code: string;
  name: string;
  standard?: string | null;
  region?: string | null;
  width?: number;
  depth?: number;
  height?: number;
  innerWidth?: number | null;
  innerDepth?: number | null;
  innerHeight?: number | null;
  weight?: number | null;
  maxLoad?: number | null;
  capacity?: number | null;
  levels?: number | null;
  levelHeight?: number | null;
  loadPerLevel?: number | null;
  qtyPerPallet?: number | null;
  kgPerPallet?: number | null;
  color?: string | null;
  opacity?: number;
  meshType?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}) {
  return prisma.spatialPreset.create({
    data: {
      categoryId: data.categoryId,
      code: data.code,
      name: data.name,
      standard: data.standard,
      region: data.region,
      width: data.width ?? 0,
      depth: data.depth ?? 0,
      height: data.height ?? 0,
      innerWidth: data.innerWidth,
      innerDepth: data.innerDepth,
      innerHeight: data.innerHeight,
      weight: data.weight,
      maxLoad: data.maxLoad,
      capacity: data.capacity,
      levels: data.levels,
      levelHeight: data.levelHeight,
      loadPerLevel: data.loadPerLevel,
      qtyPerPallet: data.qtyPerPallet,
      kgPerPallet: data.kgPerPallet,
      color: data.color,
      opacity: data.opacity ?? 1.0,
      meshType: data.meshType,
      metadata: data.metadata ?? Prisma.DbNull,
    },
    include: { category: true },
  });
}
