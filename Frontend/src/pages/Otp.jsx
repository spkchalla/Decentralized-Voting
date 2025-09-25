import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useContext } from 'react';
import { AppContent } from '../context/AppContext';

const Otp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsLoggedin, getUserData } = useContext(AppContent);

  const purpose = location.state?.purpose || 'verification';
  const email = location.state?.email || '';

  const [otp, setOtp] = useState('');
  const [title, setTitle] = useState('OTP Verification');
  const [subtitle, setSubtitle] = useState('Enter the 6-digit code sent to your email.');
  const [buttonText, setButtonText] = useState('Verify OTP');

  useEffect(() => {
    if (purpose === 'reset') {
      setTitle('Reset Password');
      setSubtitle('Enter the OTP to reset your password.');
      setButtonText('Verify & Proceed');
    } else {
      setTitle('OTP Verification');
      setSubtitle('Enter the 6-digit code sent to your email.');
      setButtonText('Verify OTP');
    }
    if (!email) {
      toast.error('Email is required. Please go back and provide your email.');
      navigate('/login');
    }
  }, [purpose, email, navigate]);

  const onSubmitHandler = (e) => {
    e.preventDefault();
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      toast.error('Please enter a valid 6-digit OTP.');
      return;
    }
    if (purpose === 'reset') {
      toast.success('OTP Verified! Please create a new password.');
      navigate('/reset-password', { state: { email } });
    } else {
      toast.success('Verification Successful!');
      setIsLoggedin(true);
      getUserData();
      navigate('/');
    }
  };

  const handleResendOtp = () => {
    toast.info(`A new OTP has been sent to ${email}.`);
  };

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
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
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
        <p className="text-center text-sm mb-6">{subtitle}</p>

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
          Didn't receive the code?{' '}
          <span onClick={handleResendOtp} className="text-blue-400 cursor-pointer underline">
            Resend OTP
          </span>
        </p>
      </div>
    </div>
  );
};

export default Otp;