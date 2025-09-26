import React, { useState } from 'react';
import { assets } from '../assets/assets';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import useAuth from '../context/useAuth';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const handleLogout = () => {
    if (logout) {
      logout();
    }
    setShowDropdown(false);
    navigate('/login');
  };

  const handleViewProfile = () => {
    navigate('/profile');
    setShowDropdown(false);
  };

  const handleChangePassword = async () => {
    if (isLoading) return;
    if (!user?.email) {
      toast.error('User email not available. Please log in again.');
      navigate('/login');
      return;
    }
    setIsLoading(true);
    try {
      axios.defaults.withCredentials = true;
      const response = await axios.post(`${backendUrl}/login/forgot-password`, { email: user.email });
      const { data, status } = response;
      console.log('Forgot password response:', { status, data });
      if (status === 200 || data.success || data.message === 'OTP sent to email' || data.message === 'User registered, OTP sent') {
        toast.success('OTP sent to your email.');
        setShowDropdown(false);
        navigate('/otp-verification', { state: { purpose: 'reset', email: user.email, source: 'forgot-password' } });
      } else {
        toast.error(data.message || 'Failed to send OTP.');
      }
    } catch (error) {
      console.error('Error during forgot password:', error.response?.data, error.response?.status);
      toast.error(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="w-full flex justify-between items-center p-2 sm:p-3 sm:px-12 absolute top-0">
        <div className="flex items-center gap-2">
          <img
            src={assets.vote_image}
            alt="Logo"
            className="w-12 sm:w-16 cursor-pointer"
            onClick={() => navigate('/')}
          />
          <span className="text-indigo-300 text-base sm:text-lg font-semibold">Decentralized Voting</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 border border-gray-500 rounded-full px-3 py-1 text-gray-800 hover:bg-gray-100 transition-all text-base sm:text-lg"
          >
            Login
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-800"
            >
              <polyline points="6,9 12,15 18,9"></polyline>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="w-full flex justify-between items-center p-2 sm:p-3 sm:px-12 absolute top-0 bg-slate-900/80 backdrop-blur-sm z-20">
      <div className="flex items-center gap-2">
        <img
          src={assets.vote_image}
          alt="Logo"
          className="w-12 sm:w-16 cursor-pointer"
          onClick={() => navigate('/')}
        />
        <span className="text-indigo-300 text-base sm:text-lg font-semibold">Decentralized Voting</span>
      </div>

      {user.userType === 'admin' && (
        <div className="flex items-center gap-4 sm:gap-6 text-indigo-300 text-base sm:text-lg font-medium">
          <button
            onClick={() => navigate('/candidates')}
            className={`relative cursor-pointer group transition-all duration-200 ${
              location.pathname === '/candidates' ? 'text-indigo-100 font-bold' : 'hover:text-indigo-100'
            }`}
          >
            Candidates
            <span
              className={`absolute left-0 bottom-0 h-[2px] bg-indigo-100 transition-all duration-300 ${
                location.pathname === '/candidates' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            ></span>
          </button>
          <button
            onClick={() => navigate('/parties')}
            className={`relative cursor-pointer group transition-all duration-200 ${
              location.pathname === '/parties' ? 'text-indigo-100 font-bold' : 'hover:text-indigo-100'
            }`}
          >
            Parties
            <span
              className={`absolute left-0 bottom-0 h-[2px] bg-indigo-100 transition-all duration-300 ${
                location.pathname === '/parties' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            ></span>
          </button>
          <button
            onClick={() => navigate('/people')}
            className={`relative cursor-pointer group transition-all duration-200 ${
              location.pathname === '/people' ? 'text-indigo-100 font-bold' : 'hover:text-indigo-100'
            }`}
          >
            People
            <span
              className={`absolute left-0 bottom-0 h-[2px] bg-indigo-100 transition-all duration-300 ${
                location.pathname === '/people' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            ></span>
          </button>
          <button
            onClick={() => navigate('/admin')}
            className={`relative cursor-pointer group transition-all duration-200 ${
              location.pathname === '/admin' ? 'text-indigo-100 font-bold' : 'hover:text-indigo-100'
            }`}
          >
            Admin
            <span
              className={`absolute left-0 bottom-0 h-[2px] bg-indigo-100 transition-all duration-300 ${
                location.pathname === '/admin' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            ></span>
          </button>
          <button
            onClick={() => navigate('/elections')}
            className={`relative cursor-pointer group transition-all duration-200 ${
              location.pathname === '/elections' ? 'text-indigo-100 font-bold' : 'hover:text-indigo-100'
            }`}
          >
            Elections
            <span
              className={`absolute left-0 bottom-0 h-[2px] bg-indigo-100 transition-all duration-300 ${
                location.pathname === '/elections' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            ></span>
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 text-indigo-300">
        <span className="text-base sm:text-lg hidden sm:block">Welcome,</span>
        <span className="text-base sm:text-lg font-medium hidden sm:block">{user.name}</span>
        {user.userType === 'admin' && (
          <span className="text-sm sm:text-base bg-indigo-600 text-white px-2 py-1 rounded-full">
            Admin
          </span>
        )}
        
        <div className="flex items-center gap-2 cursor-pointer" onClick={toggleDropdown}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white text-base sm:text-lg font-medium">
            {initial}
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-indigo-300 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
          >
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </div>
      </div>

      {showDropdown && (
        <div className="absolute top-full right-4 sm:right-12 mt-1 w-48 bg-slate-900 rounded-lg shadow-lg border border-slate-700 py-3 z-50 overflow-hidden">
          <button
            onClick={handleViewProfile}
            className="w-full text-left px-4 py-2 text-indigo-300 hover:bg-indigo-600 hover:text-white hover:underline transition-all duration-200 text-base"
          >
            View Profile
          </button>
          <button
            onClick={handleChangePassword}
            disabled={isLoading}
            className={`w-full text-left px-4 py-2 text-indigo-300 hover:bg-indigo-600 hover:text-white hover:underline transition-all duration-200 text-base ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Sending OTP...' : 'Change Password'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-indigo-300 hover:bg-indigo-600 hover:text-white hover:underline transition-all duration-200 text-base"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default Navbar;