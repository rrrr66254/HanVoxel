import prisma from './prisma';

// 창고 템플릿 전체 조회 (업종 필터)
export async function getTemplates(filters: { industry?: string } = {}) {
  return prisma.warehouseTemplate.findMany({
    where: {
      ...(filters.industry && { industry: filters.industry }),
    },
    include: {
      rackPreset: { select: { code: true, name: true, width: true, depth: true, height: true, levels: true, levelHeight: true, loadPerLevel: true, color: true } },
      palletPreset: { select: { code: true, name: true, width: true, depth: true, height: true } },
    },
    orderBy: { name: 'asc' },
  });
}

// 창고 템플릿 단건 조회
export async function getTemplateByCode(code: string) {
  return prisma.warehouseTemplate.findUnique({
    where: { code },
    include: {
      rackPreset: { select: { code: true, name: true, width: true, depth: true, height: true, levels: true, levelHeight: true, loadPerLevel: true, color: true } },
      palletPreset: { select: { code: true, name: true, width: true, depth: true, height: true } },
    },
  });
}
