import React from 'react';
import { Calendar, Clock, MapPin, DollarSign, User, Users, Eye } from 'lucide-react';
import { Job } from '../types';

interface JobCardProps {
  job: Job;
  onApply?: (jobId: string) => void;
  onViewApplicants?: (jobId: string) => void;
  onViewFarmerProfile?: (farmerId: string) => void;
  showActions?: boolean;
  isOwner?: boolean;
  canApply?: boolean;
  applicationStatus?: 'pending' | 'accepted' | 'rejected' | null;
}

export function JobCard({ 
  job, 
  onApply, 
  onViewApplicants, 
  onViewFarmerProfile,
  showActions = true, 
  isOwner = false,
  canApply = true,
  applicationStatus = null
}: JobCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

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

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canApplyToJob = () => {
    if (!canApply || applicationStatus) return false;
    // Check if job is actually open (not filled, completed, or in-progress)
    return job.status === 'open';
  };

  const getApplyButtonText = () => {
    if (applicationStatus === 'pending') return 'Application Pending';
    if (applicationStatus === 'accepted') return 'Application Accepted';
    if (applicationStatus === 'rejected') return 'Application Rejected';
    if (job.status === 'completed') return 'Job Completed';
    if (job.status === 'filled') return 'All Positions Filled';
    if (job.status === 'in-progress') return 'Job In Progress';
    if ((job.acceptedWorkerIds?.length ?? 0) >= job.requiredWorkers) return 'All Positions Filled';
    return 'Apply Now';
  };

  return (
    <div className="bg-white rounded-xl border border-green-100 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900 text-lg">{job.title}</h3>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
            {getStatusText(job.status)}
          </span>
          {applicationStatus && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getApplicationStatusColor(applicationStatus)}`}>
              {applicationStatus}
            </span>
          )}
        </div>
      </div>
      
      <p className="text-gray-600 mb-4 line-clamp-2">{job.description}</p>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600">
            <User size={16} className="mr-2 text-green-600" />
            <span>{job.farmerName}</span>
          </div>
          {!isOwner && onViewFarmerProfile && (
            <button
              onClick={() => onViewFarmerProfile(job.farmerId)}
              className="flex items-center text-blue-600 hover:text-blue-700 text-xs font-medium"
            >
              <Eye size={14} className="mr-1" />
              View Profile
            </button>
          )}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <DollarSign size={16} className="mr-2 text-green-600" />
          <span className="font-semibold">NPR.{job.wage.toLocaleString()}</span>
          <span className="ml-1">per {job.durationType.slice(0, -1)}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Clock size={16} className="mr-2 text-green-600" />
          <span>{job.duration} {job.durationType}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Calendar size={16} className="mr-2 text-green-600" />
          <span>{formatDate(job.preferredDate)}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <MapPin size={16} className="mr-2 text-green-600" />
          <span>{job.location}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Users size={16} className="mr-2 text-green-600" />
          <span>
            {job.acceptedWorkerIds?.length ?? 0}/{job.requiredWorkers} workers
            {job.requiredWorkers > 1 ? ' needed' : ' needed'}
          </span>
        </div>
      </div>
      
      {showActions && (
        <div className="flex gap-2">
          {isOwner ? (
            <>
              {job.status !== 'completed' ? (
                <button
                  onClick={() => onViewApplicants?.(job.id)}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  View Applicants
                </button>
              ) : (
                <div className="flex-1 bg-gray-100 text-gray-500 py-3 px-4 rounded-lg font-medium text-center">
                  Job Completed & Closed
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => onApply?.(job.id)}
              disabled={!canApplyToJob()}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {getApplyButtonText()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}