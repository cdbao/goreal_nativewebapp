import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  type: 'quest_approved' | 'quest_rejected' | 'general';
  message: string;
  questId?: string;
  auraReward?: number;
  isRead: boolean;
  timestamp: any;
  triggerCeremony?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  triggerQuestApprovedCeremony: (
    questId: string,
    questTitle: string,
    auraReward: number
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [ceremonyCallbacks, setCeremonyCallbacks] = useState<(() => void)[]>(
    []
  );

  useEffect(() => {
    if (!currentUser?.uid) {
      setNotifications([]);
      return;
    }

    // Listen for user's notifications in subcollection
    const notificationsQuery = query(
      collection(db, 'users', currentUser.uid, 'notifications'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      snapshot => {
        const newNotifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];

        // Check for new quest_approved notifications to trigger ceremony
        const previousNotificationIds = new Set(notifications.map(n => n.id));
        const newApprovedNotifications = newNotifications.filter(
          n =>
            n.type === 'quest_approved' &&
            !previousNotificationIds.has(n.id) &&
            n.triggerCeremony
        );

        // Trigger ceremony for new approved notifications
        newApprovedNotifications.forEach(notification => {
          console.log(
            '🎉 Quest approved notification received, triggering ceremony:',
            notification
          );
          // Here we would trigger the ceremony - this will be handled by Dashboard
        });

        setNotifications(newNotifications);
      },
      error => {
        console.error('Error listening to notifications:', error);
      }
    );

    return unsubscribe;
  }, [currentUser?.uid]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifications.map(notification =>
          updateDoc(doc(db, 'notifications', notification.id), {
            isRead: true,
          })
        )
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const triggerQuestApprovedCeremony = (
    questId: string,
    questTitle: string,
    auraReward: number
  ) => {
    // This will be used to trigger ceremony from Dashboard
    ceremonyCallbacks.forEach(callback => callback());
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    triggerQuestApprovedCeremony,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};
