import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import EmailVerify from './pages/EmailVerify';
import ResetPassword from './pages/ResetPassword';
import Otp from './pages/Otp';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AppContext';

const App = () => {
  return (
    <div>
      <AuthProvider>
        <ToastContainer />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/email-verify" element={<EmailVerify />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/otp-verification" element={<Otp />} />
        </Routes>
      </AuthProvider>
    </div>
  );
};

export default App;