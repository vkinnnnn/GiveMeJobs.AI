import { pgPool, redisClient, mongoClient } from '../config/database';

/**
 * Health Check Utility
 * Provides comprehensive health checks for all system components
 */

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    mongodb: ComponentHealth;
    memory: ComponentHealth;
    cpu: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  details?: any;
}

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  const [database, redis, mongodb, memory, cpu] = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkMongoDB(),
    checkMemory(),
    checkCPU(),
  ]);

  const checks = {
    database: getResult(database),
    redis: getResult(redis),
    mongodb: getResult(mongodb),
    memory: getResult(memory),
    cpu: getResult(cpu),
  };

  // Determine overall status
  const statuses = Object.values(checks).map(c => c.status);
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  
  if (statuses.every(s => s === 'up')) {
    overallStatus = 'healthy';
  } else if (statuses.some(s => s === 'down')) {
    overallStatus = 'unhealthy';
  } else {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    checks,
  };
}

/**
 * Check PostgreSQL database health
 */
async function checkDatabase(): Promise<ComponentHealth> {
  const startTime = Date.now();
  
  try {
    await pgPool.query('SELECT 1');
    const responseTime = Date.now() - startTime;
    
    // Check connection pool stats
    const poolStats = {
      total: pgPool.totalCount,
      idle: pgPool.idleCount,
      waiting: pgPool.waitingCount,
    };

    return {
      status: 'up',
      responseTime,
      details: poolStats,
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedis(): Promise<ComponentHealth> {
  const startTime = Date.now();
  
  try {
    await redisClient.ping();
    const responseTime = Date.now() - startTime;
    
    // Get Redis info
    const info = await redisClient.info('memory');
    const memoryUsed = info.match(/used_memory_human:(.+)/)?.[1]?.trim();

    return {
      status: 'up',
      responseTime,
      details: { memoryUsed },
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Redis connection failed',
    };
  }
}

/**
 * Check MongoDB health
 */
async function checkMongoDB(): Promise<ComponentHealth> {
  const startTime = Date.now();
  
  try {
    await mongoClient.db().admin().ping();
    const responseTime = Date.now() - startTime;

    return {
      status: 'up',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'MongoDB connection failed',
    };
  }
}

/**
 * Check memory usage
 */
async function checkMemory(): Promise<ComponentHealth> {
  const usage = process.memoryUsage();
  const totalMemory = usage.heapTotal;
  const usedMemory = usage.heapUsed;
  const usagePercent = (usedMemory / totalMemory) * 100;

  const status = usagePercent > 90 ? 'degraded' : 'up';

  return {
    status,
    details: {
      heapUsed: formatBytes(usage.heapUsed),
      heapTotal: formatBytes(usage.heapTotal),
      external: formatBytes(usage.external),
      rss: formatBytes(usage.rss),
      usagePercent: usagePercent.toFixed(2) + '%',
    },
  };
}

/**
 * Check CPU usage
 */
async function checkCPU(): Promise<ComponentHealth> {
  const usage = process.cpuUsage();
  const uptime = process.uptime();
  
  // Calculate CPU usage percentage
  const userCPU = usage.user / 1000000; // Convert to seconds
  const systemCPU = usage.system / 1000000;
  const totalCPU = userCPU + systemCPU;
  const cpuPercent = (totalCPU / uptime) * 100;

  const status = cpuPercent > 80 ? 'degraded' : 'up';

  return {
    status,
    details: {
      user: userCPU.toFixed(2) + 's',
      system: systemCPU.toFixed(2) + 's',
      total: totalCPU.toFixed(2) + 's',
      percent: cpuPercent.toFixed(2) + '%',
    },
  };
}

/**
 * Get result from Promise.allSettled
 */
function getResult(result: PromiseSettledResult<ComponentHealth>): ComponentHealth {
  if (result.status === 'fulfilled') {
    return result.value;
  } else {
    return {
      status: 'down',
      message: result.reason?.message || 'Health check failed',
    };
  }
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Readiness check
 * Returns true if the application is ready to serve traffic
 */
export async function isReady(): Promise<boolean> {
  try {
    const [dbCheck, redisCheck] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);

    return dbCheck.status === 'up' && redisCheck.status === 'up';
  } catch (error) {
    return false;
  }
}

/**
 * Liveness check
 * Returns true if the application is alive (even if degraded)
 */
export async function isAlive(): Promise<boolean> {
  try {
    // Simple check - if we can execute this, the process is alive
    return true;
  } catch (error) {
    return false;
  }
}
