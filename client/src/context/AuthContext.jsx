import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

/**
 * Parse API error and return user-friendly message
 */
const getErrorMessage = (error) => {
  const status = error.response?.status;
  const serverMsg = error.response?.data?.msg;
  
  // Use server message if available
  if (serverMsg) {
    return serverMsg;
  }
  
  // Map status codes to user-friendly messages
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Invalid credentials. Please try again.';
    case 404:
      return 'API endpoint not found. Please contact support.';
    case 409:
      return 'Email already exists. Please use a different email.';
    case 500:
      return 'Server error. Please try again later.';
    default:
      if (!error.response) {
        return 'Network error. Please check your connection.';
      }
      return 'An unexpected error occurred.';
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await api.get('/auth');
        setUser(res.data);
      } catch (err) {
        console.error('[Auth] Failed to load user:', err);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  /**
   * Login with email and password
   * @throws {Error} with user-friendly message
   */
  const login = async (email, password) => {
    setError(null);
    
    try {
      const res = await api.post('/auth/login', { email, password });
      
      if (!res.data?.token) {
        throw new Error('No token received from server');
      }
      
      localStorage.setItem('token', res.data.token);
      
      // Fetch user data
      const userRes = await api.get('/auth');
      setUser(userRes.data);
      
      return { success: true };
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw new Error(message);
    }
  };

  /**
   * Register new user
   * @throws {Error} with user-friendly message
   */
  const register = async (name, mobile, email, password) => {
    setError(null);
    
    try {
      const res = await api.post('/auth/register', { name, mobile, email, password });
      
      if (!res.data?.token) {
        throw new Error('No token received from server');
      }
      
      localStorage.setItem('token', res.data.token);
      
      // Fetch user data
      const userRes = await api.get('/auth');
      setUser(userRes.data);
      
      return { success: true };
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw new Error(message);
    }
  };

  /**
   * Logout user
   */
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
  };

  /**
   * Clear current error
   */
  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error,
      login, 
      register, 
      logout,
      clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
