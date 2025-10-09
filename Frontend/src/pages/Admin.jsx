import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import Cookies from 'js-cookie';
import { assets } from '../assets/assets';
import useAuth from '../context/useAuth';
import Navbar from '../components/Navbar';

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const [admins, setAdmins] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteAdminId, setDeleteAdminId] = useState(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Super Admin');
  const [email, setEmail] = useState('');
  const [editAdminId, setEditAdminId] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || user?.userType !== 'admin') {
      toast.error('You are not authorized to access this page.');
      navigate('/login');
      return;
    }

    const fetchAdmins = async () => {
      try {
        const token = Cookies.get('token');
        console.log('Token for fetching admins:', token);
        if (!token) {
          throw new Error('No authentication token found.');
        }

        const response = await axios.get(`${backendUrl}/admin/`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        console.log('Fetch admins response:', response.data);
        if (!Array.isArray(response.data)) {
          console.error('Expected array but got:', response.data);
          toast.error('Invalid data format from server.');
          setAdmins([]);
          return;
        }
        const adminsWithEmail = response.data.map(admin => ({
          ...admin,
          emailId: admin.emailId || admin.email || 'N/A',
        }));
        setAdmins(adminsWithEmail);
      } catch (error) {
        console.error('Error fetching admins:', error.message, error.response?.data, error.response?.status);
        toast.error(error.response?.data?.message || 'Failed to fetch admins.');
        if (error.response?.status === 401) {
          logout();
        }
        setAdmins([]);
      }
    };

    fetchAdmins();
  }, [backendUrl, isAuthenticated, user, loading, navigate, logout]);

  const handleAddAdmin = async (e) => {
    e.preventDefault();

    if (!name || !email || !role) {
      toast.error('All fields are required.');
      return;
    }

    setIsActionLoading(true);
    try {
      const token = Cookies.get('token');
      console.log('Token for adding admin:', token);
      if (!token) {
        throw new Error('No authentication token found.');
      }

      const response = await axios.post(
        `${backendUrl}/admin/add`,
        { name, role, emailId: email },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      console.log('Add admin response:', response.data);
      toast.success(response.data.message);
      setAdmins([...admins, { _id: response.data.adminId, emp_id: response.data.emp_id, name, role, emailId: email }]);
      setIsModalOpen(false);
      setName('');
      setRole('Super Admin');
      setEmail('');
    } catch (error) {
      console.error('Error adding admin:', error.message, error.response?.data, error.response?.status);
      toast.error(error.response?.data?.message || 'Failed to add admin.');
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEditAdmin = async (adminId) => {
    if (!name || !role) {
      toast.error('Name and role are required.');
      return;
    }

    setIsActionLoading(true);
    try {
      const token = Cookies.get('token');
      console.log('Token for updating admin:', token);
      if (!token) {
        throw new Error('No authentication token found.');
      }

      const response = await axios.patch(
        `${backendUrl}/admin/update/${adminId}`,
        { name, role },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      console.log('Update admin response:', response.data);
      toast.success(response.data.message || 'Admin updated successfully.');
      setAdmins(admins.map(admin => admin._id === adminId ? { ...admin, name, role } : admin));
      setEditAdminId(null);
      setName('');
      setRole('Super Admin');
      setEmail('');
    } catch (error) {
      console.error('Error updating admin:', error.message, error.response?.data, error.response?.status);
      toast.error(error.response?.data?.message || 'Failed to update admin.');
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    setIsActionLoading(true);
    try {
      const token = Cookies.get('token');
      console.log('Token for deleting admin:', token);
      if (!token) {
        throw new Error('No authentication token found.');
      }

      const response = await axios.delete(`${backendUrl}/admin/delete/${deleteAdminId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      console.log('Delete admin response:', response.data);
      toast.success(response.data.message || 'Admin deleted successfully.');
      setAdmins(admins.filter(admin => admin._id !== deleteAdminId));
      setIsDeleteModalOpen(false);
      setDeleteAdminId(null);
    } catch (error) {
      console.error('Error deleting admin:', error.message, error.response?.data, error.response?.status);
      toast.error(error.response?.data?.message || 'Failed to delete admin.');
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const startEditing = (admin) => {
    setEditAdminId(admin._id);
    setName(admin.name);
    setRole(admin.role);
    setEmail(admin.emailId);
  };

  const cancelEditing = () => {
    setEditAdminId(null);
    setName('');
    setRole('Super Admin');
    setEmail('');
  };

  const openModal = () => {
    setIsModalOpen(true);
    setEditAdminId(null);
    setName('');
    setRole('Super Admin');
    setEmail('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditAdminId(null);
    setName('');
    setRole('Super Admin');
    setEmail('');
  };

  const openDeleteModal = (adminId) => {
    setDeleteAdminId(adminId);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteAdminId(null);
  };

  return (
    <div className="min-h-screen px-6 sm:px-0 bg-slate-950">
      <Navbar />
      <div className="flex items-center justify-center pt-28">
        <div className="bg-slate-900 p-12 rounded-lg shadow-lg w-full sm:w-[900px] text-indigo-300 text-base">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-4xl font-semibold text-white">Admin Management</h2>
            <button
              onClick={openModal}
              className={`px-4 py-2 rounded-full font-medium text-base transition-transform duration-200 transform hover:scale-105 hover:shadow-lg ${
                isActionLoading
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-indigo-900 text-white cursor-pointer'
              }`}
              disabled={isActionLoading}
            >
              Add Admin
            </button>
          </div>

          {admins.length === 0 ? (
            <p className="text-center text-gray-400">No admins found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead>
                  <tr className="text-indigo-100">
                    <th className="p-4 min-w-[200px]">Name</th>
                    <th className="p-4 min-w-[200px]">Email</th>
                    <th className="p-4 min-w-[200px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(admin => (
                    <tr key={admin._id} className="bg-[#333A5C] border-b border-slate-700">
                      <td className="p-4">
                        {editAdminId === admin._id ? (
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-transparent border border-indigo-400 rounded px-2 py-1 text-white text-base w-full"
                            placeholder="Full Name"
                            disabled={isActionLoading}
                          />
                        ) : (
                          admin.name
                        )}
                      </td>
                      <td className="p-4">{admin.emailId || admin.email || 'N/A'}</td>
                      <td className="p-4 flex gap-2">
                        {editAdminId === admin._id ? (
                          <>
                            <button
                              onClick={() => handleEditAdmin(admin._id)}
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
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(admin)}
                              className={`text-indigo-400 underline text-base transition-colors duration-200 hover:text-indigo-200 ${
                                isActionLoading ? 'cursor-not-allowed' : 'cursor-pointer'
                              }`}
                              disabled={isActionLoading}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openDeleteModal(admin._id)}
                              className={`px-3 py-1 rounded-full font-medium text-base transition-transform duration-200 transform hover:scale-105 hover:shadow-lg ${
                                isActionLoading
                                  ? 'bg-gray-500 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-red-500 to-red-900 text-white cursor-pointer'
                              }`}
                              disabled={isActionLoading}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-slate-900 p-8 rounded-lg shadow-lg w-full sm:w-[500px] text-indigo-300 text-base">
                <h3 className="text-2xl font-semibold text-white text-center mb-4">Add New Admin</h3>
                <form onSubmit={handleAddAdmin}>
                  <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
                    <img src={assets.person_icon} alt="" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name"
                      className="bg-transparent outline-none text-base"
                      required
                      disabled={isActionLoading}
                    />
                  </div>
                  <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
                    <img src={assets.role_icon || assets.person_icon} alt="" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="bg-transparent outline-none text-base w-full"
                      required
                      disabled={isActionLoading}
                    >
                      <option value="Super Admin" className="bg-[#333A5C] text-indigo-300">Super Admin</option>
                      <option value="Moderator" className="bg-[#333A5C] text-indigo-300">Moderator</option>
                    </select>
                  </div>
                  <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
                    <img src={assets.mail_icon} alt="" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Id"
                      className="bg-transparent outline-none text-base"
                      required
                      disabled={isActionLoading}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-full font-medium text-base transition-transform duration-200 transform hover:scale-105 hover:shadow-lg ${
                        isActionLoading
                          ? 'bg-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-indigo-500 to-indigo-900 text-white cursor-pointer'
                      }`}
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? 'Adding Admin...' : 'Add Admin'}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className={`px-4 py-2 rounded-full font-medium text-base transition-transform duration-200 transform hover:scale-105 hover:shadow-lg ${
                        isActionLoading
                          ? 'bg-gray-500 cursor-not-allowed'
                          : 'bg-gray-500 text-white cursor-pointer'
                      }`}
                      disabled={isActionLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isDeleteModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-slate-900 p-8 rounded-lg shadow-lg w-full sm:w-[400px] text-indigo-300 text-base">
                <h3 className="text-2xl font-semibold text-white text-center mb-4">Confirm Deletion</h3>
                <p className="text-center mb-6">Are you sure you want to delete this admin?</p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleDeleteAdmin}
                    className={`px-4 py-2 rounded-full font-medium text-base transition-transform duration-200 transform hover:scale-105 hover:shadow-lg ${
                      isActionLoading
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-red-500 to-red-900 text-white cursor-pointer'
                    }`}
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    onClick={closeDeleteModal}
                    className={`px-4 py-2 rounded-full font-medium text-base transition-transform duration-200 transform hover:scale-105 hover:shadow-lg ${
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
      </div>
    </div>
  );
};

export default Admin;