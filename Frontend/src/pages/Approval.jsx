import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import Cookies from 'js-cookie';
import { assets } from '../assets/assets';
import useAuth from '../context/useAuth';
import Navbar from '../components/Navbar';

const Approval = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, error, logout } = useAuth();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [editUserId, setEditUserId] = useState(null);
  const [editName, setEditName] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false); // Track loading state for actions

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || user?.userType !== 'admin') {
      toast.error('You are not authorized to access this page.');
      navigate('/login');
      return;
    }

    const fetchAllUsers = async () => {
      try {
        const token = Cookies.get('token');
        console.log('Token:', token);
        if (!token) {
          throw new Error('No authentication token found.');
        }

        console.log('Fetching from:', `${backendUrl}/user/`);
        const response = await axios.get(`${backendUrl}/user/`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        console.log('All users response:', response.data);
        setAllUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error.message, error.response?.data, error.response?.status);
        toast.error(error.response?.data?.message || error.message || 'Failed to fetch users.');
        if (error.response?.status === 401) {
          logout();
        }
      }
    };

    fetchAllUsers();
  }, [backendUrl, isAuthenticated, user, loading, navigate, logout]);

  const handleApprove = async (userId) => {
    setIsActionLoading(true);
    try {
      const token = Cookies.get('token');
      console.log('Approving user with token:', token);
      if (!token) {
        throw new Error('No authentication token found.');
      }

      const response = await axios.put(`${backendUrl}/approval/approve/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      toast.success(response.data.message);
      setAllUsers(allUsers.map(user => user._id === userId ? { ...user, status: 'Accepted', isVerified: true } : user));
    } catch (error) {
      console.error('Error approving user:', error.message, error.response?.data, error.response?.status);
      toast.error(error.response?.data?.message || 'Failed to approve user.');
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async (userId) => {
    setIsActionLoading(true);
    try {
      const token = Cookies.get('token');
      console.log('Rejecting user with token:', token);
      if (!token) {
        throw new Error('No authentication token found.');
      }

      const response = await axios.delete(`${backendUrl}/approval/reject/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      toast.success(response.data.message);
      setAllUsers(allUsers.map(user => user._id === userId ? { ...user, status: 'Rejected' } : user));
    } catch (error) {
      console.error('Error rejecting user:', error.message, error.response?.data, error.response?.status);
      toast.error(error.response?.data?.message || 'Failed to reject user.');
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateName = async (userId) => {
    setIsActionLoading(true);
    try {
      const token = Cookies.get('token');
      console.log('Updating name with token:', token);
      if (!token) {
        throw new Error('No authentication token found.');
      }
      if (!editName.trim()) {
        toast.error('Name cannot be empty.');
        return;
      }

      const response = await axios.put(`${backendUrl}/approval/update/${userId}`, { name: editName }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      toast.success(response.data.message);
      setAllUsers(allUsers.map(user => user._id === userId ? { ...user, name: editName } : user));
      setEditUserId(null);
      setEditName('');
    } catch (error) {
      console.error('Error updating name:', error.message, error.response?.data, error.response?.status);
      toast.error(error.response?.data?.message || 'Failed to update name.');
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const startEditing = (userId, currentName) => {
    setEditUserId(userId);
    setEditName(currentName);
  };

  const cancelEditing = () => {
    setEditUserId(null);
    setEditName('');
  };

  const filteredUsers = activeTab === 'All'
    ? allUsers
    : allUsers.filter(user => user.status === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <p className="text-white text-base">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 sm:px-0 bg-slate-950">
      <Navbar />
      <div className="flex items-center justify-center pt-28">
        <div className="bg-slate-900 p-12 rounded-lg shadow-lg w-full sm:w-[650px] text-indigo-300 text-base">
          <h2 className="text-4xl font-semibold text-white text-center mb-3">User Approvals</h2>
          <p className="text-center text-base mb-4">Review and manage user accounts.</p>

          <div className="flex justify-center mb-6">
            {['All', 'Pending', 'Rejected', 'Accepted'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 mx-1 rounded-full font-medium text-base transition-transform duration-200 transform hover:scale-105 hover:bg-[#4A517A] ${
                  isActionLoading
                    ? 'bg-gray-500 cursor-not-allowed'
                    : activeTab === tab
                      ? 'bg-gradient-to-r from-indigo-500 to-indigo-900 text-white cursor-pointer'
                      : 'bg-[#333A5C] text-indigo-300 cursor-pointer'
                }`}
                disabled={isActionLoading}
              >
                {tab}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-center text-red-400 mb-4">{error}</p>
          )}

          {filteredUsers.length === 0 ? (
            <p className="text-center text-gray-400">No {activeTab.toLowerCase()} users found.</p>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map(user => (
                <div key={user._id} className="bg-[#333A5C] p-4 rounded-lg flex justify-between items-center">
                  <div>
                    {editUserId === user._id && (activeTab === 'Pending' || activeTab === 'Rejected') ? (
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-transparent border border-indigo-400 rounded px-2 py-1 text-white text-base"
                          placeholder="Enter new name"
                          disabled={isActionLoading}
                        />
                        <button
                          onClick={() => handleUpdateName(user._id)}
                          className={`px-3 py-1 rounded-full font-medium text-base transition-transform duration-200 transform hover:scale-105 hover:shadow-lg ${
                            isActionLoading
                              ? 'bg-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-500 to-blue-900 text-white cursor-pointer'
                          }`}
                          disabled={isActionLoading}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className={`px-3 py-1 rounded-full font-medium text-base transition-transform duration-200 transform hover:scale-105 hover:shadow-lg ${
                            isActionLoading
                              ? 'bg-gray-500 cursor-not-allowed'
                              : 'bg-gray-500 text-white cursor-pointer'
                          }`}
                          disabled={isActionLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-white">
                          <strong>Name:</strong> {user.name}
                          {(activeTab === 'Pending' || activeTab === 'Rejected') && (
                            <button
                              onClick={() => startEditing(user._id, user.name)}
                              className={`ml-2 text-indigo-400 underline text-base transition-colors duration-200 hover:text-indigo-200 ${
                                isActionLoading ? 'cursor-not-allowed' : 'cursor-pointer'
                              }`}
                              disabled={isActionLoading}
                            >
                              Edit
                            </button>
                          )}
                        </p>
                        <p className="text-indigo-400"><strong>Email:</strong> {user.email}</p>
                        <p className="text-gray-400"><strong>Status:</strong> {user.status}</p>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {(activeTab === 'Pending' || activeTab === 'Rejected') && (
                      <button
                        onClick={() => handleApprove(user._id)}
                        className={`px-4 py-2 rounded-full font-medium text-base transition-transform duration-200 transform hover:scale-105 hover:shadow-lg ${
                          isActionLoading
                            ? 'bg-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-500 to-green-900 text-white cursor-pointer'
                        }`}
                        disabled={isActionLoading}
                      >
                        Approve
                      </button>
                    )}
                    {(activeTab === 'Pending' || activeTab === 'Accepted') && (
                      <button
                        onClick={() => handleReject(user._id)}
                        className={`px-4 py-2 rounded-full font-medium text-base transition-transform duration-200 transform hover:scale-105 hover:shadow-lg ${
                          isActionLoading
                            ? 'bg-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-red-500 to-red-900 text-white cursor-pointer'
                        }`}
                        disabled={isActionLoading}
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Approval;