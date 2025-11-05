import { injectable, inject } from 'inversify';
import { TYPES } from '../types/container.types';
import { IApplicationRepository, ApplicationStats } from '../repositories/application.repository';
import { IJobRepository } from '../repositories/job.repository';
import { IUserRepository } from '../repositories/user.repository';
import { Application, CreateApplicationRequest, UpdateApplicationRequest } from '../types/application.types';
import { Logger } from 'winston';

@injectable()
export class ApplicationService {
  constructor(
    @inject(TYPES.ApplicationRepository) private applicationRepository: IApplicationRepository,
    @inject(TYPES.JobRepository) private jobRepository: IJobRepository,
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async createApplication(userId: string, data: CreateApplicationRequest): Promise<Application> {
    try {
      // Verify job exists
      const job = await this.jobRepository.findById(data.job_id);
      if (!job) {
        throw new Error('Job not found');
      }

      // Check if application already exists
      const existingApplication = await this.applicationRepository.findByUserAndJob(userId, data.job_id);
      if (existingApplication) {
        throw new Error('Application already exists for this job');
      }

      // Create application
      const applicationData = {
        user_id: userId,
        job_id: data.job_id,
        status: 'pending' as const,
        applied_date: new Date(),
        notes: data.notes,
        resume_version: data.resume_version,
        cover_letter: data.cover_letter,
      };

      const application = await this.applicationRepository.create(applicationData);

      this.logger.info('Application created', { userId, jobId: data.job_id, applicationId: application.id });

      return application;
    } catch (error) {
      this.logger.error('Failed to create application', { userId, jobId: data.job_id, error });
      throw error;
    }
  }

  async updateApplication(applicationId: string, userId: string, data: UpdateApplicationRequest): Promise<Application> {
    try {
      // Verify application exists and belongs to user
      const existingApplication = await this.applicationRepository.findById(applicationId);
      if (!existingApplication) {
        throw new Error('Application not found');
      }

      if (existingApplication.user_id !== userId) {
        throw new Error('Unauthorized to update this application');
      }

      // Update application
      const updatedApplication = await this.applicationRepository.update(applicationId, data);

      this.logger.info('Application updated', { userId, applicationId, status: data.status });

      return updatedApplication;
    } catch (error) {
      this.logger.error('Failed to update application', { userId, applicationId, error });
      throw error;
    }
  }

  async getApplicationById(applicationId: string, userId: string): Promise<Application | null> {
    try {
      const application = await this.applicationRepository.findById(applicationId);
      
      if (!application) {
        return null;
      }

      // Verify application belongs to user
      if (application.user_id !== userId) {
        throw new Error('Unauthorized to view this application');
      }

      return application;
    } catch (error) {
      this.logger.error('Failed to get application', { userId, applicationId, error });
      throw error;
    }
  }

  async getUserApplications(userId: string, page: number = 1, limit: number = 20): Promise<{ applications: Application[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      const result = await this.applicationRepository.findByUserIdWithPagination(userId, { limit, offset });

      this.logger.info('Retrieved user applications', { userId, count: result.applications.length });

      return result;
    } catch (error) {
      this.logger.error('Failed to get user applications', { userId, error });
      throw error;
    }
  }

  async deleteApplication(applicationId: string, userId: string): Promise<boolean> {
    try {
      // Verify application exists and belongs to user
      const existingApplication = await this.applicationRepository.findById(applicationId);
      if (!existingApplication) {
        throw new Error('Application not found');
      }

      if (existingApplication.user_id !== userId) {
        throw new Error('Unauthorized to delete this application');
      }

      const deleted = await this.applicationRepository.delete(applicationId);

      this.logger.info('Application deleted', { userId, applicationId });

      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete application', { userId, applicationId, error });
      throw error;
    }
  }

  async getApplicationStats(userId: string): Promise<ApplicationStats> {
    try {
      const stats = await this.applicationRepository.getApplicationStats(userId);

      this.logger.info('Retrieved application stats', { userId, totalApplications: stats.total });

      return stats;
    } catch (error) {
      this.logger.error('Failed to get application stats', { userId, error });
      throw error;
    }
  }

  async getApplicationsByStatus(userId: string, status: string): Promise<Application[]> {
    try {
      const applications = await this.applicationRepository.findByUserIdWithPagination(userId, {
        where: { status },
      });

      return applications.applications;
    } catch (error) {
      this.logger.error('Failed to get applications by status', { userId, status, error });
      throw error;
    }
  }
}