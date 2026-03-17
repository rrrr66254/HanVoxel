import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { User, Settings, LogOut, Edit3, X, Crown, Globe, Moon, Sun } from 'lucide-react';

// 프로필 데이터 타입
interface UserProfile {
  name: string;
  email: string;
  phone: string;
  language: string;
  theme: string;
}

// localStorage 키
const PROFILE_STORAGE_KEY = 'hanvoxel_profile';

function loadProfile(): UserProfile {
  const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); }
    catch { /* fall through */ }
  }
  return {
    name: '관리자',
    email: 'admin@hanvoxel.com',
    phone: '',
    language: 'ko',
    theme: 'dark',
  };
}

function saveProfile(profile: UserProfile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

// 언어 표시명
const LANGUAGE_LABELS: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
};

interface ProfileDropdownProps {
  isEnterprise?: boolean;
  onNavigateSettings?: () => void;
}

/**
 * Google 스타일 프로필 드롭다운 팝업
 * - 아바타 클릭 시 팝업
 * - 프로필 정보 표시 + 편집 모달
 * - Enterprise 골드 뱃지
 */
export function ProfileDropdown({ isEnterprise = true, onNavigateSettings }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [profile, setProfile] = useState(loadProfile);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  // 외부 클릭 닫기
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleSaveProfile = useCallback((updated: UserProfile) => {
    setProfile(updated);
    saveProfile(updated);
    // 테마/언어 동기화
    i18n.changeLanguage(updated.language);
    setEditOpen(false);
  }, [i18n]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* 아바타 트리거 */}
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid var(--border-default)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          background: open ? 'var(--bg-tertiary)' : 'transparent',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: isEnterprise
              ? 'linear-gradient(135deg, #F0B429, #FF8C00)'
              : 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: isEnterprise ? '2px solid rgba(240,180,41,0.3)' : 'none',
          }}
        >
          <User size={14} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{profile.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{profile.email}</div>
        </div>
      </div>

      {/* 드롭다운 팝업 */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 8,
          width: 300,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-dropdown)',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          {/* 프로필 헤더 */}
          <div style={{
            padding: '24px 20px 16px',
            textAlign: 'center',
            borderBottom: '1px solid var(--border-muted)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: isEnterprise
                ? 'linear-gradient(135deg, #F0B429, #FF8C00)'
                : 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
              border: isEnterprise ? '3px solid rgba(240,180,41,0.3)' : 'none',
            }}>
              <User size={28} color="#fff" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{profile.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{profile.email}</div>

            {/* Enterprise 뱃지 */}
            {isEnterprise && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 12px',
                borderRadius: 20,
                background: 'rgba(240,180,41,0.12)',
                border: '1px solid rgba(240,180,41,0.3)',
                marginTop: 10,
              }}>
                <Crown size={12} style={{ color: '#F0B429' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#F0B429', letterSpacing: '0.5px' }}>
                  ENTERPRISE
                </span>
              </div>
            )}
          </div>

          {/* 메뉴 */}
          <div style={{ padding: '8px 0' }}>
            <ProfileMenuItem
              icon={<Edit3 size={15} />}
              label={t('profile.editProfile')}
              onClick={() => { setEditOpen(true); setOpen(false); }}
            />
            <ProfileMenuItem
              icon={<Settings size={15} />}
              label={t('profile.settings')}
              onClick={() => { onNavigateSettings?.(); setOpen(false); }}
            />
            <div style={{ height: 1, background: 'var(--border-muted)', margin: '4px 12px' }} />
            <ProfileMenuItem
              icon={<Globe size={15} />}
              label={`${t('profile.language')}: ${LANGUAGE_LABELS[i18n.language] ?? i18n.language}`}
              onClick={() => {
                // 언어 순환: ko → en → ja → ko
                const langs = ['ko', 'en', 'ja'];
                const idx = langs.indexOf(i18n.language);
                const next = langs[(idx + 1) % langs.length];
                i18n.changeLanguage(next);
                const updated = { ...profile, language: next };
                setProfile(updated);
                saveProfile(updated);
              }}
            />
            <ProfileMenuItem
              icon={theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
              label={`${t('profile.theme')}: ${theme === 'dark' ? t('settings.general.darkMode') : t('settings.general.lightMode')}`}
              onClick={toggleTheme}
            />
            <div style={{ height: 1, background: 'var(--border-muted)', margin: '4px 12px' }} />
            <ProfileMenuItem
              icon={<LogOut size={15} />}
              label={t('profile.logout')}
              color="var(--accent-red)"
            />
          </div>
        </div>
      )}

      {/* 프로필 편집 모달 */}
      {editOpen && (
        <ProfileEditModal
          profile={profile}
          onSave={handleSaveProfile}
          onClose={() => setEditOpen(false)}
          isEnterprise={isEnterprise}
        />
      )}
    </div>
  );
}

