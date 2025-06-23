
import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-gray-300 p-4 text-center mt-auto">
      <p className="text-sm">
        <a 
          href="mailto:ahmedbelaribi24@gmail.com" 
          className="hover:text-indigo-400 transition-colors duration-200"
          aria-label="Send email to SID AHMED"
        >
          {t('footer.allRightsReserved', { owner: "SID AHMED", year: currentYear })}
        </a>
      </p>
    </footer>
  );
};

export default Footer;
