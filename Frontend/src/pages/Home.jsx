import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import useAuth from '../context/useAuth';
import axios from 'axios';
import Cookies from 'js-cookie';

const Header = ({ isAdmin }) => {
  if (isAdmin) {
    return (
      <div className="flex flex-col items-center mt-30 px-4 text-center text-gray-800">
        <h1 className="flex items-center gap-2 text-xl sm:text-3xl font-medium mb-2">
          Hello Admin
        </h1>
        <h2 className="text-3xl sm:text-4xl font-semibold mb-4">
          Welcome to the Admin Dashboard
        </h2>
        <p className="mb-8 max-w-md">
          Create, update, monitor and manage elections efficiently.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center mt-30 px-4 text-center text-gray-800'>
      <h1 className='flex items-center gap-2 text-xl sm:text-3xl font-medium mb-2'>Hello Voter</h1>
      <h2 className='text-3xl sm:text-4xl font-semibold mb-4'>Welcome to the Decentralized Voting System</h2>
      <p className='mb-8 max-w-md'>Cast your vote securely, anonymously, and transparently.</p>
    </div>
  );
};

const Home = () => {
  const { user, isAuthenticated, loading, error, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = React.useState(null);
  const [dashboardLoading, setDashboardLoading] = React.useState(true);
  const [dashboardError, setDashboardError] = React.useState(null);
  const [registering, setRegistering] = React.useState({});
  const [statusFilter, setStatusFilter] = React.useState('all');

  const fetchDashboard = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = Cookies.get('token');
      if (!token) throw new Error('No authentication token found in cookies');
      const response = await axios.get(`${backendUrl}/election/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      setDashboardData(response.data);
    } catch (err) {
      setDashboardError(err.response?.data?.message || err.message);
    } finally {
      setDashboardLoading(false);
    }
  };

  React.useEffect(() => {
    if (isAuthenticated && !loading) {
      fetchDashboard();
    } else if (!loading && !isAuthenticated) {
      setDashboardLoading(false);
    }
  }, [isAuthenticated, loading]);

  const handleRegister = async (electionId, eid) => {
    try {
      setRegistering(prev => ({ ...prev, [electionId]: true }));
      const password = prompt('Please enter your password to register for this election:');
      if (!password) {
        alert('Password is required for registration');
        return;
      }
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = Cookies.get('token');
      await axios.post(
        `${backendUrl}/election/register`,
        { electionId: electionId, password: password },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );
      setTimeout(async () => {
        await fetchDashboard();
        alert('Registration successful!');
      }, 1000);
    } catch (err) {
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Registration failed. Please try again.';
      if (errorMessage.includes('already registered')) {
        alert('You are already registered. Refreshing dashboard...');
        setTimeout(async () => {
          await fetchDashboard();
        }, 500);
      } else {
        alert(`Registration failed: ${errorMessage}`);
      }
    } finally {
      setRegistering(prev => ({ ...prev, [electionId]: false }));
    }
  };

  const handleVote = (electionId) => {
    navigate(`/vote/${electionId}`);
  };

  const handleViewResults = (electionId) => {
    navigate(`/election-results/${electionId}`);
  };

  const handleRefreshDashboard = async () => {
    setDashboardLoading(true);
    await fetchDashboard();
  };

  if (loading || dashboardLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  const allElections = dashboardData?.elections || [];
  const activeElections = allElections.filter(election => election.status === 'Active');
  const electionsToVote = allElections.filter(election => election.canVote);

  const registeredUpcoming = allElections.filter(election =>
    election.userStatus?.isAccepted === true &&
    !election.canVote &&
    !election.isFinished &&
    election.status !== 'Active'
  );

  const electionsToRegister = allElections.filter(election =>
    election.userStatus?.registrationStatus === 'not_registered' &&
    !election.isFinished &&
    election.status !== 'Active'
  );

  const finishedElections = allElections.filter(election => election.isFinished);

  const upcomingElections = allElections.filter(election =>
    election.isUpcoming &&
    election.userStatus?.isAccepted !== true &&
    election.userStatus?.registrationStatus !== 'not_registered' &&
    !election.canVote &&
    !election.isFinished
  );

  const getFilteredElections = () => {
    switch (statusFilter) {
      case 'active':
        return { activeElections, others: [] };
      case 'upcoming':
        return { activeElections: [], others: [...registeredUpcoming, ...electionsToRegister, ...upcomingElections] };
      case 'finished':
        return { activeElections: [], others: finishedElections };
      default:
        return null;
    }
  };

  const filtered = getFilteredElections();

  const ElectionCard = ({ election, type }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'Active': return 'bg-green-500';
        case 'Not Yet Started': return 'bg-yellow-500';
        case 'Finished': return 'bg-gray-500';
        default: return 'bg-blue-500';
      }
    };
    const getTypeBadge = () => {
      switch (type) {
        case 'vote': return 'bg-red-100 text-red-800';
        case 'register': return 'bg-blue-100 text-blue-800';
        case 'finished': return 'bg-gray-100 text-gray-800';
        case 'upcoming': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };
    const getTypeText = () => {
      switch (type) {
        case 'vote': return 'Vote Now';
        case 'register': return 'Register Now';
        case 'finished': return 'Completed';
        case 'upcoming': return 'Upcoming';
        default: return 'Election';
      }
    };
    const getRegistrationStatusText = (status) => {
      switch (status) {
        case 'not_registered': return 'Not Registered';
        case 'pending': return 'Pending Verification';
        case 'verified': return 'Verified';
        case 'rejected': return 'Registration Rejected';
        case 'registered': return 'Registered';
        default: return 'Not Registered';
      }
    };
    const getRegistrationStatusColor = (status) => {
      switch (status) {
        case 'not_registered': return 'text-red-600';
        case 'pending': return 'text-yellow-600';
        case 'verified': return 'text-green-600';
        case 'registered': return 'text-green-600';
        case 'rejected': return 'text-red-600';
        default: return 'text-gray-600';
      }
    };
    const canRegister = election.userStatus?.registrationStatus === 'not_registered' &&
      !election.isFinished;
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-4 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-gray-800">{election.title}</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeBadge()}`}>
            {getTypeText()}
          </span>
        </div>
        <p className="text-gray-600 mb-4">{election.description}</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Start Date</p>
            <p className="font-medium">
              {new Date(election.startDateTime).toLocaleDateString()} at{' '}
              {new Date(election.startDateTime).toLocaleTimeString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">End Date</p>
            <p className="font-medium">
              {new Date(election.endDateTime).toLocaleDateString()} at{' '}
              {new Date(election.endDateTime).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor(election.status)}`}>
            {election.status}
          </span>
          {type === 'vote' && (
            <button
              onClick={() => handleVote(election._id)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cast Your Vote
            </button>
          )}
          {(type === 'register' || canRegister) && (
            <button
              onClick={() => handleRegister(election._id, election.eid)}
              disabled={registering[election._id]}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {registering[election._id]
                ? 'Registering...'
                : election.userStatus?.registrationStatus === 'pending'
                  ? 'Pending Verification'
                  : election.userStatus?.registrationStatus === 'registered'
                    ? 'Registered'
                    : 'Register Now'}
            </button>
          )}
          {type === 'finished' && (
            <button
              onClick={() => handleViewResults(election._id)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              View Results
            </button>
          )}
          {type === 'upcoming' && !canRegister && (
            <button
              disabled
              className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          )}
        </div>
        {election.candidates && election.candidates.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Candidates:</p>
            <div className="flex flex-wrap gap-2">
              {election.candidates.map((candidate, index) => (
                <span key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                  {candidate.candidate.name}
                </span>
              ))}
            </div>
          </div>
        )}
        {election.userStatus && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Your Status:{' '}
              <span className={`font-medium capitalize ${getRegistrationStatusColor(election.userStatus.registrationStatus)}`}>
                {getRegistrationStatusText(election.userStatus.registrationStatus)}
              </span>
            </p>
            {election.userStatus.registrationStatus === 'not_registered' && (
              <p className="text-xs text-gray-400 mt-1">
                Click "Register Now" and enter your password to participate in this election
              </p>
            )}
            {election.userStatus.registrationStatus === 'pending' && (
              <p className="text-xs text-yellow-600 mt-1">
                Your registration is under review. Please wait for verification.
              </p>
            )}
            {election.userStatus.registrationStatus === 'registered' && (
              <p className="text-xs text-green-600 mt-1">
                You are successfully registered for this election.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  // 🔥🔥🔥 ADMIN DASHBOARD — CLEAN VERSION (option C)
  if (user?.userType === 'admin') {
    return (
      <div className="flex flex-col min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
        <Navbar />
        <Header isAdmin={true} />
      </div>
    );
  }

  // 🔥🔥🔥 VOTER DASHBOARD (unchanged)
  return (
    <div className="flex flex-col min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
      <Navbar />
      <Header isAdmin={false} />

      <div className="flex-1 container mx-auto px-4 py-8">

        <div className="flex justify-between items-center mb-6">
          {dashboardData?.user && (
            <div className="bg-white rounded-lg shadow-lg p-6 flex-1 mr-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Welcome back, {dashboardData.user.name}!
              </h2>
              <p className="text-gray-600">
                Voter ID: {dashboardData.user.voterId} • Email: {dashboardData.user.email}
                {dashboardData.user.isVerified && (
                  <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                    Verified
                  </span>
                )}
              </p>
            </div>
          )}

          <button
            onClick={handleRefreshDashboard}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            Refresh Dashboard
          </button>
        </div>

        {dashboardError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-bold">Error Loading Dashboard</p>
            <p>{dashboardError}</p>
          </div>
        )}

        {/* voter filter + elections sections (kept same) */}
        {/* Filter Bar */}
        <div className="mb-6 bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Filter Elections:</h3>

          <div className="flex flex-wrap gap-2">

            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              All Elections
            </button>

            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Active ({activeElections.length})
            </button>

            <button
              onClick={() => setStatusFilter('upcoming')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === 'upcoming'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Upcoming ({
                registeredUpcoming.length +
                electionsToRegister.length +
                upcomingElections.length
              })
            </button>

            <button
              onClick={() => setStatusFilter('finished')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === 'finished'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Finished ({finishedElections.length})
            </button>

          </div>
        </div>

        {(filtered === null || statusFilter === 'active') && activeElections.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">🔴 Active Elections - Vote Now!</h2>
            <div className="grid gap-4">
              {activeElections.map(election => {
                const type = election.canVote ? 'vote' : 'register';
                return <ElectionCard key={election.eid} election={election} type={type} />;
              })}
            </div>
          </section>
        )}

        {(filtered === null || statusFilter === 'all') &&
          electionsToVote.length > 0 &&
          statusFilter !== 'active' && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Elections Ready for Voting</h2>
              <div className="grid gap-4">
                {electionsToVote.map(election => (
                  <ElectionCard key={election.eid} election={election} type="vote" />
                ))}
              </div>
            </section>
          )}

        {(filtered === null ||
          (filtered && filtered.others.some(e => registeredUpcoming.includes(e)))) &&
          registeredUpcoming.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Your Registered Upcoming Elections</h2>
              <div className="grid gap-4">
                {registeredUpcoming.map(election => (
                  <ElectionCard key={election.eid} election={election} type="upcoming" />
                ))}
              </div>
            </section>
          )}

        {(filtered === null ||
          (filtered && filtered.others.some(e => electionsToRegister.includes(e)))) &&
          electionsToRegister.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Elections Available for Registration</h2>
              <div className="grid gap-4">
                {electionsToRegister.map(election => (
                  <ElectionCard key={election.eid} election={election} type="register" />
                ))}
              </div>
            </section>
          )}

        {(filtered === null ||
          (filtered && filtered.others.some(e => upcomingElections.includes(e)))) &&
          upcomingElections.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Upcoming Elections</h2>
              <div className="grid gap-4">
                {upcomingElections.map(election => (
                  <ElectionCard key={election.eid} election={election} type="upcoming" />
                ))}
              </div>
            </section>
          )}

        {(filtered === null ||
          (filtered && filtered.others.some(e => finishedElections.includes(e)))) &&
          finishedElections.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Completed Elections</h2>
              <div className="grid gap-4">
                {finishedElections.map(election => (
                  <ElectionCard key={election.eid} election={election} type="finished" />
                ))}
              </div>
            </section>
          )}

        {!dashboardError &&
          electionsToVote.length === 0 &&
          registeredUpcoming.length === 0 &&
          electionsToRegister.length === 0 &&
          upcomingElections.length === 0 &&
          finishedElections.length === 0 &&
          activeElections.length === 0 && (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Elections Available</h3>
              <p className="text-gray-600">There are no elections available for you at the moment.</p>
            </div>
          )}

        {dashboardData?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {dashboardData.summary.totalElections}
              </p>
              <p className="text-gray-600 text-sm">Total Elections</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {dashboardData.summary.upcomingElections}
              </p>
              <p className="text-gray-600 text-sm">Upcoming</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {dashboardData.summary.activeElections}
              </p>
              <p className="text-gray-600 text-sm">Active</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {dashboardData.summary.canVoteIn}
              </p>
              <p className="text-gray-600 text-sm">Can Vote</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {dashboardData.summary.pendingRegistrations}
              </p>
              <p className="text-gray-600 text-sm">Pending Reg</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">
                {dashboardData.summary.finishedElections}
              </p>
              <p className="text-gray-600 text-sm">Completed</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Home;
