-- SaaS 요금제 seed 데이터

INSERT INTO plans (id, code, name, description, price_monthly, price_yearly, max_sites, max_users, max_objects, trial_days, features, sort_order, updated_at)
VALUES
  -- Starter (무료/트라이얼)
  (
    '20000000-0000-0000-0000-000000000001',
    'STARTER',
    'Starter',
    '소규모 창고 1개를 디지털 트윈으로 관리. 기본 3D 뷰어와 표준 프리셋 제공.',
    0,
    0,
    1,
    3,
    500,
    14,
    '{"viewer3d": true, "presetCatalog": true, "roiCalculator": true, "exportPdf": false, "apiAccess": false, "customPresets": false, "multiSite": false, "advancedAnalytics": false}',
    1,
    NOW()
  ),
  -- Growth
  (
    '20000000-0000-0000-0000-000000000002',
    'GROWTH',
    'Growth',
    '다중 사이트 관리, 커스텀 프리셋, WMS 연동 API 제공. 성장하는 물류 기업을 위한 플랜.',
    490000,
    4900000,
    5,
    20,
    5000,
    14,
    '{"viewer3d": true, "presetCatalog": true, "roiCalculator": true, "exportPdf": true, "apiAccess": true, "customPresets": true, "multiSite": true, "advancedAnalytics": false}',
    2,
    NOW()
  ),
  -- Enterprise
  (
    '20000000-0000-0000-0000-000000000003',
    'ENTERPRISE',
    'Enterprise',
    'MES·ERP·시뮬레이션 통합, 무제한 사이트, 전담 기술 지원. 대규모 물류 운영을 위한 최상위 플랜.',
    1490000,
    14900000,
    -1,
    -1,
    -1,
    30,
    '{"viewer3d": true, "presetCatalog": true, "roiCalculator": true, "exportPdf": true, "apiAccess": true, "customPresets": true, "multiSite": true, "advancedAnalytics": true, "mesIntegration": true, "erpIntegration": true, "simulation": true, "dedicatedSupport": true}',
    3,
    NOW()
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_sites = EXCLUDED.max_sites,
  max_users = EXCLUDED.max_users,
  max_objects = EXCLUDED.max_objects,
  trial_days = EXCLUDED.trial_days,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
