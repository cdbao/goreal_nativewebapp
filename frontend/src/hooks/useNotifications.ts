import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Quest } from '../types';

interface CeremonyData {
  quest: Quest | null;
  submission: any | null;
}

interface UseNotificationsReturn {
  showCeremony: boolean;
  ceremonyData: CeremonyData;
  closeCeremony: () => void;
}

export const useNotifications = (
  userId: string | undefined
): UseNotificationsReturn => {
  const [showCeremony, setShowCeremony] = useState(false);
  const [ceremonyQuest, setCeremonyQuest] = useState<Quest | null>(null);
  const [ceremonySubmission, setCeremonySubmission] = useState<any>(null);

  const closeCeremony = useCallback(() => {
    setShowCeremony(false);
    setCeremonyQuest(null);
    setCeremonySubmission(null);
  }, []);

  const handleQuestApprovalNotification = useCallback(
    async (notification: any) => {
      console.log(
        '🎉 Quest approved notification received, triggering ceremony:',
        notification
      );

      try {
        const questDoc = await getDoc(doc(db, 'quests', notification.questId));
        if (questDoc.exists()) {
          const questData = {
            questId: questDoc.id,
            ...questDoc.data(),
          } as Quest;

          // Create a mock approved submission for ceremony
          const approvedSubmission = {
            submissionId: `approved_${notification.questId}`,
            questId: notification.questId,
            userId: userId,
            status: 'approved',
            submittedAt: notification.timestamp,
            proofData: '',
            proofType: 'text',
          };

          setCeremonyQuest(questData);
          setCeremonySubmission(approvedSubmission);
          setShowCeremony(true);

          // Mark notification as read
          if (userId) {
            await updateDoc(
              doc(db, 'users', userId, 'notifications', notification.id),
              {
                isRead: true,
              }
            );
          }
        }
      } catch (error) {
        console.error('Error fetching quest for ceremony:', error);
      }
    },
    [userId]
  );

  // Listen for quest approval notifications
  useEffect(() => {
    if (!userId) return;

    const notificationsQuery = query(
      collection(db, 'users', userId, 'notifications'),
      where('type', '==', 'quest_approved'),
      where('isRead', '==', false),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, async snapshot => {
      const newNotifications = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((notification: any) => notification.triggerCeremony);

      if (newNotifications.length > 0) {
        const notification = newNotifications[0];
        await handleQuestApprovalNotification(notification);
      }
    });

    return unsubscribe;
  }, [userId, handleQuestApprovalNotification]);

  return {
    showCeremony,
    ceremonyData: {
      quest: ceremonyQuest,
      submission: ceremonySubmission,
    },
    closeCeremony,
  };
};
