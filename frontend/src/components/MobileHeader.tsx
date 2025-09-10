import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getGuildInfo } from '../constants/guilds';
import NotificationBell from './NotificationBell';
import { TabType } from '../hooks/useDashboardState';
import './MobileHeader.css';

interface MobileHeaderProps {
  onToggleMenu: () => void;
  isMenuOpen: boolean;
  onViewAllNotifications: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ 
  onToggleMenu, 
  isMenuOpen,
  onViewAllNotifications 
}) => {
  const { userData, logout } = useAuth();

  if (!userData?.guild) {
    return null;
  }

  const guildInfo = getGuildInfo(userData.guild);

  return (
    <header className="mobile-header frosted-glass">
      <div className="mobile-header-content">
        {/* Hamburger Menu Button */}
        <button 
          className={`hamburger-btn ${isMenuOpen ? 'open' : ''}`}
          onClick={onToggleMenu}
          aria-label="Toggle navigation menu"
        >
          <div className="hamburger-lines">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>

        {/* Guild Title */}
        <div className="guild-title">
          <span className="guild-icon">{guildInfo.icon}</span>
          <h1 className="guild-name text-fantasy">{guildInfo.displayName}</h1>
        </div>

        {/* Notification Bell */}
        <div className="header-notifications">
          <NotificationBell onViewAllNotifications={onViewAllNotifications} />
        </div>
      </div>

      {/* User Info Bar - Mobile Only */}
      <div className="mobile-user-info">
        <div className="user-stats">
          <div className="stat-item">
            <span className="stat-label">Lv</span>
            <span className="stat-value">{userData.level}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">AURA</span>
            <span className="stat-value">⚡{userData.currentAura}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Streak</span>
            <span className="stat-value">🔥{userData.currentStreak}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;