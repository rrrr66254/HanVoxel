import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Key, Bell, Shield, Eye, EyeOff, CheckCircle, XCircle,
  Copy, Trash2, Globe, Database, Cpu, CreditCard, Link2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type TabId = 'general' | 'apikeys' | 'notifications' | 'security';

interface TabDef {
  id: TabId;
  icon: LucideIcon;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'general', icon: Settings, label: '일반' },
  { id: 'apikeys', icon: Key, label: 'API 키' },
  { id: 'notifications', icon: Bell, label: '알림' },
  { id: 'security', icon: Shield, label: '보안' },
];

// API 키 서비스 목록
interface ApiKeyConfig {
  id: string;
  service: string;
  icon: LucideIcon;
  color: string;
  description: string;
  placeholder: string;
}

const API_SERVICES: ApiKeyConfig[] = [
  { id: 'stripe', service: 'Stripe', icon: CreditCard, color: '#635BFF', description: '결제 처리 (Stripe Secret Key)', placeholder: 'sk_live_...' },
  { id: 'comtrade', service: 'UN Comtrade', icon: Globe, color: '#00A3E0', description: '글로벌 무역 데이터 API', placeholder: 'comtrade_api_key_...' },
  { id: 'customs', service: '한국 관세청', icon: Database, color: '#2D7DD2', description: 'UNI-PASS 수출입 데이터', placeholder: 'customs_api_key_...' },
  { id: 'douzon', service: '더존 iCUBE', icon: Link2, color: '#00B050', description: 'ERP 커넥터 인증 키', placeholder: 'douzon_client_id_...' },
  { id: 'mlservice', service: 'ML Service', icon: Cpu, color: '#F0B429', description: '이상 탐지 / 수요 예측 서비스', placeholder: 'http://localhost:8000' },
];

// localStorage 키 (btoa 인코딩)
const STORAGE_KEY = 'hanvoxel_api_keys';

// 간단한 인코딩/디코딩
function encodeKeys(keys: Record<string, string>): string {
  return btoa(JSON.stringify(keys));
}
function decodeKeys(encoded: string): Record<string, string> {
  try { return JSON.parse(atob(encoded)); }
  catch { return {}; }
}

function loadApiKeys(): Record<string, string> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return {};
  return decodeKeys(stored);
}

function saveApiKeys(keys: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, encodeKeys(keys));
}

interface SettingsPageProps {
  onBack?: () => void;
}

/**
 * 설정 페이지 — 4탭 (일반/API키/알림/보안)
 * API 키: 5개 서비스, localStorage btoa 저장, 연결 상태 표시
 */
export function SettingsPage({ onBack }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
      {/* 페이지 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {onBack && (
          <button onClick={onBack} style={{
            width: 36, height: 36, borderRadius: 8,
            border: '1px solid #30363D', background: '#161B22',
            color: '#8B949E', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            ←
          </button>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF3', margin: 0 }}>설정</h1>
      </div>

      {/* 탭 바 */}
      <div style={{
        display: 'flex', gap: 4,
        borderBottom: '1px solid #21262D',
        marginBottom: 24,
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px',
                border: 'none',
                borderBottom: isActive ? '2px solid #2D7DD2' : '2px solid transparent',
                background: 'transparent',
                color: isActive ? '#E6EDF3' : '#8B949E',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} style={{ color: isActive ? '#2D7DD2' : '#6E7681' }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'apikeys' && <ApiKeysTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'security' && <SecurityTab />}
    </div>
  );
}

