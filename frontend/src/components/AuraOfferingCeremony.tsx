import React, { useEffect, useState, useRef } from 'react';
import { Quest, Submission } from '../types';
import { useAuth } from '../contexts/AuthContext';
import './AuraOfferingCeremony.css';

interface AuraOfferingCeremonyProps {
  quest: Quest;
  submission: Submission;
  currentAura: number;
  onComplete: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  endX: number;
  endY: number;
  delay: number;
  duration: number;
}

const AuraOfferingCeremony: React.FC<AuraOfferingCeremonyProps> = ({
  quest,
  submission,
  currentAura,
  onComplete,
}) => {
  const { userData } = useAuth();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const [displayedAura, setDisplayedAura] = useState(currentAura);
  const ceremonyRef = useRef<HTMLDivElement>(null);
  const particleIdRef = useRef(0);

  useEffect(() => {
    // Start the ceremony sequence
    const ceremonySequence = async () => {
      // Phase 1: Create initial particle burst
      setTimeout(() => {
        createParticleBurst(50);
      }, 500);

      // Phase 2: Animate AURA counter increase
      setTimeout(() => {
        animateAuraIncrease();
      }, 1500);

      // Phase 3: Show continue button
      setTimeout(() => {
        setShowContinueButton(true);
      }, 4000);
    };

    ceremonySequence();
  }, []);

  const createParticleBurst = (count: number) => {
    const newParticles: Particle[] = [];
    const centerX = 300; // Center of the 600px container
    const centerY = 300;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const radius = Math.random() * 150 + 50;
      const startRadius = Math.random() * 20;

      const particle: Particle = {
        id: particleIdRef.current++,
        x: centerX + Math.cos(angle) * startRadius,
        y: centerY + Math.sin(angle) * startRadius,
        endX: centerX + Math.cos(angle) * radius,
        endY: centerY + Math.sin(angle) * radius,
        delay: Math.random() * 1000,
        duration: 2000 + Math.random() * 1000,
      };

      newParticles.push(particle);
    }

    setParticles(prev => [...prev, ...newParticles]);

    // Create continuous smaller bursts
    const continuousBurst = setInterval(() => {
      if (particleIdRef.current < 200) {
        // Limit total particles
        const smallBurst: Particle[] = [];
        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 120 + 30;
          const startRadius = Math.random() * 15;

          const particle: Particle = {
            id: particleIdRef.current++,
            x: centerX + Math.cos(angle) * startRadius,
            y: centerY + Math.sin(angle) * startRadius,
            endX: centerX + Math.cos(angle) * radius,
            endY: centerY + Math.sin(angle) * radius,
            delay: Math.random() * 500,
            duration: 1500 + Math.random() * 1000,
          };

          smallBurst.push(particle);
        }
        setParticles(prev => [...prev, ...smallBurst]);
      } else {
        clearInterval(continuousBurst);
      }
    }, 300);

    // Clean up particles after they finish
    setTimeout(() => {
      clearInterval(continuousBurst);
      setParticles([]);
    }, 8000);
  };

  const animateAuraIncrease = () => {
    // Only animate AURA increase if submission is already approved
    if (submission.status !== 'approved') {
      // For pending submissions, keep current AURA
      setDisplayedAura(currentAura);
      return;
    }

    const startValue = currentAura - quest.auraReward; // Start from previous value
    const endValue = currentAura; // End at current (which already includes reward)
    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    const animateCount = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(
        startValue + (endValue - startValue) * easeOutCubic
      );

      setDisplayedAura(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      }
    };

    requestAnimationFrame(animateCount);
  };

  const getGuildMessage = () => {
    const messages = {
      titans:
        'Thủ lĩnh Kael gật đầu tán thành. Sức mạnh của bạn đã được công nhận!',
      illumination:
        'Hiền triết Lyra mỉm cười hài lòng. Tri thức bạn chia sẻ thật quý giá!',
      envoys:
        'Sứ giả Zephyr vỗ tay ca ngợi. Tinh thần đoàn kết của bạn thật tuyệt vời!',
    };
    return (
      messages[quest.guild] || 'Các Trưởng Lão hài lòng với nỗ lực của bạn!'
    );
  };

  const getStatusMessage = () => {
    switch (submission.status) {
      case 'pending':
        return {
          icon: '⏳',
          title: 'Đang Chờ Duyệt',
          description:
            'Báo cáo của bạn đã được gửi thành công và đang chờ Trưởng Lão xem xét.',
        };
      case 'approved':
        return {
          icon: '✅',
          title: 'Đã Được Duyệt',
          description:
            'Chúc mừng! Báo cáo của bạn đã được phê duyệt và AURA đã được cộng vào tài khoản.',
        };
      case 'rejected':
        return {
          icon: '❌',
          title: 'Cần Chỉnh Sửa',
          description:
            'Báo cáo cần được bổ sung thêm thông tin. Vui lòng kiểm tra feedback và nộp lại.',
        };
      default:
        return {
          icon: '📋',
          title: 'Đã Nộp Báo Cáo',
          description: 'Báo cáo của bạn đã được ghi nhận.',
        };
    }
  };

  const status = getStatusMessage();

  return (
    <div className="aura-offering-ceremony" ref={ceremonyRef}>
      {/* Mystical Background Effects */}
      <div className="ceremony-background">
        <div className="mystical-orbs">
          <div className="orb"></div>
          <div className="orb"></div>
          <div className="orb"></div>
          <div className="orb"></div>
        </div>
      </div>

      {/* Energy Particles */}
      <div className="energy-particles">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="particle"
            style={
              {
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                '--end-x': `${particle.endX - particle.x}px`,
                '--end-y': `${particle.endY - particle.y}px`,
                animationDelay: `${particle.delay}ms`,
                animationDuration: `${particle.duration}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* AURA Counter Display */}
      <div className="aura-counter">⚡ {displayedAura} AURA</div>

      {/* Main Ceremony Content */}
      <div className="ceremony-container">
        {/* Central AURA Symbol */}
        <div className="aura-symbol">
          <div className="aura-symbol-inner">⚡</div>
        </div>

        {/* Ceremony Title */}
        <h2 className="ceremony-title">Nghi Lễ Dâng Hiến</h2>

        {/* Guild Master Message */}
        <p className="ceremony-message">{getGuildMessage()}</p>

        {/* AURA Gain Display - Only show if approved */}
        {submission.status === 'approved' && (
          <div className="aura-gain-display">+{quest.auraReward} AURA</div>
        )}

        {/* Potential AURA Gain Display - Show for pending */}
        {submission.status === 'pending' && (
          <div className="aura-gain-display pending">
            Phần thưởng: +{quest.auraReward} AURA
            <div className="pending-note">(Sẽ được cộng khi được duyệt)</div>
          </div>
        )}

        {/* Submission Status */}
        <div className="submission-status">
          <div className="status-icon">{status.icon}</div>
          <div className="status-message">{status.title}</div>
          <div className="status-description">{status.description}</div>

          {submission.feedback && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(255, 193, 7, 0.2)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 193, 7, 0.4)',
              }}
            >
              <strong>Feedback từ Trưởng Lão:</strong>
              <p
                style={{ marginTop: '8px', color: 'rgba(255, 255, 255, 0.9)' }}
              >
                {submission.feedback}
              </p>
            </div>
          )}
        </div>

        {/* Continue Button */}
        {showContinueButton && (
          <button className="continue-btn" onClick={onComplete}>
            🏛️ Trở về Lò Rèn
          </button>
        )}
      </div>

      {/* Additional CSS for dynamic particle animations */}
      <style>{`
        .aura-gain-display.pending {
          color: rgba(255, 193, 7, 0.9);
          border: 2px dashed rgba(255, 193, 7, 0.5);
        }

        .pending-note {
          font-size: 0.8rem;
          opacity: 0.8;
          margin-top: 8px;
          font-style: italic;
        }

        .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: radial-gradient(circle, rgba(255, 215, 0, 1) 0%, rgba(255, 215, 0, 0.8) 50%, transparent 100%);
          border-radius: 50%;
          animation: particleFloat var(--duration, 3s) linear infinite;
          animation-delay: var(--delay, 0s);
          animation-fill-mode: both;
        }

        @keyframes particleFloat {
          0% {
            transform: translate(0, 0) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: scale(1);
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translate(var(--end-x), var(--end-y)) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default AuraOfferingCeremony;
