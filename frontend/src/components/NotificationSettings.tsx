import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pushNotificationService } from '../services/pushNotificationService';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '../firebase';
import './NotificationSettings.css';

const NotificationSettings: React.FC = () => {
  const { userData } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Get Firebase Functions instance
  const functions = getFunctions(app);

  useEffect(() => {
    initializeNotificationState();
  }, [userData]);

  const initializeNotificationState = async () => {
    try {
      // Initialize the push notification service
      if (userData) {
        await pushNotificationService.initialize(userData);
      }

      // Check current permission
      setPermission(pushNotificationService.getPermissionStatus());

      // Check if user is subscribed
      const subscribed = await pushNotificationService.isSubscribed();
      setIsSubscribed(subscribed);
    } catch (error) {
      console.error('Error initializing notification state:', error);
    }
  };

  const handleToggleNotifications = async () => {
    try {
      setLoading(true);
      setMessage(null);

      if (isSubscribed) {
        // Unsubscribe
        const success = await pushNotificationService.unsubscribe();
        if (success) {
          setIsSubscribed(false);
          setMessage('Đã tắt thông báo thành công');
        } else {
          setMessage('Không thể tắt thông báo. Vui lòng thử lại.');
        }
      } else {
        // Subscribe
        const success = await pushNotificationService.subscribe();
        if (success) {
          setIsSubscribed(true);
          setPermission('granted');
          setMessage('Đã bật thông báo thành công! Bạn sẽ nhận được thông báo từ GoREAL.');
        } else {
          setMessage('Không thể bật thông báo. Vui lòng kiểm tra quyền truy cập.');
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      setMessage('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setTestLoading(true);
      await pushNotificationService.testNotification();
      setMessage('Thông báo test đã được gửi!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      setMessage('Không thể gửi thông báo test.');
    } finally {
      setTestLoading(false);
    }
  };

  const getPermissionText = (perm: NotificationPermission): string => {
    switch (perm) {
      case 'granted':
        return 'Đã cho phép';
      case 'denied':
        return 'Đã từ chối';
      case 'default':
        return 'Chưa quyết định';
      default:
        return 'Không xác định';
    }
  };

  const getPermissionIcon = (perm: NotificationPermission): string => {
    switch (perm) {
      case 'granted':
        return '✅';
      case 'denied':
        return '❌';
      case 'default':
        return '❓';
      default:
        return '⚠️';
    }
  };

  return (
    <div className="notification-settings">
      <div className="settings-header">
        <h3 className="settings-title">
          <span className="title-icon">🔔</span>
          Thông Báo GoREAL
        </h3>
        <p className="settings-description">
          Quản lý cách bạn nhận thông báo từ GoREAL về quest mới, achievements và tin tức cập nhật.
        </p>
      </div>

      <div className="settings-content">
        {/* Permission Status */}
        <div className="permission-status">
          <div className="status-item">
            <span className="status-label">Trạng thái quyền:</span>
            <span className={`status-value ${permission}`}>
              {getPermissionIcon(permission)} {getPermissionText(permission)}
            </span>
          </div>
          
          <div className="status-item">
            <span className="status-label">Đang đăng ký:</span>
            <span className={`status-value ${isSubscribed ? 'active' : 'inactive'}`}>
              {isSubscribed ? '🔔 Đã bật' : '🔕 Đã tắt'}
            </span>
          </div>
        </div>

        {/* Main Toggle */}
        <div className="main-control">
          <div className="control-info">
            <h4 className="control-title">Bật Thông Báo</h4>
            <p className="control-description">
              Nhận thông báo về quest mới, achievements, và cập nhật quan trọng từ Guild Master.
            </p>
          </div>
          
          <button
            className={`notification-toggle ${isSubscribed ? 'active' : 'inactive'}`}
            onClick={handleToggleNotifications}
            disabled={loading}
          >
            {loading ? (
              <div className="toggle-loading">
                <div className="spinner"></div>
                <span>Đang xử lý...</span>
              </div>
            ) : (
              <>
                <span className="toggle-icon">
                  {isSubscribed ? '🔔' : '🔕'}
                </span>
                <span className="toggle-text">
                  {isSubscribed ? 'Tắt Thông Báo' : 'Bật Thông Báo'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Permission Denied Help */}
        {permission === 'denied' && (
          <div className="permission-help">
            <div className="help-icon">⚠️</div>
            <div className="help-content">
              <h4>Thông báo đã bị chặn</h4>
              <p>
                Để nhận thông báo từ GoREAL, bạn cần cho phép thông báo trong trình duyệt:
              </p>
              <ol>
                <li>Nhấn vào biểu tượng khóa 🔒 hoặc thông tin ℹ️ trên thanh địa chỉ</li>
                <li>Tìm mục "Notifications" hoặc "Thông báo"</li>
                <li>Chọn "Allow" hoặc "Cho phép"</li>
                <li>Làm mới trang và thử lại</li>
              </ol>
            </div>
          </div>
        )}

        {/* Test Notification */}
        {isSubscribed && permission === 'granted' && (
          <div className="test-section">
            <div className="test-info">
              <h4 className="test-title">Kiểm Tra Thông Báo</h4>
              <p className="test-description">
                Gửi một thông báo thử nghiệm để đảm bảo mọi thứ hoạt động bình thường.
              </p>
            </div>
            
            <button
              className="test-button"
              onClick={handleTestNotification}
              disabled={testLoading}
            >
              {testLoading ? (
                <>
                  <div className="spinner small"></div>
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <span>📢</span>
                  <span>Gửi Thông Báo Thử</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Notification Types Info */}
        <div className="notification-types">
          <h4 className="types-title">Loại Thông Báo</h4>
          <div className="type-list">
            <div className="type-item">
              <span className="type-icon">🎯</span>
              <div className="type-content">
                <div className="type-name">Quest Mới</div>
                <div className="type-desc">Nhận thông báo khi có quest mới phù hợp với Guild của bạn</div>
              </div>
            </div>
            
            <div className="type-item">
              <span className="type-icon">🏆</span>
              <div className="type-content">
                <div className="type-name">Achievements</div>
                <div className="type-desc">Thông báo khi bạn hoàn thành quest và nhận AURA</div>
              </div>
            </div>
            
            <div className="type-item">
              <span className="type-icon">⚡</span>
              <div className="type-content">
                <div className="type-name">AURA Stream</div>
                <div className="type-desc">Cập nhật về hoạt động Strava và thành tích trong leaderboard</div>
              </div>
            </div>
            
            <div className="type-item">
              <span className="type-icon">📢</span>
              <div className="type-content">
                <div className="type-name">Thông Báo Quan Trọng</div>
                <div className="type-desc">Tin tức và cập nhật quan trọng từ Guild Master</div>
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`message ${message.includes('thành công') || message.includes('đã được gửi') ? 'success' : 'error'}`}>
            <span className="message-icon">
              {message.includes('thành công') || message.includes('đã được gửi') ? '✅' : '⚠️'}
            </span>
            <span className="message-text">{message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;