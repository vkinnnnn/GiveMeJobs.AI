/**
 * Winston logger configuration
 */

import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  
  return log;
});

// Create logger instance
export function createLogger(): winston.Logger {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      json()
    ),
    defaultMeta: {
      service: 'givemejobs-backend',
      environment: process.env.NODE_ENV || 'development'
    },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: combine(
          colorize(),
          timestamp({ format: 'HH:mm:ss' }),
          consoleFormat
        )
      })
    ]
  });

  // Add file transports in production
  if (process.env.NODE_ENV === 'production') {
    // Error log file
    logger.add(new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      )
    }));

    // Combined log file
    logger.add(new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      )
    }));
  }

  return logger;
}

// Export logger instance
export const logger = createLogger();