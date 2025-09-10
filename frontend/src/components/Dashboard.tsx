import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackground } from '../hooks/useBackground';
import { useNotifications } from '../hooks/useNotifications';
import { useAura } from '../hooks/useAura';
import { useDashboardState } from '../hooks/useDashboardState';
import { getGuildInfo } from '../constants/guilds';
import { getGuildMasterMessage } from '../constants/guildMasters';
import AscensionPath from './AscensionPath';
import JourneyLog from './JourneyLog';
import NotificationBell from './NotificationBell';
import EnhancedQuestManager from './EnhancedQuestManager';
import GuildChat from './GuildChat';
import HallOfHonor from './HallOfHonor';
import CelestialRecord from './CelestialRecord';
import QuestDebugger from './QuestDebugger';
import AuraOfferingCeremony from './AuraOfferingCeremony';
import AuraStreamSection from './AuraStreamSection';
import NotificationInbox from './NotificationInbox';
import NotificationSettings from './NotificationSettings';
import MobileHeader from './MobileHeader';
import MobileNavigation from './MobileNavigation';
import { logger } from '../services/logger';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { userData, logout, currentUser } = useAuth();
  const { backgroundUrl } = useBackground();
  const { loading, activeTab, setActiveTab, setLoading } = useDashboardState();
  const { displayedAura, updateAura } = useAura(
    userData?.currentAura || 0,
    currentUser?.uid
  );
  const { showCeremony, ceremonyData, closeCeremony } = useNotifications(
    currentUser?.uid
  );
  
  // Mobile navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    if (userData) {
      setLoading(false);
      logger.info('Dashboard loaded successfully', {
        userId: currentUser?.uid,
        guild: userData.guild,
        level: userData.level
      });
    }
  }, [userData, setLoading, currentUser?.uid]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Đang tải Lò Rèn Titan...</div>
      </div>
    );
  }

  const containerStyle = backgroundUrl
    ? {
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }
    : {};

  return (
    <div
      className="dashboard-container background-fantasy"
      style={{
        ...containerStyle,
        minHeight: '100vh',
        background: containerStyle.backgroundImage
          ? undefined
          : 'linear-gradient(135deg, #0a0e17 0%, #1a1a2e 30%, #16213e 70%, #0f1419 100%)',
        backgroundAttachment: 'fixed',
        color: 'white',
      }}
      data-guild={userData?.guild}
    >
        {/* Mobile Header */}
        <MobileHeader 
          onToggleMenu={handleToggleMobileMenu}
          isMenuOpen={isMobileMenuOpen}
          onViewAllNotifications={() => setActiveTab('notifications')}
        />
        
        {/* Mobile Navigation */}
        <MobileNavigation 
          isOpen={isMobileMenuOpen}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={handleCloseMobileMenu}
        />
        
        {/* Desktop Header */}
        <header className="dashboard-header desktop-header frosted-glass">
          <div className="guild-banner">
            {userData?.guild &&
              (() => {
                const guildInfo = getGuildInfo(userData.guild);
                return (
                  <>
                    <h1 className="text-fantasy text-shadow animate-glow">
                      {guildInfo.icon} {guildInfo.displayName} {guildInfo.icon}
                    </h1>
                    <p className="text-elegant text-shadow">
                      {guildInfo.description}
                    </p>
                  </>
                );
              })()}
          </div>

          <div className="header-actions">
            <NotificationBell 
              onViewAllNotifications={() => setActiveTab('notifications')}
            />
            <button onClick={logout} className="btn btn-ghost">
              <span>🚪</span>
              Rời khỏi Lò Rèn
            </button>
          </div>
        </header>

        {/* Desktop Tabs */}
        <div className="dashboard-tabs desktop-tabs frosted-glass">
          <button
            className={`btn ${activeTab === 'celestial' ? 'btn-primary' : 'btn-ghost'} tab-button`}
            onClick={() => setActiveTab('celestial')}
          >
            <span>🌌</span>
            Thiên Định Chí
          </button>
          <button
            className={`btn ${activeTab === 'quests' ? 'btn-primary' : 'btn-ghost'} tab-button`}
            onClick={() => setActiveTab('quests')}
          >
            <span>🎯</span>
            Nhiệm Vụ
          </button>
          <button
            className={`btn ${activeTab === 'ascension' ? 'btn-primary' : 'btn-ghost'} tab-button`}
            onClick={() => setActiveTab('ascension')}
          >
            <span>🏔️</span>
            Thăng Cấp
          </button>
          <button
            className={`btn ${activeTab === 'journey' ? 'btn-primary' : 'btn-ghost'} tab-button`}
            onClick={() => setActiveTab('journey')}
          >
            <span>📜</span>
            Nhật Ký
          </button>
          <button
            className={`btn ${activeTab === 'chat' ? 'btn-primary' : 'btn-ghost'} tab-button`}
            onClick={() => setActiveTab('chat')}
          >
            <span>💬</span>
            Chat Guild
          </button>
          <button
            className={`btn ${activeTab === 'honor' ? 'btn-primary' : 'btn-ghost'} tab-button`}
            onClick={() => setActiveTab('honor')}
          >
            <span>🏆</span>
            Đài Vinh Danh
          </button>
          <button
            className={`btn ${activeTab === 'aura-stream' ? 'btn-primary' : 'btn-ghost'} tab-button`}
            onClick={() => setActiveTab('aura-stream')}
          >
            <span>⚡</span>
            AURA Stream
          </button>
          <button
            className={`btn ${activeTab === 'notifications' ? 'btn-primary' : 'btn-ghost'} tab-button`}
            onClick={() => setActiveTab('notifications')}
          >
            <span>📬</span>
            Thông Báo
          </button>
          <button
            className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-ghost'} tab-button`}
            onClick={() => setActiveTab('settings')}
          >
            <span>⚙️</span>
            Cài Đặt
          </button>
        </div>

        <div className="dashboard-content mobile-content-wrapper">
          {activeTab === 'celestial' && (
            <div className="animate-fadeInUp">
              <CelestialRecord />
            </div>
          )}
          
          {activeTab === 'quests' && (
            <>
              <div className="player-info animate-fadeInUp">
                <div className="player-card frosted-glass">
                  <div className="player-avatar animate-pulse">
                    <span className="avatar-icon">⚔️</span>
                  </div>

                  <div className="player-details">
                    <h2 className="text-fantasy text-primary">
                      {userData?.displayName}
                    </h2>
                    <div className="player-stats">
                      <div className="stat-item">
                        <span className="stat-label text-muted">Cấp độ:</span>
                        <span className="stat-value text-primary">
                          {userData?.level}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label text-muted">AURA:</span>
                        <span className="stat-value aura text-secondary animate-glow">
                          ⚡{displayedAura}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label text-muted">Streak:</span>
                        <span className="stat-value streak text-primary">
                          🔥{userData?.currentStreak}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="guild-master-message animate-fadeInUp">
                <div className="message-card frosted-glass">
                  {(() => {
                    const { master, message } = getGuildMasterMessage(
                      userData?.guild,
                      userData?.displayName
                    );
                    return (
                      <>
                        <div className="guild-master-avatar animate-pulse">
                          {master.avatar}
                        </div>
                        <div className="message-content">
                          <h3 className="text-fantasy text-primary">
                            {master.name}
                          </h3>
                          <p className="text-elegant">"{message}"</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <EnhancedQuestManager onAuraUpdate={updateAura} />

              {/* Temporary debug component - remove after testing */}
              {process.env.NODE_ENV === 'development' && <QuestDebugger />}
            </>
          )}

          {activeTab === 'ascension' && (
            <div className="animate-fadeInUp">
              <AscensionPath />
            </div>
          )}

          {activeTab === 'journey' && (
            <div className="animate-fadeInUp">
              <JourneyLog />
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="animate-fadeInUp">
              <GuildChat />
            </div>
          )}

          {activeTab === 'honor' && (
            <div className="animate-fadeInUp">
              <HallOfHonor />
            </div>
          )}

          {activeTab === 'aura-stream' && (
            <div className="animate-fadeInUp">
              <AuraStreamSection />
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="animate-fadeInUp">
              <NotificationInbox />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="animate-fadeInUp">
              <NotificationSettings />
            </div>
          )}
        </div>

      {/* AURA Offering Ceremony for Approved Quests */}
      {showCeremony && ceremonyData.quest && ceremonyData.submission && (
        <AuraOfferingCeremony
          quest={ceremonyData.quest}
          submission={ceremonyData.submission}
          currentAura={userData?.currentAura || 0}
          onComplete={closeCeremony}
        />
      )}
    </div>
  );
};

export default Dashboard;
