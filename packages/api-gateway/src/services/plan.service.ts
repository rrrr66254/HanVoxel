import prisma from './prisma';

// 전체 플랜 조회
export async function getAllPlans() {
  return prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

// 플랜 단건 조회
export async function getPlanByCode(code: string) {
  return prisma.plan.findUnique({
    where: { code },
  });
}

// 회사 구독 상태 조회
export async function getCompanySubscription(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { planType: true, trialEndsAt: true },
  });
  if (!company) return null;

  const now = new Date();
  const trialEndsAt = company.trialEndsAt;
  const isTrialActive = trialEndsAt ? trialEndsAt.getTime() > now.getTime() : false;
  const daysRemaining = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    planType: company.planType,
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    isTrialActive,
    daysRemaining,
  };
}

// 회사 플랜 업데이트
export async function updateCompanyPlan(companyId: string, planType: string) {
  return prisma.company.update({
    where: { id: companyId },
    data: { planType },
  });
}
