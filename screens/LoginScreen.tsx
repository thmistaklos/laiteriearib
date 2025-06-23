
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import InputField from '../components/InputField';
import Button from '../components/Button';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [storeNameError, setStoreNameError] = useState('');
  const navigate = useNavigate();
  const { login, userSession } = useAppContext();
  const { t } = useTranslation();

  useEffect(() => {
    if (userSession) {
      navigate('/main');
    }
  }, [userSession, navigate]);

  const validateEmail = (emailToValidate: string): boolean => {
    if (!emailToValidate) {
      setEmailError(t('login.emailRequired'));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToValidate)) {
      setEmailError(t('login.emailInvalid'));
      return false;
    }
    setEmailError('');
    return true;
  };

  const validateStoreName = (name: string): boolean => {
    if (!name.trim()) {
      setStoreNameError(t('login.storeNameRequired'));
      return false;
    }
    setStoreNameError('');
    return true;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isEmailValid = validateEmail(email);
    const isStoreNameValid = validateStoreName(storeName);

    if (isEmailValid && isStoreNameValid) {
      login(email, storeName);
      navigate('/main');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600 p-4">
      <div className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">{t('login.title')}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <InputField
            label={t('login.emailLabel')}
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) validateEmail(e.target.value);
            }}
            error={emailError}
            placeholder={t('login.emailPlaceholder')}
            required
            aria-describedby="email-error"
          />
          {emailError && <p id="email-error" className="mt-1 text-xs text-red-500 sr-only">{emailError}</p>}
          <InputField
            label={t('login.storeNameLabel')}
            id="storeName"
            type="text"
            value={storeName}
            onChange={(e) => {
              setStoreName(e.target.value);
              if (storeNameError) validateStoreName(e.target.value);
            }}
            error={storeNameError}
            placeholder={t('login.storeNamePlaceholder')}
            required
            aria-describedby="storeName-error"
          />
          {storeNameError && <p id="storeName-error" className="mt-1 text-xs text-red-500 sr-only">{storeNameError}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full">
            {t('login.loginButton')}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
