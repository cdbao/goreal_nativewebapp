import { FirebaseError } from 'firebase/app';

export interface ErrorDetails {
  errorType: 'firebase' | 'network' | 'validation' | 'component' | 'general';
  message: string;
  component?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  additionalData?: Record<string, any>;
  stack?: string;
}

export class ErrorLogger {
  private static instance: ErrorLogger;
  private errorQueue: ErrorDetails[] = [];
  private isOnline = navigator.onLine;

  private constructor() {
    // Monitor online status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  logError(
    error: Error | FirebaseError,
    context: string,
    severity: ErrorDetails['severity'] = 'medium'
  ): void {
    const errorDetails: ErrorDetails = {
      errorType: this.determineErrorType(error),
      message: error.message,
      component: context,
      severity,
      stack: error.stack,
      additionalData: this.extractAdditionalData(error),
    };

    this.processError(errorDetails);
  }

  logCustomError(details: ErrorDetails): void {
    this.processError(details);
  }

  private determineErrorType(
    error: Error | FirebaseError
  ): ErrorDetails['errorType'] {
    if ('code' in error) {
      return 'firebase';
    }
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'network';
    }
    if (
      error.message.includes('validation') ||
      error.message.includes('invalid')
    ) {
      return 'validation';
    }
    return 'general';
  }

  private extractAdditionalData(
    error: Error | FirebaseError
  ): Record<string, any> {
    const data: Record<string, any> = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    if ('code' in error) {
      data.firebaseCode = error.code;
    }

    return data;
  }

  private processError(errorDetails: ErrorDetails): void {
    // Always log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(
        `🚨 ${errorDetails.severity.toUpperCase()} Error in ${errorDetails.component}`
      );
      console.error('Message:', errorDetails.message);
      console.error('Type:', errorDetails.errorType);
      console.error('Stack:', errorDetails.stack);
      console.error('Additional Data:', errorDetails.additionalData);
      console.groupEnd();
    }

    // Queue error for remote logging
    this.errorQueue.push(errorDetails);

    // Try to send immediately if online
    if (this.isOnline) {
      this.flushErrorQueue();
    }

    // Show user-friendly message for critical errors
    if (errorDetails.severity === 'critical') {
      this.showCriticalErrorMessage(errorDetails);
    }
  }

  private async flushErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0 || !this.isOnline) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    try {
      // In a real implementation, you would send to your error tracking service
      // Example: Sentry, LogRocket, custom endpoint, etc.
      console.log('Would send errors to logging service:', errorsToSend);

      // For Firebase projects, you could send to Firestore
      // await this.sendToFirestore(errorsToSend);
    } catch (sendError) {
      console.error('Failed to send error logs:', sendError);
      // Re-add errors to queue
      this.errorQueue.unshift(...errorsToSend);
    }
  }

  private showCriticalErrorMessage(errorDetails: ErrorDetails): void {
    // Show a user-friendly error message
    const message = this.getUserFriendlyMessage(errorDetails);

    // You could integrate with a toast library here
    alert(`Đã xảy ra lỗi nghiêm trọng: ${message}`);
  }

  private getUserFriendlyMessage(errorDetails: ErrorDetails): string {
    switch (errorDetails.errorType) {
      case 'firebase':
        return this.getFirebaseErrorMessage(errorDetails.message);
      case 'network':
        return 'Có vấn đề kết nối mạng. Vui lòng kiểm tra và thử lại.';
      case 'validation':
        return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra và thử lại.';
      default:
        return 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.';
    }
  }

  private getFirebaseErrorMessage(errorMessage: string): string {
    // Firebase error code mapping to user-friendly Vietnamese messages
    const errorMessages: Record<string, string> = {
      'auth/user-not-found': 'Không tìm thấy tài khoản người dùng.',
      'auth/wrong-password': 'Mật khẩu không đúng.',
      'auth/too-many-requests': 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
      'permission-denied': 'Bạn không có quyền thực hiện hành động này.',
      'not-found': 'Không tìm thấy dữ liệu yêu cầu.',
      unavailable: 'Dịch vụ tạm thời không khả dụng.',
    };

    const matchedError = Object.keys(errorMessages).find(key =>
      errorMessage.includes(key)
    );

    return matchedError
      ? errorMessages[matchedError]
      : 'Đã xảy ra lỗi với dịch vụ.';
  }
}

// Singleton instance
export const errorLogger = ErrorLogger.getInstance();

// React Hook for error handling
export const useErrorHandler = () => {
  const handleError = (
    error: Error,
    context: string,
    severity: ErrorDetails['severity'] = 'medium'
  ) => {
    errorLogger.logError(error, context, severity);
  };

  const handleCustomError = (details: ErrorDetails) => {
    errorLogger.logCustomError(details);
  };

  return { handleError, handleCustomError };
};
