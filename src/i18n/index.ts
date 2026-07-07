import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import de from './de.json';
import fr from './fr.json';
import la from './la.json';

const getInitialLanguage = (): string => {
  const stored = localStorage.getItem('language');
  if (stored) return stored;

  const browserLangs = navigator.languages || [navigator.language];
  for (const lang of browserLangs) {
    const code = lang.split('-')[0].toLowerCase();
    if (code === 'de') return 'de';
    if (code === 'fr') return 'fr';
    if (code === 'la') return 'la';
    if (code === 'en') return 'en';
  }

  return 'en';
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    fr: { translation: fr },
    la: { translation: la },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
