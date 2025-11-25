import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import useAuth from '../context/useAuth';
import axios from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

const VotePage = () => {
    const { electionId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated, loading } = useAuth();

    const [election, setElection] = useState(location.state?.election || null);
    const [selectedCandidate, setSelectedCandidate] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingElection, setLoadingElection] = useState(!election);

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

    // Fetch election details if not passed via state
    useEffect(() => {
        if (!election && electionId) {
            fetchElectionDetails();
        }
    }, [electionId, election]);

    // Auth guard
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            toast.error('Please login to vote');
            navigate('/login');
        }
    }, [isAuthenticated, loading, navigate]);

    const fetchElectionDetails = async () => {
        try {
            const token = Cookies.get('token');
            const response = await axios.get(`${backendUrl}/election/${electionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                withCredentials: true,
            });

            setElection(response.data.election);
        } catch (err) {
            console.error('Error fetching election:', err);
            toast.error('Failed to load election details');
            navigate('/');
        } finally {
            setLoadingElection(false);
        }
    };

    const handleVoteSubmit = async (e) => {
        e.preventDefault();

        if (!selectedCandidate) {
            toast.error('Please select a candidate');
            return;
        }

        if (!password) {
            toast.error('Password is required');
            return;
        }

        setIsSubmitting(true);

        try {
            const token = Cookies.get('token');

            const response = await axios.post(
                `${backendUrl}/vote/castVote`,
                {
                    electionId: electionId,
                    candidateId: selectedCandidate,
                    email: user.email,
                    password: password
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    withCredentials: true,
                }
            );

            if (response.data.success) {
                toast.success('Vote cast successfully! 🎉');
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            }
        } catch (err) {
            console.error('Vote error:', err);
            const errorMessage = err.response?.data?.error ||
                err.response?.data?.message ||
                'Failed to cast vote. Please try again.';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || loadingElection) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
                <Navbar />
                <p className="text-white text-lg">Loading...</p>
            </div>
        );
    }

    if (!election) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
                <Navbar />
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Election Not Found</h3>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Go Back Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
            <Navbar />

            <div className="flex-1 container mx-auto px-4 py-8 pt-24">
                <div className="max-w-4xl mx-auto">
                    {/* Election Header */}
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-3xl font-bold text-gray-800">{election.title}</h1>
                            <span className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-semibold">
                                {election.status}
                            </span>
                        </div>
                        <p className="text-gray-600 mb-4">{election.description}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Start Date</p>
                                <p className="font-medium">{new Date(election.startDateTime).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">End Date</p>
                                <p className="font-medium">{new Date(election.endDateTime).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Voting Form */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Cast Your Vote</h2>

                        <form onSubmit={handleVoteSubmit}>
                            {/* Candidates List */}
                            <div className="mb-6">
                                <label className="block text-lg font-semibold text-gray-700 mb-4">
                                    Select a Candidate:
                                </label>

                                {election.candidates && election.candidates.length > 0 ? (
                                    <div className="space-y-3">
                                        {election.candidates.map((candidateEntry) => {
                                            const candidate = candidateEntry.candidate;
                                            return (
                                                <div
                                                    key={candidate._id}
                                                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${selectedCandidate === candidate._id
                                                            ? 'border-blue-500 bg-blue-50'
                                                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                                        }`}
                                                    onClick={() => setSelectedCandidate(candidate._id)}
                                                >
                                                    <div className="flex items-center">
                                                        <input
                                                            type="radio"
                                                            name="candidate"
                                                            value={candidate._id}
                                                            checked={selectedCandidate === candidate._id}
                                                            onChange={(e) => setSelectedCandidate(e.target.value)}
                                                            className="mr-4 h-5 w-5 text-blue-600"
                                                        />
                                                        <div className="flex-1">
                                                            <h3 className="text-lg font-bold text-gray-800">{candidate.name}</h3>
                                                            <p className="text-sm text-gray-600">ID: {candidate.candidate_id}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-gray-500">No candidates available for this election.</p>
                                )}
                            </div>

                            {/* Password Input */}
                            <div className="mb-6">
                                <label className="block text-lg font-semibold text-gray-700 mb-2">
                                    Enter Your Password:
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                                    placeholder="Your account password"
                                    required
                                    disabled={isSubmitting}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Your password is required for secure vote encryption and authentication.
                                </p>
                            </div>

                            {/* Submit Button */}
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => navigate('/')}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 px-6 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !selectedCandidate}
                                    className="flex-1 py-3 px-6 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Submitting Vote...' : 'Cast Vote'}
                                </button>
                            </div>
                        </form>

                        {/* Security Notice */}
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>🔒 Security Notice:</strong> Your vote is encrypted and stored anonymously on IPFS.
                                Your password is used only for authentication and encryption, and is never stored.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VotePage;
