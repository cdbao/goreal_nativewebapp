import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Quest, ActiveQuest, Submission } from '../types';

interface UseQuestManagerProps {
  userId?: string;
  guild?: string;
}

interface UseQuestManagerReturn {
  availableQuests: Quest[];
  activeQuests: ActiveQuest[];
  loading: boolean;
  questsAcceptedToday: Set<string>;
  refreshQuests: () => Promise<void>;
  markQuestAcceptedToday: (questId: string) => void;
}

export const useQuestManager = ({
  userId,
  guild,
}: UseQuestManagerProps): UseQuestManagerReturn => {
  const [availableQuests, setAvailableQuests] = useState<Quest[]>([]);
  const [activeQuests, setActiveQuests] = useState<ActiveQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [questsAcceptedToday, setQuestsAcceptedToday] = useState<Set<string>>(
    new Set()
  );

  const loadAvailableQuests = useCallback(async () => {
    if (!guild) return;

    try {
      const questsQuery = query(
        collection(db, 'quests'),
        where('isActive', '==', true),
        where('guild', '==', guild)
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
    } catch (error) {
      console.error('Error loading available quests:', error);
    }
  }, [guild]);

  const loadActiveQuests = useCallback(async () => {
    if (!userId) return;

    try {
      const activeQuestsQuery = query(
        collection(db, 'activeQuests'),
        where('userId', '==', userId),
        where('status', 'in', ['accepted', 'in_progress', 'submitted'])
      );
      const activeSnapshot = await getDocs(activeQuestsQuery);
      const activeQuestsData = activeSnapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as ActiveQuest
      );

      setActiveQuests(activeQuestsData);
    } catch (error) {
      console.error('Error loading active quests:', error);
    }
  }, [userId]);

  const refreshQuests = useCallback(async () => {
    if (!guild || !userId) return;

    setLoading(true);
    try {
      await Promise.all([loadAvailableQuests(), loadActiveQuests()]);
    } catch (error) {
      console.error('Error refreshing quests:', error);
    } finally {
      setLoading(false);
    }
  }, [loadAvailableQuests, loadActiveQuests, guild, userId]);

  const markQuestAcceptedToday = useCallback((questId: string) => {
    setQuestsAcceptedToday(prev => new Set([...Array.from(prev), questId]));
  }, []);

  // Setup active quests listener
  useEffect(() => {
    if (!userId) return;

    const activeQuestsQuery = query(
      collection(db, 'activeQuests'),
      where('userId', '==', userId),
      where('status', 'in', ['accepted', 'in_progress', 'submitted'])
    );

    const unsubscribe = onSnapshot(activeQuestsQuery, snapshot => {
      const activeQuestsData = snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as ActiveQuest
      );

      setActiveQuests(activeQuestsData);
    });

    return unsubscribe;
  }, [userId]);

  // Initial load
  useEffect(() => {
    if (guild && userId) {
      refreshQuests();
    }
  }, [guild, userId, refreshQuests]);

  return {
    availableQuests,
    activeQuests,
    loading,
    questsAcceptedToday,
    refreshQuests,
    markQuestAcceptedToday,
  };
};
