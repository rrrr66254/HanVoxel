import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';

// localStorage에서 언어 설정 읽기
function getInitialLanguage(): string {
  const stored = localStorage.getItem('hanvoxel_language');
  if (stored) return stored;

  // 기존 프로필에서 마이그레이션
  try {
    const profile = localStorage.getItem('hanvoxel_profile');
    if (profile) {
      const parsed = JSON.parse(profile);
      if (parsed.language) return parsed.language;
    }
  } catch { /* 무시 */ }

  return 'ko';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
      ja: { translation: ja },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'ko',
    interpolation: {
      escapeValue: false,
    },
  });

// 언어 변경 시 localStorage + 프로필 동기화
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('hanvoxel_language', lng);

  // 프로필에도 동기화
  try {
    const profile = localStorage.getItem('hanvoxel_profile');
    if (profile) {
      const parsed = JSON.parse(profile);
      parsed.language = lng;
      localStorage.setItem('hanvoxel_profile', JSON.stringify(parsed));
    }
  } catch { /* 무시 */ }
});

export default i18n;
