import prisma from './prisma';

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
