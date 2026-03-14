/**
 * 플랜별 기능 제한 미들웨어
 * max_sites, max_users, max_objects 초과 시 403 응답
 */
import { Request, Response, NextFunction } from 'express';
import prisma from '../services/prisma';
import { errorResponse } from '../types/api';

type LimitType = 'sites' | 'users' | 'objects';

/**
 * 플랜 제한 검사 미들웨어 팩토리
 * @param limitType - 검사할 제한 종류
 * @param getCompanyId - request에서 companyId를 추출하는 함수
 */
export function checkPlanLimit(
  limitType: LimitType,
  getCompanyId: (req: Request) => string | undefined = (req) => req.body?.companyId ?? req.query.companyId as string,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        next();
        return;
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });
      if (!company) {
        next();
        return;
      }

      // 트라이얼 만료 확인
      if (company.subscriptionStatus === 'trialing' && company.trialEndsAt) {
        if (company.trialEndsAt.getTime() < Date.now()) {
          res.status(403).json(errorResponse(
            'TRIAL_EXPIRED',
            '트라이얼이 만료되었습니다. 서비스를 계속 이용하려면 플랜을 업그레이드하세요.',
          ));
          return;
        }
      }

      // 결제 실패 상태 확인
      if (company.subscriptionStatus === 'past_due' || company.subscriptionStatus === 'unpaid') {
        res.status(403).json(errorResponse(
          'PAYMENT_OVERDUE',
          '결제가 실패했습니다. 결제 수단을 확인하세요.',
        ));
        return;
      }

      const plan = await prisma.plan.findUnique({ where: { code: company.planType } });
      if (!plan) {
        next();
        return;
      }

      let currentCount = 0;
      let maxLimit = 0;
      let limitLabel = '';

      switch (limitType) {
        case 'sites':
          currentCount = await prisma.site.count({ where: { companyId, isActive: true } });
          maxLimit = plan.maxSites;
          limitLabel = '사이트';
          break;

        case 'users':
          currentCount = await prisma.user.count({ where: { companyId, isActive: true } });
          maxLimit = plan.maxUsers;
          limitLabel = '사용자';
          break;

        case 'objects': {
          currentCount = await prisma.spatialObject.count({
            where: { site: { companyId } },
          });
          maxLimit = plan.maxObjects;
          limitLabel = '공간 객체';
          break;
        }
      }

      if (currentCount >= maxLimit) {
        res.status(403).json(errorResponse(
          'PLAN_LIMIT_EXCEEDED',
          `현재 플랜(${plan.name})의 ${limitLabel} 제한(${maxLimit}개)에 도달했습니다. 더 많은 ${limitLabel}를 추가하려면 플랜을 업그레이드하세요.`,
        ));
        return;
      }

      next();
    } catch (err) {
      console.error('플랜 제한 검사 실패:', err);
      // 미들웨어 오류 시 통과시킴 (결제 시스템 장애로 서비스 중단 방지)
      next();
    }
  };
}

/**
 * 구독 활성 상태 확인 미들웨어
 * 트라이얼 만료 + 미결제 상태에서 주요 쓰기 작업 차단
 */
export function requireActiveSubscription(
  getCompanyId: (req: Request) => string | undefined = (req) => req.body?.companyId ?? req.query.companyId as string,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        next();
        return;
      }

      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company) {
        next();
        return;
      }

      const status = company.subscriptionStatus;

      // active, trialing(유효 기간 내)은 통과
      if (status === 'active') {
        next();
        return;
      }
      if (status === 'trialing' && company.trialEndsAt && company.trialEndsAt.getTime() > Date.now()) {
        next();
        return;
      }

      // 나머지는 차단
      res.status(403).json(errorResponse(
        'SUBSCRIPTION_INACTIVE',
        '활성 구독이 필요합니다. 플랜을 업그레이드하거나 결제 수단을 확인하세요.',
      ));
    } catch (err) {
      console.error('구독 상태 확인 실패:', err);
      next();
    }
  };
}
