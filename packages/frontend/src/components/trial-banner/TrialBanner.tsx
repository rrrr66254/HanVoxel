import { useState } from 'react';

interface TrialBannerProps {
  planType: string;
  trialEndsAt: string | null;
  onUpgrade?: () => void;
}

/**
 * 트라이얼 만료 알림 배너
 * - 트라이얼 기간 남은 일수 표시
 * - 만료 7일 전부터 경고 표시
 * - 만료 후 업그레이드 유도
 */
export function TrialBanner({ planType, trialEndsAt, onUpgrade }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (planType !== 'STARTER' || !trialEndsAt) return null;

  const now = new Date();
  const endDate = new Date(trialEndsAt);
  const diffMs = endDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // 트라이얼 만료 후
  if (daysRemaining <= 0) {
    return (
      <div className="border-b border-red-600/30 bg-red-900/20 px-4 py-2.5 text-center text-xs text-red-300">
        <span className="font-semibold">트라이얼이 만료되었습니다.</span>
        {' '}서비스를 계속 이용하려면 플랜을 업그레이드하세요.
        <button
          onClick={onUpgrade}
          className="ml-3 rounded bg-red-600 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-red-500"
        >
          플랜 업그레이드
        </button>
      </div>
    );
  }

  // 7일 이내 경고
  if (daysRemaining <= 7) {
    return (
      <div className="border-b border-yellow-600/30 bg-yellow-900/15 px-4 py-2.5 text-center text-xs text-yellow-300">
        <span className="font-semibold">트라이얼 {daysRemaining}일 남음</span>
        {' '}— 만료 전에 Growth 플랜으로 업그레이드하고 모든 기능을 사용하세요.
        <button
          onClick={onUpgrade}
          className="ml-3 rounded bg-yellow-600 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-yellow-500"
        >
          업그레이드
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 text-yellow-500 hover:text-yellow-300"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
    );
  }

  // 7일 이상 남은 경우 — 간단한 정보 표시
  return (
    <div className="border-b border-blue-600/20 bg-blue-900/10 px-4 py-2 text-center text-xs text-blue-300">
      <span className="font-semibold">Starter 트라이얼</span>
      {' '}— {daysRemaining}일 남음
      <button
        onClick={() => setDismissed(true)}
        className="ml-3 text-blue-500 hover:text-blue-300"
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  );
}
