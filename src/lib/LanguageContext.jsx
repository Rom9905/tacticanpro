import React, { createContext, useContext } from 'react';
import { translations } from './i18n';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const t = translations['he'];

  return (
    <LanguageContext.Provider value={{ lang: 'he', setLang: () => {}, t, dir: 'rtl' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}