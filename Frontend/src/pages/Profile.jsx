import React from 'react';
import Navbar from '../components/Navbar';
import useAuth from '../context/useAuth';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, error, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
        <Navbar />
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
      <Navbar />
      <div className="mt-4 text-white text-center bg-slate-900 p-4 sm:p-6 rounded-lg shadow-lg w-full sm:w-96">
        <h3 className="text-lg sm:text-xl font-semibold text-indigo-300">User Profile</h3>
        {error ? (
          <p className="text-red-400 mt-4">{error}</p>
        ) : isAuthenticated && user ? (
          <div className="text-sm sm:text-base mt-4 space-y-2">
            <p><span className="font-medium text-indigo-300">ID:</span> {user.id}</p>
            <p><span className="font-medium text-indigo-300">Name:</span> {user.name || 'N/A'}</p>
            <p><span className="font-medium text-indigo-300">Email:</span> {user.email || 'N/A'}</p>
            {user.userType !== 'admin' && (
              <p><span className="font-medium text-indigo-300">Voter ID:</span> {user.voterId || 'N/A'}</p>
            )}
            {user.userType !== 'admin' && (
              <p><span className="font-medium text-indigo-300">Status:</span> {user.status || 'N/A'}</p>
            )}
            <p><span className="font-medium text-indigo-300">User Type:</span> {user.userType}</p>
            <p><span className="font-medium text-indigo-300">Issued At:</span> {new Date(user.iat * 1000).toLocaleString()}</p>
            <p><span className="font-medium text-indigo-300">Expires At:</span> {new Date(user.exp * 1000).toLocaleString()}</p>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => navigate('/')}
                className="w-full py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-white font-medium cursor-pointer transition-transform duration-200 hover:scale-105 hover:bg-gradient-to-r hover:from-indigo-400 hover:to-indigo-800 hover:shadow-lg"
              >
                Go to Dashboard
              </button>
              <button
                onClick={logout}
                className="w-full py-2.5 rounded-full bg-gradient-to-r from-red-500 to-red-900 text-white font-medium cursor-pointer transition-transform duration-200 hover:scale-105 hover:bg-gradient-to-r hover:from-red-600 hover:to-red-950 hover:shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <p className="text-indigo-300 mt-4">No user information available.</p>
        )}
      </div>
    </div>
  );
};

export default Profile;