import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuth from '../context/useAuth';
import { assets } from '../assets/assets';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const handleLogout = () => {
    if (logout) logout();
    setShowDropdown(false);
    navigate('/login');
  };

  const handleViewProfile = () => {
    navigate('/profile');
    setShowDropdown(false);
  };

  const handleChangePassword = async () => {
    if (isLoading) return;

    if (!user?.email) {
      toast.error('User email not available. Please log in again.');
      navigate('/login');
      return;
    }

    setIsLoading(true);

    try {
      axios.defaults.withCredentials = true;
      const response = await axios.post(`${backendUrl}/login/forgot-password`, {
        email: user.email,
      });

      const { data, status } = response;
      if (
        status === 200 ||
        data.success ||
        data.message === 'OTP sent to email' ||
        data.message === 'User registered, OTP sent'
      ) {
        toast.success('OTP sent to your email.');
        setShowDropdown(false);
        navigate('/otp-verification', {
          state: {
            purpose: 'reset',
            email: user.email,
            source: 'forgot-password',
          },
        });
      } else {
        toast.error(data.message || 'Failed to send OTP.');
      }
    } catch (error) {
      console.error('Error during forgot password:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDropdown = () => setShowDropdown(!showDropdown);

  // Navbar (Not logged in)
  if (!isAuthenticated || !user) {
    return (
      <div className="w-full flex justify-between items-center p-2 sm:p-3 sm:px-12 absolute top-0">
        <div className="flex items-center gap-2">
          <img
            src={assets.vote_image}
            alt="Logo"
            className="w-12 sm:w-16 cursor-pointer"
            onClick={() => navigate('/')}
          />
          <span className="text-indigo-300 text-base sm:text-lg font-semibold">
            Decentralized Voting
          </span>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 border border-gray-500 rounded-full px-3 py-1 text-gray-800 bg-white hover:bg-gray-100 transition-all text-base sm:text-lg cursor-pointer"
        >
          Login
        </button>
      </div>
    );
  }

  // Initial letter in circle
  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="w-full flex justify-between items-center p-2 sm:p-3 sm:px-12 absolute top-0 bg-slate-900/80 backdrop-blur-sm z-20">
      <div className="flex items-center gap-2">
        <img
          src={assets.vote_image}
          alt="Logo"
          className="w-12 sm:w-16 cursor-pointer"
          onClick={() => navigate('/')}
        />
        <span className="text-indigo-300 text-base sm:text-lg font-semibold">
          Decentralized Voting
        </span>
      </div>

      {/* Admin Navigation Menu */}
      {user.userType === 'admin' && (
        <div className="flex items-center gap-4 sm:gap-6 text-indigo-300 text-base sm:text-lg font-medium">
          {['candidates', 'parties', 'approval', 'admin', 'elections'].map((path) => (
            <button
              key={path}
              onClick={() => navigate(`/${path}`)}
              className={`relative cursor-pointer group transition-all duration-200 ${
                location.pathname === `/${path}`
                  ? 'text-indigo-100 font-bold'
                  : 'hover:text-indigo-100'
              }`}
            >
              {path.charAt(0).toUpperCase() + path.slice(1)}
              <span
                className={`absolute left-0 bottom-0 h-[2px] bg-indigo-100 transition-all duration-300 ${
                  location.pathname === `/${path}` ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center gap-2 text-indigo-300">
        <span className="text-base sm:text-lg hidden sm:block">Welcome,</span>
        <span className="text-base sm:text-lg font-medium hidden sm:block">{user.name}</span>

        {user.userType === 'admin' && (
          <span className="text-sm sm:text-base bg-indigo-600 text-white px-2 py-1 rounded-full">
            Admin
          </span>
        )}

        <div className="flex items-center gap-2 cursor-pointer" onClick={toggleDropdown}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white text-base sm:text-lg font-medium">
            {initial}
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full right-4 sm:right-12 mt-1 w-48 bg-slate-900 rounded-lg shadow-lg border border-slate-700 py-3 z-50">
          <button
            onClick={handleViewProfile}
            className="w-full text-left px-4 py-2 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all text-base"
          >
            View Profile
          </button>

          <button
            onClick={handleChangePassword}
            disabled={isLoading}
            className={`w-full text-left px-4 py-2 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all text-base ${
              isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {isLoading ? 'Sending OTP...' : 'Change Password'}
          </button>

          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all text-base"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};



// ---------------------------------------------
// ⭐ BEGIN PARTY COMPONENT
// ---------------------------------------------

const Party = () => {
  const { user, isAuthenticated, loading, error: authError, logout } = useAuth();
  const [parties, setParties] = useState([]);
  const [view, setView] = useState('all');
  const [sortById, setSortById] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentParty, setCurrentParty] = useState({
    id: null,
    name: '',
    symbol: '',
  });

  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!loading && isAuthenticated && user?.userType === 'admin') {
      fetchParties();
    }
  }, [view, sortById, loading, isAuthenticated, user]);

  const fetchParties = async () => {
    try {
      const endpoint = view === 'active' ? '/party/active' : '/party/all';
      const token = Cookies.get('token');

      const { data } = await axios.get(`${backendUrl}${endpoint}`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      });

      setParties(
        data.parties.map((p) => ({
          id: p._id,
          partyId: p.party_id || p._id,
          name: p.name,
          symbol: p.symbol,
          active: p.status === 1,
        }))
      );

      setError(null);
    } catch (error) {
      console.error('Error fetching parties:', error);
      setError(error.response?.data?.message || 'Failed to fetch parties.');

      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      }
    }
  };
  const openAddModal = () => {
    setIsEdit(false);
    setCurrentParty({ id: null, name: '', symbol: '' });
    setModalOpen(true);
    setError(null);
  };

  const openEditModal = (party) => {
    setIsEdit(true);
    setCurrentParty({ ...party });
    setModalOpen(true);
    setError(null);
  };

  const handleInputChange = (e) => {
    setCurrentParty((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentParty.name || !currentParty.symbol) {
      toast.error('All fields are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: currentParty.name,
        symbol: currentParty.symbol,
      };

      const token = Cookies.get('token');
      if (!token) throw new Error('No authentication token found.');

      if (isEdit) {
        await axios.put(`${backendUrl}/party/edit/${currentParty.id}`, payload, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        });

        toast.success('Party updated successfully.');
      } else {
        await axios.post(`${backendUrl}/party/add`, payload, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        });

        toast.success('Party added successfully.');
      }

      fetchParties();
      setModalOpen(false);
      setCurrentParty({ id: null, name: '', symbol: '' });
      setError(null);
    } catch (error) {
      console.error('Error saving party:', error);
      setError(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'add'} party.`);

      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this party?')) return;

    setIsSubmitting(true);

    try {
      const token = Cookies.get('token');
      if (!token) throw new Error('No authentication token found.');

      await axios.delete(`${backendUrl}/party/${id}`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Party deleted successfully.');
      fetchParties();
      setError(null);
    } catch (error) {
      console.error('Error deleting party:', error);
      setError(error.response?.data?.message || 'Failed to delete party.');

      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDisplayedParties = () => {
    let list = [...parties];

    if (view === 'active') list = list.filter((p) => p.active);
    if (sortById) list.sort((a, b) => a.partyId.localeCompare(b.partyId));

    return list;
  };

  // -------------- LOADING SCREEN --------------
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
        <Navbar />
        <p className="text-white pt-20">Loading...</p>
      </div>
    );
  }

  // -------------- ACCESS DENIED --------------
  if (!isAuthenticated || user?.userType !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
        <Navbar />
        <p className="text-red-400 pt-20">
          {authError || 'Access denied. Admins only.'}
        </p>
      </div>
    );
  }

  // ------------------------------------------------------
  // ⭐ MAIN PARTY UI — MATCHED TO ADMIN PAGE STYLE
  // ------------------------------------------------------
  return (
    <div className="min-h-screen px-6 sm:px-0 bg-slate-950">
      <Navbar />

      <div className="flex items-center justify-center pt-28">
        <div className="bg-slate-900 p-12 rounded-lg shadow-lg w-full sm:w-[900px] text-indigo-300 text-base">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-4xl font-semibold text-white">Party Management</h2>

            <button
              onClick={openAddModal}
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-full font-medium text-base transition-transform duration-200 transform hover:scale-105 hover:shadow-lg ${
                isSubmitting
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-indigo-900 text-white cursor-pointer'
              }`}
            >
              Add Party
            </button>
          </div>

          {/* FILTER BUTTONS */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => {
                setView('all');
                setSortById(false);
              }}
              className={`px-4 py-2 rounded-full font-medium text-base transition-transform duration-200 hover:scale-105 hover:shadow-lg ${
                view === 'all' && !sortById
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-900 text-white'
                  : 'bg-gray-500 text-white'
              } ${isSubmitting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={isSubmitting}
            >
              All
            </button>

            <button
              onClick={() => {
                setView('active');
                setSortById(false);
              }}
              className={`px-4 py-2 rounded-full font-medium text-base transition-transform duration-200 hover:scale-105 hover:shadow-lg ${
                view === 'active' && !sortById
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-900 text-white'
                  : 'bg-gray-500 text-white'
              } ${isSubmitting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={isSubmitting}
            >
              Active
            </button>

            <button
              onClick={() => setSortById((prev) => !prev)}
              className={`px-4 py-2 rounded-full font-medium text-base transition-transform duration-200 hover:scale-105 hover:shadow-lg ${
                sortById
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-900 text-white'
                  : 'bg-gray-500 text-white'
              } ${isSubmitting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={isSubmitting}
            >
              Sort By ID
            </button>
          </div>

          {/* ERROR MESSAGE */}
          {(error || authError) && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded">
              {error || authError}
            </div>
          )}

          {/* PARTY TABLE */}
          {parties.length === 0 ? (
            <p className="text-center text-gray-400">No parties found.</p>
          ) : (
            <div className="overflow-x-auto mt-6">
              <table className="w-full min-w-[800px] text-left">
                <thead>
                  <tr className="text-indigo-100">
                    <th className="p-4">Party ID</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Symbol</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {getDisplayedParties().map((party) => (
                    <tr
                      key={party.id}
                      className="bg-[#333A5C] border-b border-slate-700"
                    >
                      <td className="p-4">{party.partyId}</td>
                      <td className="p-4">{party.name}</td>
                      <td className="p-4">{party.symbol}</td>
                      <td className="p-4">
                        {party.active ? 'Active' : 'Inactive'}
                      </td>

                      <td className="p-4 flex gap-2 flex-wrap">
                        <button
                          onClick={() => openEditModal(party)}
                          className={`text-indigo-400 underline text-base transition-colors duration-200 hover:text-indigo-200 ${
                            isSubmitting ? 'cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          disabled={isSubmitting}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(party.id)}
                          disabled={isSubmitting}
                          className={`px-3 py-1 rounded-full font-medium text-base transition-transform duration-200 hover:scale-105 hover:shadow-lg ${
                            isSubmitting
                              ? 'bg-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-red-500 to-red-900 text-white cursor-pointer'
                          }`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Modal */}
          {modalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-slate-900 p-8 rounded-lg shadow-lg w-full sm:w-[500px] text-indigo-300 text-base">
                <h3 className="text-2xl font-semibold text-white text-center mb-4">
                  {isEdit ? 'Edit Party' : 'Add Party'}
                </h3>

                {error && (
                  <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Party Name Input */}
                  <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
                    <img src={assets.person_icon} alt="" />
                    <input
                      type="text"
                      name="name"
                      value={currentParty.name}
                      onChange={handleInputChange}
                      placeholder="Party Name"
                      className="bg-transparent outline-none text-base text-white w-full"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Symbol Input */}
                  <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
                    <img src={assets.mail_icon || assets.person_icon} alt="" />
                    <input
                      type="text"
                      name="symbol"
                      value={currentParty.symbol}
                      onChange={handleInputChange}
                      placeholder="Symbol"
                      className="bg-transparent outline-none text-base text-white w-full"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`px-4 py-2 rounded-full font-medium text-base transition-transform duration-200 hover:scale-105 hover:shadow-lg ${
                        isSubmitting
                          ? 'bg-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-indigo-500 to-indigo-900 text-white cursor-pointer'
                      }`}
                    >
                      {isSubmitting
                        ? isEdit
                          ? 'Updating...'
                          : 'Adding...'
                        : isEdit
                        ? 'Update'
                        : 'Add'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      disabled={isSubmitting}
                      className={`px-4 py-2 rounded-full font-medium text-base transition-transform duration-200 hover:scale-105 hover:shadow-lg ${
                        isSubmitting
                          ? 'bg-gray-500 cursor-not-allowed'
                          : 'bg-gray-500 text-white cursor-pointer'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom spacing to match Admin page */}
      <div className="h-6"></div>
    </div>
  );
};

export default Party;