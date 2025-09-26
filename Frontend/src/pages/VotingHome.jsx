// File: src/pages/Otp.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import Cookies from 'js-cookie';
import jwtDecode from 'jwt-decode'; // Correct import
import Header from '../components/Header1'; // Shared header

const Otp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const purpose = location.state?.purpose || 'verification';
  const email = location.state?.email || '';
  const source = location.state?.source || 'register';
  const userId = location.state?.userId || '';

  const [otp, setOtp] = useState('');
  const [title, setTitle] = useState('OTP Verification');
  const [subtitle, setSubtitle] = useState(`Enter the 6-digit code sent to ${email || 'your email'}.`);
  const [buttonText, setButtonText] = useState('Verify OTP');
  const [sourceLabel, setSourceLabel] = useState('');

  const cookieOptions = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: 7,
  };

  useEffect(() => {
    if (purpose === 'reset') {
      setTitle('Reset Password');
      setSubtitle(`Enter the OTP sent to ${email || 'your email'} to reset your password.`);
      setButtonText('Verify & Proceed');
      setSourceLabel('Forgot Password');
    } else {
      setTitle('OTP Verification');
      setSubtitle(`Enter the 6-digit code sent to ${email || 'your email'}.`);
      setButtonText('Verify OTP');
      setSourceLabel(source === 'register' ? 'Register' : 'Login');
    }

    if (!email || (source === 'register' && !userId)) {
      toast.error('Required information missing. Please go back and try again.');
      navigate('/login');
    }
  }, [purpose, email, source, userId, navigate]);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      toast.error('Please enter a valid 6-digit OTP.');
      return;
    }

    try {
      axios.defaults.withCredentials = true;
      let response;

      if (source === 'register') {
        response = await axios.post(`${backendUrl}/user/verify-otp`, { userId, otp });
      } else if (source === 'forgot-password') {
        response = await axios.post(`${backendUrl}/login/verify`, { email, otp });
      } else {
        response = await axios.post(`${backendUrl}/login/login-otp`, { email, otp, purpose });
      }

      const { data } = response;

      if (data.token) {
        // Save token in cookies
        Cookies.set('token', data.token, cookieOptions);
        Cookies.set('userType', data.userType, cookieOptions);

        // Decode token
        const decoded = jwtDecode(data.token);
        console.log('Decoded JWT:', decoded);
      }

      if (source === 'register') {
        toast.success('User verified successfully! Please log in.');
        navigate('/login');
      } else if (source === 'forgot-password') {
        toast.success('OTP Verified! Please create a new password.');
        navigate('/reset-password', { state: { email, otp } });
      } else {
        toast.success('Login successful!');
        navigate('/');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Verification failed. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(`${backendUrl}/login/resend`, { email });
      if (data.success || data.message?.includes('OTP')) {
        toast.info(`A new OTP has been sent to ${email}.`);
      } else {
        toast.error(data.message || 'Failed to resend OTP.');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to resend OTP. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header /> {/* Shared header */}

      <div className="flex flex-1 items-center justify-center px-6 sm:px-0 mt-24">
        <div className="bg-slate-900 p-10 rounded-lg shadow-lg w-full sm:w-96 text-indigo-300 text-sm">
          <h2 className="text-3xl font-semibold text-white text-center mb-3">{title}</h2>
          <p className="text-center text-sm mb-4">{subtitle}</p>
          {email && (
            <p className="text-center text-xs text-gray-400 mb-4">
              OTP sent to: <span className="text-indigo-400">{email}</span>
            </p>
          )}
          {sourceLabel && (
            <p className="text-center text-xs text-gray-400 mb-4">
              Source: <span className="text-indigo-400">{sourceLabel}</span>
            </p>
          )}

          <form onSubmit={onSubmitHandler}>
            <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-indigo-300"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                onChange={(e) => setOtp(e.target.value)}
                value={otp}
                className="bg-transparent outline-none tracking-[8px] text-center w-full text-white"
                type="text"
                placeholder="------"
                maxLength="6"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 mt-4 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-white font-medium cursor-pointer hover:scale-105 transition-transform duration-200"
            >
              {buttonText}
            </button>
          </form>

          <p className="text-gray-400 text-center text-xs mt-4">
            Didn&apos;t receive the code?{' '}
            <span onClick={handleResendOtp} className="text-blue-400 cursor-pointer underline">
              Resend OTP
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Otp;
