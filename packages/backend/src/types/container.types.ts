/**
 * Dependency injection container type identifiers
 */

export const TYPES = {
  // Database
  Database: Symbol.for('Database'), // Added for Pool compatibility
  DatabaseConnection: Symbol.for('DatabaseConnection'),
  TransactionManager: Symbol.for('TransactionManager'),
  
  // Cache
  Redis: Symbol.for('Redis'), // Added for Redis client
  CacheService: Symbol.for('CacheService'),
  
  // Logging
  Logger: Symbol.for('Logger'),
  
  // Repositories
  UserRepository: Symbol.for('UserRepository'),
  JobRepository: Symbol.for('JobRepository'),
  ApplicationRepository: Symbol.for('ApplicationRepository'),
  SkillRepository: Symbol.for('SkillRepository'),
  ExperienceRepository: Symbol.for('ExperienceRepository'),
  EducationRepository: Symbol.for('EducationRepository'),
  DocumentRepository: Symbol.for('DocumentRepository'),
  InterviewPrepRepository: Symbol.for('InterviewPrepRepository'),
  JobAlertRepository: Symbol.for('JobAlertRepository'),
  
  // Services
  AuthService: Symbol.for('AuthService'),
  EnhancedAuthService: Symbol.for('EnhancedAuthService'), // Added for enhanced auth
  UserService: Symbol.for('UserService'),
  JobService: Symbol.for('JobService'),
  JobMatchingService: Symbol.for('JobMatchingService'),
  ApplicationService: Symbol.for('ApplicationService'),
  DocumentGenerationService: Symbol.for('DocumentGenerationService'),
  InterviewPrepService: Symbol.for('InterviewPrepService'),
  AnalyticsService: Symbol.for('AnalyticsService'),
  EmailService: Symbol.for('EmailService'),
  NotificationService: Symbol.for('NotificationService'),
  SkillScoringService: Symbol.for('SkillScoringService'),
  
  // External Services
  OpenAIService: Symbol.for('OpenAIService'),
  PineconeService: Symbol.for('PineconeService'),
  LinkedInService: Symbol.for('LinkedInService'),
  AdzunaService: Symbol.for('AdzunaService'),
  ResendService: Symbol.for('ResendService'),
  
  // Middleware
  AuthMiddleware: Symbol.for('AuthMiddleware'),
  ValidationMiddleware: Symbol.for('ValidationMiddleware'),
  RateLimitMiddleware: Symbol.for('RateLimitMiddleware'),
  ErrorHandler: Symbol.for('ErrorHandler'),
  
  // Configuration
  Config: Symbol.for('Config'),
  DatabaseConfig: Symbol.for('DatabaseConfig'),
  RedisConfig: Symbol.for('RedisConfig'),
  JWTConfig: Symbol.for('JWTConfig'),
  
  // Utilities
  PasswordHasher: Symbol.for('PasswordHasher'),
  TokenGenerator: Symbol.for('TokenGenerator'),
  Validator: Symbol.for('Validator'),
  FileUploader: Symbol.for('FileUploader'),
  
  // Queue Services
  JobQueue: Symbol.for('JobQueue'),
  EmailQueue: Symbol.for('EmailQueue'),
  DocumentQueue: Symbol.for('DocumentQueue'),
  AnalyticsQueue: Symbol.for('AnalyticsQueue'),
  
  // Service Clients
  PythonServiceClient: Symbol.for('PythonServiceClient'),
  ServiceRegistry: Symbol.for('ServiceRegistry'),
  ServiceAuthService: Symbol.for('ServiceAuthService'),
  ServiceAuthMiddleware: Symbol.for('ServiceAuthMiddleware'),
  GracefulDegradationService: Symbol.for('GracefulDegradationService'),
  ServiceHealthMonitor: Symbol.for('ServiceHealthMonitor'),
  DistributedTracingService: Symbol.for('DistributedTracingService'),
  TracingMiddleware: Symbol.for('TracingMiddleware'),
  CircuitBreakerManager: Symbol.for('CircuitBreakerManager')
} as const;

export type ContainerTypes = typeof TYPES;