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
    if (logout) {
      logout();
    }
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
      const response = await axios.post(`${backendUrl}/login/forgot-password`, { email: user.email });
      const { data, status } = response;
      if (status === 200 || data.success || data.message === 'OTP sent to email' || data.message === 'User registered, OTP sent') {
        toast.success('OTP sent to your email.');
        setShowDropdown(false);
        navigate('/otp-verification', { state: { purpose: 'reset', email: user.email, source: 'forgot-password' } });
      } else {
        toast.error(data.message || 'Failed to send OTP.');
      }
    } catch (error) {
      console.error('Error during forgot password:', error.response?.data, error.response?.status);
      toast.error(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

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
          <span className="text-indigo-300 text-base sm:text-lg font-semibold">Decentralized Voting</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 border border-gray-500 rounded-full px-3 py-1 text-gray-800 hover:bg-gray-100 transition-all text-base sm:text-lg cursor-pointer"
          >
            Login
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-800"
            >
              <polyline points="6,9 12,15 18,9"></polyline>
            </svg>
          </button>
        </div>
      </div>
    );
  }

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
        <span className="text-indigo-300 text-base sm:text-lg font-semibold">Decentralized Voting</span>
      </div>

      {user.userType === 'admin' && (
        <div className="flex items-center gap-4 sm:gap-6 text-indigo-300 text-base sm:text-lg font-medium">
          <button
            onClick={() => navigate('/candidates')}
            className={`relative cursor-pointer group transition-all duration-200 ${
              location.pathname === '/candidates' ? 'text-indigo-100 font-bold' : 'hover:text-indigo-100'
            }`}
          >
            Candidates
            <span
              className={`absolute left-0 bottom-0 h-[2px] bg-indigo-100 transition-all duration-300 ${
                location.pathname === '/candidates' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            ></span>
          </button>
          <button
            onClick={() => navigate('/parties')}
            className={`relative cursor-pointer group transition-all duration-200 ${
              location.pathname === '/parties' ? 'text-indigo-100 font-bold' : 'hover:text-indigo-100'
            }`}
          >
            Parties
            <span
              className={`absolute left-0 bottom-0 h-[2px] bg-indigo-100 transition-all duration-300 ${
                location.pathname === '/parties' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            ></span>
          </button>
          <button
            onClick={() => navigate('/approval')}
            className={`relative cursor-pointer group transition-all duration-200 ${
              location.pathname === '/approval' ? 'text-indigo-100 font-bold' : 'hover:text-indigo-100'
            }`}
          >
            Approval
            <span
              className={`absolute left-0 bottom-0 h-[2px] bg-indigo-100 transition-all duration-300 ${
                location.pathname === '/approval' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            ></span>
          </button>
          <button
            onClick={() => navigate('/admin')}
            className={`relative cursor-pointer group transition-all duration-200 ${
              location.pathname === '/admin' ? 'text-indigo-100 font-bold' : 'hover:text-indigo-100'
            }`}
          >
            Admin
            <span
              className={`absolute left-0 bottom-0 h-[2px] bg-indigo-100 transition-all duration-300 ${
                location.pathname === '/admin' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            ></span>
          </button>
          <button
            onClick={() => navigate('/elections')}
            className={`relative cursor-pointer group transition-all duration-200 ${
              location.pathname === '/elections' ? 'text-indigo-100 font-bold' : 'hover:text-indigo-100'
            }`}
          >
            Elections
            <span
              className={`absolute left-0 bottom-0 h-[2px] bg-indigo-100 transition-all duration-300 ${
                location.pathname === '/elections' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            ></span>
          </button>
        </div>
      )}

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
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-indigo-300 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
          >
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </div>
      </div>

      {showDropdown && (
        <div className="absolute top-full right-4 sm:right-12 mt-1 w-48 bg-slate-900 rounded-lg shadow-lg border border-slate-700 py-3 z-50 overflow-hidden">
          <button
            onClick={handleViewProfile}
            className="w-full text-left px-4 py-2 text-indigo-300 hover:bg-indigo-600 hover:text-white hover:underline transition-all duration-200 text-base cursor-pointer"
          >
            View Profile
          </button>
          <button
            onClick={handleChangePassword}
            disabled={isLoading}
            className={`w-full text-left px-4 py-2 text-indigo-300 hover:bg-indigo-600 hover:text-white hover:underline transition-all duration-200 text-base ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {isLoading ? 'Sending OTP...' : 'Change Password'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-indigo-300 hover:bg-indigo-600 hover:text-white hover:underline transition-all duration-200 text-base cursor-pointer"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

const Candidate = () => {
  const { user, isAuthenticated, loading, error: authError } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [parties, setParties] = useState([]);
  const [view, setView] = useState('all');
  const [sortById, setSortById] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCandidate, setCurrentCandidate] = useState({
    id: null,
    name: '',
    party: '',
  });
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!loading && isAuthenticated && user?.userType === 'admin') {
      fetchParties();
      fetchCandidates();
    }
  }, [view, sortById, loading, isAuthenticated, user]);

  const fetchParties = async () => {
    try {
      const token = Cookies.get('token');
      const { data } = await axios.get(`${backendUrl}/party/active`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      });
      setParties(data.parties || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching parties:', error);
      setError(
        error.response?.data?.message || 'Failed to fetch parties. Please try again.'
      );
    }
  };

  const fetchCandidates = async () => {
    try {
      const endpoint = view === 'active' ? '/candidate/active' : '/candidate/all';
      const token = Cookies.get('token');
      const { data } = await axios.get(`${backendUrl}${endpoint}`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      });
      setCandidates(
        data.candidates.map((c) => ({
          id: c._id,
          candidateId: c.candidate_id || c._id,
          name: c.name,
          party: c.party?._id || '',
          symbol: c.party?.symbol || '',
          active: c.status === 1,
        }))
      );
      setError(null);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      setError(
        error.response?.data?.message || 'Failed to fetch candidates. Please try again.'
      );
    }
  };

  const openAddModal = () => {
    setIsEdit(false);
    setCurrentCandidate({ id: null, name: '', party: '' });
    setModalOpen(true);
    setError(null);
  };

  const openEditModal = (candidate) => {
    setIsEdit(true);
    setCurrentCandidate({ id: candidate.id, name: candidate.name, party: candidate.party });
    setModalOpen(true);
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentCandidate((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { name: currentCandidate.name, party: currentCandidate.party };
      const token = Cookies.get('token');
      if (isEdit) {
        await axios.put(`${backendUrl}/candidate/edit/${currentCandidate.id}`, payload, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${backendUrl}/candidate/add`, payload, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      fetchCandidates();
      setModalOpen(false);
      setError(null);
    } catch (error) {
      console.error('Error saving candidate:', error);
      setError(
        error.response?.data?.message ||
          `Failed to ${isEdit ? 'update' : 'add'} candidate. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) {
      return;
    }
    setIsSubmitting(true);
    try {
      const token = Cookies.get('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      await axios.delete(`${backendUrl}/candidate/${id}`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCandidates();
      setError(null);
    } catch (error) {
      console.error('Error deleting candidate:', error);
      setError(
        error.response?.data?.message || 'Failed to delete candidate. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDisplayedCandidates = () => {
    let list = [...candidates];
    if (view === 'active') list = list.filter((c) => c.active);
    if (sortById) list.sort((a, b) => a.candidateId.localeCompare(b.candidateId));
    return list;
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!isAuthenticated || user?.userType !== 'admin') {
    return (
      <div className="p-4 text-center text-red-500">
        {authError || 'Access denied. Admins only.'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="p-4 bg-white rounded-lg shadow-md max-w-7xl mx-auto mt-20">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">Candidate Management</h1>
        </div>
        {(error || authError) && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error || authError}
          </div>
        )}
        <nav className="flex space-x-4 mb-6">
          <button
            onClick={() => {
              setView('all');
              setSortById(false);
            }}
            className={`px-4 py-2 rounded ${
              view === 'all' && !sortById ? 'bg-blue-500 text-white' : 'bg-gray-200'
            } hover:bg-blue-600 hover:text-white transition-colors cursor-pointer disabled:opacity-50`}
            disabled={isSubmitting}
          >
            All
          </button>
          <button
            onClick={() => {
              setView('active');
              setSortById(false);
            }}
            className={`px-4 py-2 rounded ${
              view === 'active' && !sortById ? 'bg-blue-500 text-white' : 'bg-gray-200'
            } hover:bg-blue-600 hover:text-white transition-colors cursor-pointer disabled:opacity-50`}
            disabled={isSubmitting}
          >
            Active
          </button>
          <button
            onClick={() => setSortById((prev) => !prev)}
            className={`px-4 py-2 rounded ${
              sortById ? 'bg-blue-500 text-white' : 'bg-gray-200'
            } hover:bg-blue-600 hover:text-white transition-colors cursor-pointer disabled:opacity-50`}
            disabled={isSubmitting}
          >
            Sort By ID
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded bg-green-500 text-white ml-auto hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50"
            disabled={isSubmitting}
          >
            Add Candidate
          </button>
        </nav>

        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Candidate ID</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Party Name</th>
              <th className="p-2 border">Symbol</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {getDisplayedCandidates().map((candidate) => (
              <tr key={candidate.id}>
                <td className="p-2 border">{candidate.candidateId}</td>
                <td className="p-2 border">{candidate.name}</td>
                <td className="p-2 border">
                  {parties.find((p) => p._id === candidate.party)?.name || 'Unknown'}
                </td>
                <td className="p-2 border">{candidate.symbol}</td>
                <td className="p-2 border">{candidate.active ? 'Active' : 'Inactive'}</td>
                <td className="p-2 border flex space-x-2">
                  <button
                    onClick={() => openEditModal(candidate)}
                    className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors cursor-pointer disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(candidate.id)}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
              <h2 className="text-lg font-bold mb-4">
                {isEdit ? 'Edit Candidate' : 'Add Candidate'}
              </h2>
              {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  name="name"
                  value={currentCandidate.name}
                  onChange={handleInputChange}
                  placeholder="Candidate Name"
                  className="w-full p-2 mb-3 border border-gray-300 rounded"
                  required
                />
                <select
                  name="party"
                  value={currentCandidate.party}
                  onChange={handleInputChange}
                  className="w-full p-2 mb-3 border border-gray-300 rounded"
                  required
                >
                  <option value="">Select Party</option>
                  {parties.map((party) => (
                    <option key={party._id} value={party._id}>
                      {party.name}
                    </option>
                  ))}
                </select>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors cursor-pointer disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isEdit ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Candidate;