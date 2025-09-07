import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { getGuildInfo } from '../constants/guilds';
import './CelestialRecord.css';

interface CelestialEntry {
  userId: string;
  displayName: string;
  guild: string;
  avatarTier: string;
  totalStamina: number;
  totalDistance: number;
  rank: number;
}

type TimeFrame = 'weekly' | 'monthly' | 'allTime';

const CelestialRecord: React.FC = () => {
  const { userData } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState<{
    weekly: CelestialEntry[];
    monthly: CelestialEntry[];
    allTime: CelestialEntry[];
  }>({
    weekly: [],
    monthly: [],
    allTime: []
  });
  const [activeTimeFrame, setActiveTimeFrame] = useState<TimeFrame>('allTime');
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchCelestialRecord();
  }, []);

  useEffect(() => {
    // Update user rank when timeframe or data changes
    const currentData = leaderboardData[activeTimeFrame];
    const rank = currentData.findIndex(entry => entry.userId === userData?.userId);
    setUserRank(rank >= 0 ? rank + 1 : null);
  }, [activeTimeFrame, leaderboardData, userData?.userId]);

  const fetchCelestialRecord = async () => {
    try {
      setLoading(true);
      const celestialDoc = await getDoc(doc(db, 'leaderboards', 'celestial_record'));
      
      if (celestialDoc.exists()) {
        const data = celestialDoc.data();
        setLeaderboardData({
          weekly: data.weekly || [],
          monthly: data.monthly || [],
          allTime: data.allTime || []
        });
      }
    } catch (error) {
      console.error('Error fetching Celestial Record:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getAvatarGlow = (tier: string) => {
    const glowMap: { [key: string]: string } = {
      'legendary': '#ffd700',
      'epic': '#9d4edd',
      'rare': '#007bff',
      'common': '#28a745'
    };
    return glowMap[tier] || '#ffffff';
  };

  const formatDistance = (distance: number) => {
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const getTimeFrameLabel = (timeFrame: TimeFrame) => {
    const labels = {
      weekly: 'Tuần Này',
      monthly: 'Tháng Này',
      allTime: 'Mọi Thời Đại'
    };
    return labels[timeFrame];
  };

  const currentData = leaderboardData[activeTimeFrame];

  return (
    <div className="celestial-record">
      {/* Animated cosmic background */}
      <div className="cosmic-background">
        <div className="stars"></div>
        <div className="nebula"></div>
        <div className="floating-particles"></div>
      </div>

      <div className="celestial-container">
        {/* Header Section */}
        <div className="celestial-header">
          <h1 className="celestial-title">
            <span className="title-glow">🌌 BẢNG GHI THIÊN THỂ</span>
            <span className="subtitle">AURA Stream Leaderboard</span>
          </h1>
          
          {/* User's Current Rank */}
          {userData && userRank && (
            <div className="user-rank-display">
              <div className="rank-badge">
                <span className="rank-icon">{getRankIcon(userRank)}</span>
                <span className="rank-text">Hạng của bạn</span>
              </div>
            </div>
          )}
        </div>

        {/* Time Frame Filters */}
        <div className="time-filters">
          {(['weekly', 'monthly', 'allTime'] as TimeFrame[]).map((timeFrame) => (
            <button
              key={timeFrame}
              className={`filter-btn ${activeTimeFrame === timeFrame ? 'active' : ''}`}
              onClick={() => setActiveTimeFrame(timeFrame)}
            >
              <span className="filter-icon">⭐</span>
              {getTimeFrameLabel(timeFrame)}
            </button>
          ))}
        </div>

        {/* Leaderboard Content */}
        <div className="leaderboard-content">
          {loading ? (
            <div className="loading-state">
              <div className="cosmic-spinner"></div>
              <p>Đang tải dữ liệu thiên định...</p>
            </div>
          ) : currentData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🌠</div>
              <p>Chưa có dữ liệu AURA Stream</p>
              <span>Kết nối Strava để tham gia xếp hạng!</span>
            </div>
          ) : (
            <div className="leaderboard-list">
              {currentData.map((entry, index) => {
                const isCurrentUser = entry.userId === userData?.userId;
                const guildInfo = getGuildInfo(entry.guild);
                
                return (
                  <div
                    key={entry.userId}
                    className={`celestial-entry ${isCurrentUser ? 'current-user' : ''} ${
                      index < 3 ? 'top-three' : ''
                    }`}
                  >
                    {/* Rank Section */}
                    <div className="rank-section">
                      <div className={`rank-display ${index < 3 ? 'medal' : ''}`}>
                        {getRankIcon(entry.rank)}
                      </div>
                    </div>

                    {/* Avatar Section */}
                    <div className="avatar-section">
                      <div 
                        className="avatar-container"
                        style={{ '--glow-color': getAvatarGlow(entry.avatarTier) } as React.CSSProperties}
                      >
                        <div className="avatar-placeholder">
                          👤
                        </div>
                        <div className="tier-indicator">{entry.avatarTier}</div>
                      </div>
                    </div>

                    {/* Player Info */}
                    <div className="player-info">
                      <div className="player-name">{entry.displayName}</div>
                      <div className="guild-info">
                        <span className="guild-icon">{guildInfo?.icon || '⚡'}</span>
                        <span className="guild-name">{guildInfo?.name || entry.guild}</span>
                      </div>
                    </div>

                    {/* Stats Section */}
                    <div className="stats-section">
                      <div className="stat-item primary">
                        <div className="stat-value">{entry.totalStamina.toLocaleString()}</div>
                        <div className="stat-label">Thể Lực</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">{formatDistance(entry.totalDistance)}</div>
                        <div className="stat-label">Tổng KM</div>
                      </div>
                    </div>

                    {/* Current User Indicator */}
                    {isCurrentUser && (
                      <div className="user-indicator">
                        <span className="indicator-text">BạN</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="celestial-footer">
          <p>
            <span className="footer-icon">⚡</span>
            Cập nhật mỗi giờ từ dữ liệu AURA Stream
          </p>
          <p className="footer-note">
            Kết nối Strava để tham gia xếp hạng thiên định!
          </p>
        </div>
      </div>
    </div>
  );
};

export default CelestialRecord;