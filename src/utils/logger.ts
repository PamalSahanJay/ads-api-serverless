export interface LogContext {
    requestId?: string;
    [key: string]: any;
  }
  
  export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
  }
  
  class Logger {
    private requestId: string | undefined;
  
    setRequestId(requestId: string | undefined): void {
      this.requestId = requestId;
    }
  
    private log(level: LogLevel, message: string, context?: LogContext): void {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        requestId: context?.requestId || this.requestId || 'unknown',
        ...context,
      };
  
      // Remove requestId from context to avoid duplication
      if (context?.requestId) {
        delete context.requestId;
      }
  
      const logString = JSON.stringify(logEntry);
      
      // Use appropriate console method based on level
      switch (level) {
        case LogLevel.ERROR:
          console.error(logString);
          break;
        case LogLevel.WARN:
          console.warn(logString);
          break;
        case LogLevel.DEBUG:
          console.debug(logString);
          break;
        default:
          console.log(logString);
      }
    }
  
    info(message: string, context?: LogContext): void {
      this.log(LogLevel.INFO, message, context);
    }
  
    error(message: string, error?: Error | unknown, context?: LogContext): void {
      const errorContext: LogContext = {
        ...context,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : String(error),
      };
      this.log(LogLevel.ERROR, message, errorContext);
    }
  
    warn(message: string, context?: LogContext): void {
      this.log(LogLevel.WARN, message, context);
    }
  
    debug(message: string, context?: LogContext): void {
      this.log(LogLevel.DEBUG, message, context);
    }
  }
  
  // Export singleton instance
  export const logger = new Logger();