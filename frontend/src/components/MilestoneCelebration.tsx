import React, { useState, useEffect } from 'react';
import kaelDialogue from '../content/kaelDialogue.json';
import './MilestoneCelebration.css';

interface MilestoneCelebrationProps {
  isVisible: boolean;
  tier: number;
  staminaPoints: number;
  onClose: () => void;
}

const MilestoneCelebration: React.FC<MilestoneCelebrationProps> = ({
  isVisible,
  tier,
  staminaPoints,
  onClose
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);

  const milestoneKey = `tier_${tier}` as keyof typeof kaelDialogue.milestones;
  const milestoneData = kaelDialogue.milestones[milestoneKey];

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      setShowFireworks(true);
      
      // Auto-close after 8 seconds if user doesn't interact
      const autoCloseTimer = setTimeout(() => {
        handleClose();
      }, 8000);

      // Stop fireworks after 3 seconds
      const fireworksTimer = setTimeout(() => {
        setShowFireworks(false);
      }, 3000);

      return () => {
        clearTimeout(autoCloseTimer);
        clearTimeout(fireworksTimer);
      };
    }
  }, [isVisible]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isVisible || !milestoneData) return null;

  return (
    <div className="milestone-overlay">
      <div className={`milestone-celebration ${isAnimating ? 'animate' : ''}`}>
        {/* Fireworks Background */}
        {showFireworks && (
          <div className="fireworks-container">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`firework firework-${i + 1}`}></div>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div className="milestone-content">
          <div className="milestone-header">
            <div className="kael-celebration-avatar">
              <span className="kael-icon">{kaelDialogue.character.avatar}</span>
              <div className="celebration-aura"></div>
            </div>
            
            <div className="milestone-title-section">
              <h1 className="milestone-title">{milestoneData.title}</h1>
              <div className="tier-badge">
                <span className="tier-name">{milestoneData.tier_name}</span>
                <span className="tier-number">Tier {tier}</span>
              </div>
            </div>
          </div>

          <div className="stamina-display">
            <div className="stamina-number">
              <span className="stamina-value">{staminaPoints.toLocaleString()}</span>
              <span className="stamina-label">Stamina Points</span>
            </div>
            <div className="stamina-threshold">
              Threshold: {milestoneData.threshold.toLocaleString()}
            </div>
          </div>

          <div className="milestone-message">
            <div className="kael-speech-bubble">
              <p>{milestoneData.message}</p>
              <div className="speech-arrow"></div>
            </div>
          </div>

          <div className="celebration-controls">
            <button 
              className="celebration-btn acknowledge"
              onClick={handleClose}
            >
              <span className="btn-icon">⚔️</span>
              I Accept This Power!
            </button>
          </div>
        </div>

        {/* Floating Icons */}
        <div className="floating-icons">
          {['⚔️', '🛡️', '⚡', '🔥', '🌟', '👑'].map((icon, index) => (
            <div 
              key={index} 
              className={`floating-icon icon-${index + 1}`}
              style={{ 
                animationDelay: `${index * 0.3}s`,
                left: `${10 + index * 15}%`
              }}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MilestoneCelebration;