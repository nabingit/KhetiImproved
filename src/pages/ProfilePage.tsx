import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Type as UserType, LogOut, Edit2, Save, X, MapPin, Calendar, Weight, Ruler, Camera, Upload, Phone } from 'lucide-react';
import { jobStorage, applicationStorage } from '../utils/storage';
import { Job, Application } from '../types';

export function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [activityStats, setActivityStats] = useState({
    jobsPosted: 0,
    totalHires: 0,
    applications: 0,
    jobsCompleted: 0
  });
  const [editData, setEditData] = useState({
    name: user?.name || '',
    contactNumber: user?.contactNumber || '',
    location: user?.location || '',
    weight: user?.weight || '',
    height: user?.height || '',
    profilePicture: user?.profilePicture || '',
    workingPicture: user?.workingPicture || ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    if (user) {
      async function fetchData() {
        const jobsData = await jobStorage.getJobs();
        setJobs(jobsData);
        const applicationsData = await applicationStorage.getApplications();
        setApplications(applicationsData);
        calculateActivityStats(jobsData, applicationsData);
      }
      fetchData();
    }
  }, [user]);

  const calculateActivityStats = (allJobs: Job[], allApplications: Application[]) => {
    if (!user) return;
    if (user.userType === 'farmer') {
      const userJobs = allJobs.filter((job: Job) => job.farmerId === user.id);
      const jobsPosted = userJobs.length;
      const totalHires = userJobs.reduce((total: number, job: Job) => total + (job.acceptedWorkerIds?.length || 0), 0);
      setActivityStats({ jobsPosted, totalHires, applications: 0, jobsCompleted: 0 });
    } else {
      const userApplications = allApplications.filter((app: Application) => app.workerId === user.id);
      const applicationsCount = userApplications.length;
      const acceptedApplications = userApplications.filter((app: Application) => app.status === 'accepted');
      const jobsCompleted = acceptedApplications.filter((app: Application) => {
        const job = jobs.find((j: Job) => j.id === app.jobId);
        return job && job.status === 'completed';
      }).length;
      setActivityStats({ jobsPosted: 0, totalHires: 0, applications: applicationsCount, jobsCompleted });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const formatContactNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10);
    
    // Format as XXX-XXX-XXXX if more than 6 digits, or XXX-XXX if more than 3 digits
    if (limitedDigits.length > 6) {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
    } else if (limitedDigits.length > 3) {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3)}`;
    }
    return limitedDigits;
  };

  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatContactNumber(e.target.value);
    setEditData({ ...editData, contactNumber: formatted });
  };

  const validateContactNumber = (contactNumber: string): boolean => {
    // Remove all non-digit characters
    const cleanNumber = contactNumber.replace(/\D/g, '');
    
    // Check if it's a valid Indian mobile number (10 digits starting with 6-9)
    const indianMobileRegex = /^[6-9]\d{9}$/;
    return indianMobileRegex.test(cleanNumber);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'working') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, [type]: 'Please select a valid image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, [type]: 'Image size should be less than 5MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (type === 'profile') {
        setEditData({ ...editData, profilePicture: result });
      } else {
        setEditData({ ...editData, workingPicture: result });
      }
      // Clear error for this field
      const newErrors = { ...errors };
      delete newErrors[type];
      setErrors(newErrors);
    };
    reader.readAsDataURL(file);
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!editData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!editData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required';
    } else if (!validateContactNumber(editData.contactNumber)) {
      newErrors.contactNumber = 'Please enter a valid 10-digit mobile number';
    } else {
      // Check if contact number is already used by another user
      const users = JSON.parse(localStorage.getItem('kheticulture_users') || '[]');
      const cleanNumber = editData.contactNumber.replace(/\D/g, '');
      const existingUser = users.find((u: any) => u.contactNumber === cleanNumber && u.id !== user?.id);
      if (existingUser) {
        newErrors.contactNumber = 'This contact number is already registered';
      }
    }

    if (user?.userType === 'worker') {
      if (!editData.location.trim()) {
        newErrors.location = 'Location is required for workers';
      }

      if (!editData.weight || parseFloat(editData.weight.toString()) <= 0) {
        newErrors.weight = 'Please enter a valid weight';
      } else if (parseFloat(editData.weight.toString()) > 300) {
        newErrors.weight = 'Weight seems too high';
      }

      if (!editData.height || parseFloat(editData.height.toString()) <= 0) {
        newErrors.height = 'Please enter a valid height';
      } else if (parseFloat(editData.height.toString()) > 250) {
        newErrors.height = 'Height seems too high';
      }

      if (!editData.profilePicture) {
        newErrors.profilePicture = 'Profile picture is required for workers';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const updates: Partial<typeof user> = {
      name: editData.name.trim(),
      contactNumber: editData.contactNumber.replace(/\D/g, ''), // Store only digits
      location: editData.location.trim() || undefined,
      weight: editData.weight ? parseFloat(editData.weight.toString()) : undefined,
      height: editData.height ? parseFloat(editData.height.toString()) : undefined,
      profilePicture: editData.profilePicture || undefined,
      workingPicture: editData.workingPicture || undefined
    };

    updateUser(updates);
    setIsEditing(false);
    setErrors({});
    // Recalculate stats after update
    calculateActivityStats(jobs, applications);
  };

  const handleCancel = () => {
    setEditData({ 
      name: user?.name || '',
      contactNumber: user?.contactNumber || '',
      location: user?.location || '',
      weight: user?.weight || '',
      height: user?.height || '',
      profilePicture: user?.profilePicture || '',
      workingPicture: user?.workingPicture || ''
    });
    setIsEditing(false);
    setErrors({});
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

  const formatDisplayContactNumber = (contactNumber: string): string => {
    if (contactNumber && contactNumber.length === 10) {
      return `${contactNumber.slice(0, 3)}-${contactNumber.slice(3, 6)}-${contactNumber.slice(6)}`;
    }
    return contactNumber || '';
  };

  if (!user) {
    return null;
  }

  const isWorker = user.userType === 'worker';
  const isFarmer = user.userType === 'farmer';
  const showProfileIncomplete = isWorker && (!user.profilePicture || !user.weight || !user.height);

  // Get theme colors based on user type
  const themeColors = {
    gradient: isFarmer ? 'from-green-500 to-green-600' : 'from-blue-500 to-blue-600',
    primary: isFarmer ? 'green' : 'blue',
    bgLight: isFarmer ? 'bg-green-50' : 'bg-blue-50',
    borderLight: isFarmer ? 'border-green-200' : 'border-blue-200',
    textPrimary: isFarmer ? 'text-green-600' : 'text-blue-600',
    bgPrimary: isFarmer ? 'bg-green-600' : 'bg-blue-600',
    hoverPrimary: isFarmer ? 'hover:bg-green-700' : 'hover:bg-blue-700',
    focusRing: isFarmer ? 'focus:ring-green-500' : 'focus:ring-blue-500'
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`p-2 text-gray-600 hover:${themeColors.textPrimary} hover:${themeColors.bgLight} rounded-lg transition-colors`}
        >
          {isEditing ? <X size={20} /> : <Edit2 size={20} />}
        </button>
      </div>

      {showProfileIncomplete && !isEditing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-yellow-600 mr-3">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Complete Your Profile</h3>
              <p className="text-sm text-yellow-700">Add your profile picture, weight, and height to improve your job applications.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Profile Header */}
        <div className={`bg-gradient-to-r ${themeColors.gradient} px-6 py-8`}>
          <div className="flex items-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 overflow-hidden">
              {user.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={32} className="text-white" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{user.name}</h2>
              <div className={`flex items-center ${isFarmer ? 'text-green-100' : 'text-blue-100'}`}>
                <UserType size={16} className="mr-1" />
                <span className="capitalize">{user.userType}</span>
                {user.userType === 'worker' && user.dateOfBirth && (
                  <span className="ml-2">• {calculateAge(user.dateOfBirth)} years old</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            {isEditing ? (
              <div>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${themeColors.focusRing} focus:border-transparent`}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>
            ) : (
              <div className="flex items-center py-3">
                <User size={20} className="text-gray-400 mr-3" />
                <span className="text-gray-900">{user.name}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="flex items-center py-3">
              <Mail size={20} className="text-gray-400 mr-3" />
              <span className="text-gray-900">{user.email}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number *
            </label>
            {isEditing ? (
              <div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    value={editData.contactNumber}
                    onChange={handleContactNumberChange}
                    className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${themeColors.focusRing} focus:border-transparent`}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={12} // XXX-XXX-XXXX format
                  />
                </div>
                {errors.contactNumber && <p className="text-red-500 text-sm mt-1">{errors.contactNumber}</p>}
              </div>
            ) : (
              <div className="flex items-center py-3">
                <Phone size={20} className="text-gray-400 mr-3" />
                <span className="text-gray-900">{formatDisplayContactNumber(user.contactNumber)}</span>
              </div>
            )}
          </div>

          {/* Location field for both farmers and workers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location {isWorker ? '*' : '(Optional)'}
            </label>
            {isEditing ? (
              <div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={editData.location}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${themeColors.focusRing} focus:border-transparent`}
                    placeholder={isFarmer ? "Home location (Village/Town, District)" : "Village/Town, District"}
                  />
                </div>
                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
              </div>
            ) : (
              <div className="flex items-center py-3">
                <MapPin size={20} className="text-gray-400 mr-3" />
                <span className="text-gray-900">{user.location || 'Not provided'}</span>
              </div>
            )}
          </div>

          {/* Profile Picture for both farmers and workers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profile Picture {isWorker ? '*' : '(Optional)'}
            </label>
            {isEditing ? (
              <div>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {editData.profilePicture ? (
                      <img 
                        src={editData.profilePicture} 
                        alt="Profile preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera size={24} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'profile')}
                      className="hidden"
                      id="profile-upload"
                    />
                    <label
                      htmlFor="profile-upload"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                    >
                      <Upload size={16} className="mr-2" />
                      Upload Photo
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG</p>
                  </div>
                </div>
                {errors.profilePicture && <p className="text-red-500 text-sm mt-1">{errors.profilePicture}</p>}
              </div>
            ) : (
              <div className="flex items-center py-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-3 overflow-hidden">
                  {user.profilePicture ? (
                    <img 
                      src={user.profilePicture} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera size={20} className="text-gray-400" />
                  )}
                </div>
                <span className="text-gray-900">
                  {user.profilePicture ? 'Profile photo uploaded' : 'No profile photo'}
                </span>
              </div>
            )}
          </div>

          {/* Worker-specific fields */}
          {isWorker && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg) *
                  </label>
                  {isEditing ? (
                    <div>
                      <div className="relative">
                        <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="number"
                          value={editData.weight}
                          onChange={(e) => setEditData({ ...editData, weight: e.target.value })}
                          className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${themeColors.focusRing} focus:border-transparent`}
                          placeholder="70"
                          min="30"
                          max="300"
                        />
                      </div>
                      {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center py-3">
                      <Weight size={20} className="text-gray-400 mr-3" />
                      <span className="text-gray-900">{user.weight ? `${user.weight} kg` : 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height (cm) *
                  </label>
                  {isEditing ? (
                    <div>
                      <div className="relative">
                        <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="number"
                          value={editData.height}
                          onChange={(e) => setEditData({ ...editData, height: e.target.value })}
                          className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${themeColors.focusRing} focus:border-transparent`}
                          placeholder="170"
                          min="100"
                          max="250"
                        />
                      </div>
                      {errors.height && <p className="text-red-500 text-sm mt-1">{errors.height}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center py-3">
                      <Ruler size={20} className="text-gray-400 mr-3" />
                      <span className="text-gray-900">{user.height ? `${user.height} cm` : 'Not provided'}</span>
                    </div>
                  )}
                </div>
              </div>

              {user.weight && user.height && !isEditing && (
                <div className={`${themeColors.bgLight} rounded-lg p-4`}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Health Information</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">BMI:</span>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">
                        {calculateBMI(user.weight, user.height)}
                      </span>
                      <span className={`ml-2 text-sm font-medium ${getBMICategory(parseFloat(calculateBMI(user.weight, user.height))).color}`}>
                        {getBMICategory(parseFloat(calculateBMI(user.weight, user.height))).category}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Working Picture (Optional)
                </label>
                {isEditing ? (
                  <div>
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {editData.workingPicture ? (
                          <img 
                            src={editData.workingPicture} 
                            alt="Working preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Camera size={24} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'working')}
                          className="hidden"
                          id="working-upload"
                        />
                        <label
                          htmlFor="working-upload"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                        >
                          <Upload size={16} className="mr-2" />
                          Upload Photo
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Show yourself at work</p>
                      </div>
                    </div>
                    {errors.working && <p className="text-red-500 text-sm mt-1">{errors.working}</p>}
                  </div>
                ) : (
                  <div className="flex items-center py-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-3 overflow-hidden">
                      {user.workingPicture ? (
                        <img 
                          src={user.workingPicture} 
                          alt="Working" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera size={20} className="text-gray-400" />
                      )}
                    </div>
                    <span className="text-gray-900">
                      {user.workingPicture ? 'Working photo uploaded' : 'No working photo'}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {user.dateOfBirth && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <div className="flex items-center py-3">
                <Calendar size={20} className="text-gray-400 mr-3" />
                <span className="text-gray-900">
                  {formatDate(user.dateOfBirth)} ({calculateAge(user.dateOfBirth)} years old)
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type
            </label>
            <div className="flex items-center py-3">
              <UserType size={20} className="text-gray-400 mr-3" />
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.userType === 'farmer' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {user.userType === 'farmer' ? 'Farmer (Job Poster)' : 'Worker (Job Seeker)'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member Since
            </label>
            <div className="flex items-center py-3">
              <span className="text-gray-900">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          {isEditing && (
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleSave}
                className={`flex-1 ${themeColors.bgPrimary} text-white py-3 px-4 rounded-lg font-medium ${themeColors.hoverPrimary} transition-colors flex items-center justify-center`}
              >
                <Save size={16} className="mr-2" />
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center"
              >
                <X size={16} className="mr-2" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Activity Summary with Real Data */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className={`text-center p-4 ${themeColors.bgLight} rounded-lg`}>
            <div className={`text-2xl font-bold ${themeColors.textPrimary}`}>
              {user.userType === 'farmer' ? activityStats.jobsPosted : activityStats.applications}
            </div>
            <div className="text-sm text-gray-600">
              {user.userType === 'farmer' ? 'Jobs Posted' : 'Applications'}
            </div>
          </div>
          <div className={`text-center p-4 ${isFarmer ? 'bg-blue-50' : 'bg-green-50'} rounded-lg`}>
            <div className={`text-2xl font-bold ${isFarmer ? 'text-blue-600' : 'text-green-600'}`}>
              {user.userType === 'farmer' ? activityStats.totalHires : activityStats.jobsCompleted}
            </div>
            <div className="text-sm text-gray-600">
              {user.userType === 'farmer' ? 'Total Hires' : 'Jobs Completed'}
            </div>
          </div>
        </div>
        
        {/* Additional stats for farmers */}
        {user.userType === 'farmer' && activityStats.jobsPosted > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Average Hires per Job</div>
              <div className="text-lg font-semibold text-gray-900">
                {(activityStats.totalHires / activityStats.jobsPosted).toFixed(1)}
              </div>
            </div>
          </div>
        )}
        
        {/* Additional stats for workers */}
        {user.userType === 'worker' && activityStats.applications > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Success Rate</div>
              <div className="text-lg font-semibold text-gray-900">
                {activityStats.applications > 0 
                  ? Math.round((activityStats.jobsCompleted / activityStats.applications) * 100)
                  : 0}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logout Button */}
      <div className="mt-6">
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
        >
          <LogOut size={16} className="mr-2" />
          Logout
        </button>
      </div>
    </div>
  );
}