function ProfileMenuItem({ icon, label, onClick, color }: {
  icon: React.ReactNode; label: string; onClick?: () => void; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 20px',
        border: 'none', background: 'transparent',
        color: color ?? 'var(--text-primary)',
        fontSize: 13, cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background 0.1s ease',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ color: color ?? 'var(--text-secondary)', display: 'flex' }}>{icon}</span>
      {label}
    </button>
  );
}

// ── 프로필 편집 모달 ──
function ProfileEditModal({ profile, onSave, onClose, isEnterprise }: {
  profile: UserProfile; onSave: (p: UserProfile) => void; onClose: () => void; isEnterprise?: boolean;
}) {
  const [form, setForm] = useState({ ...profile });
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  // 모달 열릴 때 현재 테마/언어 동기화
  useEffect(() => {
    setForm((prev) => ({ ...prev, theme }));
  }, [theme]);

  const handleSave = useCallback(() => {
    // 테마 변경 적용
    if (form.theme !== theme) {
      setTheme(form.theme as 'dark' | 'light');
    }
    onSave(form);
  }, [form, theme, setTheme, onSave]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--overlay-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 420,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-dropdown)',
        overflow: 'hidden',
      }}>
        {/* 모달 헤더 */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-muted)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('profile.editProfile')}</h2>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6,
            border: '1px solid var(--border-default)', background: 'transparent',
            color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} />
          </button>
        </div>

        {/* 아바타 + 뱃지 */}
        <div style={{ textAlign: 'center', padding: '20px 24px 12px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: isEnterprise
              ? 'linear-gradient(135deg, #F0B429, #FF8C00)'
              : 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
            border: isEnterprise ? '3px solid rgba(240,180,41,0.3)' : 'none',
          }}>
            <User size={32} color="#fff" />
          </div>
          {isEnterprise && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 20,
              background: 'rgba(240,180,41,0.12)',
              border: '1px solid rgba(240,180,41,0.3)',
              marginTop: 8,
            }}>
              <Crown size={10} style={{ color: '#F0B429' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#F0B429' }}>ENTERPRISE</span>
            </div>
          )}
        </div>

        {/* 폼 */}
        <div style={{ padding: '12px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label={t('profile.name')} value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
          <FormField label={t('profile.email')} value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} type="email" />
          <FormField label={t('profile.phone')} value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} type="tel" placeholder={t('profile.phonePlaceholder')} />

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t('profile.language')}</label>
              <select
                value={form.language}
                onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
                style={{ ...inputStyleBase, cursor: 'pointer' }}
              >
                <option value="ko">{t('profile.korean')}</option>
                <option value="en">{t('profile.english')}</option>
                <option value="ja">{t('profile.japanese')}</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t('profile.theme')}</label>
              <select
                value={form.theme}
                onChange={(e) => setForm((p) => ({ ...p, theme: e.target.value }))}
                style={{ ...inputStyleBase, cursor: 'pointer' }}
              >
                <option value="dark">{t('settings.general.darkMode')}</option>
                <option value="light">{t('settings.general.lightMode')}</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '10px', borderRadius: 8,
                border: '1px solid var(--border-default)', background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {t('profile.cancel')}
            </button>
            <button
              onClick={handleSave}
              style={{
                flex: 1, padding: '10px', borderRadius: 8,
                border: 'none', background: 'var(--accent-blue)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-blue-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-blue)'; }}
            >
              {t('profile.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyleBase}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
      />
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  letterSpacing: '0.3px',
};

const inputStyleBase: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border-default)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s ease',
};
