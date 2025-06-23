import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

interface ProtectedRouteProps {
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ adminOnly = false }) => {
  const { userSession, isAdmin, isLoading } = useAppContext();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div></div>;
  }

  if (!userSession) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    // Non-admin trying to access admin route
    return <Navigate to="/main" replace />; // Or an "Access Denied" page
  }

  return <Outlet />;
};

export default ProtectedRoute;