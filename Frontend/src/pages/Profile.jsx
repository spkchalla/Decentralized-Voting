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
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-indigo-400 rounded-full mb-4"></div>
          <p className="text-white text-lg font-medium">Loading Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-slate-900/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-indigo-500/30">

          {/* Header Section with Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{user?.name || 'User Profile'}</h3>
            <p className="text-indigo-300 text-sm">{user?.email}</p>
          </div>

          {error ? (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-center">{error}</p>
            </div>
          ) : isAuthenticated && user ? (
            <div className="space-y-6">
              {/* User Details Grid */}
              <div className="space-y-4">
                {/* Voter ID - Show for everyone except admin (unless admin also has one) */}
                {user.userType !== 'admin' && (
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <span className="text-gray-400 text-sm">Voter ID</span>
                    <span className="text-white font-mono font-medium">{user.voterId || 'N/A'}</span>
                  </div>
                )}

                {/* Status - Show for everyone except admin */}
                {user.userType !== 'admin' && (
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <span className="text-gray-400 text-sm">Status</span>
                    <span className={`font-medium px-2 py-0.5 rounded text-sm ${user.status === 'Verified' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                      {user.status || 'Pending'}
                    </span>
                  </div>
                )}

                {/* User Type - ONLY show if Admin */}
                {user.userType === 'admin' && (
                  <div className="flex items-center justify-between p-3 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
                    <span className="text-indigo-300 text-sm">Role</span>
                    <span className="text-indigo-100 font-medium uppercase tracking-wider text-xs bg-indigo-600 px-2 py-1 rounded">
                      {user.userType}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-8 pt-6 border-t border-slate-700/50">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95"
                >
                  Dashboard
                </button>
                <button
                  onClick={logout}
                  className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all duration-200 hover:shadow-lg active:scale-95 border border-slate-600"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-center">No user information available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;