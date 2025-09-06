import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import './NotificationBell.css';

interface Notification {
  id: string;
  message: string;
  timestamp: any;
  isRead: boolean;
  type: 'quest_approved' | 'level_up' | 'daily_quest' | 'general';
  questId?: string;
  auraReward?: number;
  oldLevel?: number;
  newLevel?: number;
}

const NotificationBell: React.FC = () => {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userData?.userId) return;

    // Set up real-time listener for notifications
    const notificationsRef = collection(
      db,
      'users',
      userData.userId,
      'notifications'
    );
    const q = query(notificationsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, snapshot => {
      const notificationsList: Notification[] = [];
      let unreadTotal = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        const notification: Notification = {
          id: doc.id,
          message: data.message,
          timestamp: data.timestamp,
          isRead: data.isRead,
          type: data.type,
          questId: data.questId,
          auraReward: data.auraReward,
          oldLevel: data.oldLevel,
          newLevel: data.newLevel,
        };

        notificationsList.push(notification);
        if (!notification.isRead) {
          unreadTotal++;
        }
      });

      setNotifications(notificationsList);
      setUnreadCount(unreadTotal);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = async () => {
    setIsOpen(!isOpen);

    // Mark all notifications as read when opening
    if (!isOpen && unreadCount > 0) {
      await markAllAsRead();
    }
  };

  const markAllAsRead = async () => {
    if (!userData?.userId) return;

    try {
      const batch = writeBatch(db);
      const unreadNotifications = notifications.filter(n => !n.isRead);

      for (const notification of unreadNotifications) {
        const notificationRef = doc(
          db,
          'users',
          userData.userId,
          'notifications',
          notification.id
        );
        batch.update(notificationRef, { isRead: true });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'quest_approved':
        return '🎉';
      case 'level_up':
        return '🌟';
      case 'daily_quest':
        return '🎯';
      default:
        return '📢';
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Vừa xong';

    const date =
      typeof timestamp.toDate === 'function'
        ? timestamp.toDate()
        : new Date(timestamp);

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString('vi-VN');
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'quest_approved':
        return 'success';
      case 'level_up':
        return 'legendary';
      case 'daily_quest':
        return 'info';
      default:
        return 'default';
    }
  };

  if (!userData) return null;

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className="bell-button"
        onClick={toggleDropdown}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <div className="bell-icon">
          🔔
          {unreadCount > 0 && (
            <div className="notification-badge">
              <span className="badge-count">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </div>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>🔔 Thông Báo</h3>
            {unreadCount > 0 && (
              <span className="unread-indicator">{unreadCount} mới</span>
            )}
          </div>

          <div className="notifications-list">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Đang tải thông báo...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h4>Không có thông báo</h4>
                <p>Bạn sẽ nhận được thông báo khi có cập nhật mới!</p>
              </div>
            ) : (
              notifications.slice(0, 10).map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.isRead ? 'read' : 'unread'} ${getNotificationColor(notification.type)}`}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="notification-content">
                    <p className="notification-message">
                      {notification.message}
                    </p>
                    <span className="notification-time">
                      {formatTimestamp(notification.timestamp)}
                    </span>
                  </div>

                  {!notification.isRead && <div className="unread-dot"></div>}
                </div>
              ))
            )}
          </div>

          {notifications.length > 10 && (
            <div className="dropdown-footer">
              <button className="view-all-button">
                Xem tất cả ({notifications.length})
              </button>
            </div>
          )}

          {notifications.length === 0 && !loading && (
            <div className="dropdown-footer">
              <p className="no-notifications-text">
                🎮 Hãy hoàn thành nhiệm vụ để nhận thông báo!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
