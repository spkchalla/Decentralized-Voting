// File: src/components/Header.jsx
import React from 'react';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="w-full flex justify-between items-center p-2 sm:p-3 sm:px-12 absolute top-0 bg-slate-900/80 backdrop-blur-sm z-20">
      <div className="flex items-center gap-2">
        <img
          onClick={() => navigate('/')}
          src={assets.vote_image}
          alt="Logo"
          className="w-12 sm:w-16 cursor-pointer"
        />
        <span className="text-indigo-300 text-base sm:text-lg font-semibold">
          Decentralized Voting
        </span>
      </div>
      {/* Right side left empty for pages like login */}
      <div></div>
    </header>
  );
};

export default Header;
