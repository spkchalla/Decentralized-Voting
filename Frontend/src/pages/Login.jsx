import React, { useState, useContext } from 'react';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { AuthContext } from '../context/AppContext';
import * as jwtDecode from 'jwt-decode';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const [state, setState] = useState('Login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pincode, setPincode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, message: '' });

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    // Basic client-side validation
    if (!email || !password) {
      toast.error('Email and password are required.');
      return;
    }
    if (state === 'Sign up') {
      if (!name) {
        toast.error('Full name is required for sign up.');
        return;
      }
      if (!pincode || !/^\d{6}$/.test(pincode)) {
        toast.error('A valid 6-digit pincode is required for sign up.');
        return;
      }
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      axios.defaults.withCredentials = true;
      if (state === 'Sign up') {
        const response = await axios.post(`${backendUrl}/approval/register`, {
          name,
          email,
          password,
          pincode: Number(pincode),
        });
        const { data, status } = response;
        console.log('Registration response:', { status, data });

        if (status === 201) {
          toast.success('Registration successful! Please verify OTP.');
          navigate('/otp-verification', {
            state: { purpose: 'verification', email, source: 'register' },
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
          console.log('JWT token received:', data.token);
          const decoded = jwtDecode.default(data.token);
          console.log('Decoded JWT:', decoded);
        }
        if (status === 200 && (data.message === 'OTP sent to email' || data.message === 'User registered, OTP sent')) {
          toast.success('Please verify OTP to login.');
          navigate('/otp-verification', { state: { purpose: 'verification', email, source: 'login' } });
        } else if (status === 200 && (data.message === 'Login successful' || data.success)) {
          if (data.token) {
            login(data.token);
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
      if (error.response?.status === 403) {
        setModal({ isOpen: true, message: error.response.data.message });
      } else {
        toast.error(error.response?.data?.message || 'An error occurred. Please try again.');
      }
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
      if (status === 200 || data.success || data.message === 'OTP sent to email') {
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

  const closeModal = () => {
    setModal({ isOpen: false, message: '' });
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
            <>
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
              <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
                <img src={assets.map_icon} alt="" />
                <input
                  onChange={(e) => setPincode(e.target.value)}
                  value={pincode}
                  className="bg-transparent outline-none"
                  type="text"
                  placeholder="6-digit Pincode"
                  required
                  pattern="\d{6}"
                  title="Pincode must be a 6-digit number"
                />
              </div>
            </>
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

      {/* Modal for 403 responses */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-lg shadow-lg w-full sm:w-96 text-indigo-300 text-sm">
            <h3 className="text-xl font-semibold text-white mb-4">Account Status</h3>
            <p className="text-center mb-6">{modal.message}</p>
            <button
              onClick={closeModal}
              className="w-full py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-white font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;