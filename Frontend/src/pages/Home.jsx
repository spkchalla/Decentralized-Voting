import React from 'react';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import useAuth from '../context/useAuth';

const Home = () => {
  const { user, isAuthenticated, loading, error, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
        <Navbar />
        <Header />
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
      <Navbar />
      <Header />
      {/*
      <div className="mt-4 text-white text-center bg-slate-900 p-4 rounded-lg">
        <h3 className="text-lg font-semibold">User Information</h3>
        {error ? (
          <p className="text-red-400">{error}</p>
        ) : isAuthenticated && user ? (
          <>
            <p>ID: {user.id}</p>
            <p>Name: {user.name || 'Loading...'}</p>
            <p>Email: {user.email || 'Loading...'}</p>
            {user.userType !== 'admin' && <p>Voter ID: {user.voterId || 'Loading...'}</p>}
            {user.userType !== 'admin' && <p>Status: {user.status || 'Loading...'}</p>}
            <p>User Type: {user.userType}</p>
            <p>Issued At: {new Date(user.iat * 1000).toLocaleString()}</p>
            <p>Expires At: {new Date(user.exp * 1000).toLocaleString()}</p>
            <button
              onClick={logout}
              className="mt-4 w-full py-2.5 rounded-full bg-gradient-to-r from-red-500 to-red-900 text-white font-medium cursor-pointer hover:from-red-600 hover:to-red-950 transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <p>No user information available.</p>
        )}
      </div>*/}
    </div>
  );
};

export default Home;