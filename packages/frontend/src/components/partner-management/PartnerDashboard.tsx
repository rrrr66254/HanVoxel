import { useState } from 'react';
import { PartnerList } from './PartnerList';
import { PartnerDetail } from './PartnerDetail';
import { PartnerForm } from './PartnerForm';
import { DriverManager } from './DriverManager';

// 업체 관리 대시보드 — 서브 뷰 라우팅

type SubView =
  | { type: 'list' }
  | { type: 'detail'; partnerId: string }
  | { type: 'form'; editPartnerId?: string }
  | { type: 'drivers' };

interface Props {
  onBack: () => void;
}

export function PartnerDashboard({ onBack }: Props) {
  const [view, setView] = useState<SubView>({ type: 'list' });

  switch (view.type) {
    case 'detail':
      return (
        <PartnerDetail
          partnerId={view.partnerId}
          onBack={() => setView({ type: 'list' })}
        />
      );
    case 'form':
      return (
        <PartnerForm
          editPartnerId={view.editPartnerId}
          onBack={() => setView({ type: 'list' })}
        />
      );
    case 'drivers':
      return (
        <DriverManager onBack={() => setView({ type: 'list' })} />
      );
    default:
      return (
        <PartnerList
          onBack={onBack}
          onSelectPartner={(id) => setView({ type: 'detail', partnerId: id })}
          onCreateNew={() => setView({ type: 'form' })}
          onDrivers={() => setView({ type: 'drivers' })}
        />
      );
  }
}
