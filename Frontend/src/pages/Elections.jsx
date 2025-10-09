import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import useAuth from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Define the base API URL (replace with process.env.REACT_APP_API_URL in production)
const API_BASE_URL = 'http://localhost:5000'; // Example base URL, adjust as needed
const ELECTION_API_BASE = `${API_BASE_URL}/election`;

// Error Boundary Component
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
            className="mt-2 py-1 px-3 rounded bg-gradient-to-r from-indigo-500 to-indigo-900 text-white"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Elections = () => {
  const { user, isAuthenticated, loading, error } = useAuth();
  const navigate = useNavigate();
  const [elections, setElections] = useState([]); // Ensure initial state is an empty array
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
  const [selectedElection, setSelectedElection] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated && user?.userType === 'admin') {
      fetchElections();
    }
  }, [isAuthenticated, user]);

  const fetchElections = async () => {
    try {
      const response = await axios.get(ELECTION_API_BASE);
      // Ensure response.data.elections is an array
      setElections(Array.isArray(response.data.elections) ? response.data.elections : []);
    } catch (err) {
      console.error('Fetch elections error:', err);
      setErrorMessage('Failed to fetch elections');
      setElections([]); // Reset to empty array on error
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCreateElection = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${ELECTION_API_BASE}/create`, formData);
      setSuccessMessage(response.data.message);
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
      setShowForm(false);
      fetchElections();
    } catch (err) {
      console.error('Create election error:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to create election');
    }
  };

  const handleUpdateElection = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${ELECTION_API_BASE}/update/${selectedElection.eid}`, formData);
      setSuccessMessage(response.data.message);
      setSelectedElection(null);
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
      setShowForm(false);
      fetchElections();
    } catch (err) {
      console.error('Update election error:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to update election');
    }
  };

  const handleDeleteElection = async (eid) => {
    if (window.confirm('Are you sure you want to delete this election?')) {
      try {
        const response = await axios.delete(`${ELECTION_API_BASE}/${eid}`);
        setSuccessMessage(response.data.message);
        fetchElections();
      } catch (err) {
        console.error('Delete election error:', err);
        setErrorMessage(err.response?.data?.message || 'Failed to delete election');
      }
    }
  };

  const handleViewResults = async (eid) => {
    try {
      const response = await axios.get(`${ELECTION_API_BASE}/${eid}/results`);
      navigate(`/election-results/${eid}`, { state: { results: response.data } });
    } catch (err) {
      console.error('View results error:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to fetch election results');
    }
  };

  const handleUpdateStatus = async (eid) => {
    try {
      const response = await axios.patch(`${ELECTION_API_BASE}/${eid}/status`);
      setSuccessMessage(response.data.message);
      fetchElections();
    } catch (err) {
      console.error('Update status error:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to update election status');
    }
  };

  const handleEditElection = (election) => {
    try {
      setSelectedElection(election);
      setFormData({
        eid: election.eid || '',
        title: election.title || '',
        description: election.description || '',
        startDateTime: election.startDateTime ? new Date(election.startDateTime).toISOString().slice(0, 16) : '',
        endDateTime: election.endDateTime ? new Date(election.endDateTime).toISOString().slice(0, 16) : '',
        users: Array.isArray(election.users) ? election.users.map(u => u._id || u) : [],
        candidates: Array.isArray(election.candidates) ? election.candidates.map(c => c.candidate?._id || c.candidate || '') : [],
        officers: Array.isArray(election.officers) ? election.officers.map(o => o._id || o) : [],
      });
      setShowForm(true);
    } catch (err) {
      console.error('Edit election error:', err);
      setErrorMessage('Failed to load election data for editing');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
        <Navbar />
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || user?.userType !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
        <Navbar />
        <p className="text-red-400 mt-4">Access denied. Admins only.</p>
      </div>
    );
  }

  return (
    <ElectionErrorBoundary>
      <div className="flex flex-col min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
        <Navbar />
        <div className="flex flex-col items-center justify-center flex-grow">
          <div className="w-full max-w-4xl bg-slate-900 p-4 sm:p-6 rounded-lg shadow-lg">
            <h3 className="text-lg sm:text-xl font-semibold text-indigo-300 mb-4">Elections</h3>
            
            {errorMessage && <p className="text-red-400 mb-4">{errorMessage}</p>}
            {successMessage && <p className="text-green-400 mb-4">{successMessage}</p>}

            <div className="flex flex-col items-center justify-center">
              <button
                onClick={() => setShowForm(!showForm)}
                className="mb-4 py-2.5 px-4 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-white font-medium cursor-pointer transition-transform duration-200 hover:scale-105 hover:bg-gradient-to-r hover:from-indigo-400 hover:to-indigo-800"
              >
                {showForm ? 'Close Form' : 'Create New Election'}
              </button>

              {showForm && (
                <form onSubmit={selectedElection ? handleUpdateElection : handleCreateElection} className="space-y-4 w-full max-w-md">
                  <div>
                    <label className="text-indigo-300">Election ID</label>
                    <input
                      type="text"
                      name="eid"
                      value={formData.eid}
                      onChange={handleInputChange}
                      className="w-full p-2 mt-1 rounded bg-slate-800 text-white"
                      required
                      disabled={!!selectedElection}
                    />
                  </div>
                  <div>
                    <label className="text-indigo-300">Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full p-2 mt-1 rounded bg-slate-800 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-indigo-300">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full p-2 mt-1 rounded bg-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-indigo-300">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      name="startDateTime"
                      value={formData.startDateTime}
                      onChange={handleInputChange}
                      className="w-full p-2 mt-1 rounded bg-slate-800 text-white"
                      required
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
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-white font-medium cursor-pointer transition-transform duration-200 hover:scale-105 hover:bg-gradient-to-r hover:from-indigo-400 hover:to-indigo-800"
                  >
                    {selectedElection ? 'Update Election' : 'Create Election'}
                  </button>
                </form>
              )}
            </div>

            <div className="mt-6">
              <h4 className="text-indigo-300 font-medium mb-2">All Elections</h4>
              {elections.length === 0 ? (
                <p className="text-white">No elections found.</p>
              ) : (
                <div className="space-y-4">
                  {elections.map((election) => (
                    <div key={election.eid} className="p-4 bg-slate-800 rounded-lg">
                      <p><span className="text-indigo-300">ID:</span> {election.eid}</p>
                      <p><span className="text-indigo-300">Title:</span> {election.title}</p>
                      <p><span className="text-indigo-300">Status:</span> {election.status}</p>
                      <p><span className="text-indigo-300">Start:</span> {new Date(election.startDateTime).toLocaleString()}</p>
                      <p><span className="text-indigo-300">End:</span> {new Date(election.endDateTime).toLocaleString()}</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEditElection(election)}
                          className={`py-1 px-3 rounded bg-gradient-to-r from-blue-500 to-blue-900 text-white ${election.status !== 'Not Yet Started' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={election.status !== 'Not Yet Started'}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteElection(election.eid)}
                          className={`py-1 px-3 rounded bg-gradient-to-r from-red-500 to-red-900 text-white ${election.status !== 'Not Yet Started' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={election.status !== 'Not Yet Started'}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => handleViewResults(election.eid)}
                          className={`py-1 px-3 rounded bg-gradient-to-r from-green-500 to-green-900 text-white ${election.status !== 'Finished' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={election.status !== 'Finished'}
                        >
                          View Results
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(election.eid)}
                          className="py-1 px-3 rounded bg-gradient-to-r from-yellow-500 to-yellow-900 text-white"
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