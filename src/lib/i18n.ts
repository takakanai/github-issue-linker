import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enCommon from '@/locales/en/common.json';
import jaCommon from '@/locales/ja/common.json';

// Detect browser language and fallback to English
const getBrowserLanguage = (): string => {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('ja')) {
    return 'ja';
  }
  return 'en';
};

const resources = {
  en: {
    common: enCommon,
  },
  ja: {
    common: jaCommon,
  },
};

// Initialize i18n immediately with fallback, then update asynchronously
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getBrowserLanguage(), // Start with browser language
    fallbackLng: 'en',
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    react: {
      useSuspense: false, // Disable suspense for Chrome extension compatibility
    },
  });

// Asynchronously update with stored language preference
const updateLanguageFromStorage = async () => {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.sync.get(['userPreferences']);
      const storedLanguage = result.userPreferences?.language;
      if (storedLanguage && storedLanguage !== i18n.language) {
        await i18n.changeLanguage(storedLanguage);
      }
    }
  } catch (error) {
    console.warn('Could not load language from storage:', error);
  }
};

// Update language from storage after initialization
updateLanguageFromStorage();

// Listen for storage changes to update language in real-time
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.userPreferences) {
      const newPreferences = changes.userPreferences.newValue;
      const oldPreferences = changes.userPreferences.oldValue;
      
      if (newPreferences?.language && newPreferences.language !== oldPreferences?.language) {
        i18n.changeLanguage(newPreferences.language);
      }
    }
  });
}

export default i18n;

// Utility function to change language
export const changeLanguage = async (language: string): Promise<void> => {
  await i18n.changeLanguage(language);
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language;
};

// Get available languages
export const getAvailableLanguages = (): { code: string; name: string }[] => {
  return [
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
  ];
};