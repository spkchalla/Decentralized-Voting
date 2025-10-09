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
import Navbar from './components/Navbar';
import PageNotFound from './pages/PageNotFound';
import Profile from './pages/Profile';
import Approval from './pages/Approval';
import Elections from './pages/Elections';

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
          <Route path="/profile" element={<Profile/>} />
          <Route path = "/*" element = {<PageNotFound/>}/>
          <Route path = "/approval" element = {<Approval/>}/>
          <Route path = "/elections" element = {<Elections/>}/>
        </Routes>
      </AuthProvider>

    </div>
  );
};

export default App;