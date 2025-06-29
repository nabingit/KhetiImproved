import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { JobCard } from '../components/JobCard';
import { Job, Application, User } from '../types';
import { jobStorage, applicationStorage } from '../utils/storage';
import { JobStatusManager } from '../utils/jobStatusManager';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Sprout, Tractor, Users, User as UserIcon, Mail, MapPin, Calendar, Camera, X, Phone } from 'lucide-react';

export function HomePage() {
  const { user, getUserProfile } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<User | null>(null);
  const [showFarmerModal, setShowFarmerModal] = useState(false);
  const [filters, setFilters] = useState({
    maxWage: '',
    durationType: '',
    location: ''
  });

  useEffect(() => {
    if (user) {
      loadJobs();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchTerm, filters]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get jobs and applications in parallel without updating statuses immediately
      const [allJobs, allApplications] = await Promise.all([
        jobStorage.getJobs(),
        applicationStorage.getApplications()
      ]);
      
      if (user?.userType === 'farmer') {
        setJobs(allJobs.filter((job: Job) => job.farmerId === user.id));
      } else {
        // Workers can only see open jobs
        setJobs(allJobs.filter((job: Job) => job.status === 'open'));
        setApplications(allApplications.filter((app: Application) => app.workerId === user?.id));
      }
      
      // Update job statuses in the background after initial load
      JobStatusManager.updateAllJobStatuses().then((updatedJobs) => {
        if (user?.userType === 'farmer') {
          setJobs(updatedJobs.filter((job: Job) => job.farmerId === user.id));
        } else {
          setJobs(updatedJobs.filter((job: Job) => job.status === 'open'));
        }
      }).catch(error => {
        console.error('Error updating job statuses:', error);
        // Don't show error to user as this is background operation
      });
      
    } catch (error) {
      console.error('Error loading jobs:', error);
      setError('Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = jobs;
    if (searchTerm) {
      filtered = filtered.filter((job: Job) =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filters.maxWage) {
      filtered = filtered.filter((job: Job) => job.wage <= parseInt(filters.maxWage));
    }
    if (filters.durationType) {
      filtered = filtered.filter((job: Job) => job.durationType === filters.durationType);
    }
    if (filters.location) {
      filtered = filtered.filter((job: Job) =>
        job.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    setFilteredJobs(filtered);
  };

  const canApplyToJob = (jobId: string): boolean => {
    if (!user) return false;
    
    const existingApplication = applications.find(app => app.jobId === jobId);
    
    if (!existingApplication) return true;
    
    // If rejected, check if 24 hours have passed
    if (existingApplication.status === 'rejected' && existingApplication.rejectedAt) {
      const rejectedTime = new Date(existingApplication.rejectedAt).getTime();
      const now = new Date().getTime();
      const hoursPassed = (now - rejectedTime) / (1000 * 60 * 60);
      return hoursPassed >= 24;
    }
    
    return false;
  };

  const getApplicationStatus = (jobId: string): 'pending' | 'accepted' | 'rejected' | null => {
    const application = applications.find(app => app.jobId === jobId);
    return application ? application.status : null;
  };

  const handleViewFarmerProfile = async (farmerId: string) => {
    try {
      const farmerProfile = await getUserProfile(farmerId);
      if (farmerProfile) {
        setSelectedFarmer(farmerProfile);
        setShowFarmerModal(true);
      } else {
        alert('Farmer profile not found');
      }
    } catch (error) {
      console.error('Error loading farmer profile:', error);
      alert('Failed to load farmer profile');
    }
  };

  const handleApply = (jobId: string) => {
    if (!user) return;

    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    // Check if positions are already filled
    if ((job.acceptedWorkerIds?.length ?? 0) >= job.requiredWorkers) {
      alert('All positions for this job have been filled!');
      return;
    }

    const existingApplication = applications.find(app => app.jobId === jobId);
    
    if (existingApplication) {
      if (existingApplication.status === 'pending') {
        alert('You have already applied to this job!');
        return;
      }
      
      if (existingApplication.status === 'accepted') {
        alert('Your application has already been accepted!');
        return;
      }
      
      if (existingApplication.status === 'rejected') {
        if (existingApplication.rejectedAt) {
          const rejectedTime = new Date(existingApplication.rejectedAt).getTime();
          const now = new Date().getTime();
          const hoursPassed = (now - rejectedTime) / (1000 * 60 * 60);
          
          if (hoursPassed < 24) {
            const hoursLeft = Math.ceil(24 - hoursPassed);
            alert(`You can reapply in ${hoursLeft} hours after being rejected.`);
            return;
          }
        }
      }
    }

    // Create new application or update existing rejected one
    const application: Application = {
      id: existingApplication?.id || Date.now().toString(),
      jobId,
      workerId: user.id,
      workerName: user.name,
      workerEmail: user.email,
      status: 'pending',
      appliedAt: new Date().toISOString()
    };

    if (existingApplication) {
      applicationStorage.updateApplication(application.id, {
        status: 'pending',
        appliedAt: new Date().toISOString(),
        rejectedAt: undefined
      });
    } else {
      applicationStorage.saveApplication(application);
    }
    
    alert('Application submitted successfully!');
    loadJobs(); // Reload to update application status
  };

  const handleViewApplicants = (jobId: string) => {
    navigate(`/applicants/${jobId}`);
  };

  const getWelcomeMessage = (user: User) => {
    if (user.userType === 'farmer') {
      return {
        greeting: `Welcome back, ${user.name}!`,
        subtitle: "Ready to find skilled workers for your farm?",
        icon: Tractor,
        bgColor: "bg-gradient-to-r from-green-500 to-emerald-600",
        textColor: "text-white"
      };
    } else {
      return {
        greeting: `Hello, ${user.name}!`,
        subtitle: "Discover new farming opportunities today",
        icon: Users,
        bgColor: "bg-gradient-to-r from-blue-500 to-indigo-600",
        textColor: "text-white"
      };
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDisplayContactNumber = (contactNumber: string): string => {
    if (contactNumber.length === 10) {
      return `${contactNumber.slice(0, 3)}-${contactNumber.slice(3, 6)}-${contactNumber.slice(6)}`;
    }
    return contactNumber;
  };

  const FarmerProfileModal = () => {
    if (!selectedFarmer || !showFarmerModal) return null;

    const farmerJobs = jobs.length > 0 ? jobs.filter((job: Job) => job.farmerId === selectedFarmer.id) : [];
    const workersHired = farmerJobs.reduce((total: number, job: Job) => total + (job.acceptedWorkerIds?.length || 0), 0);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                  {selectedFarmer.profilePicture ? (
                    <img 
                      src={selectedFarmer.profilePicture} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon size={32} className="text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedFarmer.name}</h2>
                  <div className="flex items-center text-green-100">
                    <span className="capitalize">{selectedFarmer.userType}</span>
                    {selectedFarmer.dateOfBirth && (
                      <span className="ml-2">• {calculateAge(selectedFarmer.dateOfBirth)} years old</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowFarmerModal(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="flex items-center py-2">
                <Mail size={16} className="text-gray-400 mr-3" />
                <span className="text-gray-900">{selectedFarmer.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <div className="flex items-center py-2">
                <Phone size={16} className="text-gray-400 mr-3" />
                <span className="text-gray-900">{formatDisplayContactNumber(selectedFarmer.contactNumber)}</span>
              </div>
            </div>

            {selectedFarmer.location && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Farm Location</label>
                <div className="flex items-center py-2">
                  <MapPin size={16} className="text-gray-400 mr-3" />
                  <span className="text-gray-900">{selectedFarmer.location}</span>
                </div>
              </div>
            )}

            {selectedFarmer.dateOfBirth && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <div className="flex items-center py-2">
                  <Calendar size={16} className="text-gray-400 mr-3" />
                  <span className="text-gray-900">
                    {formatDate(selectedFarmer.dateOfBirth)} ({calculateAge(selectedFarmer.dateOfBirth)} years old)
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
              <div className="flex items-center py-2">
                <span className="text-gray-900">
                  {formatDate(selectedFarmer.createdAt)}
                </span>
              </div>
            </div>

            {/* Farmer's Job Statistics */}
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Farmer Statistics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {farmerJobs.length}
                  </div>
                  <div className="text-xs text-gray-600">Jobs Posted</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {workersHired}
                  </div>
                  <div className="text-xs text-gray-600">Workers Hired</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading jobs...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => loadJobs()}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const welcomeConfig = getWelcomeMessage(user!);
  const WelcomeIcon = welcomeConfig.icon;

  return (
    <div className="p-4">
      {/* Personalized Welcome Header */}
      <div className={`${welcomeConfig.bgColor} rounded-2xl p-6 mb-6 shadow-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
              <WelcomeIcon size={24} className={welcomeConfig.textColor} />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${welcomeConfig.textColor}`}>
                {welcomeConfig.greeting}
              </h1>
              <p className={`${welcomeConfig.textColor} opacity-90 text-sm`}>
                {welcomeConfig.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <Sprout className={`${welcomeConfig.textColor} opacity-80`} size={20} />
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="mt-4 flex space-x-4">
          {user.userType === 'farmer' ? (
            <>
              <div className="bg-white bg-opacity-20 rounded-lg px-3 py-2">
                <div className={`text-lg font-bold ${welcomeConfig.textColor}`}>
                  {jobs.filter((job: Job) => job.status === 'open').length}
                </div>
                <div className={`text-xs ${welcomeConfig.textColor} opacity-80`}>Active Jobs</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg px-3 py-2">
                <div className={`text-lg font-bold ${welcomeConfig.textColor}`}>
                  {jobs.reduce((total: number, job: Job) => total + (job.acceptedWorkerIds?.length || 0), 0)}
                </div>
                <div className={`text-xs ${welcomeConfig.textColor} opacity-80`}>Workers Hired</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white bg-opacity-20 rounded-lg px-3 py-2">
                <div className={`text-lg font-bold ${welcomeConfig.textColor}`}>
                  {jobs.length}
                </div>
                <div className={`text-xs ${welcomeConfig.textColor} opacity-80`}>Available Jobs</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg px-3 py-2">
                <div className={`text-lg font-bold ${welcomeConfig.textColor}`}>
                  {(() => {
                    const acceptedApps = applications.filter((app: Application) => app.status === 'accepted');
                    return acceptedApps.filter((app: Application) => {
                      const job = jobs.find((j: Job) => j.id === app.jobId);
                      return job && job.status === 'completed';
                    }).length;
                  })()}
                </div>
                <div className={`text-xs ${welcomeConfig.textColor} opacity-80`}>Jobs Completed</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={user.userType === 'farmer' ? 'Search your jobs...' : 'Search jobs...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {user.userType === 'worker' && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-blue-600 font-medium hover:text-blue-700 transition-colors"
          >
            <Filter size={20} className="mr-1" />
            Filters
          </button>
        )}

        {showFilters && user.userType === 'worker' && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg space-y-3 border border-blue-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Wage (NPR.)
              </label>
              <input
                type="number"
                value={filters.maxWage}
                onChange={(e) => setFilters({ ...filters, maxWage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter maximum wage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration Type
              </label>
              <select
                value={filters.durationType}
                onChange={(e) => setFilters({ ...filters, durationType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter location"
              />
            </div>
          </div>
        )}
      </div>

      {/* Job Listings */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <WelcomeIcon size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {user.userType === 'farmer' ? 'No jobs posted yet' : 'No jobs available'}
            </h3>
            <p className="text-gray-600 mb-4">
              {user.userType === 'farmer' 
                ? 'Create your first job post to find workers'
                : 'Check back later for new opportunities'
              }
            </p>
            {user.userType === 'farmer' && (
              <button
                onClick={() => navigate('/post-job')}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Post Your First Job
              </button>
            )}
          </div>
        ) : (
          filteredJobs.map((job: Job) => (
            <JobCard
              key={job.id}
              job={job}
              onApply={handleApply}
              onViewApplicants={handleViewApplicants}
              onViewFarmerProfile={handleViewFarmerProfile}
              isOwner={user.userType === 'farmer'}
              canApply={canApplyToJob(job.id)}
              applicationStatus={getApplicationStatus(job.id)}
            />
          ))
        )}
      </div>

      {/* Farmer Profile Modal */}
      <FarmerProfileModal />
    </div>
  );
}