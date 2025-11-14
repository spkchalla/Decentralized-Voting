import React from 'react';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import useAuth from '../context/useAuth';
import axios from 'axios';
import Cookies from 'js-cookie';

const Home = () => {
  const { user, isAuthenticated, loading, error, logout } = useAuth();
  const [dashboardData, setDashboardData] = React.useState(null);
  const [dashboardLoading, setDashboardLoading] = React.useState(true);
  const [dashboardError, setDashboardError] = React.useState(null);
  const [registering, setRegistering] = React.useState({});

  const fetchDashboard = async () => {
    try {
      console.log('Fetching dashboard data...');
      
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = Cookies.get('token');
      
      console.log('Token from cookies:', token);
      
      if (!token) {
        throw new Error('No authentication token found in cookies');
      }

      const response = await axios.get(`${backendUrl}/election/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      
      console.log('Dashboard response:', response.data);
      setDashboardData(response.data);
    } catch (err) {
      console.error('Fetch error:', err);
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
      
      console.log('Frontend - Election _id:', electionId);
      console.log('Frontend - Election eid:', eid);
      
      const password = prompt('Please enter your password to register for this election:');
      if (!password) {
        alert('Password is required for registration');
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = Cookies.get('token');

      console.log('Frontend - Sending registration request with:', {
        electionId,
        passwordLength: password.length
      });

      const response = await axios.post(
        `${backendUrl}/election/register`,
        { 
          electionId: electionId,
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

      console.log('Registration response:', response.data);
      
      // Force refresh dashboard data with a small delay to ensure backend updates
      setTimeout(async () => {
        try {
          console.log('Refreshing dashboard after registration...');
          await fetchDashboard();
          alert('Registration successful! Your dashboard has been updated.');
        } catch (refreshError) {
          console.error('Failed to refresh dashboard:', refreshError);
          alert('Registration completed but failed to refresh dashboard. Please refresh the page manually.');
        }
      }, 1000);
      
    } catch (err) {
      console.error('Full registration error:', err);
      console.log('Server error response:', err.response?.data);
      
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Registration failed. Please try again.';
      
      // If it says "already registered", refresh the dashboard to get updated status
      if (errorMessage.includes('already registered')) {
        alert('You are already registered for this election. Refreshing dashboard...');
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
    // Navigate to voting page
    console.log('Navigate to vote for election:', electionId);
    // navigate(`/vote/${electionId}`);
  };

  const handleViewResults = (electionId) => {
    // Navigate to results page
    console.log('Navigate to results for election:', electionId);
    // navigate(`/results/${electionId}`);
  };

  const handleRefreshDashboard = async () => {
    setDashboardLoading(true);
    await fetchDashboard();
  };

  if (loading || dashboardLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
        <Navbar />
        <Header />
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  // Filter elections by category
  const electionsToVote = dashboardData?.elections?.filter(election => election.canVote) || [];
  
  // Show elections where user is not registered
  const electionsToRegister = dashboardData?.elections?.filter(election => 
    election.userStatus?.registrationStatus === 'not_registered' && 
    !election.isFinished
  ) || [];
  
  const finishedElections = dashboardData?.elections?.filter(election => election.isFinished) || [];
  
  // Show upcoming elections that are not in other categories
  const upcomingElections = dashboardData?.elections?.filter(election => 
    election.isUpcoming && 
    election.userStatus?.registrationStatus !== 'not_registered' && 
    !election.canVote &&
    !election.isFinished
  ) || [];

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

    // Show register button based on registration status
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
          
          {/* Vote Button */}
          {type === 'vote' && (
            <button 
              onClick={() => handleVote(election._id)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cast Your Vote
            </button>
          )}
          
          {/* Register Button - Show for elections that can be registered */}
          {(type === 'register' || canRegister) && (
            <button 
              onClick={() => handleRegister(election._id, election.eid)}
              disabled={registering[election._id] || 
                       election.userStatus?.registrationStatus === 'pending' || 
                       election.userStatus?.registrationStatus === 'registered'}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                registering[election._id] 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : election.userStatus?.registrationStatus === 'pending'
                  ? 'bg-yellow-500 text-white cursor-not-allowed'
                  : election.userStatus?.registrationStatus === 'registered'
                  ? 'bg-green-500 text-white cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {registering[election._id] 
                ? 'Registering...' 
                : election.userStatus?.registrationStatus === 'pending'
                ? 'Pending Verification'
                : election.userStatus?.registrationStatus === 'registered'
                ? 'Registered'
                : 'Register Now'
              }
            </button>
          )}
          
          {/* View Results Button */}
          {type === 'finished' && (
            <button 
              onClick={() => handleViewResults(election._id)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              View Results
            </button>
          )}

          {/* Upcoming Election - No action */}
          {type === 'upcoming' && !canRegister && (
            <button 
              disabled
              className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          )}
        </div>

        {/* Candidates List */}
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

        {/* Registration Status */}
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

  return (
    <div className="flex flex-col min-h-screen bg-[url('/bg_img.png')] bg-cover bg-center">
      <Navbar />
      <Header />
      
      <div className="flex-1 container mx-auto px-4 py-8">
        {/* Refresh Button */}
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

        {/* Elections to Vote */}
        {electionsToVote.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Elections Ready for Voting</h2>
            <div className="grid gap-4">
              {electionsToVote.map(election => (
                <ElectionCard key={election.eid} election={election} type="vote" />
              ))}
            </div>
          </section>
        )}

        {/* Elections to Register */}
        {electionsToRegister.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Elections Available for Registration</h2>
            <div className="grid gap-4">
              {electionsToRegister.map(election => (
                <ElectionCard key={election.eid} election={election} type="register" />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Elections */}
        {upcomingElections.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Upcoming Elections</h2>
            <div className="grid gap-4">
              {upcomingElections.map(election => (
                <ElectionCard key={election.eid} election={election} type="upcoming" />
              ))}
            </div>
          </section>
        )}

        {/* Finished Elections */}
        {finishedElections.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Completed Elections</h2>
            <div className="grid gap-4">
              {finishedElections.map(election => (
                <ElectionCard key={election.eid} election={election} type="finished" />
              ))}
            </div>
          </section>
        )}

        {/* No Elections Message */}
        {!dashboardError && electionsToVote.length === 0 && electionsToRegister.length === 0 && upcomingElections.length === 0 && finishedElections.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Elections Available</h3>
            <p className="text-gray-600">There are no elections available for you at the moment.</p>
          </div>
        )}

        {/* Summary Cards */}
        {dashboardData?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{dashboardData.summary.totalElections}</p>
              <p className="text-gray-600 text-sm">Total Elections</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{dashboardData.summary.upcomingElections}</p>
              <p className="text-gray-600 text-sm">Upcoming</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{dashboardData.summary.activeElections}</p>
              <p className="text-gray-600 text-sm">Active</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{dashboardData.summary.canVoteIn}</p>
              <p className="text-gray-600 text-sm">Can Vote</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{dashboardData.summary.pendingRegistrations}</p>
              <p className="text-gray-600 text-sm">Pending Reg</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{dashboardData.summary.finishedElections}</p>
              <p className="text-gray-600 text-sm">Completed</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;