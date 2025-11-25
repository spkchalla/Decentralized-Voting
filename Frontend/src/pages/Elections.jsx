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
// Modal Components
// ---------------------------------------------------------------------------
const Modal = ({ children, onClose, size = "md" }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div
      className={`bg-slate-900 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-hidden border border-slate-700 animate-scaleIn ${size === "lg" ? "max-w-4xl" :
        size === "md" ? "max-w-2xl" :
          "max-w-lg"
        }`}
    >
      {children}
    </div>
  </div>
);

const ModalHeader = ({ children, onClose }) => (
  <div className="flex justify-between items-center p-6 border-b border-slate-700">
    <div className="text-xl font-bold text-white">{children}</div>
    <button
      onClick={onClose}
      className="text-slate-400 hover:text-white transition-colors cursor-pointer text-2xl"
    >
      ×
    </button>
  </div>
);

const ModalBody = ({ children, className = "" }) => (
  <div className={`p-6 overflow-y-auto ${className}`}>
    {children}
  </div>
);

const ModalFooter = ({ children }) => (
  <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
    {children}
  </div>
);

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
    pincodes: '',
    password: '',
    users: [],
    candidates: [],
    officers: [],
  });
  const [initialFormData, setInitialFormData] = useState(null);
  const [selectedElection, setSelectedElection] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationData, setValidationData] = useState(null);
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
    if (!formData.eid || !formData.title || !formData.startDateTime || !formData.endDateTime || !formData.password) {
      toast.error('Please fill all required fields including password');
      return;
    }
    setIsActionLoading(true);
    try {
      const payload = {
        ...formData,
        pinCodes: formData.pincodes.split(',').map((p) => p.trim()).filter((p) => p),
      };
      const { data } = await api.post('/election/create', payload);
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
        {
          ...formData,
          pinCodes: formData.pincodes.split(',').map((p) => p.trim()).filter((p) => p),
        }
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
      const election = elections.find(e => e.eid === eid);
      if (election?.status?.toLowerCase() !== 'finished') {
        toast.error(`Cannot view results - Election is ${election?.status}. Results are only available for Finished elections.`);
        return;
      }

      const { data } = await api.get(`/election/${eid}/results`);
      navigate(`/election-results/${eid}`, { state: { results: data } });
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to load results');
    }
  };

  const handleViewValidationDetails = async (eid) => {
    try {
      const election = elections.find(e => e.eid === eid);
      if (election?.status?.toLowerCase() !== 'finished') {
        toast.error(`Cannot run tally - Election is ${election?.status}. Tally can only be run on Finished elections.`);
        return;
      }

      setIsActionLoading(true);
      // Run tally to get detailed validation
      const password = prompt('Enter election password to run tally:');
      if (!password) {
        setIsActionLoading(false);
        return;
      }

      const electionId = elections.find(e => e.eid === eid)?._id;
      const { data } = await api.post('/admin/tally/run', {
        electionId,
        electionPassword: password
      });

      if (data.success) {
        setValidationData(data);
        setShowValidationModal(true);
        toast.success('Tally completed! View validation details.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to run tally');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateStatus = async (eid) => {
    try {
      setIsActionLoading(true);
      const election = elections.find(e => e.eid === eid);
      if (!election) {
        toast.error('Election not found');
        return;
      }

      const { data } = await api.patch(`/election/${election._id}/status`);
      toast.success(data.message || 'Status updated successfully');
      fetchElections();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleForceFinish = async (eid) => {
    if (!window.confirm('⚠️ Force finish this election?\n\nThis will immediately set the election status to "Finished" regardless of the end time. This action cannot be undone.\n\nProceed?')) {
      return;
    }

    try {
      setIsActionLoading(true);
      const election = elections.find(e => e.eid === eid);
      if (!election) {
        toast.error('Election not found');
        return;
      }

      const { data } = await api.patch(`/election/${election._id}/force-finish`);
      toast.success(data.message || 'Election forcefully finished');
      fetchElections();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to force finish election');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleForceStart = async (eid) => {
    if (!window.confirm('⚡ Force start this election?\n\nThis will immediately set the election status to "Active" and set the start time to NOW. Users will be able to vote immediately.\n\nProceed?')) {
      return;
    }

    try {
      setIsActionLoading(true);
      const election = elections.find(e => e.eid === eid);
      if (!election) {
        toast.error('Election not found');
        return;
      }

      const { data } = await api.patch(`/election/${election._id}/force-start`);
      toast.success(data.message || 'Election forcefully started');
      fetchElections();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to force start election');
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
      pincodes: Array.isArray(election.pinCodes) ? election.pinCodes.join(', ') : '',
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
      pincodes: '',
      password: '',
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
  // Fill Default Data for Testing
  // -------------------------------------------------------------------------
  const handleFillDefault = () => {
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 2 days from now

    setFormData((prev) => ({
      ...prev,
      eid: `ELE${Date.now()}`.toUpperCase(),
      title: 'Test Election - ' + new Date().toLocaleDateString(),
      description: 'This is a test election created for testing purposes. Please vote for your preferred candidate.',
      startDateTime: startDate.toISOString().slice(0, 16),
      endDateTime: endDate.toISOString().slice(0, 16),
      pincodes: '500001, 500002, 500003',
      password: 'TestPass123'
    }));
    toast.info('Default values filled! Please select candidates.');
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
      formData.pincodes !== initialFormData.pincodes ||
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

  const getFilteredElections = () => {
    const now = new Date();
    return elections.filter((election) => {
      const start = new Date(election.startDateTime);
      const end = new Date(election.endDateTime);
      const status = election.status?.toLowerCase();

      if (filterStatus === 'Ongoing') {
        return (start <= now && end > now) || status === 'active';
      }
      if (filterStatus === 'Upcoming') {
        return start > now && status !== 'active' && status !== 'finished';
      }
      if (filterStatus === 'Completed') {
        return end <= now || status === 'finished';
      }
      return true;
    });
  };

  const filteredElectionsList = getFilteredElections();

  const openDetailModal = (election) => {
    setSelectedElection(election);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setSelectedElection(null);
    setShowDetailModal(false);
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
        <div className="flex flex-col items-center justify-start flex-grow pt-24 px-4 sm:px-6">
          <div className="w-full max-w-7xl bg-slate-900/90 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
              <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                Elections Management
              </h3>
              <button
                onClick={() => setShowForm(true)}
                disabled={isActionLoading}
                className={`py-2.5 px-6 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg transition-all duration-300 ${isActionLoading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105 hover:shadow-indigo-500/50 hover:from-indigo-500 hover:to-purple-500'
                  }`}
              >
                + Create New Election
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-700 pb-2">
              {['All', 'Ongoing', 'Upcoming', 'Completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-t-lg font-medium transition-colors duration-200 cursor-pointer ${filterStatus === status
                    ? 'bg-indigo-600 text-white border-b-2 border-indigo-400'
                    : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Create / Edit form modal */}
            {showForm && (
              <Modal onClose={handleCloseForm} size="md">
                <ModalHeader onClose={handleCloseForm}>
                  <div className="flex items-center justify-between w-full mr-8">
                    <span>{selectedElection ? 'Edit Election' : 'Create New Election'}</span>
                    {!selectedElection && (
                      <button
                        type="button"
                        onClick={handleFillDefault}
                        disabled={isActionLoading}
                        className="ml-4 px-4 py-1.5 text-sm rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium shadow-md hover:from-cyan-500 hover:to-blue-500 transition-all duration-200 cursor-pointer"
                      >
                        Fill Default
                      </button>
                    )}
                  </div>
                </ModalHeader>
                <ModalBody className="max-h-[70vh]">
                  <form
                    onSubmit={selectedElection ? handleUpdateElection : handleCreateElection}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-indigo-300 mb-1">Election ID</label>
                        <input
                          type="text"
                          name="eid"
                          value={formData.eid}
                          onChange={handleInputChange}
                          className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          required
                          disabled={!!selectedElection || isActionLoading}
                          placeholder="E.g., ELE-2023-001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-indigo-300 mb-1">Title</label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          required
                          disabled={isActionLoading}
                          placeholder="Election Title"
                        />
                      </div>
                    </div>

                    {!selectedElection && (
                      <div>
                        <label className="block text-sm font-medium text-indigo-300 mb-1">Election Password</label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          required
                          disabled={isActionLoading}
                          placeholder="Secure password for election encryption"
                        />
                        <p className="text-xs text-slate-400 mt-1">Required for generating encryption keys. Keep it safe!</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-indigo-300 mb-1">Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-h-[100px]"
                        disabled={isActionLoading}
                        placeholder="Describe the election..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-indigo-300 mb-1">Allowed Pincodes (Comma separated)</label>
                      <input
                        type="text"
                        name="pincodes"
                        value={formData.pincodes}
                        onChange={handleInputChange}
                        className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        required
                        disabled={isActionLoading}
                        placeholder="e.g. 500001, 500002"
                      />
                      <p className="text-xs text-slate-400 mt-1">Only users with these pincodes can vote.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-indigo-300 mb-1">Start Date & Time</label>
                        <input
                          type="datetime-local"
                          name="startDateTime"
                          value={formData.startDateTime}
                          onChange={handleInputChange}
                          className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          required
                          disabled={isActionLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-indigo-300 mb-1">End Date & Time</label>
                        <input
                          type="datetime-local"
                          name="endDateTime"
                          value={formData.endDateTime}
                          onChange={handleInputChange}
                          className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          required
                          disabled={isActionLoading}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-indigo-300 mb-1">Candidates</label>
                      <div className="relative" ref={dropdownRef}>
                        <input
                          type="text"
                          placeholder="Search and select candidates..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onFocus={() => setIsDropdownOpen(true)}
                          className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          disabled={isActionLoading}
                        />
                        {isDropdownOpen && (
                          <div className="absolute z-10 w-full max-h-60 overflow-y-auto bg-slate-800 rounded-lg mt-1 shadow-xl border border-slate-600">
                            {filteredCandidates.length === 0 ? (
                              <p className="p-3 text-gray-400 text-center">No candidates found.</p>
                            ) : (
                              filteredCandidates.map((c) => (
                                <div
                                  key={c._id}
                                  className={`p-3 cursor-pointer hover:bg-slate-700 flex items-center transition-colors ${formData.candidates.includes(c._id) ? 'bg-slate-700' : ''
                                    }`}
                                  onClick={() => handleCandidateSelect(c._id)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={formData.candidates.includes(c._id)}
                                    onChange={() => handleCandidateSelect(c._id)}
                                    className="mr-3 h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                    disabled={isActionLoading}
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-white font-medium">{c.name}</span>
                                    <span className="text-xs text-gray-400">
                                      ID: {c.candidate_id} | Party: {c.party.name} ({c.party.symbol})
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {formData.candidates.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {formData.candidates.map((id) => {
                            const cand = candidates.find((c) => c._id === id);
                            return cand ? (
                              <span key={id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-900/50 text-indigo-200 border border-indigo-700/50">
                                {cand.name}
                                <button
                                  type="button"
                                  onClick={() => handleCandidateSelect(id)}
                                  className="ml-2 text-indigo-400 hover:text-white focus:outline-none"
                                  disabled={isActionLoading}
                                >
                                  ✕
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </form>
                </ModalBody>
                <ModalFooter>
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    disabled={isActionLoading}
                    className="px-5 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={selectedElection ? handleUpdateElection : handleCreateElection}
                    disabled={isActionLoading}
                    className={`px-6 py-2.5 rounded-lg font-medium text-white shadow-lg transition-all duration-300 cursor-pointer ${isActionLoading
                      ? 'bg-slate-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/30'
                      }`}
                  >
                    {isActionLoading
                      ? selectedElection
                        ? 'Updating...'
                        : 'Creating...'
                      : selectedElection
                        ? 'Update Election'
                        : 'Create Election'}
                  </button>
                </ModalFooter>
              </Modal>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedElection && (
              <Modal onClose={closeDetailModal} size="lg">
                <ModalHeader onClose={closeDetailModal}>
                  {selectedElection.title}
                </ModalHeader>
                <ModalBody className="max-h-[70vh]">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-900 text-indigo-200 border border-indigo-700">
                        ID: {selectedElection.eid}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${selectedElection.status === 'Active' ? 'bg-green-900 text-green-200 border-green-700' :
                        selectedElection.status === 'Finished' ? 'bg-red-900 text-red-200 border-red-700' :
                          'bg-yellow-900 text-yellow-200 border-yellow-700'
                        }`}>
                        {selectedElection.status}
                      </span>
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                      <h4 className="text-lg font-semibold text-indigo-300 mb-2">Description</h4>
                      <p className="text-slate-300 leading-relaxed">{selectedElection.description || 'No description provided.'}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-1">Start Time</h4>
                        <p className="text-white font-mono text-lg">{new Date(selectedElection.startDateTime).toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-1">End Time</h4>
                        <p className="text-white font-mono text-lg">{new Date(selectedElection.endDateTime).toLocaleString()}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-indigo-300 mb-3">Candidates ({selectedElection.candidates?.length || 0})</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedElection.candidates && selectedElection.candidates.length > 0 ? (
                          selectedElection.candidates.map((c, idx) => {
                            const cand = c.candidate || c; // Handle populated or raw ID
                            return (
                              <div key={idx} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                                  {cand.name ? cand.name.charAt(0) : '?'}
                                </div>
                                <div>
                                  <p className="font-medium text-white">{cand.name || 'Unknown'}</p>
                                  <p className="text-xs text-slate-400">{cand.candidate_id}</p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-slate-400 italic">No candidates assigned.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </ModalBody>
              </Modal>
            )}

            {/* Confirmation Popup */}
            {showConfirmPopup && (
              <Modal onClose={() => setShowConfirmPopup(false)} size="sm">
                <ModalHeader onClose={() => setShowConfirmPopup(false)}>
                  Unsaved Changes
                </ModalHeader>
                <ModalBody>
                  <p className="text-slate-300">
                    You have unsaved changes. Are you sure you want to close?
                  </p>
                </ModalBody>
                <ModalFooter>
                  <button
                    onClick={() => setShowConfirmPopup(false)}
                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Keep Editing
                  </button>
                  <button
                    onClick={confirmCloseForm}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors cursor-pointer"
                  >
                    Discard Changes
                  </button>
                </ModalFooter>
              </Modal>
            )}

            {/* Validation Details Modal */}
            {showValidationModal && validationData && (
              <Modal onClose={() => setShowValidationModal(false)} size="lg">
                <ModalHeader onClose={() => setShowValidationModal(false)}>
                  Vote Validation Details
                </ModalHeader>
                <ModalBody className="max-h-[70vh]">
                  {/* Results Summary */}
                  {validationData.winner && (
                    <div className="mb-6 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-xl border border-indigo-500/30 p-5">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-2xl">🏆</span> Election Results
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Winner Card */}
                        <div className="bg-slate-900/60 rounded-lg p-4 border border-indigo-500/30 flex flex-col items-center justify-center text-center">
                          <span className="text-indigo-300 text-sm uppercase tracking-wider font-semibold mb-2">Winner</span>
                          <div className="text-2xl font-bold text-white mb-1">{validationData.winner.name}</div>
                          <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                            {validationData.winner.voteCount} Votes
                          </div>
                        </div>

                        {/* Margin Card */}
                        <div className="bg-slate-900/60 rounded-lg p-4 border border-purple-500/30 flex flex-col items-center justify-center text-center">
                          <span className="text-purple-300 text-sm uppercase tracking-wider font-semibold mb-2">Victory Margin</span>
                          <div className="text-4xl font-black text-white mb-1">+{validationData.winner.margin}</div>
                          <div className="text-sm text-slate-400">votes ahead of runner-up</div>
                        </div>
                      </div>

                      {/* Candidate Table */}
                      <div className="mt-6 overflow-hidden rounded-lg border border-slate-700">
                        <table className="w-full text-left text-sm text-slate-300">
                          <thead className="bg-slate-900/80 text-xs uppercase font-semibold text-slate-400">
                            <tr>
                              <th className="px-4 py-3">Rank</th>
                              <th className="px-4 py-3">Candidate</th>
                              <th className="px-4 py-3 text-right">Votes</th>
                              <th className="px-4 py-3 text-right">% Share</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700 bg-slate-800/40">
                            {validationData.results.map((candidate, index) => {
                              const totalValidVotes = validationData.statistics.validVotes;
                              const percentage = totalValidVotes > 0
                                ? ((candidate.voteCount / totalValidVotes) * 100).toFixed(1)
                                : 0;

                              return (
                                <tr key={candidate._id} className={index === 0 ? "bg-indigo-900/20" : ""}>
                                  <td className="px-4 py-3 font-mono">
                                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-white">{candidate.name}</td>
                                  <td className="px-4 py-3 text-right font-bold">{candidate.voteCount}</td>
                                  <td className="px-4 py-3 text-right text-slate-400">{percentage}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Statistics Summary */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-center">
                      <div className="text-2xl font-bold text-white">{validationData.statistics.totalVotesProcessed}</div>
                      <div className="text-sm text-slate-400">Total Votes</div>
                    </div>
                    <div className="bg-green-900/20 p-4 rounded-lg border border-green-700/50 text-center">
                      <div className="text-2xl font-bold text-green-400">{validationData.statistics.validVotes}</div>
                      <div className="text-sm text-green-300">Valid</div>
                    </div>
                    <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-700/50 text-center">
                      <div className="text-2xl font-bold text-yellow-400">{validationData.statistics.duplicateVotes}</div>
                      <div className="text-sm text-yellow-300">Duplicate</div>
                    </div>
                    <div className="bg-red-900/20 p-4 rounded-lg border border-red-700/50 text-center">
                      <div className="text-2xl font-bold text-red-400">{validationData.statistics.invalidVotes}</div>
                      <div className="text-sm text-red-300">Invalid</div>
                    </div>
                  </div>

                  {/* Vote Details List */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white mb-3">Vote Breakdown:</h3>
                    {validationData.voteDetails.map((vote, index) => (
                      <details key={index} className="bg-slate-800/50 rounded-lg border border-slate-700">
                        <summary className="cursor-pointer p-4 hover:bg-slate-700/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm text-slate-400">
                                #{index + 1}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${vote.status === 'Valid' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                                vote.status === 'Duplicate' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' :
                                  'bg-red-900/50 text-red-300 border border-red-700'
                                }`}>
                                {vote.status}
                              </span>
                              <span className="text-sm text-slate-300">{vote.reason}</span>
                            </div>
                            <span className="text-xs text-slate-500 font-mono">
                              CID: {vote.cid.substring(0, 12)}...
                            </span>
                          </div>
                        </summary>
                        <div className="p-4 border-t border-slate-700 space-y-3">
                          {/* Basic Info */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-slate-400">Full CID:</span>
                              <p className="font-mono text-xs text-white break-all">{vote.cid}</p>
                            </div>
                            {vote.candidateName && (
                              <div>
                                <span className="text-slate-400 ">Voted For:</span>
                                <p className="font-medium text-white">{vote.candidateName}</p>
                              </div>
                            )}
                          </div>

                          {/* Technical Details */}
                          {vote.technicalDetails && (
                            <div className="mt-4 p-3 bg-slate-900/50 rounded border border-slate-600">
                              <h4 className="text-sm font-semibold text-indigo-300 mb-2">Technical Details:</h4>
                              <div className="space-y-2 text-xs">
                                {vote.technicalDetails.tokenHash && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Token Hash:</span>
                                    <span className="font-mono text-slate-300">{vote.technicalDetails.tokenHash}</span>
                                  </div>
                                )}
                                {vote.technicalDetails.publicKeyHash && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Public Key Hash:</span>
                                    <span className="font-mono text-slate-300">{vote.technicalDetails.publicKeyHash}</span>
                                  </div>
                                )}
                                {vote.technicalDetails.registrationId && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Registration ID:</span>
                                    <span className="font-mono text-slate-300">{vote.technicalDetails.registrationId}</span>
                                  </div>
                                )}
                                {vote.technicalDetails.signatureVerified !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Signature Verified:</span>
                                    <span className={vote.technicalDetails.signatureVerified ? 'text-green-400' : 'text-red-400'}>
                                      {vote.technicalDetails.signatureVerified ? '✓ Yes' : '✗ No'}
                                    </span>
                                  </div>
                                )}
                                {vote.technicalDetails.decryptionMethod && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Decryption:</span>
                                    <span className="text-slate-300">{vote.technicalDetails.decryptionMethod}</span>
                                  </div>
                                )}
                                {vote.technicalDetails.previouslyVoted !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Previously Voted:</span>
                                    <span className={vote.technicalDetails.previouslyVoted ? 'text-yellow-400' : 'text-green-400'}>
                                      {vote.technicalDetails.previouslyVoted ? '⚠ Yes' : '✓ No'}
                                    </span>
                                  </div>
                                )}
                                {vote.technicalDetails.actualIssue && (
                                  <div className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded">
                                    <span className="text-red-400 font-semibold block mb-1">🔍 Actual Issue:</span>
                                    <p className="text-red-300 text-xs">{vote.technicalDetails.actualIssue}</p>
                                  </div>
                                )}
                                {vote.technicalDetails.technicalExplanation && (
                                  <div className="mt-2 p-3 bg-slate-950/50 border border-slate-600 rounded">
                                    <span className="text-cyan-400 font-semibold block mb-2">🔬 Technical Explanation:</span>
                                    <p className="text-slate-300 text-xs leading-relaxed">{vote.technicalDetails.technicalExplanation}</p>
                                  </div>
                                )}
                                {vote.technicalDetails.securityImplication && (
                                  <div className="mt-2 p-2 bg-orange-900/20 border border-orange-700/30 rounded">
                                    <span className="text-orange-400 font-semibold block mb-1">⚠️ Security Implication:</span>
                                    <p className="text-orange-300 text-xs font-medium">{vote.technicalDetails.securityImplication}</p>
                                  </div>
                                )}
                                {vote.technicalDetails.suggestion && (
                                  <div className="mt-2 p-2 bg-blue-900/20 border border-blue-700/30 rounded">
                                    <span className="text-blue-400 font-semibold block mb-1">💡 Suggestion:</span>
                                    <p className="text-blue-300 text-xs">{vote.technicalDetails.suggestion}</p>
                                  </div>
                                )}
                                {vote.technicalDetails.fullProvidedPubKeyHash && (
                                  <div className="mt-2 p-2 bg-slate-800 rounded border border-slate-600">
                                    <span className="text-slate-400 text-xs block mb-1">Full Provided Public Key Hash:</span>
                                    <code className="text-yellow-300 text-xs font-mono break-all block">{vote.technicalDetails.fullProvidedPubKeyHash}</code>
                                  </div>
                                )}
                                {vote.technicalDetails.fullExpectedPubKeyHash && (
                                  <div className="mt-2 p-2 bg-slate-800 rounded border border-slate-600">
                                    <span className="text-slate-400 text-xs block mb-1">Full Expected Public Key Hash:</span>
                                    <code className="text-green-300 text-xs font-mono break-all block">{vote.technicalDetails.fullExpectedPubKeyHash}</code>
                                  </div>
                                )}
                                {vote.technicalDetails.debugInfo && (
                                  <div className="mt-2 p-2 bg-indigo-900/20 border border-indigo-700/30 rounded">
                                    <span className="text-indigo-400 font-semibold block mb-2 text-xs">🐛 Debug Information:</span>
                                    <div className="space-y-1 text-xs">
                                      {Object.entries(vote.technicalDetails.debugInfo).map(([key, value]) => (
                                        <div key={key} className="flex justify-between">
                                          <span className="text-slate-400">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                          <span className="text-indigo-200 font-mono text-xs">{typeof value === 'boolean' ? (value ? '✓' : '✗') : value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {vote.technicalDetails.registeredUserId && (
                                  <div className="flex justify-between mt-1">
                                    <span className="text-slate-400">Registered User ID:</span>
                                    <span className="font-mono text-slate-300 text-xs">{vote.technicalDetails.registeredUserId}</span>
                                  </div>
                                )}
                                {vote.technicalDetails.expectedTokenHash && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Expected Token:</span>
                                    <span className="font-mono text-yellow-300">{vote.technicalDetails.expectedTokenHash}</span>
                                  </div>
                                )}
                                {vote.technicalDetails.expectedPublicKeyHash && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Expected PubKey:</span>
                                    <span className="font-mono text-yellow-300">{vote.technicalDetails.expectedPublicKeyHash}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </ModalBody>
                <ModalFooter>
                  <button
                    onClick={() => setShowValidationModal(false)}
                    className="px-6 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all duration-200 cursor-pointer"
                  >
                    Close
                  </button>
                </ModalFooter>
              </Modal>
            )}

            {/* Elections Grid */}
            <div className="mt-6">
              {filteredElectionsList.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700 border-dashed">
                  <p className="text-slate-400 text-lg">No elections found for this category.</p>
                  <button
                    onClick={() => setFilterStatus('All')}
                    className="mt-2 text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    View all elections
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredElectionsList.map((election) => (
                    <div
                      key={election.eid}
                      className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col group"
                    >
                      <div className="p-5 flex-grow">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-mono text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded">{election.eid}</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider ${election.status?.toLowerCase() === 'active' ? 'bg-green-900/50 text-green-400 border border-green-800' :
                            election.status?.toLowerCase() === 'finished' ? 'bg-red-900/50 text-red-400 border border-red-800' :
                              'bg-yellow-900/50 text-yellow-400 border border-yellow-800'
                            }`}>
                            {election.status}
                          </span>
                        </div>

                        <h4 className="text-xl font-bold text-white mb-2 line-clamp-1" title={election.title}>{election.title}</h4>
                        <p className="text-slate-400 text-sm mb-4 line-clamp-2 min-h-[2.5em]">{election.description || 'No description available.'}</p>

                        <div className="space-y-2 text-sm text-slate-300">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            <span>Start: {new Date(election.startDateTime).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>End: {new Date(election.endDateTime).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900/50 p-4 border-t border-slate-700">
                        <button
                          onClick={() => openDetailModal(election)}
                          className="text-sm font-medium text-indigo-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer mb-3"
                        >
                          View Details
                        </button>

                        <div className="flex flex-wrap gap-2">
                          {/* Edit Button */}
                          <div className="group/btn relative flex items-center">
                            <button
                              onClick={() => handleEditElection(election)}
                              disabled={election.status?.toLowerCase() !== 'not yet started' || isActionLoading}
                              className={`p-2 rounded-lg transition-all duration-300 flex items-center gap-2 overflow-hidden cursor-pointer ${election.status?.toLowerCase() !== 'not yet started'
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'text-blue-400 hover:bg-blue-900/30 hover:w-auto'
                                }`}
                              title="Edit"
                            >
                              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                              <span className="max-w-0 opacity-0 group-hover/btn:max-w-xs group-hover/btn:opacity-100 transition-all duration-300 whitespace-nowrap">Edit</span>
                            </button>
                          </div>

                          {/* Delete Button */}
                          <div className="group/btn relative flex items-center">
                            <button
                              onClick={() => handleDeleteElection(election.eid)}
                              disabled={election.status?.toLowerCase() !== 'not yet started' || isActionLoading}
                              className={`p-2 rounded-lg transition-all duration-300 flex items-center gap-2 overflow-hidden cursor-pointer ${election.status?.toLowerCase() !== 'not yet started'
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'text-red-400 hover:bg-red-900/30 hover:w-auto'
                                }`}
                              title="Delete"
                            >
                              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                              <span className="max-w-0 opacity-0 group-hover/btn:max-w-xs group-hover/btn:opacity-100 transition-all duration-300 whitespace-nowrap">Delete</span>
                            </button>
                          </div>

                          {/* Results Button */}
                          <div className="group/btn relative flex items-center">
                            <button
                              onClick={() => handleViewResults(election.eid)}
                              disabled={isActionLoading}
                              className="p-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-green-400 hover:bg-green-900/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title="View Results"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                              <span className="ml-1">Results</span>
                            </button>
                          </div>

                          {/* Validation Details Button */}
                          <div className="group/btn relative flex items-center">
                            <button
                              onClick={() => handleViewValidationDetails(election.eid)}
                              disabled={isActionLoading}
                              className="p-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-purple-400 hover:bg-purple-900/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title="View Validation Details"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              <span className="ml-1">Validation</span>
                            </button>
                          </div>

                          {/* Status Button */}
                          <div className="group/btn relative flex items-center">
                            <button
                              onClick={() => handleUpdateStatus(election.eid)}
                              disabled={isActionLoading}
                              className="p-2 rounded-lg text-yellow-400 hover:bg-yellow-900/30 transition-colors duration-200 flex items-center gap-2 cursor-pointer"
                              title="Update Status"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                              <span className="ml-1">Status</span>
                            </button>
                          </div>

                          {/* Force Start Button */}
                          <div className="group/btn relative flex items-center">
                            <button
                              onClick={() => handleForceStart(election.eid)}
                              disabled={election.status?.toLowerCase() !== 'not yet started' || isActionLoading}
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-2 ${election.status?.toLowerCase() !== 'not yet started'
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer shadow-lg'
                                }`}
                              title="Force Start Election"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              <span>START NOW</span>
                            </button>
                          </div>

                          {/* Force Finish Button - PROMINENT */}
                          <div className="group/btn relative flex items-center">
                            <button
                              onClick={() => handleForceFinish(election.eid)}
                              disabled={election.status?.toLowerCase() === 'finished' || isActionLoading}
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-2 ${election.status?.toLowerCase() === 'finished'
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-lg'
                                }`}
                              title="Force Finish Election"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path></svg>
                              <span>END ELECTION</span>
                            </button>
                          </div>
                        </div>
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
