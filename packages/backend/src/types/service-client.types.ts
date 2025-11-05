/**
 * Service client types and interfaces
 */

import { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ServiceClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  circuitBreakerOptions: CircuitBreakerOptions;
  authentication?: ServiceAuthConfig;
}

export interface CircuitBreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  rollingCountTimeout: number;
  rollingCountBuckets: number;
  name?: string;
  group?: string;
}

export interface ServiceAuthConfig {
  type: 'jwt' | 'api-key';
  token?: string;
  apiKey?: string;
  refreshUrl?: string;
  refreshToken?: string;
}

export interface ServiceRequest extends AxiosRequestConfig {
  correlationId?: string;
  retryCount?: number;
  skipCircuitBreaker?: boolean;
  traceHeaders?: Record<string, string>;
  parentSpan?: any; // OpenTracing Span
}

export interface ServiceResponse<T = any> extends AxiosResponse<T> {
  correlationId?: string;
  fromCache?: boolean;
  responseTime?: number;
}

export interface ServiceError extends Error {
  code?: string;
  status?: number;
  correlationId?: string;
  isTimeout?: boolean;
  isCircuitOpen?: boolean;
  retryCount?: number;
  originalError?: Error;
}

export interface ServiceHealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

export interface LoadBalancerConfig {
  strategy: 'round-robin' | 'least-connections' | 'random' | 'weighted';
  endpoints: ServiceEndpoint[];
  healthCheckInterval: number;
}

export interface ServiceEndpoint {
  url: string;
  weight?: number;
  healthy: boolean;
  connections: number;
  lastHealthCheck?: Date;
}

// Python service specific types
export interface UserProfile {
  id: string;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  preferences: UserPreferences;
  careerGoals?: string;
  yearsExperience?: number;
  salaryExpectationMin?: number;
  preferredLocations?: string[];
}

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  duration: string;
  description: string;
  skills: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  year: number;
  gpa?: number;
}

export interface UserPreferences {
  remoteWork: boolean;
  salaryRange: {
    min: number;
    max: number;
  };
  locations: string[];
  jobTypes: string[];
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: string[];
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  remoteType?: 'remote' | 'hybrid' | 'onsite';
  requiredSkills?: string[];
  requiredExperienceYears?: number;
}

export interface GeneratedDocument {
  content: string;
  metadata: {
    wordCount: number;
    generationTime: number;
    templateId?: string;
  };
}

export interface JobMatch {
  jobId: string;
  semanticScore: number;
  traditionalScore: number;
  compositeScore: number;
  jobData: JobPosting;
  matchExplanation: string;
}

export interface JobSearchFilters {
  location?: string[];
  salaryMin?: number;
  salaryMax?: number;
  remoteType?: string[];
  jobType?: string[];
  experienceLevel?: string[];
  skills?: string[];
}

export interface AnalyticsInsights {
  metrics: {
    totalApplications: number;
    responseRate: number;
    interviewRate: number;
    offerRate: number;
    averageResponseTimeDays: number;
  };
  insights: {
    topPerformingSkills: string[];
    recommendedImprovements: string[];
    marketTrends: string[];
  };
  successPrediction: {
    successProbability: number;
    confidence: number;
    keyFactors: string[];
  };
  recommendations: string[];
  generatedAt: string;
}

// Result type for explicit error handling
export class Result<T, E = ServiceError> {
  private constructor(
    private readonly _success: boolean,
    private readonly _data?: T,
    private readonly _error?: E
  ) {}

  static success<T>(data: T): Result<T, never> {
    return new Result(true, data);
  }

  static error<E>(error: E): Result<never, E> {
    return new Result(false, undefined, error);
  }

  get success(): boolean {
    return this._success;
  }

  get data(): T {
    if (!this._success) {
      throw new Error('Cannot access data on failed result');
    }
    return this._data!;
  }

  get error(): E {
    if (this._success) {
      throw new Error('Cannot access error on successful result');
    }
    return this._error!;
  }

  map<U>(fn: (data: T) => U): Result<U, E> {
    if (this._success) {
      return Result.success(fn(this._data!));
    }
    return Result.error(this._error!);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (!this._success) {
      return Result.error(fn(this._error!));
    }
    return Result.success(this._data!);
  }
}