import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as jwtDecode from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('AuthProvider: Checking for stored token on init:', token ? 'Token found' : 'No token found');
    if (token) {
      try {
        const decoded = jwtDecode.default(token);
        console.log('AuthProvider: Decoded token on init:', decoded);
        console.log('AuthProvider: User name on init:', decoded.name || 'No name in token');
        setUser(decoded); // Store user details from JWT
      } catch (error) {
        console.error('AuthProvider: Error decoding token on init:', error);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  // Login function to store token and decode user details
  const login = (token) => {
    console.log('AuthProvider: Login function called with token:', token);
    localStorage.setItem('token', token);
    try {
      const decoded = jwtDecode.default(token);
      console.log('AuthProvider: Decoded token in login:', decoded);
      console.log('AuthProvider: Logged in user name:', decoded.name || 'No name in token');
      setUser(decoded);
    } catch (error) {
      console.error('AuthProvider: Error decoding token in login:', error);
      localStorage.removeItem('token');
    }
  };

  // Logout function
  const logout = () => {
    console.log('AuthProvider: Logging out user');
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};