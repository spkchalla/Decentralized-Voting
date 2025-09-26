import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const PageNotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-6 sm:px-0">
      <Navbar />
      <div className="bg-slate-900 p-10 rounded-lg shadow-lg w-full sm:w-96 text-indigo-300 text-sm">
        <h2 className="text-3xl font-semibold text-white text-center mb-3">Page Not Found</h2>
        <p className="text-center text-sm mb-6">
          Oops! The page you are looking for does not exist.
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-white font-medium cursor-pointer transition-transform duration-200 hover:scale-105 hover:bg-gradient-to-r hover:from-indigo-400 hover:to-indigo-800 hover:shadow-lg"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default PageNotFound;