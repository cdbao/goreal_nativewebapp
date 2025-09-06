import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GUILDS, GuildId } from '../constants/guilds';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './GuildSelection.css';

interface GuildSelectionProps {
  onSelection?: (guildId: GuildId) => void;
}

interface GuildData {
  id: GuildId;
  name: string;
  icon: string;
  motto: string;
  description: string;
  focus: string;
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
}

const ENHANCED_GUILDS: Record<GuildId, GuildData> = {
  titans: {
    id: 'titans',
    name: 'Titans',
    icon: '⚡',
    motto: 'Mồ hôi hôm nay là sức mạnh ngày mai',
    description: 'Masters of discipline and raw power. The Titans forge themselves through trials of strength and unwavering determination.',
    focus: 'Discipline & Strength',
    theme: GUILDS.titans.theme
  },
  illumination: {
    id: 'illumination', 
    name: 'Illumination',
    icon: '🔮',
    motto: 'Tri thức là ánh sáng dẫn lối',
    description: 'Seekers of wisdom and truth. The Illumination guild unravels mysteries through knowledge and enlightenment.',
    focus: 'Wisdom & Knowledge',
    theme: GUILDS.illumination.theme
  },
  envoys: {
    id: 'envoys',
    name: 'Envoys',
    icon: '🌿',
    motto: 'Hài hòa trong đa dạng, sức mạnh trong đoàn kết',
    description: 'Guardians of balance and unity. The Envoys bridge differences with diplomacy and natural harmony.',
    focus: 'Balance & Nature',
    theme: GUILDS.envoys.theme
  }
};

