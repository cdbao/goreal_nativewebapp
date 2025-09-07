import React, { useState, useEffect } from 'react';
import './AvatarEvolutionAnimation.css';

interface AvatarEvolutionAnimationProps {
  isActive: boolean;
  fromTier: number;
  toTier: number;
  onAnimationComplete?: () => void;
}

const AvatarEvolutionAnimation: React.FC<AvatarEvolutionAnimationProps> = ({
  isActive,
  fromTier,
  toTier,
  onAnimationComplete
}) => {
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'charging' | 'evolution' | 'complete'>('idle');

  useEffect(() => {
    if (isActive) {
      setAnimationPhase('charging');
      
      // Charging phase (2 seconds)
      const chargingTimer = setTimeout(() => {
        setAnimationPhase('evolution');
      }, 2000);

      // Evolution phase (3 seconds)
      const evolutionTimer = setTimeout(() => {
        setAnimationPhase('complete');
      }, 5000);

      // Complete phase (1 second)
      const completeTimer = setTimeout(() => {
        setAnimationPhase('idle');
        onAnimationComplete?.();
      }, 6000);

      return () => {
        clearTimeout(chargingTimer);
        clearTimeout(evolutionTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isActive, onAnimationComplete]);

  if (!isActive) return null;

  const getTierEmoji = (tier: number): string => {
    const tierEmojis = {
      0: '🌱', // Người Mới
      1: '⚔️', // Tập Sự  
      2: '🛡️', // Chiến Binh
      3: '⚡', // Vệ Binh
      4: '🔥', // Thần Binh
      5: '🌟', // Anh Hùng
      6: '✨', // Huyền Thoại
      7: '🔮', // Siêu Huyền Thoại
      8: '👑', // Bán Thần
      9: '🌞', // Thần Thánh
      10: '🌌' // Vô Cực
    };
    return tierEmojis[tier as keyof typeof tierEmojis] || '⚔️';
  };

  const getTierColor = (tier: number): string => {
    const tierColors = {
      0: '#8FBC8F',
      1: '#FF6B35',
      2: '#4169E1',
      3: '#FFD700',
      4: '#FF4500',
      5: '#FF69B4',
      6: '#00FFFF',
      7: '#9400D3',
      8: '#FFD700',
      9: '#FFA500',
      10: '#E6E6FA'
    };
    return tierColors[tier as keyof typeof tierColors] || '#FF6B35';
  };

  return (
    <div className={`avatar-evolution-container ${animationPhase}`}>
      {/* Energy Charging Effects */}
      {animationPhase === 'charging' && (
        <div className="charging-effects">
          <div className="energy-ring ring-1"></div>
          <div className="energy-ring ring-2"></div>
          <div className="energy-ring ring-3"></div>
          <div className="energy-particles">
            {[...Array(12)].map((_, i) => (
              <div key={i} className={`particle particle-${i + 1}`}></div>
            ))}
          </div>
        </div>
      )}

      {/* Avatar Transformation */}
      <div className="avatar-transformation">
        {/* Old Avatar (fading out) */}
        <div 
          className={`avatar old-avatar ${animationPhase === 'evolution' ? 'fade-out' : ''}`}
          style={{ color: getTierColor(fromTier) }}
        >
          {getTierEmoji(fromTier)}
        </div>

        {/* New Avatar (fading in) */}
        <div 
          className={`avatar new-avatar ${animationPhase === 'evolution' ? 'fade-in' : ''}`}
          style={{ color: getTierColor(toTier) }}
        >
          {getTierEmoji(toTier)}
        </div>

        {/* Light Burst Effect */}
        {animationPhase === 'evolution' && (
          <div className="light-burst">
            <div className="burst-ray ray-1"></div>
            <div className="burst-ray ray-2"></div>
            <div className="burst-ray ray-3"></div>
            <div className="burst-ray ray-4"></div>
            <div className="burst-ray ray-5"></div>
            <div className="burst-ray ray-6"></div>
            <div className="burst-ray ray-7"></div>
            <div className="burst-ray ray-8"></div>
          </div>
        )}
      </div>

      {/* Evolution Aura */}
      {(animationPhase === 'evolution' || animationPhase === 'complete') && (
        <div 
          className="evolution-aura"
          style={{ 
            background: `conic-gradient(from 0deg, ${getTierColor(toTier)}, transparent, ${getTierColor(toTier)}, transparent)` 
          }}
        ></div>
      )}

      {/* Completion Effects */}
      {animationPhase === 'complete' && (
        <div className="completion-effects">
          <div className="success-ring"></div>
          <div className="sparkles">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`sparkle sparkle-${i + 1}`}>✨</div>
            ))}
          </div>
        </div>
      )}

      {/* Background Glow */}
      <div 
        className={`background-glow ${animationPhase}`}
        style={{ backgroundColor: getTierColor(toTier) }}
      ></div>
    </div>
  );
};

export default AvatarEvolutionAnimation;