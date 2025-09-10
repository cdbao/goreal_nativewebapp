import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TabType } from '../hooks/useDashboardState';
import './MobileNavigation.css';

interface MobileNavigationProps {
  isOpen: boolean;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onClose: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  onClose
}) => {
  const { userData, logout } = useAuth();

  const navigationItems = [
    {
      id: 'celestial' as TabType,
      icon: '🌌',
      label: 'Thiên Định Chí',
      description: 'Strava Leaderboard'
    },
    {
      id: 'quests' as TabType,
      icon: '🎯',
      label: 'Nhiệm Vụ',
      description: 'Quest System'
    },
    {
      id: 'ascension' as TabType,
      icon: '🏔️',
      label: 'Thăng Cấp',
      description: 'Level Progress'
    },
    {
      id: 'journey' as TabType,
      icon: '📜',
      label: 'Nhật Ký',
      description: 'Activity Log'
    },
    {
      id: 'aura-stream' as TabType,
      icon: '⚡',
      label: 'AURA Stream',
      description: 'Real-time Activity'
    },
    {
      id: 'chat' as TabType,
      icon: '💬',
      label: 'Chat Guild',
      description: 'Team Communication'
    },
    {
      id: 'honor' as TabType,
      icon: '🏆',
      label: 'Đài Vinh Danh',
      description: 'Hall of Honor'
    },
    {
      id: 'notifications' as TabType,
      icon: '📬',
      label: 'Thông Báo',
      description: 'Messages & Alerts'
    },
    {
      id: 'settings' as TabType,
      icon: '⚙️',
      label: 'Cài Đặt',
      description: 'App Settings'
    }
  ];

  const handleTabClick = (tabId: TabType) => {
    onTabChange(tabId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="mobile-nav-backdrop" 
        onClick={onClose}
        aria-label="Close navigation menu"
      />
      
      {/* Navigation Menu */}
      <nav className={`mobile-navigation ${isOpen ? 'open' : ''}`}>
        <div className="mobile-nav-content">
          {/* User Profile Section */}
          <div className="mobile-nav-profile">
            <div className="profile-avatar">
              <span className="avatar-icon">⚔️</span>
            </div>
            <div className="profile-info">
              <h3 className="profile-name">{userData?.displayName}</h3>
              <p className="profile-guild">{userData?.guild} Guild Member</p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="mobile-nav-items">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleTabClick(item.id)}
              >
                <div className="nav-item-icon">
                  <span>{item.icon}</span>
                </div>
                <div className="nav-item-content">
                  <div className="nav-item-label">{item.label}</div>
                  <div className="nav-item-description">{item.description}</div>
                </div>
                {activeTab === item.id && (
                  <div className="nav-item-active-indicator">
                    <span>◆</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Logout Section */}
          <div className="mobile-nav-footer">
            <button className="mobile-nav-logout" onClick={logout}>
              <div className="nav-item-icon">
                <span>🚪</span>
              </div>
              <div className="nav-item-content">
                <div className="nav-item-label">Rời khỏi Lò Rèn</div>
                <div className="nav-item-description">Sign Out</div>
              </div>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default MobileNavigation;