// ── 일반 탭 ──
function GeneralTab() {
  const [language, setLanguage] = useState('ko');
  const [theme, setTheme] = useState('dark');
  const [timezone, setTimezone] = useState('Asia/Seoul');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SettingSection title="기본 설정">
        <SettingRow label="언어" description="인터페이스 표시 언어">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={selectStyle}>
            <option value="ko">한국어</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </SettingRow>
        <SettingRow label="테마" description="UI 테마 선택">
          <select value={theme} onChange={(e) => setTheme(e.target.value)} style={selectStyle}>
            <option value="dark">다크 모드</option>
            <option value="light">라이트 모드</option>
          </select>
        </SettingRow>
        <SettingRow label="시간대" description="날짜/시간 표시 기준">
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={selectStyle}>
            <option value="Asia/Seoul">Asia/Seoul (KST)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (EST)</option>
          </select>
        </SettingRow>
      </SettingSection>

      <SettingSection title="3D 뷰어">
        <SettingRow label="그리드 표시" description="3D 뷰어에 격자선 표시">
          <ToggleSwitch defaultChecked />
        </SettingRow>
        <SettingRow label="안개 효과" description="원거리 안개 효과">
          <ToggleSwitch defaultChecked />
        </SettingRow>
        <SettingRow label="그림자" description="실시간 그림자 렌더링">
          <ToggleSwitch defaultChecked />
        </SettingRow>
      </SettingSection>
    </div>
  );
}

