import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import gameConfig from '../config/gameConfig.json';
import KaelIntroModal from './KaelIntroModal';
import MilestoneCelebration from './MilestoneCelebration';
import AvatarEvolutionAnimation from './AvatarEvolutionAnimation';
import kaelDialogue from '../content/kaelDialogue.json';
import './AuraStreamSection.css';

interface StravaConnectionStatus {
  connected: boolean;
  athleteInfo?: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
    city: string;
    country: string;
    sex: string;
  };
  lastSync?: Date;
}

const AuraStreamSection: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const [stravaStatus, setStravaStatus] = useState<StravaConnectionStatus>({ connected: false });
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  // Kael UI state
  const [showKaelIntro, setShowKaelIntro] = useState(false);
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
  const [milestoneData, setMilestoneData] = useState<{tier: number, stamina: number} | null>(null);
  const [showEvolutionAnimation, setShowEvolutionAnimation] = useState(false);
  const [evolutionData, setEvolutionData] = useState<{fromTier: number, toTier: number} | null>(null);

  const staminaPoints = userData?.stamina_points || 0;
  const avatarTier = userData?.avatar_tier || 0;
  const currentTierData = gameConfig.AVATAR_TIERS[avatarTier.toString() as keyof typeof gameConfig.AVATAR_TIERS];
  const nextTier = avatarTier + 1;
  const nextTierData = gameConfig.AVATAR_TIERS[nextTier.toString() as keyof typeof gameConfig.AVATAR_TIERS];
  const nextThreshold = gameConfig.AVATAR_EVOLUTION_THRESHOLDS[`TIER_${nextTier}` as keyof typeof gameConfig.AVATAR_EVOLUTION_THRESHOLDS];

  useEffect(() => {
    if (userData) {
      const previousStatus = stravaStatus.connected;
      setStravaStatus({
        connected: userData.strava_connected || false,
        athleteInfo: userData.strava_athlete_info,
        lastSync: userData.last_activity_sync?.toDate()
      });

      // Show Kael intro modal if user hasn't connected Strava yet
      if (!userData.strava_connected && !localStorage.getItem('kael_intro_dismissed')) {
        setShowKaelIntro(true);
      }

      // Show connection success message from Kael
      if (!previousStatus && userData.strava_connected) {
        setSyncMessage(`⚔️ ${kaelDialogue.connectionSuccess.message}`);
        localStorage.setItem('kael_intro_dismissed', 'true');
      }
    }
  }, [userData]);

  // Monitor for avatar tier changes to trigger celebrations
  useEffect(() => {
    const previousTier = localStorage.getItem('previous_avatar_tier');
    const currentTier = avatarTier;

    if (previousTier && parseInt(previousTier) < currentTier) {
      // Trigger evolution animation first
      setEvolutionData({
        fromTier: parseInt(previousTier),
        toTier: currentTier
      });
      setShowEvolutionAnimation(true);

      // Then show milestone celebration after animation
      setTimeout(() => {
        setMilestoneData({
          tier: currentTier,
          stamina: staminaPoints
        });
        setShowMilestoneCelebration(true);
      }, 6000); // Wait for evolution animation to complete
    }

    // Store current tier for next comparison
    localStorage.setItem('previous_avatar_tier', currentTier.toString());
  }, [avatarTier, staminaPoints]);

  const handleConnectStrava = async () => {
    try {
      if (!currentUser) return;
      
      const idToken = await currentUser.getIdToken();
      
      // Use production API URL during development since rewrites only work in production
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'https://goreal-native.web.app/api/getStravaAuthUrl'
        : '/api/getStravaAuthUrl';
        
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get Strava auth URL');
      }
    } catch (error) {
      console.error('Error connecting to Strava:', error);
      setSyncMessage('❌ Lỗi kết nối Strava. Vui lòng thử lại.');
    }
  };

  const handleDisconnectStrava = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn ngắt kết nối với Strava?')) {
      return;
    }

    try {
      if (!currentUser) return;
      
      const idToken = await currentUser.getIdToken();
      
      // Use production API URL during development
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'https://goreal-native.web.app/api/disconnectStrava'
        : '/api/disconnectStrava';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setStravaStatus({ connected: false });
        setSyncMessage('✅ Đã ngắt kết nối Strava thành công');
      } else {
        throw new Error('Failed to disconnect Strava');
      }
    } catch (error) {
      console.error('Error disconnecting Strava:', error);
      setSyncMessage('❌ Lỗi ngắt kết nối Strava. Vui lòng thử lại.');
    }
  };

  const handleSyncActivities = async () => {
    if (syncing) return;

    setSyncing(true);
    setSyncMessage(null);

    try {
      if (!currentUser) return;
      
      const idToken = await currentUser.getIdToken();
      
      // Use production API URL during development
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'https://goreal-native.web.app/api/syncStravaActivities'
        : '/api/syncStravaActivities';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSyncMessage(
          `✅ Đã đồng bộ ${data.activities_processed} hoạt động! ` +
          `+${data.stamina_gained} Stamina` +
          (data.tier_upgraded ? ` 🎉 Thăng cấp lên ${nextTierData?.name}!` : '')
        );
        
        // Refresh user data
        window.location.reload();
      } else {
        throw new Error(data.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing activities:', error);
      setSyncMessage(`❌ Lỗi đồng bộ: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  const calculateProgress = () => {
    if (!nextThreshold) return 100; // Max tier reached
    
    const currentThreshold = gameConfig.AVATAR_EVOLUTION_THRESHOLDS[`TIER_${avatarTier}` as keyof typeof gameConfig.AVATAR_EVOLUTION_THRESHOLDS];
    const progress = ((staminaPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  return (
    <div className="aura-stream-section">
      <div className="section-header">
        <h2 className="aura-stream-title">
          <span className="stream-icon">⚡</span>
          Dòng Chảy AURA
        </h2>
        <p className="section-description">
          Kết nối Strava để chuyển hóa hoạt động thể thao thành sức mạnh AURA
        </p>
      </div>

      {/* Strava Connection Status */}
      <div className="strava-connection">
        <div className="connection-header">
          <div className="strava-logo">
            <span>🏃‍♂️</span>
          </div>
          <div className="connection-info">
            <h3>Kết nối Strava</h3>
            {stravaStatus.connected ? (
              <div className="connected-status">
                <span className="status-indicator connected"></span>
                <span className="status-text">Đã kết nối</span>
                {stravaStatus.athleteInfo && (
                  <span className="athlete-name">{stravaStatus.athleteInfo.firstname} {stravaStatus.athleteInfo.lastname}</span>
                )}
              </div>
            ) : (
              <div className="disconnected-status">
                <span className="status-indicator disconnected"></span>
                <span className="status-text">Chưa kết nối</span>
              </div>
            )}
          </div>
        </div>

        <div className="connection-actions">
          {stravaStatus.connected ? (
            <div className="connected-actions">
              <button 
                className="sync-button primary" 
                onClick={handleSyncActivities}
                disabled={syncing}
              >
                {syncing ? (
                  <>
                    <span className="spinner"></span>
                    Đang đồng bộ...
                  </>
                ) : (
                  <>
                    <span className="sync-icon">🔄</span>
                    Đồng Bộ Hoạt Động
                  </>
                )}
              </button>
              <button 
                className="disconnect-button secondary" 
                onClick={handleDisconnectStrava}
              >
                Ngắt Kết Nối
              </button>
            </div>
          ) : (
            <button 
              className="connect-button primary" 
              onClick={handleConnectStrava}
            >
              <span className="connect-icon">🔗</span>
              Kết Nối Strava
            </button>
          )}
        </div>

        {stravaStatus.lastSync && (
          <div className="last-sync-info">
            <span className="sync-label">Đồng bộ lần cuối:</span>
            <span className="sync-time">
              {stravaStatus.lastSync.toLocaleString('vi-VN')}
            </span>
          </div>
        )}
      </div>

      {/* Stamina & Avatar Status */}
      <div className="stamina-section">
        <div className="stats-grid">
          <div className="stat-card stamina">
            <div className="stat-icon">💪</div>
            <div className="stat-info">
              <h4>Stamina Points</h4>
              <div className="stat-value">{staminaPoints.toLocaleString()}</div>
            </div>
          </div>
          
          <div className="stat-card avatar">
            <div className="stat-icon">🎭</div>
            <div className="stat-info">
              <h4>Avatar Tier</h4>
              <div className="stat-value">{currentTierData?.name || 'Người Mới'}</div>
              <div className="tier-level">Cấp {avatarTier}</div>
            </div>
          </div>
        </div>

        {/* Progress to Next Tier */}
        {nextTierData && (
          <div className="tier-progress">
            <div className="progress-header">
              <h4>Tiến Trình Thăng Cấp</h4>
              <span className="next-tier">{nextTierData.name}</span>
            </div>
            
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
            
            <div className="progress-info">
              <span className="current-progress">
                {staminaPoints} / {nextThreshold} Stamina
              </span>
              <span className="remaining">
                Còn {nextThreshold - staminaPoints} để thăng cấp
              </span>
            </div>
          </div>
        )}

        {avatarTier === 10 && (
          <div className="max-tier-achieved">
            <div className="achievement-icon">👑</div>
            <h4>Đã Đạt Cấp Độ Tối Cao!</h4>
            <p>Bạn đã trở thành Vô Cực - đỉnh cao của sức mạnh!</p>
          </div>
        )}
      </div>

      {/* Activity History Preview */}
      {stravaStatus.connected && (
        <div className="activity-preview">
          <h4>Hoạt Động Gần Đây</h4>
          <div className="activity-summary">
            <div className="summary-item">
              <span className="activity-icon">🏃‍♂️</span>
              <span className="activity-stat">
                {userData?.total_distance_run?.toFixed(1) || '0'} km chạy
              </span>
            </div>
            <div className="summary-item">
              <span className="activity-icon">🏊‍♂️</span>
              <span className="activity-stat">
                {userData?.total_distance_swim?.toFixed(1) || '0'} km bơi
              </span>
            </div>
            <div className="summary-item">
              <span className="activity-icon">🚴‍♂️</span>
              <span className="activity-stat">
                {userData?.total_distance_cycle?.toFixed(1) || '0'} km đạp xe
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sync Message */}
      {syncMessage && (
        <div className={`sync-message ${syncMessage.startsWith('✅') ? 'success' : 'error'}`}>
          {syncMessage}
        </div>
      )}

      {/* Stamina Rates Info */}
      <div className="stamina-rates">
        <h4>Tỷ Lệ Stamina</h4>
        <div className="rates-grid">
          <div className="rate-item">
            <span className="rate-icon">🏃‍♂️</span>
            <span className="rate-text">Chạy: 1 điểm/km</span>
          </div>
          <div className="rate-item">
            <span className="rate-icon">🏊‍♂️</span>
            <span className="rate-text">Bơi: 50 điểm/km</span>
          </div>
          <div className="rate-item">
            <span className="rate-icon">🚴‍♂️</span>
            <span className="rate-text">Đạp xe: 0.3 điểm/km</span>
          </div>
          <div className="rate-item">
            <span className="rate-icon">🚶‍♂️</span>
            <span className="rate-text">Đi bộ: 0.5 điểm/km</span>
          </div>
        </div>
      </div>

      {/* Kael Interactive Components */}
      <KaelIntroModal
        isVisible={showKaelIntro}
        onClose={() => {
          setShowKaelIntro(false);
          localStorage.setItem('kael_intro_dismissed', 'true');
        }}
        onConnectStrava={handleConnectStrava}
      />

      <MilestoneCelebration
        isVisible={showMilestoneCelebration}
        tier={milestoneData?.tier || 0}
        staminaPoints={milestoneData?.stamina || 0}
        onClose={() => setShowMilestoneCelebration(false)}
      />

      <AvatarEvolutionAnimation
        isActive={showEvolutionAnimation}
        fromTier={evolutionData?.fromTier || 0}
        toTier={evolutionData?.toTier || 0}
        onAnimationComplete={() => setShowEvolutionAnimation(false)}
      />
    </div>
  );
};

export default AuraStreamSection;