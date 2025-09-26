import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Party = () => {
  const [parties, setParties] = useState([]);
  const [view, setView] = useState('all');
  const [sortById, setSortById] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentParty, setCurrentParty] = useState({
    id: null,
    name: '',
    symbol: '',
    active: true,
  });
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/';

  useEffect(() => {
    fetchParties();
  }, [view, sortById]);

  const fetchParties = async () => {
    try {
      const endpoint = view === 'active' ? '/party/active' : '/party/all';
      const { data } = await axios.get(`${backendUrl}${endpoint}`, { withCredentials: true });
      setParties(data.parties.map(p => ({
        id: p._id,
        partyId: p.party_id || p._id,
        name: p.name,
        symbol: p.symbol,
        active: p.status === 1,
      })));
    } catch (error) {
      console.error('Error fetching parties:', error);
    }
  };

  const openAddModal = () => {
    setIsEdit(false);
    setCurrentParty({ id: null, name: '', symbol: '', active: true });
    setModalOpen(true);
  };

  const openEditModal = (party) => {
    setIsEdit(true);
    setCurrentParty({ ...party });
    setModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentParty((prev) => ({ ...prev, [name]: value }));
  };

  const handleActiveChange = (e) => {
    setCurrentParty((prev) => ({ ...prev, active: e.target.checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { name: currentParty.name, symbol: currentParty.symbol };
      if (isEdit) {
        await axios.put(`${backendUrl}/party/edit/${currentParty.id}`, payload, { withCredentials: true });
      } else {
        const { data } = await axios.post(`${backendUrl}/party/add`, payload, { withCredentials: true });
        setCurrentParty((prev) => ({ ...prev, id: data.party._id }));
      }
      fetchParties();
      setModalOpen(false);
    } catch (error) {
      console.error('Error saving party:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${backendUrl}/party/${id}`, { withCredentials: true });
      fetchParties();
    } catch (error) {
      console.error('Error deleting party:', error);
    }
  };

  const getDisplayedParties = () => {
    let list = [...parties];
    if (view === 'active') list = list.filter((p) => p.active);
    if (sortById) list.sort((a, b) => a.partyId.localeCompare(b.partyId));
    return list;
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h1 className="text-xl font-bold mb-4">Party Default Page</h1>
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
            <th className="p-2 border">Party ID</th>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Symbol</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {getDisplayedParties().map((party) => (
            <tr key={party.id}>
              <td className="p-2 border">{party.partyId}</td>
              <td className="p-2 border">{party.name}</td>
              <td className="p-2 border">{party.symbol}</td>
              <td className="p-2 border flex space-x-2">
                <button
                  onClick={() => openEditModal(party)}
                  className="px-2 py-1 bg-yellow-500 text-white rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(party.id)}
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
              {isEdit ? 'Edit Party' : 'Add Party'}
            </h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                value={currentParty.name}
                onChange={handleInputChange}
                placeholder="Party Name"
                className="w-full p-2 mb-3 border border-gray-300 rounded"
                required
              />
              <input
                type="text"
                name="symbol"
                value={currentParty.symbol}
                onChange={handleInputChange}
                placeholder="Symbol"
                className="w-full p-2 mb-3 border border-gray-300 rounded"
                required
              />
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={currentParty.active}
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

export default Party;