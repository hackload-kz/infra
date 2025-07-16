// import { db } from '@/lib/db';

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

export enum LogAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  READ = 'READ',
  DISABLE = 'DISABLE',
  ENABLE = 'ENABLE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT'
}

export interface LogEntry {
  level: LogLevel;
  action: LogAction;
  entityType: string;
  entityId?: string;
  userId?: string;
  userEmail?: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

class Logger {
  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const user = entry.userEmail ? `[${entry.userEmail}]` : '[SYSTEM]';
    const entity = entry.entityId ? `${entry.entityType}:${entry.entityId}` : entry.entityType;
    
    return `[${timestamp}] ${entry.level} ${user} ${entry.action} ${entity} - ${entry.message}`;
  }

  private async persistLog(entry: LogEntry): Promise<void> {
    try {
      // In a production environment, you might want to store logs in a dedicated table
      // For now, we'll use console and could extend to external logging services
      const message = this.formatMessage(entry);
      
      // Use appropriate console method based on log level
      switch (entry.level) {
        case LogLevel.ERROR:
          console.error(message);
          break;
        case LogLevel.WARN:
          console.warn(message);
          break;
        case LogLevel.INFO:
          console.info(message);
          break;
        case LogLevel.DEBUG:
          console.info(message); // Use console.info for DEBUG as well
          break;
        default:
          console.info(message);
      }
      
      // Optional: Store in database (create a Log model in Prisma schema if needed)
      // await db.log.create({ data: entry });
    } catch (error) {
      console.error('Failed to persist log:', error);
    }
  }

  async log(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date()
    };
    
    await this.persistLog(logEntry);
  }

  async info(action: LogAction, entityType: string, message: string, options: {
    entityId?: string;
    userId?: string;
    userEmail?: string;
    metadata?: Record<string, unknown>;
  } = {}): Promise<void> {
    await this.log({
      level: LogLevel.INFO,
      action,
      entityType,
      message,
      ...options
    });
  }

  async warn(action: LogAction, entityType: string, message: string, options: {
    entityId?: string;
    userId?: string;
    userEmail?: string;
    metadata?: Record<string, unknown>;
  } = {}): Promise<void> {
    await this.log({
      level: LogLevel.WARN,
      action,
      entityType,
      message,
      ...options
    });
  }

  async error(action: LogAction, entityType: string, message: string, options: {
    entityId?: string;
    userId?: string;
    userEmail?: string;
    metadata?: Record<string, unknown>;
  } = {}): Promise<void> {
    await this.log({
      level: LogLevel.ERROR,
      action,
      entityType,
      message,
      ...options
    });
  }

  async debug(action: LogAction, entityType: string, message: string, options: {
    entityId?: string;
    userId?: string;
    userEmail?: string;
    metadata?: Record<string, unknown>;
  } = {}): Promise<void> {
    await this.log({
      level: LogLevel.DEBUG,
      action,
      entityType,
      message,
      ...options
    });
  }

  // Specific logging methods for common operations
  async logCreate(entityType: string, entityId: string, userEmail: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.info(LogAction.CREATE, entityType, message, {
      entityId,
      userEmail,
      metadata
    });
  }

  async logUpdate(entityType: string, entityId: string, userEmail: string, message: string, changes?: Record<string, unknown>): Promise<void> {
    await this.info(LogAction.UPDATE, entityType, message, {
      entityId,
      userEmail,
      metadata: { changes }
    });
  }

  async logDelete(entityType: string, entityId: string, userEmail: string, message: string): Promise<void> {
    await this.info(LogAction.DELETE, entityType, message, {
      entityId,
      userEmail
    });
  }

  async logStatusChange(entityType: string, entityId: string, userEmail: string, fromStatus: string, toStatus: string): Promise<void> {
    await this.info(LogAction.UPDATE, entityType, `Status changed from ${fromStatus} to ${toStatus}`, {
      entityId,
      userEmail,
      metadata: { fromStatus, toStatus }
    });
  }

  async logRead(entityType: string, entityId: string, userEmail: string, message: string): Promise<void> {
    await this.debug(LogAction.READ, entityType, message, {
      entityId,
      userEmail
    });
  }

  async logError(entityType: string, error: Error, userEmail?: string, entityId?: string): Promise<void> {
    await this.error(LogAction.UPDATE, entityType, `Error: ${error.message}`, {
      entityId,
      userEmail,
      metadata: { stack: error.stack }
    });
  }

  // API-specific logging methods
  async logApiCall(method: string, endpoint: string, userEmail?: string, participantId?: string): Promise<void> {
    await this.debug(LogAction.READ, 'API', `${method} ${endpoint}`, {
      userEmail,
      entityId: participantId,
      metadata: { method, endpoint }
    });
  }

  async logApiSuccess(method: string, endpoint: string, userEmail?: string, entityId?: string): Promise<void> {
    await this.info(LogAction.READ, 'API', `${method} ${endpoint} - Success`, {
      userEmail,
      entityId,
      metadata: { method, endpoint }
    });
  }

  async logApiError(method: string, endpoint: string, error: Error, userEmail?: string): Promise<void> {
    await this.error(LogAction.UPDATE, 'API', `${method} ${endpoint} - Error: ${error.message}`, {
      userEmail,
      metadata: { method, endpoint, stack: error.stack }
    });
  }
}

export const logger = new Logger();