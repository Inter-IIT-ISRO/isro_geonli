import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAuth = true, requireAdmin = false }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">
      <div>Loading...</div>
    </div>;
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && user?.role !== 2) {
    return <Navigate to="/chat" replace />;
  }

  return children;
};

export default ProtectedRoute;