const GuildSelection: React.FC<GuildSelectionProps> = ({ onSelection }) => {
  const { userData, updateUserGuild, currentUser } = useAuth();
  const { applyGuildTheme } = useTheme();
  const navigate = useNavigate();
  const [selectedGuild, setSelectedGuild] = useState<GuildId | null>(null);
  const [hoveredGuild, setHoveredGuild] = useState<GuildId | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Apply initial theme
    if (userData?.guild) {
      applyGuildTheme(userData.guild);
    } else {
      applyGuildTheme('titans'); // Default
    }
  }, [userData?.guild, applyGuildTheme]);

  const handleGuildPreview = (guildId: GuildId) => {
    setHoveredGuild(guildId);
    applyGuildTheme(guildId);
    
    // Add body background transition
    document.body.style.transition = 'background 0.5s ease';
    document.body.style.background = ENHANCED_GUILDS[guildId].theme.background;
  };

  const handleGuildLeave = () => {
    setHoveredGuild(null);
    if (selectedGuild) {
      applyGuildTheme(selectedGuild);
      document.body.style.background = ENHANCED_GUILDS[selectedGuild].theme.background;
    } else if (userData?.guild) {
      applyGuildTheme(userData.guild);
      document.body.style.background = ENHANCED_GUILDS[userData.guild as GuildId]?.theme.background || '';
    } else {
      applyGuildTheme('titans'); // Default
      document.body.style.background = ENHANCED_GUILDS['titans'].theme.background;
    }
  };

  const handleGuildSelect = (guildId: GuildId) => {
    setSelectedGuild(guildId);
    applyGuildTheme(guildId);
    setHasError(null); // Clear any errors
    
    // Add click feedback animation
    const clickedCard = document.querySelector(`.guild-card[data-guild="${guildId}"]`);
    if (clickedCard) {
      clickedCard.classList.add('clicked');
      setTimeout(() => clickedCard.classList.remove('clicked'), 300);
    }
  };

  // Comprehensive guild selection handler
  const handleSelectGuild = async (guildId: GuildId): Promise<void> => {
    // Validation checks
    if (!currentUser) {
      setHasError('You must be logged in to select a guild.');
      return;
    }

    if (!userData) {
      setHasError('User data not loaded. Please refresh and try again.');
      return;
    }

    if (!['titans', 'illumination', 'envoys'].includes(guildId)) {
      setHasError('Invalid guild selection.');
      return;
    }

    // Clear any previous errors
    setHasError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    setIsLoading(true);
    setIsConnecting(true);

    const previousGuild = userData.guild;
    const previousTheme = localStorage.getItem('currentGuild') || previousGuild;

    try {
      // Step 1: Apply theme immediately for visual feedback
      applyGuildTheme(guildId);
      
      // Step 2: Update via AuthContext (includes optimistic updates and rollback)
      await updateUserGuild(guildId);

      // Step 3: Success feedback
      setIsConnecting(false);
      setIsLoading(false);
      setSuccessMessage(`Welcome to the ${ENHANCED_GUILDS[guildId].name}! Your ascension begins now.`);

      // Step 4: Trigger callback if provided
      if (onSelection) {
        onSelection(guildId);
      }

      // Step 5: Success animation and navigation
      const modal = document.querySelector('.guild-selection-modal');
      if (modal) {
        modal.classList.add('success-exit');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 2000); // Give user time to see success message
      } else {
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      }

    } catch (error: any) {
      console.error('Error in handleSelectGuild:', error);
      
      // Rollback theme on error
      if (previousTheme) {
        applyGuildTheme(previousTheme);
      }

      // Comprehensive error handling
      let errorMessage = 'Failed to join guild. Please try again.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'You do not have permission to update your guild. Please contact support.';
      } else if (error.code === 'not-found') {
        errorMessage = 'User account not found. Please try logging out and back in.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please check your internet connection and try again.';
      } else if (error.code === 'deadline-exceeded') {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setHasError(errorMessage);
      setIsConnecting(false);
      setIsLoading(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSelection = async () => {
    if (!selectedGuild) return;
    await handleSelectGuild(selectedGuild);
  };

  return (
    <div className="guild-selection-container">
      <div className="guild-selection-modal">
        <div className="selection-header">
          <h1 className="selection-title text-gaming">
            Welcome to the Ascension Citadel!
          </h1>
          <h2 className="selection-subtitle-primary">
            Choose Your Path
          </h2>
          <p className="selection-subtitle">
            Three ancient guilds await your decision. Each path offers unique wisdom, challenges, and power. 
            Choose wisely, for your journey of ascension begins here.
          </p>
        </div>

        {hasError && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{hasError}</span>
            <button 
              className="error-dismiss"
              onClick={() => setHasError(null)}
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="success-banner">
            <span className="success-icon">✅</span>
            <span className="success-message">{successMessage}</span>
          </div>
        )}

        {isConnecting && (
          <div className="connection-status">
            <div className="loading-spinner"></div>
            <span>Connecting to Firestore...</span>
          </div>
        )}

        <div className="guilds-grid">
          {Object.values(ENHANCED_GUILDS).map((guild) => (
            <div
              key={guild.id}
              data-guild={guild.id}
              className={`guild-card ${selectedGuild === guild.id ? 'selected' : ''} ${hoveredGuild === guild.id ? 'hovered' : ''}`}
              onMouseEnter={() => handleGuildPreview(guild.id)}
              onMouseLeave={handleGuildLeave}
              onClick={() => handleGuildSelect(guild.id)}
            >
              <div className="guild-card-content">
                <div className="guild-icon-large">
                  {guild.icon}
                </div>
                <h3 className="guild-name text-fantasy">
                  {guild.name}
                </h3>
                <div className="guild-motto">
                  "{guild.motto}"
                </div>
                <div className="guild-focus">
                  {guild.focus}
                </div>
                <p className="guild-description">
                  {guild.description}
                </p>
                <div className="guild-path-button">
                  <button className="choose-path-btn btn-primary">
                    Choose This Path
                  </button>
                </div>
              </div>
              
              {selectedGuild === guild.id && (
                <div className="selection-indicator animate-pulse">
                  <span className="indicator-icon">⚡</span>
                  <span>Selected</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedGuild && (
          <div className="selection-actions animate-fadeInUp">
            <div className="selected-guild-info">
              <div className="selection-badge">
                <span className="badge-icon">{ENHANCED_GUILDS[selectedGuild].icon}</span>
                <span className="badge-text">
                  You have chosen the path of <strong>{ENHANCED_GUILDS[selectedGuild].name}</strong>
                </span>
              </div>
              <p className="selection-motto">
                "{ENHANCED_GUILDS[selectedGuild].motto}"
              </p>
              <p className="selection-note">
                You can change your guild later in account settings if needed.
              </p>
            </div>
            
            <div className="action-buttons">
              <button
                className="cancel-button btn-ghost"
                onClick={() => {
                  setSelectedGuild(null);
                  setHasError(null);
                }}
                disabled={isSubmitting}
              >
                Reconsider
              </button>
              <button
                className="confirm-button btn-primary"
                onClick={handleConfirmSelection}
                disabled={isSubmitting || isLoading || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <div className="loading-spinner"></div>
                    <span>Connecting...</span>
                  </>
                ) : isLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    <span>Updating Profile...</span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <div className="loading-spinner"></div>
                    <span>Joining Guild...</span>
                  </>
                ) : successMessage ? (
                  <>
                    <span className="confirm-icon">✅</span>
                    <span>Guild Joined!</span>
                  </>
                ) : (
                  <>
                    <span className="confirm-icon">🛡️</span>
                    <span>Begin Your Ascension</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="selection-footer">
          <p className="footer-text">
            Each guild offers a unique journey of growth and mastery. Choose the path that resonates with your spirit.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuildSelection;