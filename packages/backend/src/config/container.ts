import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../types/container.types';

// Database and Infrastructure
import { DatabaseConnection } from './database-connection';
import { CacheServiceImpl } from '../services/cache-impl.service';
import { IDatabaseConnection, ICacheService } from '../types/repository.types';

// Repositories
import { IUserRepository, UserRepository } from '../repositories/user.repository';
import { IJobRepository, JobRepository } from '../repositories/job.repository';
import { IApplicationRepository, ApplicationRepository } from '../repositories/application.repository';
import { IProfileRepository, ProfileRepository } from '../repositories/profile.repository';

// Services
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';
import { JobService } from '../services/job.service';
import { ApplicationService } from '../services/application.service';
import { CacheInvalidationService } from '../services/cache-invalidation.service';

// Utilities
import { Logger } from 'winston';
import logger from '../services/logger.service';
import { EnhancedErrorHandler } from '../middleware/error-handler-enhanced.middleware';

const container = new Container();

// Database and Infrastructure
container.bind<IDatabaseConnection>(TYPES.DatabaseConnection).to(DatabaseConnection).inSingletonScope();
container.bind<ICacheService>(TYPES.CacheService).to(CacheServiceImpl).inSingletonScope();

// Repositories
container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository).inSingletonScope();
container.bind<IJobRepository>(TYPES.JobRepository).to(JobRepository).inSingletonScope();
container.bind<IApplicationRepository>(TYPES.ApplicationRepository).to(ApplicationRepository).inSingletonScope();
container.bind<IProfileRepository>(TYPES.ProfileRepository).to(ProfileRepository).inSingletonScope();

// Services
container.bind<AuthService>(TYPES.AuthService).to(AuthService).inSingletonScope();
container.bind<ProfileService>(TYPES.ProfileService).to(ProfileService).inSingletonScope();
container.bind<JobService>(TYPES.JobService).to(JobService).inSingletonScope();
container.bind<ApplicationService>(TYPES.ApplicationService).to(ApplicationService).inSingletonScope();
container.bind<CacheInvalidationService>(TYPES.CacheInvalidationService).to(CacheInvalidationService).inSingletonScope();

// Utilities
container.bind<Logger>(TYPES.Logger).toConstantValue(logger);
container.bind<EnhancedErrorHandler>(TYPES.ErrorHandler).to(EnhancedErrorHandler).inSingletonScope();

export { container };