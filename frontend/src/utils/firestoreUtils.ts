import { FirebaseError } from 'firebase/app';

// Retry logic for Firestore operations
export const retryFirestoreOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        console.log(`Firestore operation succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(`Firestore operation attempt ${attempt} failed:`, error);

      // Don't retry on certain error types
      if (shouldNotRetry(error)) {
        throw error;
      }

      if (attempt === maxRetries) {
        console.error(`Firestore operation failed after ${maxRetries} attempts`);
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = delayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// Determine if an error should not be retried
const shouldNotRetry = (error: any): boolean => {
  if (error instanceof FirebaseError) {
    const nonRetryableErrors = [
      'permission-denied',
      'unauthenticated', 
      'invalid-argument',
      'not-found',
      'already-exists',
      'failed-precondition',
      'out-of-range',
      'unimplemented',
      'data-loss'
    ];
    
    return nonRetryableErrors.includes(error.code);
  }
  return false;
};

// Get user-friendly error messages
export const getFirestoreErrorMessage = (error: any): string => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        return 'Không có quyền thực hiện thao tác này';
      case 'unavailable':
        return 'Dịch vụ tạm thời không khả dụng';
      case 'deadline-exceeded':
        return 'Kết nối quá chậm, vui lòng thử lại';
      case 'unauthenticated':
        return 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại';
      case 'resource-exhausted':
        return 'Server quá tải, vui lòng thử lại sau';
      case 'cancelled':
        return 'Thao tác bị hủy';
      case 'already-exists':
        return 'Dữ liệu đã tồn tại';
      case 'not-found':
        return 'Không tìm thấy dữ liệu';
      case 'invalid-argument':
        return 'Dữ liệu không hợp lệ';
      case 'failed-precondition':
        return 'Điều kiện thực hiện không đạt';
      case 'aborted':
        return 'Thao tác bị gián đoạn, vui lòng thử lại';
      case 'out-of-range':
        return 'Dữ liệu vượt quá giới hạn';
      case 'unimplemented':
        return 'Tính năng chưa được hỗ trợ';
      case 'internal':
        return 'Lỗi hệ thống nội bộ';
      case 'data-loss':
        return 'Mất dữ liệu, vui lòng liên hệ hỗ trợ';
      default:
        return `Lỗi Firestore: ${error.message}`;
    }
  }

  // Handle network errors
  if (error.message?.includes('network')) {
    return 'Lỗi kết nối mạng, vui lòng kiểm tra internet';
  }

  // Handle session errors (like the 400 error you're experiencing)
  if (error.message?.includes('SID') || error.message?.includes('session')) {
    return 'Phiên kết nối hết hạn, vui lòng làm mới trang';
  }

  return error.message || 'Lỗi không xác định';
};

// Enhanced error handler for user-facing operations
export const handleFirestoreError = (error: any, operation: string = 'thao tác'): void => {
  const errorMessage = getFirestoreErrorMessage(error);
  
  console.error(`Firestore error during ${operation}:`, error);
  
  // Show user-friendly alert
  alert(`Không thể thực hiện ${operation}: ${errorMessage}\n\nVui lòng thử lại sau ít phút.`);
  
  // If it's a session error, suggest page refresh
  if (error.message?.includes('SID') || error.message?.includes('session')) {
    if (window.confirm('Có vẻ như phiên kết nối đã hết hạn. Bạn có muốn làm mới trang không?')) {
      window.location.reload();
    }
  }
};

// Check if user is properly authenticated
export const validateUserAuth = (user: any): void => {
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  if (!user.uid) {
    throw new Error('User ID not available');
  }
  
  // Check if auth token is still valid (basic check)
  if (user.accessToken && user.metadata?.lastSignInTime) {
    const lastSignIn = new Date(user.metadata.lastSignInTime);
    const hoursSinceSignIn = (Date.now() - lastSignIn.getTime()) / (1000 * 60 * 60);
    
    // If signed in more than 24 hours ago, suggest re-auth
    if (hoursSinceSignIn > 24) {
      console.warn('User session is old, may need re-authentication');
    }
  }
};