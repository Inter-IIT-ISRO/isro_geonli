import React, { createContext, useState, useContext, useEffect } from 'react';
import { login as loginAPI, adminLogin as adminLoginAPI, logout as logoutAPI, signup as signupAPI, getMe } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await getMe();
        const { email, role, isWhitelisted } = response.data;
        setUser({ email, role, isWhitelisted });
        setIsAuthenticated(true);
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password, isAdmin = false) => {
    try {
      setLoading(true);
      const response = isAdmin 
        ? await adminLoginAPI(email, password)
        : await loginAPI(email, password);
      
      const meResponse = await getMe();
      const { role, isWhitelisted } = meResponse.data;
      setUser({ email, role, isWhitelisted });
      setIsAuthenticated(true);
      return { success: true, message: response.data.message || 'Login successful' };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password) => {
    try {
      setLoading(true);
      const response = await signupAPI(email, password);
      
      const meResponse = await getMe();
      const { role, isWhitelisted } = meResponse.data;
      setUser({ email, role, isWhitelisted });
      setIsAuthenticated(true);
      return { success: true, message: response.data.message || 'Signup successful' };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Signup failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutAPI();
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
