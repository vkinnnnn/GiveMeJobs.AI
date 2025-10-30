import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { config } from '../config';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Define transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: config.nodeEnv === 'development' ? consoleFormat : format,
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Add Elasticsearch transport if configured
if (config.logging.elasticsearch.node && config.nodeEnv !== 'test') {
  const esTransportOpts = {
    level: 'info',
    clientOpts: {
      node: config.logging.elasticsearch.node,
      ...(config.logging.elasticsearch.username && {
        auth: {
          username: config.logging.elasticsearch.username,
          password: config.logging.elasticsearch.password,
        },
      }),
    },
    index: 'givemejobs-logs',
    dataStream: true,
  };

  try {
    transports.push(new ElasticsearchTransport(esTransportOpts));
    console.log('✅ Elasticsearch logging transport initialized');
  } catch (error) {
    console.warn('⚠️  Failed to initialize Elasticsearch transport:', error);
  }
}

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logger
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper methods for structured logging
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: string, message: string, meta?: any) {
    logger.log(level, message, { context: this.context, ...meta });
  }

  error(message: string, error?: Error, meta?: any) {
    this.log('error', message, {
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : undefined,
    });
  }

  warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  http(message: string, meta?: any) {
    this.log('http', message, meta);
  }

  debug(message: string, meta?: any) {
    this.log('debug', message, meta);
  }

  // Specialized logging methods
  logDatabaseQuery(operation: string, table: string, duration: number, meta?: any) {
    this.info(`Database query: ${operation} on ${table}`, {
      operation,
      table,
      duration,
      type: 'database',
      ...meta,
    });
  }

  logExternalApiCall(service: string, endpoint: string, duration: number, statusCode?: number, meta?: any) {
    this.info(`External API call: ${service} ${endpoint}`, {
      service,
      endpoint,
      duration,
      statusCode,
      type: 'external_api',
      ...meta,
    });
  }

  logUserAction(userId: string, action: string, meta?: any) {
    this.info(`User action: ${action}`, {
      userId,
      action,
      type: 'user_action',
      ...meta,
    });
  }

  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', meta?: any) {
    this.warn(`Security event: ${event}`, {
      event,
      severity,
      type: 'security',
      ...meta,
    });
  }

  logPerformance(operation: string, duration: number, meta?: any) {
    const level = duration > 5000 ? 'warn' : 'info';
    this.log(level, `Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      type: 'performance',
      ...meta,
    });
  }
}

export default logger;
