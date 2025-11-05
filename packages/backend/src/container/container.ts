/**
 * Dependency injection container configuration
 */

import { Container } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '../types/container.types';

// Services
import { CacheService } from '../services/cache.service';
import { DatabaseService } from '../services/database.service';

// Repositories
import { UserRepository, IUserRepository } from '../repositories/user.repository';

// Types
import { 
  ICacheService, 
  IDatabaseConnection, 
  ITransactionManager,
  IRepository 
} from '../types/repository.types';
import { User } from '../types/entities.types';

// Configuration
import { createLogger } from '../config/logger.config';
import { getDatabaseConfig } from '../config/database.config';
import { getCacheConfig } from '../config/cache.config';

const container = new Container();

// Configuration bindings
container.bind(TYPES.Config).toConstantValue({
  database: getDatabaseConfig(),
  cache: getCacheConfig(),
  // Add other config as needed
});

container.bind(TYPES.DatabaseConfig).toConstantValue(getDatabaseConfig());

// Logger binding
container.bind<Logger>(TYPES.Logger).toConstantValue(createLogger());

// Database service bindings
container.bind<IDatabaseConnection>(TYPES.DatabaseConnection)
  .to(DatabaseService)
  .inSingletonScope();

container.bind<ITransactionManager>(TYPES.TransactionManager)
  .toService(TYPES.DatabaseConnection);

// Cache service binding
container.bind<ICacheService>(TYPES.CacheService)
  .to(CacheService)
  .inSingletonScope();

// Repository bindings
container.bind<IUserRepository>(TYPES.UserRepository)
  .to(UserRepository)
  .inSingletonScope();

// Service bindings
import { UserService, IUserService } from '../services/user.service';
import { PythonServiceClient, IPythonServiceClient } from '../services/python-service-client';

container.bind<IUserService>(TYPES.UserService)
  .to(UserService)
  .inSingletonScope();

// Service client bindings
container.bind<IPythonServiceClient>(TYPES.PythonServiceClient)
  .to(PythonServiceClient)
  .inSingletonScope();

// Service authentication and registry
import { ServiceAuthService, IServiceAuthService } from '../services/service-auth.service';
import { ServiceRegistry, IServiceRegistry } from '../services/service-registry.service';
import { ServiceAuthMiddleware, IServiceAuthMiddleware } from '../middleware/service-auth.middleware';

container.bind<IServiceAuthService>(TYPES.ServiceAuthService)
  .to(ServiceAuthService)
  .inSingletonScope();

container.bind<IServiceRegistry>(TYPES.ServiceRegistry)
  .to(ServiceRegistry)
  .inSingletonScope();

container.bind<IServiceAuthMiddleware>(TYPES.ServiceAuthMiddleware)
  .to(ServiceAuthMiddleware)
  .inSingletonScope();

// Graceful degradation services
import { GracefulDegradationService, IGracefulDegradationService } from '../services/graceful-degradation.service';
import { ServiceHealthMonitor, IServiceHealthMonitor } from '../services/service-health-monitor.service';

container.bind<IGracefulDegradationService>(TYPES.GracefulDegradationService)
  .to(GracefulDegradationService)
  .inSingletonScope();

container.bind<IServiceHealthMonitor>(TYPES.ServiceHealthMonitor)
  .to(ServiceHealthMonitor)
  .inSingletonScope();

// Distributed tracing services
import { DistributedTracingService, IDistributedTracingService } from '../services/distributed-tracing.service';
import { TracingMiddleware, ITracingMiddleware } from '../middleware/tracing.middleware';

container.bind<IDistributedTracingService>(TYPES.DistributedTracingService)
  .to(DistributedTracingService)
  .inSingletonScope();

container.bind<ITracingMiddleware>(TYPES.TracingMiddleware)
  .to(TracingMiddleware)
  .inSingletonScope();

// Export the configured container
export { container };

// Helper function to get services
export function getService<T>(serviceIdentifier: symbol): T {
  return container.get<T>(serviceIdentifier);
}

// Helper function to check if service is bound
export function isBound(serviceIdentifier: symbol): boolean {
  return container.isBound(serviceIdentifier);
}

// Container initialization function
export async function initializeContainer(): Promise<void> {
  try {
    // Initialize database connection
    const dbService = container.get<DatabaseService>(TYPES.DatabaseConnection);
    await dbService.connect();

    // Initialize cache service (Redis connection is lazy)
    const cacheService = container.get<CacheService>(TYPES.CacheService);
    const cacheHealth = await cacheService.healthCheck();
    
    const logger = container.get<Logger>(TYPES.Logger);
    logger.info('Container initialized successfully', {
      database: 'connected',
      cache: cacheHealth.redis ? 'redis-connected' : 'memory-only'
    });

  } catch (error) {
    const logger = container.get<Logger>(TYPES.Logger);
    logger.error('Failed to initialize container', { error: error.message });
    throw error;
  }
}

// Graceful shutdown function
export async function shutdownContainer(): Promise<void> {
  try {
    const logger = container.get<Logger>(TYPES.Logger);
    
    // Shutdown database
    if (container.isBound(TYPES.DatabaseConnection)) {
      const dbService = container.get<DatabaseService>(TYPES.DatabaseConnection);
      await dbService.disconnect();
    }

    // Shutdown cache
    if (container.isBound(TYPES.CacheService)) {
      const cacheService = container.get<CacheService>(TYPES.CacheService);
      await cacheService.disconnect();
    }

    logger.info('Container shutdown completed');
  } catch (error) {
    const logger = container.get<Logger>(TYPES.Logger);
    logger.error('Error during container shutdown', { error: error.message });
    throw error;
  }
}