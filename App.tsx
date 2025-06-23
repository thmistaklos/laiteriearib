
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { LanguageProvider } from './contexts/LanguageContext';
import LoginScreen from './screens/LoginScreen';
import MainScreen from './screens/MainScreen';
import ConfirmationScreen from './screens/ConfirmationScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProductAdminScreen from './screens/ProductAdminScreen';
import OrderHistoryScreen from './screens/OrderHistoryScreen';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/Footer'; // Import Footer


const App: React.FC = () => {
  return (
    <AppProvider>
      <LanguageProvider>
        <HashRouter>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow pt-20 sm:pt-16">
              <Routes>
                <Route path="/login" element={<LoginScreen />} />
                
                {/* User accessible routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/main" element={<MainScreen />} />
                  <Route path="/confirmation/:orderId" element={<ConfirmationScreen />} />
                  <Route path="/order-history" element={<OrderHistoryScreen />} />
                </Route>

                {/* Admin accessible routes */}
                <Route element={<ProtectedRoute adminOnly={true} />}>
                  <Route path="/dashboard" element={<DashboardScreen />} />
                  <Route path="/admin/products" element={<ProductAdminScreen />} />
                </Route>
                
                <Route path="/" element={<Navigate replace to="/login" />} />
                <Route path="*" element={<Navigate replace to="/" />} /> {/* Catch-all route */}
              </Routes>
            </main>
            <Footer />
          </div>
        </HashRouter>
      </LanguageProvider>
    </AppProvider>
  );
};

export default App;
