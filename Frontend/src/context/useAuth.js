import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const useAuth = () => {
  const [user, setUser] = useState(null); // { id, iat, exp, name, email, voterId?, userType }
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('useAuth: Checking for token and userType...');
      const token = localStorage.getItem('token');
      const userType = localStorage.getItem('userType');
      console.log('useAuth - Token from localStorage:', token);
      console.log('useAuth - UserType from localStorage:', userType);

      if (token) {
        try {
          const decoded = jwtDecode(token);
          console.log('useAuth - Decoded JWT:', decoded);

          // Determine ID field based on userType
          const idField = userType === 'admin' ? decoded.adminId : decoded.userId;
          if (!idField) {
            throw new Error(`Missing ${userType === 'admin' ? 'adminId' : 'userId'} in JWT`);
          }

          // Determine endpoint based on userType
          const endpoint =
            userType === 'admin'
              ? `${backendUrl}/admin/get/${idField}`
              : `${backendUrl}/user/get/${idField}`;

          // Fetch user details
          const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
          });
          console.log('useAuth - Full API response:', response.data);
          const userData = response.data.admin || response.data.user || response.data;

          // Validate response based on userType
          if (!userData || !userData.name || !userData.email) {
            throw new Error('Invalid user data structure: Missing name or email');
          }
          if (userType !== 'admin' && !userData.voterId) {
            throw new Error('Invalid user data structure: Missing voterId for non-admin user');
          }

          setUser({
            id: idField,
            iat: decoded.iat,
            exp: decoded.exp,
            name: userData.name,
            email: userData.email,
            voterId: userType === 'admin' ? undefined : userData.voterId,
            userType: userType || 'N/A',
          });
          setIsAuthenticated(true);
          setError(null);
        } catch (error) {
          console.error('useAuth - Error:', error.response?.data || error.message);
          setError(error.response?.data?.message || 'Authentication failed.');
          setIsAuthenticated(false);
          localStorage.removeItem('token');
          localStorage.removeItem('userType');
          navigate('/login');
        }
      } else {
        console.log('useAuth - No token found in localStorage');
        setError('No token found. Please log in.');
        setIsAuthenticated(false);
        navigate('/login');
      }
      setLoading(false);
    };

    initializeAuth();
  }, [navigate, backendUrl]);

  const logout = () => {
    console.log('useAuth - Logging out: Clearing localStorage and navigating to /login');
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  };

  return { user, isAuthenticated, loading, error, logout };
};

export default useAuth;