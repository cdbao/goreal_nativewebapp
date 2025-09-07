import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { db } from '../firebase';
import app from '../firebase';
import { User } from '../types';
import './NotificationPanel.css';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  clickAction?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  urgent?: boolean;
  tag?: string;
  data?: Record<string, string>;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

interface NotificationTarget {
  type: 'all' | 'guild' | 'user';
  value?: string;
  label?: string;
}

const NotificationPanel: React.FC = () => {
  const [payload, setPayload] = useState<NotificationPayload>({
    title: '',
    body: '',
    icon: '/logo192.png',
    clickAction: '/dashboard',
    requireInteraction: false,
    silent: false,
    urgent: false,
    tag: 'goreal-admin-notification'
  });

  const [target, setTarget] = useState<NotificationTarget>({
    type: 'all',
    value: '',
    label: 'Tất cả người chơi'
  });

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [scheduleTime, setScheduleTime] = useState('');

  // Get Firebase Functions instance
  const functions = getFunctions(app);
  
  // Cloud Function references
  const sendNotification = httpsCallable(functions, 'sendPushNotification');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (target.type === 'user' && searchTerm) {
      const filtered = users.filter(user => 
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users, target.type]);

  const fetchUsers = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersData = usersSnapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      })) as User[];
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleTargetChange = (type: 'all' | 'guild' | 'user', value?: string) => {
    let label = '';
    
    switch (type) {
      case 'all':
        label = 'Tất cả người chơi';
        break;
      case 'guild':
        const guildLabels = {
          'titans': 'Guild Titans',
          'illumination': 'Guild Illumination', 
          'envoys': 'Guild Envoys'
        };
        label = guildLabels[value as keyof typeof guildLabels] || value || '';
        break;
      case 'user':
        const user = users.find(u => u.userId === value);
        label = user ? user.displayName || user.email || 'Người dùng không xác định' : '';
        break;
    }

    setTarget({ type, value, label });
    setSearchTerm('');
    setFilteredUsers([]);
  };

  const handleSendNotification = async () => {
    try {
      // Validate required fields
      if (!payload.title.trim()) {
        setMessage({ type: 'error', text: 'Tiêu đề thông báo là bắt buộc' });
        return;
      }

      if (!payload.body.trim()) {
        setMessage({ type: 'error', text: 'Nội dung thông báo là bắt buộc' });
        return;
      }

      if (target.type === 'guild' && !target.value) {
        setMessage({ type: 'error', text: 'Vui lòng chọn Guild' });
        return;
      }

      if (target.type === 'user' && !target.value) {
        setMessage({ type: 'error', text: 'Vui lòng chọn người dùng' });
        return;
      }

      setLoading(true);
      setMessage(null);

      // Prepare function call data
      const callData: any = {
        target: target.type,
        payload: {
          ...payload,
          targetType: `admin-${target.type}`,
          data: {
            ...payload.data,
            sentFrom: 'admin-panel',
            targetInfo: target.label
          }
        }
      };

      // Add target-specific data
      if (target.type === 'guild') {
        callData.targetGuild = target.value;
      } else if (target.type === 'user') {
        callData.targetUserId = target.value;
      }

      // Add schedule time if specified
      if (scheduleTime) {
        const scheduleDate = new Date(scheduleTime);
        if (scheduleDate > new Date()) {
          callData.scheduleTime = scheduleDate.toISOString();
        }
      }

      console.log('Sending notification with data:', callData);

      // Call the Cloud Function
      const result = await sendNotification(callData);
      
      console.log('Notification sent:', result.data);

      if ((result.data as any).success) {
        setMessage({ 
          type: 'success', 
          text: (result.data as any).message || 'Thông báo đã được gửi thành công!' 
        });
        
        // Reset form after successful send
        setPayload({
          title: '',
          body: '',
          icon: '/logo192.png',
          clickAction: '/dashboard',
          requireInteraction: false,
          silent: false,
          urgent: false,
          tag: 'goreal-admin-notification'
        });
        
        setTarget({
          type: 'all',
          value: '',
          label: 'Tất cả người chơi'
        });
        
        setScheduleTime('');
      } else {
        setMessage({ 
          type: 'error', 
          text: (result.data as any).message || 'Không thể gửi thông báo' 
        });
      }

    } catch (error: any) {
      console.error('Error sending notification:', error);
      
      let errorMessage = 'Có lỗi xảy ra khi gửi thông báo';
      
      if (error.code === 'unauthenticated') {
        errorMessage = 'Bạn cần đăng nhập để gửi thông báo';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Bạn không có quyền gửi thông báo';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // Minimum 1 minute from now
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="notification-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <span className="title-icon">📢</span>
          Phát Lệnh Từ Đại Sảnh
        </h2>
        <p className="panel-description">
          Gửi thông báo đến các Vệ Thần trong Aethelgard để thông báo quest mới, sự kiện và tin tức quan trọng.
        </p>
      </div>

      <div className="panel-content">
        {/* Target Selection */}
        <div className="form-section">
          <h3 className="section-title">
            <span className="section-icon">🎯</span>
            Đối Tượng Nhận Thông Báo
          </h3>
          
          <div className="target-selector">
            <div className="target-options">
              <label className={`target-option ${target.type === 'all' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="target"
                  value="all"
                  checked={target.type === 'all'}
                  onChange={() => handleTargetChange('all')}
                />
                <span className="option-content">
                  <span className="option-icon">🌍</span>
                  <span className="option-text">Tất cả người chơi</span>
                </span>
              </label>

              <label className={`target-option ${target.type === 'guild' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="target"
                  value="guild"
                  checked={target.type === 'guild'}
                  onChange={() => handleTargetChange('guild')}
                />
                <span className="option-content">
                  <span className="option-icon">⚔️</span>
                  <span className="option-text">Guild cụ thể</span>
                </span>
              </label>

              <label className={`target-option ${target.type === 'user' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="target"
                  value="user"
                  checked={target.type === 'user'}
                  onChange={() => handleTargetChange('user')}
                />
                <span className="option-content">
                  <span className="option-icon">👤</span>
                  <span className="option-text">Người chơi cụ thể</span>
                </span>
              </label>
            </div>

            {/* Guild Selection */}
            {target.type === 'guild' && (
              <div className="guild-selector">
                <select
                  value={target.value || ''}
                  onChange={(e) => handleTargetChange('guild', e.target.value)}
                  className="guild-select"
                >
                  <option value="">Chọn Guild</option>
                  <option value="titans">⚡ Titans - Kỷ Luật & Sức Mạnh</option>
                  <option value="illumination">🔮 Illumination - Trí Tuệ & Kiến Thức</option>
                  <option value="envoys">🌿 Envoys - Giao Tiếp & Kết Nối</option>
                </select>
              </div>
            )}

            {/* User Search */}
            {target.type === 'user' && (
              <div className="user-selector">
                <input
                  type="text"
                  placeholder="Tìm kiếm người chơi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="user-search"
                />
                
                {searchTerm && filteredUsers.length > 0 && (
                  <div className="user-dropdown">
                    {filteredUsers.slice(0, 10).map((user) => (
                      <div
                        key={user.userId}
                        className="user-option"
                        onClick={() => {
                          handleTargetChange('user', user.userId);
                          setSearchTerm(user.displayName || user.email || '');
                        }}
                      >
                        <span className="user-name">{user.displayName || user.email}</span>
                        <span className="user-guild">
                          {user.guild ? `Guild: ${user.guild}` : 'Chưa có Guild'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {target.value && (
              <div className="selected-target">
                <strong>Đã chọn:</strong> {target.label}
              </div>
            )}
          </div>
        </div>

        {/* Notification Content */}
        <div className="form-section">
          <h3 className="section-title">
            <span className="section-icon">✍️</span>
            Nội Dung Thông Báo
          </h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Tiêu đề *</label>
              <input
                type="text"
                value={payload.title}
                onChange={(e) => setPayload({...payload, title: e.target.value})}
                placeholder="GoREAL - Quest mới!"
                className="form-input"
                maxLength={100}
              />
              <small className="form-hint">{payload.title.length}/100 ký tự</small>
            </div>

            <div className="form-group">
              <label className="form-label">Nội dung *</label>
              <textarea
                value={payload.body}
                onChange={(e) => setPayload({...payload, body: e.target.value})}
                placeholder="Bạn có một quest mới từ Guild Master! Hãy vào GoREAL để xem chi tiết."
                className="form-textarea"
                rows={4}
                maxLength={500}
              />
              <small className="form-hint">{payload.body.length}/500 ký tự</small>
            </div>

            <div className="form-group">
              <label className="form-label">Link đích</label>
              <input
                type="text"
                value={payload.clickAction}
                onChange={(e) => setPayload({...payload, clickAction: e.target.value})}
                placeholder="/dashboard"
                className="form-input"
              />
              <small className="form-hint">Trang sẽ mở khi người dùng nhấn vào thông báo</small>
            </div>

            <div className="form-group">
              <label className="form-label">Tag thông báo</label>
              <input
                type="text"
                value={payload.tag}
                onChange={(e) => setPayload({...payload, tag: e.target.value})}
                placeholder="goreal-admin-notification"
                className="form-input"
              />
              <small className="form-hint">Dùng để nhóm các thông báo cùng loại</small>
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="form-section">
          <h3 className="section-title">
            <span className="section-icon">⚙️</span>
            Tùy Chọn Nâng Cao
          </h3>
          
          <div className="options-grid">
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={payload.urgent}
                onChange={(e) => setPayload({...payload, urgent: e.target.checked})}
              />
              <span className="checkbox-label">
                <span className="checkbox-icon">🚨</span>
                Thông báo khẩn cấp
              </span>
            </label>

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={payload.requireInteraction}
                onChange={(e) => setPayload({...payload, requireInteraction: e.target.checked})}
              />
              <span className="checkbox-label">
                <span className="checkbox-icon">👆</span>
                Yêu cầu tương tác
              </span>
            </label>

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={payload.silent}
                onChange={(e) => setPayload({...payload, silent: e.target.checked})}
              />
              <span className="checkbox-label">
                <span className="checkbox-icon">🔇</span>
                Gửi âm thầm
              </span>
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Lên lịch gửi (tùy chọn)</label>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              min={getMinDateTime()}
              className="form-input"
            />
            <small className="form-hint">Để trống để gửi ngay lập tức</small>
          </div>
        </div>

        {/* Send Button */}
        <div className="form-section">
          <button
            className="send-button"
            onClick={handleSendNotification}
            disabled={loading || !payload.title.trim() || !payload.body.trim()}
          >
            {loading ? (
              <>
                <div className="button-spinner"></div>
                <span>Đang gửi...</span>
              </>
            ) : (
              <>
                <span className="button-icon">📤</span>
                <span>
                  {scheduleTime ? 'Lên lịch gửi thông báo' : 'Gửi thông báo ngay'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`message ${message.type}`}>
            <span className="message-icon">
              {message.type === 'success' ? '✅' : '❌'}
            </span>
            <span className="message-text">{message.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;