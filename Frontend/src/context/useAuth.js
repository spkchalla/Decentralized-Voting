import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import Cookies from 'js-cookie'; // Add this import

const useAuth = () => {
  const [user, setUser] = useState(null); // { id, iat, exp, name, email, voterId?, userType }
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Cookie options for security (adjust as needed)
  const cookieOptions = {
    secure: process.env.NODE_ENV === 'production', // HTTPS in prod
    sameSite: 'strict',
    expires: 7, // Or tie to token exp
  };

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('useAuth: Checking for token and userType...');
      const token = Cookies.get('token'); // Changed from localStorage
      const userType = Cookies.get('userType'); // Changed from localStorage
      console.log('useAuth - Token from cookies:', token);
      console.log('useAuth - UserType from cookies:', userType);

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

          // Fetch user details (consider adding withCredentials: true if backend uses cookie auth)
          const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true, // Enable if backend reads cookies
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
            status: userType === 'admin' ? undefined : userData.status,
            userType: userType || 'N/A',
          });
          setIsAuthenticated(true);
          setError(null);
        } catch (error) {
          console.error('useAuth - Error:', error.response?.data || error.message);
          setError(error.response?.data?.message || 'Authentication failed.');
          setIsAuthenticated(false);
          // Clear cookies on error
          Cookies.remove('token', cookieOptions);
          Cookies.remove('userType', cookieOptions);
          navigate('/login');
        }
      } else {
        console.log('useAuth - No token found in cookies');
        setError('No token found. Please log in.');
        setIsAuthenticated(false);
        navigate('/login');
      }
      setLoading(false);
    };

    initializeAuth();
  }, [navigate, backendUrl]);

  const logout = () => {
    console.log('useAuth - Logging out: Clearing cookies and navigating to /login');
    Cookies.remove('token', cookieOptions); // Changed from localStorage
    Cookies.remove('userType', cookieOptions); // Changed from localStorage
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  };

  return { user, isAuthenticated, loading, error, logout };
};

export default useAuth;