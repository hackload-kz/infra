export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class ConsoleLogger implements Logger {
  private logLevel: LogLevel;
  private serviceName: string;
  
  constructor(logLevel: LogLevel = 'info', serviceName: string = 'JobService') {
    this.logLevel = logLevel;
    this.serviceName = serviceName;
  }
  
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('DEBUG', message), ...args);
    }
  }
  
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('INFO', message), ...args);
    }
  }
  
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }
  
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('ERROR', message), ...args);
    }
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex <= currentLevelIndex;
  }
  
  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.serviceName}] ${message}`;
  }
}

// Global logger instance
export let logger: Logger = new ConsoleLogger();

export function setLogger(newLogger: Logger): void {
  logger = newLogger;
}

export function createLogger(logLevel: LogLevel, serviceName: string): Logger {
  return new ConsoleLogger(logLevel, serviceName);
}