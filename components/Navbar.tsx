
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import Button from './Button';

const Navbar: React.FC = () => {
  const { userSession, logout, isAdmin, showAdminOrderNotification } = useAppContext();
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as 'en' | 'fr' | 'ar');
  };

  return (
    <nav className="bg-white shadow-md fixed w-full top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <NavLink to="/" className="text-2xl font-bold text-indigo-600">
              {t('laiterieArib')}
            </NavLink>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            {userSession && (
              <>
                <NavLink
                  to="/main"
                  className={({ isActive }) =>
                    `px-2 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium ${
                      isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`
                  }
                >
                  {t('navbar.orderProducts')}
                </NavLink>
                {!isAdmin && (
                   <NavLink
                      to="/order-history"
                      className={({ isActive }) =>
                        `px-2 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium ${
                          isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`
                      }
                    >
                      {t('navbar.myOrders')}
                    </NavLink>
                )}
                {isAdmin && (
                  <>
                    <NavLink
                      to="/dashboard"
                      className={({ isActive }) =>
                        `relative px-2 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium ${
                          isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`
                      }
                    >
                      {t('navbar.dashboard')}
                      {isAdmin && showAdminOrderNotification && (
                        <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white" />
                      )}
                    </NavLink>
                    <NavLink
                      to="/admin/products"
                      className={({ isActive }) =>
                        `px-2 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium ${ // Applied responsive classes and removed 'hidden'
                          isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`
                      }
                    >
                      {t('navbar.manageProducts')}
                    </NavLink>
                  </>
                )}
              </>
            )}
             <div className="ml-2">
                <select
                    onChange={handleLanguageChange}
                    value={language}
                    className="block w-full pl-2 pr-6 py-1.5 text-xs sm:text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                    aria-label={t('navbar.selectLanguage', {defaultValue: 'Select language'})}
                >
                    <option value="en">EN</option>
                    <option value="fr">FR</option>
                    <option value="ar">AR</option>
                </select>
            </div>
            {userSession ? (
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="hidden md:inline text-xs sm:text-sm text-gray-600">
                  {isAdmin ? t('navbar.hiAdmin', { storeName: userSession.storeName }) : t('navbar.hiStore', { storeName: userSession.storeName })}
                </span>
                <Button onClick={handleLogout} variant="secondary" size="sm" className="text-xs !px-2 !py-1 sm:!px-3 sm:!py-1.5">
                  {t('navbar.logout')}
                </Button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `px-2 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium ${
                    isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`
                }
              >
                {t('navbar.login')}
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
