import { Job } from '../types';
import { jobStorage } from './storage';

export class JobStatusManager {
  /**
   * Updates job status based on accepted workers and job date
   */
  static async updateJobStatus(job: Job): Promise<Job> {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    const jobDate = new Date(job.preferredDate);
    jobDate.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const acceptedWorkers = job.acceptedWorkerIds?.length || 0;
    let newStatus = job.status;
    
    // Auto-change to 'filled' when required workers are reached and job is open
    if (acceptedWorkers >= job.requiredWorkers && job.status === 'open') {
      newStatus = 'filled';
      console.log(`Job ${job.id} status changed to 'filled' - all ${job.requiredWorkers} positions filled`);
    }
    
    // Auto-change to 'in-progress' if job date has arrived and workers are accepted
    if (jobDate <= today && acceptedWorkers > 0 && (job.status === 'open' || job.status === 'filled')) {
      newStatus = 'in-progress';
      console.log(`Job ${job.id} status changed to 'in-progress' - job date has arrived`);
    }
    
    // If status changed, update the job in database
    if (newStatus !== job.status) {
      const updateResult = await jobStorage.updateJob(job.id, { status: newStatus });
      if (updateResult.success) {
        const updatedJob = { ...job, status: newStatus };
        console.log(`Job ${job.id} status updated from '${job.status}' to '${newStatus}'`);
        return updatedJob;
      } else {
        console.error(`Failed to update job ${job.id} status:`, updateResult.error);
        return job;
      }
    }
    
    return job;
  }
  
  /**
   * Updates all jobs' statuses based on current conditions
   */
  static async updateAllJobStatuses(): Promise<Job[]> {
    try {
      const allJobs = await jobStorage.getJobs();
      const updatedJobs: Job[] = [];
      let hasUpdates = false;
      
      for (const job of allJobs) {
        // Only process jobs that are not completed
        if (job.status !== 'completed') {
          const updatedJob = await this.checkJobStatus(job);
          updatedJobs.push(updatedJob);
          if (updatedJob.status !== job.status) {
            hasUpdates = true;
          }
        } else {
          updatedJobs.push(job);
        }
      }
      
      // Only perform database updates if there are actual changes
      if (hasUpdates) {
        console.log('Updating job statuses in database...');
        // Update jobs with changed statuses
        for (const job of updatedJobs) {
          const originalJob = allJobs.find(j => j.id === job.id);
          if (originalJob && originalJob.status !== job.status) {
            await jobStorage.updateJob(job.id, { status: job.status });
          }
        }
      }
      
      return updatedJobs;
    } catch (error) {
      console.error('Error updating job statuses:', error);
      return await jobStorage.getJobs();
    }
  }
  
  /**
   * Checks what the job status should be without updating the database
   */
  static checkJobStatus(job: Job): Job {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const jobDate = new Date(job.preferredDate);
    jobDate.setHours(0, 0, 0, 0);
    
    const acceptedWorkers = job.acceptedWorkerIds?.length || 0;
    let newStatus = job.status;
    
    // Auto-change to 'filled' when required workers are reached and job is open
    if (acceptedWorkers >= job.requiredWorkers && job.status === 'open') {
      newStatus = 'filled';
    }
    
    // Auto-change to 'in-progress' if job date has arrived and workers are accepted
    if (jobDate <= today && acceptedWorkers > 0 && (job.status === 'open' || job.status === 'filled')) {
      newStatus = 'in-progress';
    }
    
    return { ...job, status: newStatus };
  }
  
  /**
   * Checks if a job should automatically change status when workers are accepted
   */
  static async checkStatusAfterWorkerAccepted(jobId: string): Promise<Job | null> {
    try {
      const allJobs = await jobStorage.getJobs();
      const job = allJobs.find(j => j.id === jobId);
      
      if (job) {
        const updatedJob = await this.updateJobStatus(job);
        return updatedJob;
      }
      
      return null;
    } catch (error) {
      console.error('Error checking job status after worker accepted:', error);
      return null;
    }
  }
  
  /**
   * Updates a single job's status and returns the updated job
   */
  static async refreshJobStatus(jobId: string): Promise<Job | null> {
    try {
      const allJobs = await jobStorage.getJobs();
      const job = allJobs.find(j => j.id === jobId);
      
      if (job) {
        return await this.updateJobStatus(job);
      }
      
      return null;
    } catch (error) {
      console.error('Error refreshing job status:', error);
      return null;
    }
  }
  
  /**
   * Checks if a job should automatically transition to in-progress based on date
   */
  static isJobDateReached(jobDate: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const preferredDate = new Date(jobDate);
    preferredDate.setHours(0, 0, 0, 0);
    
    return preferredDate <= today;
  }
  
  /**
   * Checks if a job should automatically transition to filled based on worker count
   */
  static isJobFilled(job: Job): boolean {
    const acceptedWorkers = job.acceptedWorkerIds?.length || 0;
    return acceptedWorkers >= job.requiredWorkers;
  }
}