import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Quest, ActiveQuest, Submission } from '../types';
import { getGuildInfo } from '../constants/guilds';
import EnhancedQuestCard from './EnhancedQuestCard';
import DynamicQuestReport from './DynamicQuestReport';
import AuraOfferingCeremony from './AuraOfferingCeremony';

interface EnhancedQuestManagerProps {
  onAuraUpdate?: (newAura: number) => void;
}

const EnhancedQuestManager: React.FC<EnhancedQuestManagerProps> = ({
  onAuraUpdate,
}) => {
  const { userData, currentUser } = useAuth();
  const [availableQuests, setAvailableQuests] = useState<Quest[]>([]);
  const [activeQuests, setActiveQuests] = useState<ActiveQuest[]>([]);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(
    null
  );
  const [showCeremony, setShowCeremony] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questsAcceptedToday, setQuestsAcceptedToday] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (userData?.guild && currentUser) {
      loadQuestsData();
      setupActiveQuestsListener();
    }
  }, [userData, currentUser]);

  const loadQuestsData = async () => {
    if (!userData?.guild || !currentUser) return;

    setLoading(true);
    try {
      // Load available quests for user's guild
      const questsQuery = query(
        collection(db, 'quests'),
        where('isActive', '==', true),
        where('guild', '==', userData.guild)
      );
      const questSnapshot = await getDocs(questsQuery);
      const quests = questSnapshot.docs.map(
        doc =>
          ({
            questId: doc.id,
            ...doc.data(),
          }) as Quest
      );

      setAvailableQuests(quests);

      // Load user's active quests
      const activeQuestsQuery = query(
        collection(db, `users/${currentUser.uid}/activeQuests`)
      );
      const activeSnapshot = await getDocs(activeQuestsQuery);
      const activeQuests: ActiveQuest[] = [];
      const acceptedToday = new Set<string>();

      for (const activeDoc of activeSnapshot.docs) {
        const activeData = activeDoc.data() as Omit<ActiveQuest, 'quest'>;

        // Check if quest was accepted today
        const acceptedDate = new Date(
          activeData.acceptedAt?.toDate?.() || activeData.acceptedAt
        );
        const today = new Date();
        if (acceptedDate.toDateString() === today.toDateString()) {
          acceptedToday.add(activeData.questId);
        }

        // Find the corresponding quest data
        const questData = quests.find(q => q.questId === activeData.questId);
        if (questData) {
          activeQuests.push({
            ...activeData,
            quest: questData,
          });
        }
      }

      setActiveQuests(activeQuests);
      setQuestsAcceptedToday(acceptedToday);
    } catch (error) {
      console.error('Error loading quests data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupActiveQuestsListener = () => {
    if (!currentUser) return;

    const activeQuestsRef = collection(
      db,
      `users/${currentUser.uid}/activeQuests`
    );
    return onSnapshot(activeQuestsRef, snapshot => {
      const updatedActiveQuests: ActiveQuest[] = [];
      const acceptedToday = new Set<string>();

      snapshot.docs.forEach(doc => {
        const activeData = doc.data() as Omit<ActiveQuest, 'quest'>;

        // Check if quest was accepted today
        const acceptedDate = new Date(
          activeData.acceptedAt?.toDate?.() || activeData.acceptedAt
        );
        const today = new Date();
        if (acceptedDate.toDateString() === today.toDateString()) {
          acceptedToday.add(activeData.questId);
        }

        // Find the corresponding quest data
        const questData = availableQuests.find(
          q => q.questId === activeData.questId
        );
        if (questData) {
          updatedActiveQuests.push({
            ...activeData,
            quest: questData,
          });
        }
      });

      setActiveQuests(updatedActiveQuests);
      setQuestsAcceptedToday(acceptedToday);
    });
  };

  const handleQuestAccepted = (quest: Quest) => {
    setQuestsAcceptedToday(prev => {
      const newSet = new Set(prev);
      newSet.add(quest.questId);
      return newSet;
    });
    // The active quests will be updated through the listener
  };

  const handleSubmissionStart = () => {
    // Optional: Add any pre-submission logic here
    console.log('Submission started...');
  };

  const handleSubmissionComplete = async (submission: Submission) => {
    // Update the active quest status to 'submitted'
    if (currentUser) {
      try {
        const activeQuestRef = doc(
          db,
          `users/${currentUser.uid}/activeQuests/${submission.questId}`
        );
        await updateDoc(activeQuestRef, { status: 'submitted' });
      } catch (error) {
        console.error('Error updating active quest status:', error);
      }
    }

    // REMOVED: Don't show ceremony immediately after submission
    // Ceremony will only be shown when admin approves submission
    // For now, just refresh quests to show the updated status
    loadQuestsData();
  };

  const handleCeremonyComplete = () => {
    setShowCeremony(false);
    setCurrentSubmission(null);

    // REMOVED: Don't award AURA immediately - wait for admin approval
    // AURA will be awarded when admin approves the submission via cloud function

    // Refresh quests data
    loadQuestsData();
  };

  if (loading) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '40px',
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '1.1rem',
        }}
      >
        <div style={{ marginBottom: '16px', fontSize: '2rem' }}>⚡</div>
        Đang tải nhiệm vụ từ Lò Rèn...
      </div>
    );
  }

  if (!userData?.guild) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '40px',
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '1.1rem',
        }}
      >
        Vui lòng chọn Guild để xem nhiệm vụ.
      </div>
    );
  }

  const guildInfo = getGuildInfo(userData.guild);

  return (
    <div className="enhanced-quest-manager">
      {/* Quest Section Header */}
      <div className="quests-section">
        <h3
          style={{
            color: '#fff',
            fontSize: '1.8rem',
            marginBottom: '24px',
            textAlign: 'center',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
          }}
        >
          {guildInfo.icon} Nhiệm vụ {guildInfo.displayName}
        </h3>

        {availableQuests.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '16px',
              border: '2px solid rgba(255, 215, 0, 0.3)',
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏺</div>
            <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
              Hiện tại chưa có nhiệm vụ nào được kích hoạt.
            </p>
            <p style={{ fontSize: '1rem' }}>
              Hãy chờ{' '}
              {guildInfo.name === 'titans'
                ? 'Thủ lĩnh Kael'
                : guildInfo.name === 'illumination'
                  ? 'Hiền triết Lyra'
                  : 'Sứ giả Zephyr'}{' '}
              công bố nhiệm vụ mới!
            </p>
          </div>
        ) : (
          <div
            className="quests-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            {availableQuests.map((quest, index) => {
              const isAccepted = questsAcceptedToday.has(quest.questId);
              return (
                <EnhancedQuestCard
                  key={quest.questId}
                  quest={quest}
                  isAccepted={isAccepted}
                  onAccepted={handleQuestAccepted}
                  delay={index * 200} // Staggered animation
                />
              );
            })}
          </div>
        )}

        {/* Dynamic Report Interfaces for Accepted Quests */}
        {activeQuests
          .filter(aq => {
            const shouldShow = aq.status === 'accepted';
            console.log('Filtering activeQuest:', {
              questId: aq.questId,
              status: aq.status,
              hasQuestData: !!aq.quest,
              shouldShow: shouldShow,
            });
            return shouldShow;
          })
          .map(
            activeQuest =>
              activeQuest.quest && (
                <DynamicQuestReport
                  key={activeQuest.questId}
                  quest={activeQuest.quest}
                  onSubmissionComplete={handleSubmissionComplete}
                  onStartSubmission={handleSubmissionStart}
                />
              )
          )}
      </div>

      {/* AURA Offering Ceremony Modal */}
      {showCeremony && currentSubmission && (
        <AuraOfferingCeremony
          quest={
            availableQuests.find(q => q.questId === currentSubmission.questId)!
          }
          submission={currentSubmission}
          currentAura={userData?.currentAura || 0}
          onComplete={handleCeremonyComplete}
        />
      )}

      {/* Additional Styles for Quest Grid */}
      <style>{`
        .enhanced-quest-manager {
          width: 100%;
        }

        @media (max-width: 768px) {
          .quests-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }

        @media (max-width: 480px) {
          .enhanced-quest-manager h3 {
            font-size: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EnhancedQuestManager;
