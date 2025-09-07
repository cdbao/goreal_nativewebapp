import React, { useState, useEffect } from 'react';
import './CommunityStats.css';

interface CommunityStatsData {
  totalConnectedHeroes: number;
  totalDistanceConquered: number;
  totalAuraForged: number;
  lastUpdated: string;
}

const CommunityStats: React.FC = () => {
  const [stats, setStats] = useState<CommunityStatsData>({
    totalConnectedHeroes: 0,
    totalDistanceConquered: 0,
    totalAuraForged: 0,
    lastUpdated: new Date().toISOString()
  });
  const [displayStats, setDisplayStats] = useState({
    totalConnectedHeroes: 0,
    totalDistanceConquered: 0,
    totalAuraForged: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation duration in milliseconds
  const ANIMATION_DURATION = 2000;

  // Fetch community stats from backend
  const fetchCommunityStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://us-central1-goreal-native.cloudfunctions.net/getCommunityStats');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching community stats:', error);
      setError('Không thể tải thông tin cộng đồng');
      // Set fallback data for demo
      setStats({
        totalConnectedHeroes: 128,
        totalDistanceConquered: 15420.5,
        totalAuraForged: 89247,
        lastUpdated: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  // Animate numbers counting up
  const animateNumber = (
    start: number,
    end: number,
    setter: (value: number) => void,
    duration: number = ANIMATION_DURATION
  ) => {
    const startTime = Date.now();
    const difference = end - start;

    const updateNumber = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(start + (difference * easeOutQuart));
      
      setter(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      } else {
        setter(end);
      }
    };

    requestAnimationFrame(updateNumber);
  };

  // Format distance display
  const formatDistance = (distance: number): string => {
    return `${(distance / 1000).toFixed(1)}`;
  };

  // Format large numbers with separators
  const formatNumber = (num: number): string => {
    return num.toLocaleString('vi-VN');
  };

  // Start animations when stats are loaded
  useEffect(() => {
    if (!loading && !error) {
      // Small delay to ensure component is mounted
      setTimeout(() => {
        animateNumber(0, stats.totalConnectedHeroes, (value) => 
          setDisplayStats(prev => ({ ...prev, totalConnectedHeroes: value })));
        
        animateNumber(0, stats.totalDistanceConquered, (value) => 
          setDisplayStats(prev => ({ ...prev, totalDistanceConquered: value })));
        
        animateNumber(0, stats.totalAuraForged, (value) => 
          setDisplayStats(prev => ({ ...prev, totalAuraForged: value })));
      }, 300);
    }
  }, [stats, loading, error]);

  // Fetch data on component mount and set up polling
  useEffect(() => {
    fetchCommunityStats();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchCommunityStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="community-stats loading">
        <div className="stats-container">
          <div className="stats-header">
            <h3 className="stats-title">
              <span className="title-icon">⚡</span>
              Tiếng Vọng Aethelgard
            </h3>
            <p className="stats-subtitle">Đang tải thông tin cộng đồng...</p>
          </div>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="community-stats">
      <div className="stats-container">
        <div className="stats-header">
          <h3 className="stats-title">
            <span className="title-icon">⚡</span>
            Tiếng Vọng Aethelgard
          </h3>
          <p className="stats-subtitle">Sức mạnh tập thể của các Vệ Thần</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card heroes">
            <div className="stat-icon">🛡️</div>
            <div className="stat-content">
              <div className="stat-number">{formatNumber(displayStats.totalConnectedHeroes)}</div>
              <div className="stat-label">Số Anh Hùng Đã Kết Nối</div>
            </div>
          </div>

          <div className="stat-card distance">
            <div className="stat-icon">🏃‍♂️</div>
            <div className="stat-content">
              <div className="stat-number">
                {formatDistance(displayStats.totalDistanceConquered)} 
                <span className="stat-unit">km</span>
              </div>
              <div className="stat-label">Tổng Quãng Đường Chinh Phục</div>
            </div>
          </div>

          <div className="stat-card aura">
            <div className="stat-icon">✨</div>
            <div className="stat-content">
              <div className="stat-number">{formatNumber(displayStats.totalAuraForged)}</div>
              <div className="stat-label">Tổng AURA Đã Kiến Tạo</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="stats-footer">
          <p className="last-updated">
            Cập nhật lúc {new Date(stats.lastUpdated).toLocaleString('vi-VN')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CommunityStats;