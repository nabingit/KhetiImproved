import { Job, Application } from '../types';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { WageValidator } from './wageValidation';

export const jobStorage = {
  getJobs: async (): Promise<Job[]> => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limit initial load to prevent performance issues
      
      if (error) throw error;
      
      return data?.map(job => ({
        id: job.id,
        farmerId: job.farmer_id,
        farmerName: job.farmer_name,
        title: job.title,
        description: job.description,
        preferredDate: job.preferred_date || '',
        wage: job.wage,
        duration: job.duration,
        durationType: job.duration_type,
        location: job.location,
        requiredWorkers: job.required_workers,
        acceptedWorkerIds: job.accepted_worker_ids || [],
        status: job.status,
        createdAt: job.created_at
      })) || [];
    } catch (error) {
      console.error('Error fetching jobs:', error);
      throw error; // Re-throw to handle in component
    }
  },
  
  saveJob: async (job: Job): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('jobs')
        .insert({
          farmer_id: job.farmerId,
          farmer_name: job.farmerName,
          title: job.title,
          description: job.description,
          preferred_date: job.preferredDate || null,
          wage: job.wage,
          duration: job.duration,
          duration_type: job.durationType,
          location: job.location,
          required_workers: job.requiredWorkers,
          status: job.status
        });
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: handleSupabaseError(error) };
    }
  },
  
  updateJob: async (jobId: string, updates: Partial<Job>): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get current job data for validation
      const jobs = await jobStorage.getJobs();
      const currentJob = jobs.find(j => j.id === jobId);
      
      if (!currentJob) {
        return { success: false, error: 'Job not found' };
      }

      // Prevent editing of completed jobs
      if (currentJob.status === 'completed' && Object.keys(updates).some(key => key !== 'status')) {
        return { success: false, error: 'Cannot edit completed jobs. The job has been closed.' };
      }

      // Validate wage changes if wage is being updated
      if (updates.wage !== undefined && updates.wage !== currentJob.wage) {
        // Get applications for this job to check if wage changes are allowed
        const applications = await applicationStorage.getApplications();
        const jobApplications = applications.filter(app => app.jobId === jobId);
        
        // Strict rule: No wage changes whatsoever if any applications exist
        if (jobApplications.length > 0) {
          return { 
            success: false, 
            error: `Cannot modify wage. ${jobApplications.length} worker${jobApplications.length !== 1 ? 's have' : ' has'} already applied based on the current wage of ₹${currentJob.wage}. Wage changes are locked once applications are received.`
          };
        }
        
        const wageValidation = WageValidator.validateWageChange(
          currentJob.wage,
          updates.wage,
          jobApplications.length > 0,
          currentJob.acceptedWorkerIds?.length || 0
        );

        if (!wageValidation.canModify) {
          const errorMessage = WageValidator.getWageErrorMessage(
            currentJob.wage,
            updates.wage,
            jobApplications.length > 0,
            jobApplications.length
          );
          return { success: false, error: errorMessage || wageValidation.reason };
        }
      }

      const updateData: any = {};
      
      if (updates.wage !== undefined) updateData.wage = updates.wage;
      if (updates.requiredWorkers !== undefined) updateData.required_workers = updates.requiredWorkers;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.acceptedWorkerIds !== undefined) updateData.accepted_worker_ids = updates.acceptedWorkerIds;
      
      const { error } = await supabase
        .from('jobs')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      if (error) throw error;
      
      console.log(`Job ${jobId} updated successfully:`, updateData);
      return { success: true };
    } catch (error) {
      console.error(`Failed to update job ${jobId}:`, error);
      return { success: false, error: handleSupabaseError(error) };
    }
  },

  validateJobUpdate: async (jobId: string, updates: Partial<Job>): Promise<{ valid: boolean; error?: string }> => {
    try {
      const jobs = await jobStorage.getJobs();
      const currentJob = jobs.find(j => j.id === jobId);
      
      if (!currentJob) {
        return { valid: false, error: 'Job not found' };
      }

      // Validate wage if being updated
      if (updates.wage !== undefined) {
        const applications = await applicationStorage.getApplications();
        const jobApplications = applications.filter(app => app.jobId === jobId);
        
        if (!WageValidator.isWageValid(updates.wage, currentJob.wage, jobApplications.length > 0)) {
          return { 
            valid: false, 
            error: WageValidator.getWageErrorMessage(
              currentJob.wage,
              updates.wage,
              jobApplications.length > 0,
              jobApplications.length
            )
          };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: handleSupabaseError(error) };
    }
  },

  deleteJob: async (jobId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: handleSupabaseError(error) };
    }
  }
};

export const applicationStorage = {
  getApplications: async (): Promise<Application[]> => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('applied_at', { ascending: false })
        .limit(200); // Limit initial load
      
      if (error) throw error;
      
      return data?.map(app => ({
        id: app.id,
        jobId: app.job_id,
        workerId: app.worker_id,
        workerName: app.worker_name,
        workerEmail: app.worker_email,
        message: app.message || undefined,
        status: app.status,
        appliedAt: app.applied_at,
        rejectedAt: app.rejected_at || undefined
      })) || [];
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error; // Re-throw to handle in component
    }
  },
  
  saveApplication: async (application: Application): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('applications')
        .insert({
          job_id: application.jobId,
          worker_id: application.workerId,
          worker_name: application.workerName,
          worker_email: application.workerEmail,
          message: application.message || null,
          status: application.status,
          applied_at: application.appliedAt
        });
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: handleSupabaseError(error) };
    }
  },
  
  updateApplication: async (applicationId: string, updates: Partial<Application>): Promise<{ success: boolean; error?: string }> => {
    try {
      const updateData: any = {};
      
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.appliedAt !== undefined) updateData.applied_at = updates.appliedAt;
      if (updates.rejectedAt !== undefined) updateData.rejected_at = updates.rejectedAt;
      
      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', applicationId);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: handleSupabaseError(error) };
    }
  },

  getApplicationsForJob: async (jobId: string): Promise<Application[]> => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId)
        .order('applied_at', { ascending: false });
      
      if (error) throw error;
      
      return data?.map(app => ({
        id: app.id,
        jobId: app.job_id,
        workerId: app.worker_id,
        workerName: app.worker_name,
        workerEmail: app.worker_email,
        message: app.message || undefined,
        status: app.status,
        appliedAt: app.applied_at,
        rejectedAt: app.rejected_at || undefined
      })) || [];
    } catch (error) {
      console.error('Error fetching job applications:', error);
      return [];
    }
  },

  getApplicationsForWorker: async (workerId: string): Promise<Application[]> => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('worker_id', workerId)
        .order('applied_at', { ascending: false });
      
      if (error) throw error;
      
      return data?.map(app => ({
        id: app.id,
        jobId: app.job_id,
        workerId: app.worker_id,
        workerName: app.worker_name,
        workerEmail: app.worker_email,
        message: app.message || undefined,
        status: app.status,
        appliedAt: app.applied_at,
        rejectedAt: app.rejected_at || undefined
      })) || [];
    } catch (error) {
      console.error('Error fetching worker applications:', error);
      return [];
    }
  }
};