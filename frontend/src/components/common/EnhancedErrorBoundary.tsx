import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorLogger, ErrorDetails } from '../../utils/errorHandler';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, only this boundary catches errors, doesn't bubble up
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorDetails: ErrorDetails = {
      errorType: 'component',
      message: error.message,
      severity: 'high',
      stack: error.stack,
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
        errorId: this.state.errorId,
        props: this.props,
      },
    };

    // Log error
    errorLogger.logCustomError(errorDetails);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry for certain types of errors
    this.scheduleRetry(error);
  }

  private scheduleRetry = (error: Error) => {
    // Only auto-retry for network errors or Firebase temporary errors
    const shouldAutoRetry =
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('unavailable');

    if (shouldAutoRetry) {
      this.retryTimeoutId = window.setTimeout(() => {
        this.handleRetry();
      }, 3000);
    }
  };

  private handleRetry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    this.setState({ hasError: false, error: null, errorId: null });
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback component if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            retry={this.handleRetry}
          />
        );
      }

      // Default error UI
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">Đã xảy ra lỗi</h2>
            <p className="error-message">
              Có vấn đề với thành phần này. Chúng tôi đã ghi nhận lỗi và sẽ khắc
              phục sớm.
            </p>
            <div className="error-actions">
              <button
                onClick={this.handleRetry}
                className="btn btn-primary"
                type="button"
              >
                🔄 Thử lại
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-ghost"
                type="button"
              >
                🔁 Tải lại trang
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Chi tiết lỗi (Development)</summary>
                <pre className="error-stack">
                  <strong>Error ID:</strong> {this.state.errorId}
                  {'\n'}
                  <strong>Message:</strong> {this.state.error.message}
                  {'\n'}
                  <strong>Stack:</strong> {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WithErrorBoundaryComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </EnhancedErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `WithErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
};

// Specific error fallback components
export const QuestErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
}> = ({ error, retry }) => (
  <div className="quest-error-fallback">
    <div className="error-content">
      <h3>⚔️ Lỗi tải nhiệm vụ</h3>
      <p>Không thể tải danh sách nhiệm vụ. Vui lòng thử lại.</p>
      <button onClick={retry} className="btn btn-primary">
        🔄 Tải lại nhiệm vụ
      </button>
    </div>
  </div>
);

export const DashboardErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
}> = ({ error, retry }) => (
  <div className="dashboard-error-fallback">
    <div className="error-content">
      <h3>🏠 Lỗi tải bảng điều khiển</h3>
      <p>Có vấn đề khi tải bảng điều khiển. Vui lòng thử lại.</p>
      <div className="error-actions">
        <button onClick={retry} className="btn btn-primary">
          🔄 Thử lại
        </button>
        <button
          onClick={() => (window.location.href = '/login')}
          className="btn btn-ghost"
        >
          🔐 Đăng nhập lại
        </button>
      </div>
    </div>
  </div>
);

export default EnhancedErrorBoundary;
