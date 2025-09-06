import React, { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { getGuildInfo } from '../constants/guilds';
import { Quest, ActiveQuest } from '../types';
import { retryFirestoreOperation, handleFirestoreError, validateUserAuth } from '../utils/firestoreUtils';
import './EnhancedQuestCard.css';

interface EnhancedQuestCardProps {
  quest: Quest;
  isAccepted: boolean;
  onAccepted: (quest: Quest) => void;
  onTransitionComplete?: () => void;
  delay?: number; // Animation delay for staggered reveals
}

const EnhancedQuestCard: React.FC<EnhancedQuestCardProps> = ({
  quest,
  isAccepted,
  onAccepted,
  onTransitionComplete,
  delay = 0
}) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isAcceptedState, setIsAcceptedState] = useState(isAccepted);
  const [showAcceptedEffect, setShowAcceptedEffect] = useState(false);

  useEffect(() => {
    setIsAcceptedState(isAccepted);
  }, [isAccepted]);

  const getReportTypeIcon = (reportType: string) => {
    const icons = {
      image: '📸',
      text: '📝',
      audio: '🎤',
      video: '🎥'
    };
    return icons[reportType as keyof typeof icons] || '📋';
  };

  const getReportTypeName = (reportType: string) => {
    const names = {
      image: 'Hình ảnh',
      text: 'Văn bản',
      audio: 'Ghi âm',
      video: 'Video'
    };
    return names[reportType as keyof typeof names] || 'Báo cáo';
  };

  const handleAcceptQuest = async () => {
    if (!currentUser || isLoading || isAcceptedState) return;

    setIsLoading(true);
    
    try {
      // Validate user authentication first
      validateUserAuth(currentUser);

      console.log(`Accepting quest ${quest.questId} for user ${currentUser.uid}`);

      // Create active quest document in user's subcollection
      const activeQuestRef = doc(db, `users/${currentUser.uid}/activeQuests/${quest.questId}`);
      const activeQuestData: Omit<ActiveQuest, 'quest'> = {
        questId: quest.questId,
        userId: currentUser.uid,
        acceptedAt: serverTimestamp() as any,
        status: 'accepted'
      };

      // Use enhanced retry logic for Firestore operations
      await retryFirestoreOperation(
        () => setDoc(activeQuestRef, activeQuestData),
        3, // max retries
        1000 // base delay ms
      );

      console.log(`Quest ${quest.questId} accepted successfully`);

      // Trigger acceptance animation
      setShowAcceptedEffect(true);
      
      // Update local state after a brief delay for animation
      setTimeout(() => {
        setIsAcceptedState(true);
        onAccepted(quest);
        
        // Call transition complete callback after animation
        setTimeout(() => {
          if (onTransitionComplete) {
            onTransitionComplete();
          }
        }, 800); // Wait for acceptance animation to complete
      }, 100);

    } catch (error: any) {
      console.error('Error accepting quest:', error);
      handleFirestoreError(error, 'chấp nhận nhiệm vụ');
      setIsLoading(false);
    }
  };

  const guildInfo = getGuildInfo(quest.guild);

  return (
    <div 
      className={`enhanced-quest-card frosted-glass ${isAcceptedState ? 'accepted' : ''} ${isLoading ? 'loading' : ''} animate-fadeInUp`}
      style={{ 
        animationDelay: `${delay}ms`,
        '--guild-primary': guildInfo.theme.primary,
        '--guild-accent': guildInfo.theme.accent
      } as React.CSSProperties}
      data-guild={quest.guild}
    >
      {/* Guild Seal */}
      <div className={`quest-guild-seal ${showAcceptedEffect ? 'accepted' : ''}`}>
        {guildInfo.icon}
      </div>

      {/* Quest Header */}
      <div className="quest-header">
        <h3 className="quest-title text-fantasy text-primary">{quest.title}</h3>
        <div className="aura-reward animate-glow">
          <span>⚡</span>
          +{quest.auraReward} AURA
        </div>
      </div>

      {/* Quest Description */}
      <p className="quest-description text-elegant">{quest.description}</p>

      {/* Report Type Indicator */}
      <div className="report-type-indicator frosted-glass">
        <span className="icon">{getReportTypeIcon(quest.reportType)}</span>
        <span className="text-muted">{getReportTypeName(quest.reportType)}</span>
      </div>

      {/* Accept Challenge Button - Only show if not accepted */}
      {!isAcceptedState && (
        <button
          className={`btn ${isLoading ? 'btn-ghost' : 'btn-primary'} accept-challenge-btn`}
          onClick={handleAcceptQuest}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="loading-spinner"></div>
              Đang chấp nhận...
            </>
          ) : (
            <>
              <span>🔥</span>
              Chấp Nhận Thử Thách
            </>
          )}
        </button>
      )}

      {/* Accepted Status Message */}
      {isAcceptedState && (
        <div className="quest-accepted-status">
          <div className="status-message">
            ✅ Đã chấp nhận thử thách!
          </div>
          <div className="next-step-hint">
            Scroll xuống để hoàn thành nhiệm vụ 👇
          </div>
        </div>
      )}

      <style>{`
        .loading-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .quest-accepted-status {
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1));
          border: 2px solid rgba(76, 175, 80, 0.4);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          margin-top: 16px;
        }

        .status-message {
          color: #4CAF50;
          font-size: 1.1rem;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .next-step-hint {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          animation: bounce 2s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </div>
  );
};

export default EnhancedQuestCard;