import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie'; // Add this import

const Otp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Extract navigation state
  const purpose = location.state?.purpose || 'verification';
  const email = location.state?.email || '';
  const source = location.state?.source || 'register';
  const userId = location.state?.userId || '';

  // State for OTP input
  const [otp, setOtp] = useState('');
  const [title, setTitle] = useState('OTP Verification');
  const [subtitle, setSubtitle] = useState(`Enter the 6-digit code sent to ${email || 'your email'}.`);
  const [buttonText, setButtonText] = useState('Verify OTP');
  const [sourceLabel, setSourceLabel] = useState('');

  // Cookie options for consistency with useAuth
  const cookieOptions = {
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    sameSite: 'strict',
    expires: 7, // 7 days, adjust based on token expiry
  };

  // Validate state and set UI text
  useEffect(() => {
    console.log('Full location.state:', location.state);
    console.log('OTP page - purpose:', purpose);
    console.log('OTP page - email:', email);
    console.log('OTP page - source:', source);
    console.log('OTP page - userId:', userId);

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
      console.error('Validation failed: email=', email, 'userId=', userId, 'source=', source);
      toast.error('Required information missing. Please go back and try again.');
      navigate('/login');
    }
  }, [purpose, email, source, userId, navigate]);

  // Handle OTP submission
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
        console.log('Submitting to /user/verify-otp with userId:', userId, 'and OTP:', otp);
        response = await axios.post(`${backendUrl}/user/verify-otp`, {
          userId,
          otp,
        });
      } else if (source === 'forgot-password') {
        console.log('Submitting to /login/verify with email:', email, 'and OTP:', otp);
        response = await axios.post(`${backendUrl}/login/verify`, {
          email,
          otp,
        });
      } else {
        console.log('Submitting to /login/login-otp with email:', email, 'purpose:', purpose, 'and OTP:', otp);
        response = await axios.post(`${backendUrl}/login/login-otp`, {
          email,
          otp,
          purpose,
        });
      }
      const { data } = response;
      console.log('OTP verification response:', data);

      if (
        data.message === 'User verified successfully' ||
        data.message === 'Login successful' ||
        data.message === 'OTP is valid' ||
        data.success
      ) {
        // Save token and userType to cookies and decode token
        if (data.token) {
          Cookies.set('token', data.token, cookieOptions); // Changed from localStorage
          Cookies.set('userType', data.userType, cookieOptions); // Changed from localStorage
          try {
            const decodedToken = jwtDecode(data.token);
            console.log('Decoded JWT:', decodedToken);
            console.log('Stored userType:', data.userType);
          } catch (error) {
            console.error('Error decoding JWT:', error);
          }
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
      } else {
        toast.error(data.message || 'OTP verification failed.');
      }
    } catch (error) {
      console.error('Error during OTP verification:', error.response?.data, error.response?.status);
      toast.error(error.response?.data?.message || 'Verification failed. Please try again.');
    }
  };

  // Handle OTP resend
  const handleResendOtp = async () => {
    try {
      axios.defaults.withCredentials = true;
      console.log('Submitting to /login/resend with email:', email);
      const { data } = await axios.post(`${backendUrl}/login/resend`, { email });
      console.log('Resend OTP response:', data);
      if (data.message === 'OTP resent successfully' || data.success) {
        toast.info(`A new OTP has been sent to ${email}.`);
      } else {
        toast.error(data.message || 'Failed to resend OTP.');
      }
    } catch (error) {
      console.error('Error during resend OTP:', error.response?.data, error.response?.status);
      toast.error(error.response?.data?.message || 'Failed to resend OTP. Please try again.');
    }
  };

  // Lock icon component
  const LockIcon = () => (
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
  );

  return (
    <div className="flex items-center justify-center min-h-screen px-6 sm:px-0 bg-slate-950">
      <img
        onClick={() => navigate('/')}
        src="https://placehold.co/128x50/4338ca/ffffff?text=Vote&font=lato"
        alt="Logo"
        className="absolute left-5 sm:left-20 top-5 cursor-pointer rounded"
      />
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
            <LockIcon />
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
            className="w-full py-2.5 mt-4 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-white font-medium cursor-pointer"
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
  );
};

export default Otp;