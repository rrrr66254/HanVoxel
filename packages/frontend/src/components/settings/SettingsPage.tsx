import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Settings, Key, Bell, Shield, Eye, EyeOff, CheckCircle, XCircle,
  Copy, Trash2, Globe, Database, Cpu, CreditCard, Link2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type TabId = 'general' | 'apikeys' | 'notifications' | 'security';

interface TabDef {
  id: TabId;
  icon: LucideIcon;
  labelKey: string;
}

const TABS: TabDef[] = [
  { id: 'general', icon: Settings, labelKey: 'settings.tabs.general' },
  { id: 'apikeys', icon: Key, labelKey: 'settings.tabs.apikeys' },
  { id: 'notifications', icon: Bell, labelKey: 'settings.tabs.notifications' },
  { id: 'security', icon: Shield, labelKey: 'settings.tabs.security' },
];

// API 키 서비스 목록
interface ApiKeyConfig {
  id: string;
  service: string;
  icon: LucideIcon;
  color: string;
  descKey: string;
  placeholder: string;
}

const API_SERVICES: ApiKeyConfig[] = [
  { id: 'stripe', service: 'Stripe', icon: CreditCard, color: '#635BFF', descKey: 'settings.apikeys.stripDesc', placeholder: 'sk_live_...' },
  { id: 'comtrade', service: 'UN Comtrade', icon: Globe, color: '#00A3E0', descKey: 'settings.apikeys.comtradeDesc', placeholder: 'comtrade_api_key_...' },
  { id: 'customs', service: '한국 관세청', icon: Database, color: '#2D7DD2', descKey: 'settings.apikeys.customsDesc', placeholder: 'customs_api_key_...' },
  { id: 'douzon', service: '더존 iCUBE', icon: Link2, color: '#00B050', descKey: 'settings.apikeys.douzonDesc', placeholder: 'douzon_client_id_...' },
  { id: 'mlservice', service: 'ML Service', icon: Cpu, color: '#F0B429', descKey: 'settings.apikeys.mlDesc', placeholder: 'http://localhost:8000' },
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
  const { t } = useTranslation();

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
      {/* 페이지 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {onBack && (
          <button onClick={onBack} style={{
            width: 36, height: 36, borderRadius: 8,
            border: '1px solid var(--border-default)', background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            ←
          </button>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('settings.title')}</h1>
      </div>

      {/* 탭 바 */}
      <div style={{
        display: 'flex', gap: 4,
        borderBottom: '1px solid var(--border-muted)',
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
                borderBottom: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                background: 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-icon)' }} />
              {t(tab.labelKey)}
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
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState(i18n.language);

  // 언어 변경 핸들러
  const handleLanguageChange = useCallback((lng: string) => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
  }, [i18n]);

  // 테마 변경 핸들러
  const handleThemeChange = useCallback((newTheme: string) => {
    setTheme(newTheme as 'dark' | 'light');
  }, [setTheme]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SettingSection title={t('settings.general.basicSettings')}>
        <SettingRow label={t('settings.general.language')} description={t('settings.general.languageDesc')}>
          <select value={language} onChange={(e) => handleLanguageChange(e.target.value)} style={selectStyle}>
            <option value="ko">{t('profile.korean')}</option>
            <option value="en">{t('profile.english')}</option>
            <option value="ja">{t('profile.japanese')}</option>
          </select>
        </SettingRow>
        <SettingRow label={t('settings.general.theme')} description={t('settings.general.themeDesc')}>
          <select value={theme} onChange={(e) => handleThemeChange(e.target.value)} style={selectStyle}>
            <option value="dark">{t('settings.general.darkMode')}</option>
            <option value="light">{t('settings.general.lightMode')}</option>
          </select>
        </SettingRow>
        <SettingRow label={t('settings.general.timezone')} description={t('settings.general.timezoneDesc')}>
          <select defaultValue="Asia/Seoul" style={selectStyle}>
            <option value="Asia/Seoul">Asia/Seoul (KST)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (EST)</option>
          </select>
        </SettingRow>
      </SettingSection>

      <SettingSection title={t('settings.general.viewer3d')}>
        <SettingRow label={t('settings.general.grid')} description={t('settings.general.gridDesc')}>
          <ToggleSwitch defaultChecked />
        </SettingRow>
        <SettingRow label={t('settings.general.fog')} description={t('settings.general.fogDesc')}>
          <ToggleSwitch defaultChecked />
        </SettingRow>
        <SettingRow label={t('settings.general.shadows')} description={t('settings.general.shadowsDesc')}>
          <ToggleSwitch defaultChecked />
        </SettingRow>
      </SettingSection>
    </div>
  );
}

