
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Language = 'en' | 'fr' | 'ar';
const DEFAULT_LANGUAGE: Language = 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  translations: Record<string, string>;
  isLoading: boolean; // Exposed isLoading state
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
        // Attempt to fetch English translations as a fallback
        try {
            const enResponse = await fetch(`/locales/en/translation.json`);
            if (enResponse.ok) {
                const enData = await enResponse.json();
                setTranslations(enData);
            } else {
                 setTranslations({}); // Clear translations if English also fails
            }
        } catch (enError) {
            console.error("Error loading fallback English translations:", enError);
            setTranslations({});
        }
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
  
  // Render children immediately. The t function will fallback to keys if translations aren't loaded yet.
  // The AppContext's isLoading (if AppContext is a child or parent managing global load) or other specific loading indicators should handle visual loading states.
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};
