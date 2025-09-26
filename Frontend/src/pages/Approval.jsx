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
  const [pendingUsers, setPendingUsers] = useState([]);
  const [acceptedUsers, setAcceptedUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [editUserId, setEditUserId] = useState(null);
  const [editName, setEditName] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState({ isOpen: false, userId: null });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || user?.userType !== 'admin') {
      toast.error('You are not authorized to access this page.');
      navigate('/login');
      return;
    }

    const fetchPendingUsers = async () => {
      try {
        const token = Cookies.get('token');
        console.log('Token:', token);
        if (!token) {
          throw new Error('No authentication token found.');
        }

        console.log('Fetching from:', `${backendUrl}/approval/pending`);
        const response = await axios.get(`${backendUrl}/approval/pending`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        console.log('Pending users response:', response.data);
        setPendingUsers(response.data);
      } catch (error) {
        console.error('Error fetching pending users:', error.message, error.response?.data, error.response?.status);
        toast.error(error.response?.data?.message || error.message || 'Failed to fetch pending users.');
        if (error.response?.status === 401) {
          logout();
        }
      }
    };

    fetchPendingUsers();
  }, [backendUrl, isAuthenticated, user, loading, navigate, logout]);

  useEffect(() => {
    if (activeTab !== 'Accepted') return;

    const fetchAcceptedUsers = async () => {
      try {
        const token = Cookies.get('token');
        console.log('Token:', token);
        if (!token) {
          throw new Error('No authentication token found.');
        }

        console.log('Fetching from:', `${backendUrl}/user`);
        const response = await axios.get(`${backendUrl}/user`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        console.log('Accepted users response:', response.data);
        setAcceptedUsers(response.data);
      } catch (error) {
        console.error('Error fetching accepted users:', error.message, error.response?.data, error.response?.status);
        toast.error(error.response?.data?.message || error.message || 'Failed to fetch accepted users.');
        if (error.response?.status === 401) {
          logout();
        }
      }
    };

    fetchAcceptedUsers();
  }, [activeTab, backendUrl, logout]);

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
      const updatedUser = pendingUsers.find(user => user._id === userId);
      if (updatedUser) {
        setPendingUsers(pendingUsers.filter(user => user._id !== userId));
        setAcceptedUsers([...acceptedUsers, { ...updatedUser, status: 'Accepted', isVerified: true }]);
      }
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

  const handleReject = async (userId, reason) => {
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
        data: { reason }, // Send reason in request body
      });
      toast.success(response.data.message);
      setPendingUsers(pendingUsers.filter(user => user._id !== userId));
      setAcceptedUsers(acceptedUsers.filter(user => user._id !== userId));
    } catch (error) {
      console.error('Error rejecting user:', error.message, error.response?.data, error.response?.status);
      toast.error(error.response?.data?.message || 'Failed to reject user.');
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setIsActionLoading(false);
      setRejectModal({ isOpen: false, userId: null });
      setRejectReason('');
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
      setPendingUsers(pendingUsers.map(user => user._id === userId ? { ...user, name: editName } : user));
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

  const openRejectModal = (userId) => {
    setRejectModal({ isOpen: true, userId });
    setRejectReason('');
  };

  const closeRejectModal = () => {
    setRejectModal({ isOpen: false, userId: null });
    setRejectReason('');
  };

  const combinedUsers = [
    ...pendingUsers,
    ...acceptedUsers.filter(acceptedUser => !pendingUsers.some(pendingUser => pendingUser._id === acceptedUser._id))
  ];

  const filteredUsers = activeTab === 'All'
    ? combinedUsers
    : activeTab === 'Pending'
      ? pendingUsers
      : acceptedUsers;

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
            {['All', 'Pending', 'Accepted'].map(tab => (
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
                    {editUserId === user._id && activeTab === 'Pending' ? (
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
                          {activeTab === 'Pending' && (
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
                        <p className="text-indigo-400"><strong>Pincode:</strong> {user.pincode}</p>
                        <p className="text-gray-400"><strong>Status:</strong> {user.status}</p>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {activeTab === 'Pending' && (
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
                        onClick={() => openRejectModal(user._id)}
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

      {/* Reject Reason Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-lg shadow-lg w-full sm:w-96 text-indigo-300 text-sm">
            <h3 className="text-xl font-semibold text-white mb-4">Reject User</h3>
            <p className="mb-4">Please provide a reason for rejecting this user:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-[#333A5C] text-white p-2 rounded border border-indigo-400 focus:outline-none mb-4"
              rows="4"
              placeholder="Enter rejection reason"
              disabled={isActionLoading}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleReject(rejectModal.userId, rejectReason)}
                className={`flex-1 py-2 rounded-full font-medium text-base transition-transform duration-200 transform hover:scale-105 hover:shadow-lg ${
                  isActionLoading || !rejectReason.trim()
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-500 to-red-900 text-white cursor-pointer'
                }`}
                disabled={isActionLoading || !rejectReason.trim()}
              >
                Submit
              </button>
              <button
                onClick={closeRejectModal}
                className={`flex-1 py-2 rounded-full font-medium text-base transition-transform duration-200 transform hover:scale-105 hover:shadow-lg ${
                  isActionLoading
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-gray-500 text-white cursor-pointer'
                }`}
                disabled={isActionLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approval;