import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface ErrorLog {
  id?: string;
  timestamp: any;
  errorType: 'javascript' | 'api' | 'upload' | 'auth' | 'firestore' | 'general';
  message: string;
  stack?: string | null;
  userAgent: string;
  url: string;
  userId?: string;
  component?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  additionalData?: Record<string, any> | null;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private errorQueue: ErrorLog[] = [];
  private isOnline = navigator.onLine;

  private constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.flushErrorQueue.bind(this));
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Global error handler
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private handleGlobalError(event: ErrorEvent) {
    this.logError({
      errorType: 'javascript',
      message: event.message,
      stack: event.error?.stack,
      component: 'Global',
      severity: 'high'
    });
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent) {
    this.logError({
      errorType: 'general',
      message: `Unhandled Promise Rejection: ${event.reason}`,
      stack: event.reason?.stack,
      component: 'Global',
      severity: 'high'
    });
  }

  public async logError(error: Partial<ErrorLog>, userId?: string): Promise<void> {
    try {
      const errorLog: ErrorLog = {
        timestamp: serverTimestamp(),
        errorType: error.errorType || 'general',
        message: error.message || 'Unknown error',
        stack: error.stack || null,
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: userId || 'anonymous',
        component: error.component || 'Unknown',
        severity: error.severity || 'medium',
        additionalData: error.additionalData || null
      };

      if (this.isOnline) {
        await this.saveToFirestore(errorLog);
      } else {
        this.errorQueue.push(errorLog);
      }

      // Console log for development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error logged:', errorLog);
      }
    } catch (err) {
      console.error('Failed to log error:', err);
    }
  }

  private async saveToFirestore(errorLog: ErrorLog): Promise<void> {
    try {
      await addDoc(collection(db, 'errorLogs'), errorLog);
    } catch (error) {
      console.error('Failed to save error to Firestore:', error);
      // Add to queue for retry
      this.errorQueue.push(errorLog);
    }
  }

  private async flushErrorQueue(): Promise<void> {
    this.isOnline = true;
    
    while (this.errorQueue.length > 0) {
      const errorLog = this.errorQueue.shift();
      if (errorLog) {
        try {
          await this.saveToFirestore(errorLog);
        } catch (error) {
          // Put it back in queue and stop flushing
          this.errorQueue.unshift(errorLog);
          break;
        }
      }
    }
  }

  // Convenience methods for different error types
  public logUploadError(message: string, additionalData?: Record<string, any>, userId?: string): void {
    this.logError({
      errorType: 'upload',
      message,
      severity: 'high',
      component: 'Upload',
      additionalData
    }, userId);
  }

  public logApiError(message: string, endpoint: string, additionalData?: Record<string, any>, userId?: string): void {
    this.logError({
      errorType: 'api',
      message,
      severity: 'medium',
      component: 'API',
      additionalData: { endpoint, ...additionalData }
    }, userId);
  }

  public logFirestoreError(message: string, operation: string, additionalData?: Record<string, any>, userId?: string): void {
    this.logError({
      errorType: 'firestore',
      message,
      severity: 'high',
      component: 'Firestore',
      additionalData: { operation, ...additionalData }
    }, userId);
  }

  public logAuthError(message: string, additionalData?: Record<string, any>, userId?: string): void {
    this.logError({
      errorType: 'auth',
      message,
      severity: 'critical',
      component: 'Authentication',
      additionalData
    }, userId);
  }
}

export const errorLogger = ErrorLogger.getInstance();

// Helper hook for React components
export const useErrorLogger = (component: string) => {
  const logComponentError = (error: Error, additionalData?: Record<string, any>) => {
    errorLogger.logError({
      errorType: 'javascript',
      message: error.message,
      stack: error.stack,
      severity: 'high',
      component,
      additionalData
    });
  };

  return { logComponentError };
};