// ── API 키 탭 ──
function ApiKeysTab() {
  const [keys, setKeys] = useState<Record<string, string>>(loadApiKeys);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Record<string, 'connected' | 'error' | null>>({});

  const handleChange = useCallback((id: string, value: string) => {
    setKeys((prev) => {
      const next = { ...prev, [id]: value };
      saveApiKeys(next);
      return next;
    });
    setStatus((prev) => ({ ...prev, [id]: null }));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setKeys((prev) => {
      const next = { ...prev };
      delete next[id];
      saveApiKeys(next);
      return next;
    });
    setStatus((prev) => ({ ...prev, [id]: null }));
  }, []);

  const handleTest = useCallback((id: string) => {
    setTesting((prev) => ({ ...prev, [id]: true }));
    // 연결 테스트 시뮬레이션 (실제는 API 호출)
    setTimeout(() => {
      const hasKey = !!keys[id]?.trim();
      setStatus((prev) => ({ ...prev, [id]: hasKey ? 'connected' : 'error' }));
      setTesting((prev) => ({ ...prev, [id]: false }));
    }, 1200);
  }, [keys]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 13, color: '#8B949E', margin: 0 }}>
        외부 서비스 연동에 필요한 API 키를 관리합니다. 키는 브라우저에 암호화되어 저장됩니다.
      </p>

      {API_SERVICES.map((svc) => {
        const Icon = svc.icon;
        const keyValue = keys[svc.id] ?? '';
        const isVisible = visible[svc.id];
        const isTesting = testing[svc.id];
        const connStatus = status[svc.id];

        return (
          <div key={svc.id} style={{
            background: '#161B22',
            border: '1px solid #21262D',
            borderRadius: 12,
            padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${svc.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} style={{ color: svc.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#E6EDF3' }}>{svc.service}</div>
                  <div style={{ fontSize: 11, color: '#484F58' }}>{svc.description}</div>
                </div>
              </div>

              {/* 연결 상태 인디케이터 */}
              {connStatus && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 6,
                  background: connStatus === 'connected' ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
                  border: `1px solid ${connStatus === 'connected' ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)'}`,
                }}>
                  {connStatus === 'connected'
                    ? <CheckCircle size={12} style={{ color: '#3FB950' }} />
                    : <XCircle size={12} style={{ color: '#F85149' }} />
                  }
                  <span style={{ fontSize: 10, fontWeight: 600, color: connStatus === 'connected' ? '#3FB950' : '#F85149' }}>
                    {connStatus === 'connected' ? '연결됨' : '오류'}
                  </span>
                </div>
              )}
            </div>

            {/* 키 입력 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type={isVisible ? 'text' : 'password'}
                  value={keyValue}
                  onChange={(e) => handleChange(svc.id, e.target.value)}
                  placeholder={svc.placeholder}
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 12px',
                    borderRadius: 8,
                    border: '1px solid #30363D',
                    background: '#0D1117',
                    color: '#E6EDF3',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#2D7DD2'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#30363D'; }}
                />
                <button
                  onClick={() => setVisible((prev) => ({ ...prev, [svc.id]: !prev[svc.id] }))}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer', color: '#6E7681',
                    display: 'flex', padding: 2,
                  }}
                >
                  {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* 액션 버튼 */}
              {keyValue && (
                <button onClick={() => copyToClipboard(keyValue)} style={iconBtnStyle} title="복사">
                  <Copy size={14} />
                </button>
              )}
              {keyValue && (
                <button onClick={() => handleDelete(svc.id)} style={{ ...iconBtnStyle, color: '#F85149' }} title="삭제">
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => handleTest(svc.id)}
                disabled={isTesting || !keyValue.trim()}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  border: '1px solid #30363D', background: '#21262D',
                  color: '#E6EDF3', fontSize: 11, fontWeight: 600,
                  cursor: isTesting || !keyValue.trim() ? 'not-allowed' : 'pointer',
                  opacity: isTesting || !keyValue.trim() ? 0.5 : 1,
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                }}
              >
                {isTesting ? '테스트 중...' : '연결 테스트'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 알림 탭 ──
function NotificationsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SettingSection title="알림 채널">
        <SettingRow label="이메일 알림" description="이상 탐지 / SLA 위반 시 이메일 발송">
          <ToggleSwitch defaultChecked />
        </SettingRow>
        <SettingRow label="브라우저 알림" description="푸시 알림 수신">
          <ToggleSwitch />
        </SettingRow>
        <SettingRow label="Slack 연동" description="Slack 채널로 알림 전송">
          <ToggleSwitch />
        </SettingRow>
      </SettingSection>

      <SettingSection title="알림 유형">
        <SettingRow label="재고 이상" description="재고 수치 급변 시 알림">
          <ToggleSwitch defaultChecked />
        </SettingRow>
        <SettingRow label="SLA 위반" description="납기 준수율 기준 미달 시 알림">
          <ToggleSwitch defaultChecked />
        </SettingRow>
        <SettingRow label="QC 불량" description="품질 검수 불량률 초과 시 알림">
          <ToggleSwitch defaultChecked />
        </SettingRow>
        <SettingRow label="발주 추천" description="자동 발주 추천 생성 시 알림">
          <ToggleSwitch />
        </SettingRow>
      </SettingSection>
    </div>
  );
}

// ── 보안 탭 ──
function SecurityTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SettingSection title="인증">
        <SettingRow label="2단계 인증 (2FA)" description="Google Authenticator 또는 SMS 인증">
          <ToggleSwitch />
        </SettingRow>
        <SettingRow label="세션 타임아웃" description="비활동 시 자동 로그아웃">
          <select defaultValue="30" style={selectStyle}>
            <option value="15">15분</option>
            <option value="30">30분</option>
            <option value="60">1시간</option>
            <option value="0">사용 안 함</option>
          </select>
        </SettingRow>
      </SettingSection>

      <SettingSection title="접근 로그">
        <div style={{
          background: '#0D1117',
          border: '1px solid #21262D',
          borderRadius: 8,
          padding: 16,
        }}>
          <p style={{ fontSize: 12, color: '#8B949E', margin: 0 }}>
            최근 접근 로그가 여기에 표시됩니다. (Enterprise 플랜 전용 기능)
          </p>
        </div>
      </SettingSection>
    </div>
  );
}

// ── 공통 서브 컴포넌트 ──
function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#161B22',
      border: '1px solid #21262D',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #21262D',
        fontSize: 14,
        fontWeight: 700,
        color: '#E6EDF3',
      }}>
        {title}
      </div>
      <div style={{ padding: '4px 0' }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 20px',
      borderBottom: '1px solid #161B22',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#E6EDF3' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#484F58', marginTop: 2 }}>{description}</div>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        border: 'none',
        background: on ? '#2D7DD2' : '#30363D',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s ease',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2, left: on ? 20 : 2,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s ease',
      }} />
    </button>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid #30363D',
  background: '#0D1117',
  color: '#E6EDF3',
  fontSize: 12,
  outline: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const iconBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8,
  border: '1px solid #30363D', background: '#21262D',
  color: '#8B949E', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