// ── API 키 탭 ──
function ApiKeysTab() {
  const { t } = useTranslation();
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
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
        {t('settings.apikeys.description')}
      </p>

      {API_SERVICES.map((svc) => {
        const Icon = svc.icon;
        const keyValue = keys[svc.id] ?? '';
        const isVisible = visible[svc.id];
        const isTesting = testing[svc.id];
        const connStatus = status[svc.id];

        return (
          <div key={svc.id} style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-muted)',
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{svc.service}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t(svc.descKey)}</div>
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
                    ? <CheckCircle size={12} style={{ color: 'var(--accent-green)' }} />
                    : <XCircle size={12} style={{ color: 'var(--accent-red)' }} />
                  }
                  <span style={{ fontSize: 10, fontWeight: 600, color: connStatus === 'connected' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {connStatus === 'connected' ? t('settings.apikeys.connected') : t('settings.apikeys.error')}
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
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                />
                <button
                  onClick={() => setVisible((prev) => ({ ...prev, [svc.id]: !prev[svc.id] }))}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-icon)',
                    display: 'flex', padding: 2,
                  }}
                >
                  {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* 액션 버튼 */}
              {keyValue && (
                <button onClick={() => copyToClipboard(keyValue)} style={iconBtnStyle} title={t('settings.apikeys.copy')}>
                  <Copy size={14} />
                </button>
              )}
              {keyValue && (
                <button onClick={() => handleDelete(svc.id)} style={{ ...iconBtnStyle, color: 'var(--accent-red)' }} title={t('settings.apikeys.delete')}>
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => handleTest(svc.id)}
                disabled={isTesting || !keyValue.trim()}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  border: '1px solid var(--border-default)', background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)', fontSize: 11, fontWeight: 600,
                  cursor: isTesting || !keyValue.trim() ? 'not-allowed' : 'pointer',
                  opacity: isTesting || !keyValue.trim() ? 0.5 : 1,
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                }}
              >
                {isTesting ? t('settings.apikeys.testing') : t('settings.apikeys.connectionTest')}
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
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SettingSection title={t('settings.notifications.channels')}>
        <SettingRow label={t('settings.notifications.email')} description={t('settings.notifications.emailDesc')}>
          <ToggleSwitch defaultChecked />
        </SettingRow>
        <SettingRow label={t('settings.notifications.browser')} description={t('settings.notifications.browserDesc')}>
          <ToggleSwitch />
        </SettingRow>
        <SettingRow label={t('settings.notifications.slack')} description={t('settings.notifications.slackDesc')}>
          <ToggleSwitch />
        </SettingRow>
      </SettingSection>

      <SettingSection title={t('settings.notifications.types')}>
        <SettingRow label={t('settings.notifications.inventory')} description={t('settings.notifications.inventoryDesc')}>
          <ToggleSwitch defaultChecked />
        </SettingRow>
        <SettingRow label={t('settings.notifications.slaViolation')} description={t('settings.notifications.slaViolationDesc')}>
          <ToggleSwitch defaultChecked />
        </SettingRow>
        <SettingRow label={t('settings.notifications.qcDefect')} description={t('settings.notifications.qcDefectDesc')}>
          <ToggleSwitch defaultChecked />
        </SettingRow>
        <SettingRow label={t('settings.notifications.reorderRec')} description={t('settings.notifications.reorderRecDesc')}>
          <ToggleSwitch />
        </SettingRow>
      </SettingSection>
    </div>
  );
}

// ── 보안 탭 ──
function SecurityTab() {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SettingSection title={t('settings.security.auth')}>
        <SettingRow label={t('settings.security.twoFactor')} description={t('settings.security.twoFactorDesc')}>
          <ToggleSwitch />
        </SettingRow>
        <SettingRow label={t('settings.security.sessionTimeout')} description={t('settings.security.sessionTimeoutDesc')}>
          <select defaultValue="30" style={selectStyle}>
            <option value="15">{t('settings.security.min15')}</option>
            <option value="30">{t('settings.security.min30')}</option>
            <option value="60">{t('settings.security.hour1')}</option>
            <option value="0">{t('settings.security.disabled')}</option>
          </select>
        </SettingRow>
      </SettingSection>

      <SettingSection title={t('settings.security.accessLog')}>
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-muted)',
          borderRadius: 8,
          padding: 16,
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
            {t('settings.security.accessLogDesc')}
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
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-muted)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-muted)',
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--text-primary)',
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
      borderBottom: '1px solid var(--bg-secondary)',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{description}</div>
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
        background: on ? 'var(--accent-blue)' : 'var(--border-default)',
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
  border: '1px solid var(--border-default)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: 12,
  outline: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const iconBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8,
  border: '1px solid var(--border-default)', background: 'var(--bg-tertiary)',
  color: 'var(--text-secondary)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
