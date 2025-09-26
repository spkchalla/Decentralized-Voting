import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Candidate = () => {
  const [candidates, setCandidates] = useState([]);
  const [parties, setParties] = useState([]); // Store party list
  const [view, setView] = useState('all');
  const [sortById, setSortById] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentCandidate, setCurrentCandidate] = useState({
    id: null,
    name: '',
    party: '', // Store party _id
    symbol: '',
    active: true,
  });
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Fetch parties on component mount
  useEffect(() => {
    const fetchParties = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/party`, { withCredentials: true }); // Adjust endpoint
        setParties(data.parties || []);
      } catch (error) {
        console.error('Error fetching parties:', error);
      }
    };
    fetchParties();
    fetchCandidates();
  }, [view, sortById]);

  const fetchCandidates = async () => {
    try {
      const endpoint = view === 'active' ? '/candidate/active' : '/candidate/all';
      const { data } = await axios.get(`${backendUrl}${endpoint}`, { withCredentials: true });
      setCandidates(data.candidates.map(c => ({
        id: c._id,
        name: c.name,
        party: c.party?._id || '', // Store party _id
        symbol: c.party?.symbol || '',
        active: c.status === 1,
      })));
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  const openAddModal = () => {
    setIsEdit(false);
    setCurrentCandidate({ id: null, name: '', party: '', symbol: '', active: true });
    setModalOpen(true);
  };

  const openEditModal = (candidate) => {
    setIsEdit(true);
    setCurrentCandidate({ ...candidate });
    setModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentCandidate((prev) => ({ ...prev, [name]: value }));
  };

  const handleActiveChange = (e) => {
    setCurrentCandidate((prev) => ({ ...prev, active: e.target.checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { name: currentCandidate.name, party: currentCandidate.party }; // Send party _id
      if (isEdit) {
        await axios.put(`${backendUrl}/candidate/edit/${currentCandidate.id}`, payload, { withCredentials: true });
      } else {
        const { data } = await axios.post(`${backendUrl}/candidate/add`, payload, { withCredentials: true });
        setCurrentCandidate((prev) => ({ ...prev, id: data.candidate._id }));
      }
      fetchCandidates();
      setModalOpen(false);
    } catch (error) {
      console.error('Error saving candidate:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${backendUrl}/candidate/${id}`, { withCredentials: true });
      fetchCandidates();
    } catch (error) {
      console.error('Error deleting candidate:', error);
    }
  };

  const getDisplayedCandidates = () => {
    let list = [...candidates];
    if (view === 'active') list = list.filter((c) => c.active);
    if (sortById) list.sort((a, b) => a.id.localeCompare(b.id));
    return list;
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h1 className="text-xl font-bold mb-4">Candidate Default Page</h1>
      <nav className="flex space-x-4 mb-6">
        <button
          onClick={() => { setView('all'); setSortById(false); }}
          className={`px-4 py-2 rounded ${view === 'all' && !sortById ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          All
        </button>
        <button
          onClick={() => { setView('active'); setSortById(false); }}
          className={`px-4 py-2 rounded ${view === 'active' && !sortById ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Active
        </button>
        <button
          onClick={() => setSortById((prev) => !prev)}
          className={`px-4 py-2 rounded ${sortById ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          By ID
        </button>
        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded bg-green-500 text-white ml-auto"
        >
          Add
        </button>
      </nav>

      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Party Name</th>
            <th className="p-2 border">Symbol</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {getDisplayedCandidates().map((candidate) => (
            <tr key={candidate.id}>
              <td className="p-2 border">{candidate.id}</td>
              <td className="p-2 border">{candidate.name}</td>
              <td className="p-2 border">{parties.find(p => p._id === candidate.party)?.name || ''}</td>
              <td className="p-2 border">{parties.find(p => p._id === candidate.party)?.symbol || ''}</td>
              <td className="p-2 border flex space-x-2">
                <button
                  onClick={() => openEditModal(candidate)}
                  className="px-2 py-1 bg-yellow-500 text-white rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(candidate.id)}
                  className="px-2 py-1 bg-red-500 text-white rounded"
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
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                value={currentCandidate.name}
                onChange={handleInputChange}
                placeholder="Name"
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
              <input
                type="text"
                name="symbol"
                value={parties.find(p => p._id === currentCandidate.party)?.symbol || ''}
                onChange={handleInputChange}
                placeholder="Symbol"
                className="w-full p-2 mb-3 border border-gray-300 rounded"
                readOnly
              />
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={currentCandidate.active}
                  onChange={handleActiveChange}
                  className="mr-2"
                />
                Active
              </label>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  OK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Candidate;