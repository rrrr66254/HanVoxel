import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// 테마 타입
type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'hanvoxel_theme';

// localStorage에서 테마 읽기 (프로필과 동기화)
function loadTheme(): Theme {
  // 전용 키 우선
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;

  // 기존 프로필에서 마이그레이션
  try {
    const profile = localStorage.getItem('hanvoxel_profile');
    if (profile) {
      const parsed = JSON.parse(profile);
      if (parsed.theme === 'light') return 'light';
    }
  } catch { /* 무시 */ }

  return 'dark';
}

// html data-theme 속성 적용
function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(loadTheme);

  // 초기 적용
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);

    // 프로필에도 동기화
    try {
      const profile = localStorage.getItem('hanvoxel_profile');
      if (profile) {
        const parsed = JSON.parse(profile);
        parsed.theme = newTheme;
        localStorage.setItem('hanvoxel_profile', JSON.stringify(parsed));
      }
    } catch { /* 무시 */ }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 커스텀 훅
export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
