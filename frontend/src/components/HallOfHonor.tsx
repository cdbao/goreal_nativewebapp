import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { getGuildInfo } from '../constants/guilds';
import './HallOfHonor.css';

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  guild: string;
  currentAura: number;
  level: number;
  currentStreak: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  rank: number;
}

const HallOfHonor: React.FC = () => {
  const { userData } = useAuth();
  const [globalLeaderboard, setGlobalLeaderboard] = useState<
    LeaderboardEntry[]
  >([]);
  const [guildLeaderboard, setGuildLeaderboard] = useState<LeaderboardEntry[]>(
    []
  );
  const [activeView, setActiveView] = useState<'global' | 'guild'>('global');
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboards();
  }, [userData]);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);

      // Fetch all users for global leaderboard
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('currentAura', 'desc'),
        limit(50)
      );

      const usersSnapshot = await getDocs(usersQuery);
      const allUsers: LeaderboardEntry[] = [];

      usersSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        if (data.displayName && data.guild && data.currentAura !== undefined) {
          allUsers.push({
            userId: doc.id,
            displayName: data.displayName,
            guild: data.guild,
            currentAura: data.currentAura || 0,
            level: data.level || 1,
            currentStreak: data.currentStreak || 0,
            totalSubmissions: data.totalSubmissions || 0,
            approvedSubmissions: data.approvedSubmissions || 0,
            rank: index + 1,
          });
        }
      });

      setGlobalLeaderboard(allUsers);

      // Find user's rank
      if (userData?.userId) {
        const userIndex = allUsers.findIndex(
          user => user.userId === userData.userId
        );
        setUserRank(userIndex >= 0 ? userIndex + 1 : null);
      }

      // Filter for guild leaderboard
      if (userData?.guild) {
        const guildUsers = allUsers.filter(
          user => user.guild === userData.guild
        );
        // Recalculate ranks for guild
        const guildWithRanks = guildUsers.map((user, index) => ({
          ...user,
          rank: index + 1,
        }));
        setGuildLeaderboard(guildWithRanks);
      }
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGuildIcon = (guildId: string) => {
    const guildInfo = getGuildInfo(guildId as any);
    return guildInfo?.icon || '⚔️';
  };

  const getGuildDisplayName = (guildId: string) => {
    const guildInfo = getGuildInfo(guildId as any);
    return guildInfo?.displayName || guildId;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getRankClass = (rank: number) => {
    if (rank <= 3) return 'top-three';
    if (rank <= 10) return 'top-ten';
    return 'regular';
  };

  const isCurrentUser = (userId: string) => {
    return userId === userData?.userId;
  };

  const currentLeaderboard =
    activeView === 'global' ? globalLeaderboard : guildLeaderboard;

  if (loading) {
    return (
      <div className="hall-loading frosted-glass">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h3 className="text-fantasy">Đang tải Đài Vinh Danh...</h3>
          <p>Thu thập thông tin các Chiến Binh xuất sắc...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="hall-of-honor frosted-glass"
      data-guild={userData?.guild}
      style={{
        background: 'rgba(20, 25, 35, 0.95)',
        backdropFilter: 'blur(15px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '20px',
        boxShadow:
          '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        color: 'white',
        padding: '2rem',
      }}
    >
      {/* Hall Header */}
      <div className="hall-header">
        <div className="hall-title">
          <div className="title-icon animate-glow">🏆</div>
          <div className="title-content">
            <h1
              className="text-fantasy text-primary text-shadow"
              style={{
                background:
                  'linear-gradient(135deg, #FFD700, #FFA500, #FF6B6B)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow:
                  '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4), 2px 2px 8px rgba(0, 0, 0, 0.8)',
                filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.5))',
                fontWeight: '800',
              }}
            >
              Đài Vinh Danh
            </h1>
            <p
              className="text-elegant text-muted"
              style={{
                color: 'rgba(255, 255, 255, 0.95)',
                textShadow: '1px 1px 3px rgba(0, 0, 0, 0.7)',
                fontWeight: '500',
              }}
            >
              Vinh danh những Chiến Binh xuất sắc nhất của GoREAL
            </p>
          </div>
        </div>

        {userRank && (
          <div className="user-rank-badge animate-pulse">
            <div className="badge-icon">⭐</div>
            <div className="badge-content">
              <span className="badge-label">Hạng của bạn</span>
              <span className="badge-rank text-primary">#{userRank}</span>
            </div>
          </div>
        )}
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button
          className={`btn ${activeView === 'global' ? 'btn-primary' : 'btn-ghost'} toggle-button`}
          onClick={() => setActiveView('global')}
        >
          <span>🌍</span>
          Toàn Cầu
        </button>
        <button
          className={`btn ${activeView === 'guild' ? 'btn-primary' : 'btn-ghost'} toggle-button`}
          onClick={() => setActiveView('guild')}
          disabled={!userData?.guild}
        >
          <span>{userData?.guild ? getGuildIcon(userData.guild) : '⚔️'}</span>
          {userData?.guild
            ? getGuildDisplayName(userData.guild)
            : 'Chưa có Guild'}
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="leaderboard-container">
        {currentLeaderboard.length === 0 ? (
          <div className="empty-leaderboard">
            <div className="empty-icon">🏆</div>
            <h3 className="text-fantasy">Chưa có dữ liệu xếp hạng</h3>
            <p>
              {activeView === 'guild'
                ? 'Guild của bạn chưa có thành viên nào hoàn thành nhiệm vụ.'
                : 'Hệ thống đang thu thập dữ liệu xếp hạng.'}
            </p>
          </div>
        ) : (
          <div className="leaderboard-table">
            {/* Table Header */}
            <div className="table-header">
              <div className="header-cell rank-col">#</div>
              <div className="header-cell player-col">Chiến Binh</div>
              <div className="header-cell guild-col">Guild</div>
              <div className="header-cell aura-col">⚡ AURA</div>
              <div className="header-cell level-col">📊 Level</div>
              <div className="header-cell streak-col">🔥 Streak</div>
            </div>

            {/* Table Body */}
            <div className="table-body">
              {currentLeaderboard.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`table-row ${getRankClass(entry.rank)} ${
                    isCurrentUser(entry.userId) ? 'current-user' : ''
                  } animate-fadeInUp`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="table-cell rank-col">
                    <div className="rank-display">
                      <span className="rank-icon">
                        {getRankIcon(entry.rank)}
                      </span>
                    </div>
                  </div>

                  <div className="table-cell player-col">
                    <div className="player-info">
                      <div className="player-avatar">
                        <span>⚔️</span>
                      </div>
                      <div className="player-details">
                        <span className="player-name text-primary">
                          {entry.displayName}
                          {isCurrentUser(entry.userId) && (
                            <span className="you-badge">Bạn</span>
                          )}
                        </span>
                        <span className="player-stats text-muted">
                          {entry.approvedSubmissions || 0}/
                          {entry.totalSubmissions || 0} nhiệm vụ
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="table-cell guild-col">
                    <div className="guild-info">
                      <span className="guild-icon">
                        {getGuildIcon(entry.guild)}
                      </span>
                      <span className="guild-name">
                        {getGuildDisplayName(entry.guild)}
                      </span>
                    </div>
                  </div>

                  <div className="table-cell aura-col">
                    <div className="aura-display">
                      <span className="aura-amount text-secondary animate-glow">
                        {entry.currentAura.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="table-cell level-col">
                    <div className="level-display">
                      <span className="level-number">{entry.level}</span>
                    </div>
                  </div>

                  <div className="table-cell streak-col">
                    <div className="streak-display">
                      <span className="streak-number">
                        {entry.currentStreak}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="hall-footer">
        <button
          className="btn btn-secondary refresh-btn"
          onClick={fetchLeaderboards}
          disabled={loading}
        >
          <span>🔄</span>
          {loading ? 'Đang làm mới...' : 'Làm mới bảng xếp hạng'}
        </button>
      </div>
    </div>
  );
};

export default HallOfHonor;
