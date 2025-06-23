
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { LanguageProvider } from './contexts/LanguageContext';
import LoginScreen from './screens/LoginScreen';
import MainScreen from './screens/MainScreen';
import ConfirmationScreen from './screens/ConfirmationScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProductAdminScreen from './screens/ProductAdminScreen';
import OrderHistoryScreen from './screens/OrderHistoryScreen'; // New import
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';


const App: React.FC = () => {
  return (
    <AppProvider>
      <LanguageProvider>
        <HashRouter>
          <Navbar />
          {/* Adjusted padding top to ensure content is below the fixed navbar */}
          <div className="pt-20 sm:pt-16"> 
            <Routes>
              <Route path="/login" element={<LoginScreen />} />
              
              {/* User accessible routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/main" element={<MainScreen />} />
                <Route path="/confirmation/:orderId" element={<ConfirmationScreen />} />
                <Route path="/order-history" element={<OrderHistoryScreen />} /> {/* New route for order history */}
              </Route>

              {/* Admin accessible routes */}
              <Route element={<ProtectedRoute adminOnly={true} />}>
                <Route path="/dashboard" element={<DashboardScreen />} />
                <Route path="/admin/products" element={<ProductAdminScreen />} />
              </Route>
              
              <Route path="/" element={<Navigate replace to="/login" />} />
              <Route path="*" element={<Navigate replace to="/" />} /> {/* Catch-all route */}
            </Routes>
          </div>
        </HashRouter>
      </LanguageProvider>
    </AppProvider>
  );
};

export default App;
