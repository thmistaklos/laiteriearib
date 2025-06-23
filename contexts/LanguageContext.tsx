
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Language = 'en' | 'fr' | 'ar';
const DEFAULT_LANGUAGE: Language = 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  translations: Record<string, string>;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const storedLang = localStorage.getItem('appLanguage') as Language | null;
    return storedLang || DEFAULT_LANGUAGE;
  });
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchTranslations = useCallback(async (lang: Language) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/locales/${lang}/translation.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${lang} translations: ${response.statusText}`);
      }
      const data = await response.json();
      setTranslations(data);
    } catch (error) {
      console.error("Error loading translations:", error);
      // Fallback to English if current language fails
      if (lang !== 'en') {
        await fetchTranslations('en');
      } else {
        setTranslations({}); // Clear translations if English itself fails
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTranslations(language);
  }, [language, fetchTranslations]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('appLanguage', lang);
  };

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    let translation = translations[key] || key; // Fallback to key if not found
    if (replacements) {
      Object.keys(replacements).forEach(placeholder => {
        translation = translation.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(replacements[placeholder]));
      });
    }
    return translation;
  }, [translations]);
  
  if (isLoading) {
    // You might want a more sophisticated loading state here,
    // but for now, we'll just delay rendering children.
    // Or, ensure AppContext's loader handles this.
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div></div>;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};
