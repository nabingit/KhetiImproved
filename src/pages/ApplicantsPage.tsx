import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Job, Application, User } from '../types';
import { jobStorage, applicationStorage } from '../utils/storage';
import { JobStatusManager } from '../utils/jobStatusManager';
import { ArrowLeft, User as UserIcon, Mail, Calendar, CheckCircle, XCircle, Users, Award, Eye, MapPin, Weight, Ruler, X, Briefcase, Phone } from 'lucide-react';

export function ApplicantsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { user, getUserProfile } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadData();
    }
  }, [jobId]);

  const loadData = async () => {
    if (!jobId) return;

    // Update job status first
    await JobStatusManager.updateAllJobStatuses();
    
    const jobs = await jobStorage.getJobs();
    const currentJob = jobs.find((j: Job) => j.id === jobId);
    setJob(currentJob || null);
    setAllJobs(jobs);

    const applications = await applicationStorage.getApplications();
    const jobApplications = applications.filter((app: Application) => app.jobId === jobId);
    setApplications(jobApplications);
    setAllApplications(applications);
  };

  const getWorkerProfile = (workerId: string): User | null => {
    const users = JSON.parse(localStorage.getItem('kheticulture_users') || '[]');
    return users.find((u: User) => u.id === workerId) || null;
  };

  const getWorkerJobsCompleted = (workerId: string): number => {
    // Get all accepted applications for this worker
    const acceptedApplications = allApplications.filter(
      (app: Application) => app.workerId === workerId && app.status === 'accepted'
    );
    
    // Count how many of those jobs are completed
    const completedJobs = acceptedApplications.filter((app: Application) => {
      const job = allJobs.find((j: Job) => j.id === app.jobId);
      return job && job.status === 'completed';
    });
    
    return completedJobs.length;
  };

  const getWorkerTotalApplications = (workerId: string): number => {
    return allApplications.filter((app: Application) => app.workerId === workerId).length;
  };

  const getWorkerSuccessRate = (workerId: string): number => {
    const totalApplications = getWorkerTotalApplications(workerId);
    const completedJobs = getWorkerJobsCompleted(workerId);
    
    if (totalApplications === 0) return 0;
    return Math.round((completedJobs / totalApplications) * 100);
  };

  const handleViewProfile = async (workerId: string) => {
    setLoadingProfile(true);
    try {
      const workerProfile = await getUserProfile(workerId);
      if (workerProfile) {
        setSelectedWorker(workerProfile);
        setShowProfileModal(true);
      } else {
        alert('Worker profile not found');
      }
    } catch (error) {
      console.error('Error loading worker profile:', error);
      alert('Failed to load worker profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdateApplication = (applicationId: string, status: 'accepted' | 'rejected') => {
    if (!job) return;

    // Check if we can accept more workers
    if (status === 'accepted' && (job.acceptedWorkerIds?.length ?? 0) >= job.requiredWorkers) {
      alert('Cannot accept more workers. All positions are filled.');
      return;
    }

    const application = applications.find((app: Application) => app.id === applicationId);
    if (!application) return;

    if (status === 'accepted') {
      // Update application status
      applicationStorage.updateApplication(applicationId, { status: 'accepted' });
      
      // Add worker to accepted list
      const updatedAcceptedWorkers = [...(job.acceptedWorkerIds ?? []), application.workerId];
      
      // Update job with new accepted workers
      jobStorage.updateJob(job.id, { 
        acceptedWorkerIds: updatedAcceptedWorkers
      });
      
      // Check if job status should auto-update and reload data
      JobStatusManager.checkStatusAfterWorkerAccepted(job.id).then(() => {
        loadData(); // Reload to get updated job status
      });
      
    } else if (status === 'rejected') {
      // Update application with rejection timestamp
      applicationStorage.updateApplication(applicationId, { 
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });
      
      loadData(); // Reload data
    }
  };

  const handleMarkCompleted = () => {
    if (!job) return;
    
    jobStorage.updateJob(job.id, { status: 'completed' });
    loadData();
    alert('Job marked as completed!');
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

  const calculateBMI = (weight: number, height: number): string => {
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi: number): { category: string; color: string } => {
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
    if (bmi < 25) return { category: 'Normal', color: 'text-green-600' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-yellow-600' };
    return { category: 'Obese', color: 'text-red-600' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDisplayContactNumber = (contactNumber: string): string => {
    if (!contactNumber || typeof contactNumber !== 'string') {
      return 'N/A';
    }
    
    if (contactNumber.length === 10) {
      return `${contactNumber.slice(0, 3)}-${contactNumber.slice(3, 6)}-${contactNumber.slice(6)}`;
    }
    return contactNumber;
  };

  if (!job) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Job not found</h3>
          <button
            onClick={() => navigate('/')}
            className="text-green-600 hover:text-green-700"
          >
            Go back to home
          </button>
        </div>
      </div>
    );
  }

  if (user?.userType !== 'farmer' || job.farmerId !== user.id) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access denied</h3>
          <p className="text-gray-600 mb-4">You can only view applicants for your own jobs</p>
          <button
            onClick={() => navigate('/')}
            className="text-green-600 hover:text-green-700"
          >
            Go back to home
          </button>
        </div>
      </div>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const acceptedApplications = applications.filter(app => app.status === 'accepted');
  const rejectedApplications = applications.filter(app => app.status === 'rejected');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'filled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Open';
      case 'filled':
        return 'Filled';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const WorkerProfileModal = () => {
    if (!selectedWorker || !showProfileModal) return null;

    const jobsCompleted = getWorkerJobsCompleted(selectedWorker.id);
    const totalApplications = getWorkerTotalApplications(selectedWorker.id);
    const successRate = getWorkerSuccessRate(selectedWorker.id);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                  {selectedWorker.profilePicture ? (
                    <img 
                      src={selectedWorker.profilePicture} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon size={32} className="text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedWorker.name}</h2>
                  <div className="flex items-center text-blue-100">
                    <span className="capitalize">{selectedWorker.userType}</span>
                    {selectedWorker.dateOfBirth && (
                      <span className="ml-2">• {calculateAge(selectedWorker.dateOfBirth)} years old</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
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
                <span className="text-gray-900">{selectedWorker.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <div className="flex items-center py-2">
                <Phone size={16} className="text-gray-400 mr-3" />
                <span className="text-gray-900">{formatDisplayContactNumber(selectedWorker.contactNumber)}</span>
              </div>
            </div>

            {selectedWorker.location && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <div className="flex items-center py-2">
                  <MapPin size={16} className="text-gray-400 mr-3" />
                  <span className="text-gray-900">{selectedWorker.location}</span>
                </div>
              </div>
            )}

            {selectedWorker.dateOfBirth && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <div className="flex items-center py-2">
                  <Calendar size={16} className="text-gray-400 mr-3" />
                  <span className="text-gray-900">
                    {new Date(selectedWorker.dateOfBirth).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })} ({calculateAge(selectedWorker.dateOfBirth)} years old)
                  </span>
                </div>
              </div>
            )}

            {selectedWorker.weight && selectedWorker.height && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                    <div className="flex items-center py-2">
                      <Weight size={16} className="text-gray-400 mr-3" />
                      <span className="text-gray-900">{selectedWorker.weight} kg</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                    <div className="flex items-center py-2">
                      <Ruler size={16} className="text-gray-400 mr-3" />
                      <span className="text-gray-900">{selectedWorker.height} cm</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Health Information</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">BMI:</span>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">
                        {calculateBMI(selectedWorker.weight, selectedWorker.height)}
                      </span>
                      <span className={`ml-2 text-sm font-medium ${getBMICategory(parseFloat(calculateBMI(selectedWorker.weight, selectedWorker.height))).color}`}>
                        {getBMICategory(parseFloat(calculateBMI(selectedWorker.weight, selectedWorker.height))).category}
                      </span>
                    
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedWorker.workingPicture && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Working Picture</label>
                <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={selectedWorker.workingPicture} 
                    alt="Working" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
              <div className="flex items-center py-2">
                <span className="text-gray-900">
                  {new Date(selectedWorker.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Worker's Job Statistics */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Briefcase size={16} className="mr-2 text-blue-600" />
                Work History
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{totalApplications}</div>
                  <div className="text-xs text-gray-600">Total Applications</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{jobsCompleted}</div>
                  <div className="text-xs text-gray-600">Jobs Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{successRate}%</div>
                  <div className="text-xs text-gray-600">Success Rate</div>
                </div>
              </div>
              
              {jobsCompleted > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center justify-center">
                    <CheckCircle size={16} className="text-green-600 mr-2" />
                    <span className="text-sm text-gray-700">
                      Experienced worker with {jobsCompleted} completed job{jobsCompleted !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
              
              {jobsCompleted === 0 && totalApplications > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center justify-center">
                    <UserIcon size={16} className="text-blue-600 mr-2" />
                    <span className="text-sm text-gray-700">New worker seeking first opportunity</span>
                  </div>
                </div>
              )}
              
              {totalApplications === 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center justify-center">
                    <UserIcon size={16} className="text-gray-600 mr-2" />
                    <span className="text-sm text-gray-700">First time applicant</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/my-jobs')}
          className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
          <p className="text-gray-600">{job.title}</p>
        </div>
      </div>

      {/* Job Summary */}
      <div className="bg-green-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900">{job.title}</h3>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
            {getStatusText(job.status)}
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-3">{job.description}</p>
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <span className="font-semibold">₹{job.wage.toLocaleString()} per {job.durationType.slice(0, -1)}</span>
          <div className="flex items-center">
            <Users size={16} className="mr-1" />
            <span>{job.acceptedWorkerIds?.length ?? 0}/{job.requiredWorkers} workers</span>
          </div>
        </div>
        
        {job.status === 'in-progress' && (
          <button
            onClick={handleMarkCompleted}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
          >
            <Award size={16} className="mr-2" />
            Mark Job as Completed
          </button>
        )}
      </div>

      {/* Applications Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-yellow-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-yellow-600">{pendingApplications.length}</div>
          <div className="text-xs text-yellow-700">Pending</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-green-600">{acceptedApplications.length}</div>
          <div className="text-xs text-green-700">Accepted</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-600">{rejectedApplications.length}</div>
          <div className="text-xs text-red-700">Rejected</div>
        </div>
      </div>

      {/* Applications */}
      {applications.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <UserIcon size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
          <p className="text-gray-600">Workers will appear here when they apply to your job</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Applications */}
          {pendingApplications.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Pending Applications ({pendingApplications.length})
              </h3>
              <div className="space-y-3">
                {pendingApplications.map(application => {
                  const workerProfile = getWorkerProfile(application.workerId);
                  const jobsCompleted = getWorkerJobsCompleted(application.workerId);
                  return (
                    <div key={application.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                            {workerProfile?.profilePicture ? (
                              <img 
                                src={workerProfile.profilePicture} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <UserIcon size={20} className="text-blue-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{application.workerName}</h4>
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail size={14} className="mr-1" />
                              {application.workerEmail}
                            </div>
                            {workerProfile?.location && (
                              <div className="flex items-center text-sm text-gray-500">
                                <MapPin size={14} className="mr-1" />
                                {workerProfile.location}
                              </div>
                            )}
                            {/* Jobs completed indicator */}
                            <div className="flex items-center text-sm text-green-600 mt-1">
                              <Briefcase size={14} className="mr-1" />
                              <span>{jobsCompleted} job{jobsCompleted !== 1 ? 's' : ''} completed</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleViewProfile(application.workerId)}
                          disabled={loadingProfile}
                          className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Eye size={16} className="mr-1" />
                          {loadingProfile ? 'Loading...' : 'View Profile'}
                        </button>
                      </div>

                      <div className="flex items-center text-sm text-gray-500 mb-4">
                        <Calendar size={14} className="mr-1" />
                        Applied on {formatDate(application.appliedAt)}
                      </div>

                      {application.message && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                          <p className="text-sm text-gray-700">{application.message}</p>
                        </div>
                      )}

                      {job.status !== 'completed' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateApplication(application.id, 'accepted')}
                            disabled={(job.acceptedWorkerIds?.length ?? 0) >= job.requiredWorkers}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                          >
                            <CheckCircle size={16} className="mr-1" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleUpdateApplication(application.id, 'rejected')}
                            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
                          >
                            <XCircle size={16} className="mr-1" />
                            Reject
                          </button>
                        </div>
                      )}
                      {job.status === 'completed' && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                          <span className="text-sm text-gray-600">Job completed - no further actions available</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Accepted Applications */}
          {acceptedApplications.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Accepted Workers ({acceptedApplications.length})
              </h3>
              <div className="space-y-3">
                {acceptedApplications.map(application => {
                  const workerProfile = getWorkerProfile(application.workerId);
                  const jobsCompleted = getWorkerJobsCompleted(application.workerId);
                  return (
                    <div key={application.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                            {workerProfile?.profilePicture ? (
                              <img 
                                src={workerProfile.profilePicture} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <UserIcon size={20} className="text-green-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{application.workerName}</h4>
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail size={14} className="mr-1" />
                              {application.workerEmail}
                            </div>
                            {workerProfile?.location && (
                              <div className="flex items-center text-sm text-gray-500">
                                <MapPin size={14} className="mr-1" />
                                {workerProfile.location}
                              </div>
                            )}
                            {/* Jobs completed indicator */}
                            <div className="flex items-center text-sm text-green-600 mt-1">
                              <Briefcase size={14} className="mr-1" />
                              <span>{jobsCompleted} job{jobsCompleted !== 1 ? 's' : ''} completed</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewProfile(application.workerId)}
                            disabled={loadingProfile}
                            className="flex items-center text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Eye size={16} className="mr-1" />
                            {loadingProfile ? 'Loading...' : 'View Profile'}
                          </button>
                          <div className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Accepted
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rejected Applications */}
          {rejectedApplications.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Rejected Applications ({rejectedApplications.length})
              </h3>
              <div className="space-y-3">
                {rejectedApplications.map(application => {
                  const workerProfile = getWorkerProfile(application.workerId);
                  const jobsCompleted = getWorkerJobsCompleted(application.workerId);
                  return (
                    <div key={application.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                            {workerProfile?.profilePicture ? (
                              <img 
                                src={workerProfile.profilePicture} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <UserIcon size={20} className="text-red-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{application.workerName}</h4>
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail size={14} className="mr-1" />
                              {application.workerEmail}
                            </div>
                            {workerProfile?.location && (
                              <div className="flex items-center text-sm text-gray-500">
                                <MapPin size={14} className="mr-1" />
                                {workerProfile.location}
                              </div>
                            )}
                            {/* Jobs completed indicator */}
                            <div className="flex items-center text-sm text-green-600 mt-1">
                              <Briefcase size={14} className="mr-1" />
                              <span>{jobsCompleted} job{jobsCompleted !== 1 ? 's' : ''} completed</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewProfile(application.workerId)}
                            disabled={loadingProfile}
                            className="flex items-center text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Eye size={16} className="mr-1" />
                            {loadingProfile ? 'Loading...' : 'View Profile'}
                          </button>
                          <div className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Rejected
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Worker Profile Modal */}
      <WorkerProfileModal />
    </div>
  );
}