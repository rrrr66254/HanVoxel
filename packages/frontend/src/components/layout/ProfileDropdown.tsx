import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Settings, LogOut, Edit3, X, Crown, Globe, Moon } from 'lucide-react';

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
    setEditOpen(false);
  }, []);

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
          border: '1px solid #30363D',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          background: open ? '#21262D' : 'transparent',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = '#21262D'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: isEnterprise
              ? 'linear-gradient(135deg, #F0B429, #FF8C00)'
              : 'linear-gradient(135deg, #2D7DD2, #A371F7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: isEnterprise ? '2px solid rgba(240,180,41,0.3)' : 'none',
          }}
        >
          <User size={14} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#E6EDF3' }}>{profile.name}</div>
          <div style={{ fontSize: 10, color: '#484F58' }}>{profile.email}</div>
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
          background: '#161B22',
          border: '1px solid #30363D',
          borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          {/* 프로필 헤더 */}
          <div style={{
            padding: '24px 20px 16px',
            textAlign: 'center',
            borderBottom: '1px solid #21262D',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: isEnterprise
                ? 'linear-gradient(135deg, #F0B429, #FF8C00)'
                : 'linear-gradient(135deg, #2D7DD2, #A371F7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
              border: isEnterprise ? '3px solid rgba(240,180,41,0.3)' : 'none',
            }}>
              <User size={28} color="#fff" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#E6EDF3' }}>{profile.name}</div>
            <div style={{ fontSize: 12, color: '#8B949E', marginTop: 2 }}>{profile.email}</div>

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
              label="프로필 편집"
              onClick={() => { setEditOpen(true); setOpen(false); }}
            />
            <ProfileMenuItem
              icon={<Settings size={15} />}
              label="설정"
              onClick={() => { onNavigateSettings?.(); setOpen(false); }}
            />
            <div style={{ height: 1, background: '#21262D', margin: '4px 12px' }} />
            <ProfileMenuItem
              icon={<Globe size={15} />}
              label={`언어: ${profile.language === 'ko' ? '한국어' : 'English'}`}
            />
            <ProfileMenuItem
              icon={<Moon size={15} />}
              label={`테마: ${profile.theme === 'dark' ? '다크 모드' : '라이트 모드'}`}
            />
            <div style={{ height: 1, background: '#21262D', margin: '4px 12px' }} />
            <ProfileMenuItem
              icon={<LogOut size={15} />}
              label="로그아웃"
              color="#F85149"
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
        color: color ?? '#E6EDF3',
        fontSize: 13, cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background 0.1s ease',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#1C2A3A'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ color: color ?? '#8B949E', display: 'flex' }}>{icon}</span>
      {label}
    </button>
  );
}

// ── 프로필 편집 모달 ──
function ProfileEditModal({ profile, onSave, onClose, isEnterprise }: {
  profile: UserProfile; onSave: (p: UserProfile) => void; onClose: () => void; isEnterprise?: boolean;
}) {
  const [form, setForm] = useState({ ...profile });

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 420,
        background: '#161B22',
        border: '1px solid #30363D',
        borderRadius: 16,
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* 모달 헤더 */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #21262D',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#E6EDF3', margin: 0 }}>프로필 편집</h2>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6,
            border: '1px solid #30363D', background: 'transparent',
            color: '#8B949E', cursor: 'pointer',
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
              : 'linear-gradient(135deg, #2D7DD2, #A371F7)',
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
          <FormField label="이름" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
          <FormField label="이메일" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} type="email" />
          <FormField label="전화번호" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} type="tel" placeholder="010-1234-5678" />

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>언어</label>
              <select
                value={form.language}
                onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
                style={{ ...inputStyleBase, cursor: 'pointer' }}
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>테마</label>
              <select
                value={form.theme}
                onChange={(e) => setForm((p) => ({ ...p, theme: e.target.value }))}
                style={{ ...inputStyleBase, cursor: 'pointer' }}
              >
                <option value="dark">다크 모드</option>
                <option value="light">라이트 모드</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '10px', borderRadius: 8,
                border: '1px solid #30363D', background: '#21262D',
                color: '#8B949E', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              취소
            </button>
            <button
              onClick={() => onSave(form)}
              style={{
                flex: 1, padding: '10px', borderRadius: 8,
                border: 'none', background: '#2D7DD2',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#3A8FE0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#2D7DD2'; }}
            >
              저장
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
        onFocus={(e) => { e.currentTarget.style.borderColor = '#2D7DD2'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#30363D'; }}
      />
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 11,
  fontWeight: 600,
  color: '#484F58',
  letterSpacing: '0.3px',
};

const inputStyleBase: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #30363D',
  background: '#0D1117',
  color: '#E6EDF3',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s ease',
};
