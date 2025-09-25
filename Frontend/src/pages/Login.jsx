import React, { useState, useContext } from 'react';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { AuthContext } from '../context/AppContext';
import * as jwtDecode from 'jwt-decode'; // Added import for JWT decoding

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // Access login function
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const [state, setState] = useState('Login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    // Basic client-side validation
    if (!email || !password) {
      toast.error('Email and password are required.');
      return;
    }
    if (state === 'Sign up' && !name) {
      toast.error('Full name is required for sign up.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      axios.defaults.withCredentials = true;
      if (state === 'Sign up') {
        const response = await axios.post(`${backendUrl}/user/register`, {
          name,
          email,
          password,
        });
        const { data, status } = response;
        console.log('Registration response:', { status, data });

        if (status === 201 || data.success || data.message === 'User registered, OTP sent' || data.message === 'OTP sent to email') {
          const userId = data.userId || data.user_id || data.id || data._id;
          if (!userId) {
            console.error('userId not found in response data:', data);
            toast.error('Registration successful, but user ID missing.');
            return;
          }
          toast.success('Registration successful! Please verify OTP.');
          navigate('/otp-verification', {
            state: { purpose: 'verification', email, source: 'register', userId },
          });
        } else {
          toast.error(data.message || 'Registration failed.');
        }
      } else {
        const response = await axios.post(`${backendUrl}/login/`, {
          email,
          password,
        });
        const { data, status } = response;
        console.log('Login response:', { status, data });
        if (data.token) {
          console.log('JWT token received:', data.token); // Log the token
          const decoded = jwtDecode.default(data.token); // Decode token
          console.log('Decoded JWT:', decoded); // Log decoded contents
        }
        if (status === 200 && (data.message === 'OTP sent to email' || data.message === 'User registered, OTP sent')) {
          toast.success('Please verify OTP to login.');
          navigate('/otp-verification', { state: { purpose: 'verification', email, source: 'login' } });
        } else if (status === 200 && (data.message === 'Login successful' || data.success)) {
          if (data.token) {
            login(data.token); // Store JWT and update auth context
            toast.success('Login successful!');
            navigate('/');
          } else {
            toast.error('Login successful, but no token received.');
          }
        } else {
          toast.error(data.message || 'Login failed.');
        }
      }
    } catch (error) {
      console.error('Error during submission:', error.response?.data, error.response?.status);
      toast.error(error.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }
    try {
      axios.defaults.withCredentials = true;
      const response = await axios.post(`${backendUrl}/login/forgot-password`, { email });
      const { data, status } = response;
      console.log('Forgot password response:', { status, data });
      if (status === 200 || data.success || data.message === 'OTP sent to email' || data.message === 'User registered, OTP sent') {
        toast.success('OTP sent to your email.');
        navigate('/otp-verification', { state: { purpose: 'reset', email, source: 'forgot-password' } });
      } else {
        toast.error(data.message || 'Failed to send OTP.');
      }
    } catch (error) {
      console.error('Error during forgot password:', error.response?.data, error.response?.status);
      toast.error(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    }
  };

  const buttonClasses = isSubmitting
    ? 'w-full py-2.5 rounded-full bg-gray-400 opacity-70 cursor-not-allowed text-white font-medium'
    : 'w-full py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-white font-medium cursor-pointer transition-transform duration-200 hover:scale-105 hover:bg-gradient-to-r hover:from-indigo-400 hover:to-indigo-800 hover:shadow-lg';

  return (
    <div className="flex items-center justify-center min-h-screen px-6 sm:px-0">
      <img
        onClick={() => navigate('/')}
        src={assets.vote_image}
        alt=""
        className="absolute left-5 sm:left-20 top-5 w-28 sm:w-32 cursor-pointer"
      />
      <div className="bg-slate-900 p-10 rounded-lg shadow-lg w-full sm:w-96 text-indigo-300 text-sm">
        <h2 className="text-3xl font-semibold text-white text-center mb-3">
          {state === 'Sign up' ? 'Create Account' : 'Login'}
        </h2>
        <p className="text-center text-sm mb-6">
          {state === 'Sign up' ? 'Create your account' : 'Login to your account!'}
        </p>

        <form onSubmit={onSubmitHandler}>
          {state === 'Sign up' && (
            <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
              <img src={assets.person_icon} alt="" />
              <input
                onChange={(e) => setName(e.target.value)}
                value={name}
                className="bg-transparent outline-none"
                type="text"
                placeholder="Full Name"
                required
              />
            </div>
          )}
          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
            <img src={assets.mail_icon} alt="" />
            <input
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              className="bg-transparent outline-none"
              type="email"
              placeholder="Email Id"
              required
            />
          </div>
          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
            <img src={assets.lock_icon} alt="" />
            <input
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              className="bg-transparent outline-none"
              type="password"
              placeholder="Password"
              required
            />
          </div>

          {state === 'Login' && (
            <p
              onClick={handleForgotPassword}
              className="mb-4 text-indigo-500 cursor-pointer hover:text-indigo-400"
            >
              Forgot Password?
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={buttonClasses}
          >
            {isSubmitting ? 'Requesting OTP' : state === 'Sign up' ? 'Sign Up' : 'Login'}
          </button>
        </form>

        {state === 'Sign up' ? (
          <p className="text-gray-400 text-center text-xs mt-4">
            Already have an account?{' '}
            <span
              onClick={() => setState('Login')}
              className="text-blue-400 cursor-pointer underline"
            >
              Login Here
            </span>
          </p>
        ) : (
          <p className="text-gray-400 text-center text-xs mt-4">
            Don't have an account?{' '}
            <span
              onClick={() => setState('Sign up')}
              className="text-blue-400 cursor-pointer underline"
            >
              Sign up
            </span>
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;