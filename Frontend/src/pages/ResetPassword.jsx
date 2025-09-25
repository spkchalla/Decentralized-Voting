import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { assets } from '../assets/assets';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const email = location.state?.email || '';
  const otp = location.state?.otp || ''; // OTP carried from Otp component
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    console.log('ResetPassword location.state:', location.state);
    console.log('ResetPassword - email:', email);
    console.log('ResetPassword - otp:', otp);
    if (!email || !otp) {
      console.error('Validation failed: email=', email, 'otp=', otp);
      toast.error('Required information missing. Please go back to the forgot password page.');
      navigate('/login');
    }
  }, [email, otp, navigate]);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    try {
      axios.defaults.withCredentials = true;
      console.log('Submitting to /login/reset-password with:', { email, otp, newPassword: password });
      const response = await axios.post(`${backendUrl}/login/reset-password`, {
        email,
        otp,
        newPassword: password,
      });
      const { data } = response;
      console.log('Reset password response:', data);
      if (data.message === 'Password reset successfully') {
        toast.success('Password reset successfully! Please log in.');
        navigate('/login');
      } else {
        toast.error(data.message || 'Failed to reset password.');
      }
    } catch (error) {
      console.error('Error during password reset:', error.response?.data, error.response?.status);
      toast.error(error.response?.data?.message || 'Failed to reset password. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-6 sm:px-0 bg-slate-950">
      <img
        onClick={() => navigate('/')}
        src={assets.vote_image}
        alt="Logo"
        className="absolute left-5 sm:left-20 top-5 w-28 sm:w-32 cursor-pointer"
      />
      <div className="bg-slate-900 p-10 rounded-lg shadow-lg w-full sm:w-96 text-indigo-300 text-sm">
        <h2 className="text-3xl font-semibold text-white text-center mb-3">Reset Password</h2>
        <p className="text-center text-sm mb-4">Enter your new password for {email}.</p>
        {email && (
          <p className="text-center text-xs text-gray-400 mb-4">
            Password reset for: <span className="text-indigo-400">{email}</span>
          </p>
        )}

        <form onSubmit={onSubmitHandler}>
          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
            <img src={assets.lock_icon} alt="" />
            <input
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              className="bg-transparent outline-none"
              type="password"
              placeholder="New Password"
              required
            />
          </div>
          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
            <img src={assets.lock_icon} alt="" />
            <input
              onChange={(e) => setConfirmPassword(e.target.value)}
              value={confirmPassword}
              className="bg-transparent outline-none"
              type="password"
              placeholder="Confirm Password"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-white font-medium cursor-pointer"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;