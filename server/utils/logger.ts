import { storage } from "../storage";

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogData {
  level: LogLevel;
  message: string;
  service: string;
  transactionId?: string;
  processorId?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentLevelIndex = levels.indexOf(logLevel as LogLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private async logToStorage(data: LogData): Promise<void> {
    try {
      await storage.createSystemLog({
        level: data.level,
        message: data.message,
        service: data.service,
        transactionId: data.transactionId || null,
        processorId: data.processorId || null,
        metadata: data.metadata || {},
      });
    } catch (error) {
      console.error('Failed to log to storage:', error);
    }
  }

  private formatMessage(data: LogData): string {
    const timestamp = new Date().toISOString();
    const extras = [];
    
    if (data.transactionId) extras.push(`txn:${data.transactionId}`);
    if (data.processorId) extras.push(`proc:${data.processorId}`);
    
    const extraStr = extras.length > 0 ? ` [${extras.join(', ')}]` : '';
    return `${timestamp} [${data.level.toUpperCase()}] [${data.service}]${extraStr} ${data.message}`;
  }

  private log(data: LogData): void {
    if (!this.shouldLog(data.level)) return;

    const formattedMessage = this.formatMessage(data);
    
    // Console output
    switch (data.level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }

    // Store in database (async, don't block)
    this.logToStorage(data).catch(() => {});
  }

  debug(message: string, service: string, metadata?: Record<string, any>): void {
    this.log({ level: LogLevel.DEBUG, message, service, metadata });
  }

  info(message: string, service: string, metadata?: Record<string, any>): void {
    this.log({ level: LogLevel.INFO, message, service, metadata });
  }

  warn(message: string, service: string, metadata?: Record<string, any>): void {
    this.log({ level: LogLevel.WARN, message, service, metadata });
  }

  error(message: string, service: string, error?: Error, metadata?: Record<string, any>): void {
    const errorMetadata = error ? {
      error: error.message,
      stack: error.stack,
      ...metadata,
    } : metadata;
    
    this.log({ level: LogLevel.ERROR, message, service, metadata: errorMetadata });
  }

  // Transaction-specific logging
  transactionLog(level: LogLevel, message: string, transactionId: string, processorId?: string, metadata?: Record<string, any>): void {
    this.log({
      level,
      message,
      service: 'payment-processor',
      transactionId,
      processorId,
      metadata,
    });
  }
}

export const logger = new Logger();
