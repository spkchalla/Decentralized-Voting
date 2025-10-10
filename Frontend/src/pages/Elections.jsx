import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import useAuth from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

// ---------------------------------------------------------------------------
// API base URLs
// ---------------------------------------------------------------------------
const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const ELECTION_API_BASE = `${API_BASE_URL}/election`;
const CANDIDATE_API_BASE = `${API_BASE_URL}/candidate/active`;

// ---------------------------------------------------------------------------
// Axios instance – token injection + global 401 handling
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('token');
      toast.error('Session expired – please log in again.');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------
class ElectionErrorBoundary extends React.Component {
  state = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-red-400 text-center p-4">
          <p>Something went wrong: {this.state.errorMessage}</p>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            className="mt-2 py-1 px-3 rounded bg-gradient-to-r from-indigo-500 to-indigo-900 text-white cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:from-indigo-400 hover:to-indigo-800"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const Elections = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();

  // UI state
  const [elections, setElections] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    eid: '',
    title: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
    users: [],
    candidates: [],
    officers: [],
  });
  const [initialFormData, setInitialFormData] = useState(null);
  const [selectedElection, setSelectedElection] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const dropdownRef = useRef(null);

  // -------------------------------------------------------------------------
  // Auth guard – runs only on mount / auth changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || user?.userType !== 'admin') {
      toast.error('You are not authorized to access this page.');
      navigate('/login');
      return;
    }
    fetchElections();
    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, loading, navigate]);

  // -------------------------------------------------------------------------
  // Click-outside handler for candidate dropdown
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // -------------------------------------------------------------------------
  // Set initial form data when form opens
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (showForm) {
      setInitialFormData({ ...formData });
    }
  }, [showForm]);

  // -------------------------------------------------------------------------
  // API calls
  // -------------------------------------------------------------------------
  const fetchElections = async () => {
    try {
      const { data } = await api.get('/election');
      setElections(Array.isArray(data.elections) ? data.elections : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load elections');
      setElections([]);
    }
  };

  const fetchCandidates = async () => {
    try {
      const { data } = await api.get('/candidate/active');
      setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load candidates');
      setCandidates([]);
    }
  };

  const handleCreateElection = async (e) => {
    e.preventDefault();
    if (!formData.eid || !formData.title || !formData.startDateTime || !formData.endDateTime) {
      toast.error('Please fill all required fields');
      return;
    }
    setIsActionLoading(true);
    try {
      const { data } = await api.post('/election/create', formData);
      toast.success(data.message);
      resetForm();
      fetchElections();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create election');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateElection = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startDateTime || !formData.endDateTime) {
      toast.error('Title, start and end dates are required');
      return;
    }
    setIsActionLoading(true);
    try {
      const { data } = await api.put(
        `/election/update/${selectedElection.eid}`,
        formData
      );
      toast.success(data.message || 'Election updated');
      resetForm();
      fetchElections();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update election');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteElection = async (eid) => {
    if (!window.confirm('Delete this election?')) return;
    setIsActionLoading(true);
    try {
      const { data } = await api.delete(`/election/${eid}`);
      toast.success(data.message || 'Election deleted');
      fetchElections();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete election');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleViewResults = async (eid) => {
    try {
      const { data } = await api.get(`/election/${eid}/results`);
      navigate(`/election-results/${eid}`, { state: { results: data } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load results');
    }
  };

  const handleUpdateStatus = async (eid) => {
    setIsActionLoading(true);
    try {
      const { data } = await api.patch(`/election/${eid}/status`);
      toast.success(data.message || 'Status updated');
      fetchElections();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setIsActionLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Form helpers
  // -------------------------------------------------------------------------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCandidateSelect = (candidateId) => {
    setFormData((prev) => {
      const exists = prev.candidates.includes(candidateId);
      return {
        ...prev,
        candidates: exists
          ? prev.candidates.filter((id) => id !== candidateId)
          : [...prev.candidates, candidateId],
      };
    });
  };

  // Filter candidates based on search term and exclude those with same party_id or party_name as selected candidates
  const filteredCandidates = candidates.filter((c) => {
    // Check if candidate matches the search term
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.candidate_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.party.party_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.party.symbol.toLowerCase().includes(searchTerm.toLowerCase());

    // Get the party IDs and names of selected candidates
    const selectedCandidateParties = formData.candidates
      .map((id) => candidates.find((cand) => cand._id === id))
      .filter((cand) => cand) // Ensure candidate exists
      .map((cand) => ({
        party_id: cand.party.party_id,
        party_name: cand.party.name,
      }));

    // Exclude candidates with matching party_id or party_name
    const isPartyExcluded = selectedCandidateParties.some(
      (party) =>
        party.party_id === c.party.party_id || party.party_name === c.party.name
    );

    return matchesSearch && !isPartyExcluded;
  });

  const handleEditElection = (election) => {
    setSelectedElection(election);
    setFormData({
      eid: election.eid || '',
      title: election.title || '',
      description: election.description || '',
      startDateTime: election.startDateTime
        ? new Date(election.startDateTime).toISOString().slice(0, 16)
        : '',
      endDateTime: election.endDateTime
        ? new Date(election.endDateTime).toISOString().slice(0, 16)
        : '',
      users: Array.isArray(election.users)
        ? election.users.map((u) => u._id || u)
        : [],
      candidates: Array.isArray(election.candidates)
        ? election.candidates.map((c) => c.candidate?._id || c.candidate || '')
        : [],
      officers: Array.isArray(election.officers)
        ? election.officers.map((o) => o._id || o)
        : [],
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      eid: '',
      title: '',
      description: '',
      startDateTime: '',
      endDateTime: '',
      users: [],
      candidates: [],
      officers: [],
    });
    setSelectedElection(null);
    setShowForm(false);
    setShowConfirmPopup(false);
    setSearchTerm('');
    setIsDropdownOpen(false);
    setInitialFormData(null);
  };

  // -------------------------------------------------------------------------
  // Check if form has changes
  // -------------------------------------------------------------------------
  const hasFormChanged = () => {
    if (!initialFormData) return false;
    return (
      formData.eid !== initialFormData.eid ||
      formData.title !== initialFormData.title ||
      formData.description !== initialFormData.description ||
      formData.startDateTime !== initialFormData.startDateTime ||
      formData.endDateTime !== initialFormData.endDateTime ||
      JSON.stringify(formData.users) !== JSON.stringify(initialFormData.users) ||
      JSON.stringify(formData.candidates) !==
        JSON.stringify(initialFormData.candidates) ||
      JSON.stringify(formData.officers) !== JSON.stringify(initialFormData.officers)
    );
  };

  // -------------------------------------------------------------------------
  // Handle close form (Cancel button or cross mark)
  // -------------------------------------------------------------------------
  const handleCloseForm = () => {
    if (hasFormChanged()) {
      setShowConfirmPopup(true);
    } else {
      resetForm();
    }
  };

  // -------------------------------------------------------------------------
  // Confirm close form
  // -------------------------------------------------------------------------
  const confirmCloseForm = () => {
    resetForm();
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
        <Navbar />
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <ElectionErrorBoundary>
      <div className="flex flex-col min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
        <Navbar />
        <div className="flex flex-col items-center justify-center flex-grow">
          <div className="w-full max-w-4xl bg-slate-900 p-4 sm:p-6 rounded-lg shadow-lg">
            <h3 className="text-lg sm:text-xl font-semibold text-indigo-300 mb-4">
              Elections
            </h3>

            {/* ----------------------------------------------------------------- */}
            {/* Create / Edit form modal */}
            {/* ----------------------------------------------------------------- */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowForm(true)}
                disabled={isActionLoading}
                className={`mb-4 py-2.5 px-4 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-white font-medium transition-transform duration-200 ${
                  isActionLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:scale-105 hover:shadow-lg hover:from-indigo-400 hover:to-indigo-800'
                }`}
              >
                Create New Election
              </button>
            </div>

            {showForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-slate-900 p-8 rounded-lg shadow-lg w-full sm:w-[700px] text-indigo-300 max-h-[80vh] overflow-y-auto relative">
                  {/* Cross Mark */}
                  <button
                    onClick={handleCloseForm}
                    className="absolute top-4 right-4 text-white text-xl font-bold hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-110"
                    disabled={isActionLoading}
                  >
                    ✕
                  </button>

                  <h3 className="text-2xl font-semibold text-white text-center mb-4">
                    {selectedElection ? 'Edit Election' : 'Create New Election'}
                  </h3>

                  <form
                    onSubmit={
                      selectedElection ? handleUpdateElection : handleCreateElection
                    }
                    className="space-y-4"
                  >
                    {/* ----- Eid ----- */}
                    <div>
                      <label className="text-indigo-300">Election ID</label>
                      <input
                        type="text"
                        name="eid"
                        value={formData.eid}
                        onChange={handleInputChange}
                        className="w-full p-2 mt-1 rounded bg-slate-800 text-white"
                        required
                        disabled={!!selectedElection || isActionLoading}
                      />
                    </div>

                    {/* ----- Title ----- */}
                    <div>
                      <label className="text-indigo-300">Title</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="w-full p-2 mt-1 rounded bg-slate-800 text-white"
                        required
                        disabled={isActionLoading}
                      />
                    </div>

                    {/* ----- Description ----- */}
                    <div>
                      <label className="text-indigo-300">Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full p-2 mt-1 rounded bg-slate-800 text-white"
                        disabled={isActionLoading}
                      />
                    </div>

                    {/* ----- Dates ----- */}
                    <div>
                      <label className="text-indigo-300">Start Date & Time</label>
                      <input
                        type="datetime-local"
                        name="startDateTime"
                        value={formData.startDateTime}
                        onChange={handleInputChange}
                        className="w-full p-2 mt-1 rounded bg-slate-800 text-white"
                        required
                        disabled={isActionLoading}
                      />
                    </div>
                    <div>
                      <label className="text-indigo-300">End Date & Time</label>
                      <input
                        type="datetime-local"
                        name="endDateTime"
                        value={formData.endDateTime}
                        onChange={handleInputChange}
                        className="w-full p-2 mt-1 rounded bg-slate-800 text-white"
                        required
                        disabled={isActionLoading}
                      />
                    </div>

                    {/* ----- Candidates ----- */}
                    <div>
                      <label className="text-indigo-300">Candidates</label>
                      <div className="relative" ref={dropdownRef}>
                        <input
                          type="text"
                          placeholder="Search candidates..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onFocus={() => setIsDropdownOpen(true)}
                          className="w-full p-2 mt-1 rounded bg-slate-800 text-white"
                          disabled={isActionLoading}
                        />
                        {isDropdownOpen && (
                          <div className="absolute z-10 w-full max-h-60 overflow-y-auto bg-slate-800 rounded mt-1 shadow-lg">
                            {filteredCandidates.length === 0 ? (
                              <p className="p-2 text-gray-400">No candidates found.</p>
                            ) : (
                              filteredCandidates.map((c) => (
                                <div
                                  key={c._id}
                                  className={`p-2 cursor-pointer hover:bg-slate-700 flex items-center ${
                                    formData.candidates.includes(c._id) ? 'bg-slate-700' : ''
                                  }`}
                                  onClick={() => handleCandidateSelect(c._id)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={formData.candidates.includes(c._id)}
                                    onChange={() => handleCandidateSelect(c._id)}
                                    className="mr-2"
                                    disabled={isActionLoading}
                                  />
                                  <span className="text-white break-words">
                                    {c.candidate_id} - {c.name} ({c.party.party_id}: {c.party.name}, Symbol: {c.party.symbol})
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {formData.candidates.length > 0 && (
                        <div className="mt-2">
                          <p className="text-indigo-300">Selected:</p>
                          <ul className="list-disc pl-5 text-white">
                            {formData.candidates.map((id) => {
                              const cand = candidates.find((c) => c._id === id);
                              return cand ? (
                                <li key={id} className="flex items-center justify-between break-words">
                                  <span>
                                    {cand.candidate_id} - {cand.name} ({cand.party.party_id}: {cand.party.name}, Symbol: {cand.party.symbol})
                                  </span>
                                  <button
                                    onClick={() => handleCandidateSelect(id)}
                                    className="text-white hover:bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-110"
                                    disabled={isActionLoading}
                                  >
                                    ✕
                                  </button>
                                </li>
                              ) : null;
                            })}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* ----- Submit / Cancel ----- */}
                    <div className="flex gap-2 justify-end">
                      <button
                        type="submit"
                        disabled={isActionLoading}
                        className={`px-4 py-2 rounded-full font-medium transition-transform duration-200 ${
                          isActionLoading
                            ? 'bg-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-indigo-500 to-indigo-900 text-white cursor-pointer hover:scale-105 hover:shadow-lg hover:from-indigo-400 hover:to-indigo-800'
                        }`}
                      >
                        {isActionLoading
                          ? selectedElection
                            ? 'Updating...'
                            : 'Creating...'
                          : selectedElection
                            ? 'Update'
                            : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseForm}
                        disabled={isActionLoading}
                        className={`px-4 py-2 rounded-full font-medium transition-transform duration-200 ${
                          isActionLoading
                            ? 'bg-gray-500 cursor-not-allowed'
                            : 'bg-gray-500 text-white cursor-pointer hover:scale-105 hover:shadow-lg hover:bg-gray-600'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>

                {/* Confirmation Popup */}
                {showConfirmPopup && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-slate-900 p-6 rounded-lg shadow-lg w-full max-w-sm text-white">
                      <p className="text-center mb-4">
                        Your changes will not be saved. Do you want to close the form?
                      </p>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={confirmCloseForm}
                          className="px-4 py-2 rounded-full bg-gradient-to-r from-red-500 to-red-900 text-white cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:from-red-400 hover:to-red-800"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setShowConfirmPopup(false)}
                          className="px-4 py-2 rounded-full bg-gray-500 text-white cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-lg hover:bg-gray-600"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* Elections list */}
            {/* ----------------------------------------------------------------- */}
            <div className="mt-6">
              <h4 className="text-indigo-300 font-medium mb-2">All Elections</h4>

              {elections.length === 0 ? (
                <p className="text-white">No elections found.</p>
              ) : (
                <div className="space-y-4">
                  {elections.map((election) => (
                    <div
                      key={election.eid}
                      className="p-4 bg-slate-800 rounded-lg"
                    >
                      <p>
                        <span className="text-indigo-300">ID:</span> {election.eid}
                      </p>
                      <p>
                        <span className="text-indigo-300">Title:</span> {election.title}
                      </p>
                      <p>
                        <span className="text-indigo-300">Status:</span> {election.status}
                      </p>
                      <p>
                        <span className="text-indigo-300">Start:</span>{' '}
                        {new Date(election.startDateTime).toLocaleString()}
                      </p>
                      <p>
                        <span className="text-indigo-300">End:</span>{' '}
                        {new Date(election.endDateTime).toLocaleString()}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={() => handleEditElection(election)}
                          disabled={
                            election.status?.toLowerCase() !== 'not yet started' ||
                            isActionLoading
                          }
                          className={`py-1 px-3 rounded bg-gradient-to-r from-blue-500 to-blue-900 text-white transition-transform duration-200 ${
                            election.status?.toLowerCase() !== 'not yet started' ||
                            isActionLoading
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer hover:scale-105 hover:shadow-lg hover:from-blue-400 hover:to-blue-800'
                          }`}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteElection(election.eid)}
                          disabled={
                            election.status?.toLowerCase() !== 'not yet started' ||
                            isActionLoading
                          }
                          className={`py-1 px-3 rounded bg-gradient-to-r from-red-500 to-red-900 text-white transition-transform duration-200 ${
                            election.status?.toLowerCase() !== 'not yet started' ||
                            isActionLoading
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer hover:scale-105 hover:shadow-lg hover:from-red-400 hover:to-red-800'
                          }`}
                        >
                          Delete
                        </button>

                        <button
                          onClick={() => handleViewResults(election.eid)}
                          disabled={
                            election.status?.toLowerCase() !== 'finished' ||
                            isActionLoading
                          }
                          className={`py-1 px-3 rounded bg-gradient-to-r from-green-500 to-green-900 text-white transition-transform duration-200 ${
                            election.status?.toLowerCase() !== 'finished' ||
                            isActionLoading
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer hover:scale-105 hover:shadow-lg hover:from-green-400 hover:to-green-800'
                          }`}
                        >
                          View Results
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(election.eid)}
                          disabled={isActionLoading}
                          className={`py-1 px-3 rounded bg-gradient-to-r from-yellow-500 to-yellow-900 text-white transition-transform duration-200 ${
                            isActionLoading
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer hover:scale-105 hover:shadow-lg hover:from-yellow-400 hover:to-yellow-800'
                          }`}
                        >
                          Update Status
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ElectionErrorBoundary>
  );
};

export default Elections;