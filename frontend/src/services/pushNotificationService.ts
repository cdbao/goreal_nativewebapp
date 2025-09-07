// GoREAL Push Notification Service
// Handles all push notification subscription and management logic

import { getToken, onMessage } from 'firebase/messaging';
import { collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { messaging, db } from '../firebase';
import { User } from '../types';

// VAPID key - In production, this should be stored securely
const VAPID_KEY = 'BNxKjdQvKL7iOmV6qQe1HzO8xYwNrPm2CvBnFgHjKlAsZxWqE3DfGhJkMnBvCxRtYuIoPsLqWe4RtYuNmKjHgFd';

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  createdAt: Date;
  lastUsed: Date;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private isInitialized = false;
  private currentUser: User | null = null;

  private constructor() {}

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize the push notification service
   */
  public async initialize(user: User | null): Promise<boolean> {
    try {
      this.currentUser = user;

      if (!messaging) {
        console.log('Firebase Messaging is not available');
        return false;
      }

      // Set up foreground message handler
      onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        this.handleForegroundMessage(payload);
      });

      this.isInitialized = true;
      console.log('Push notification service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize push notification service:', error);
      return false;
    }
  }

  /**
   * Request notification permission from user
   */
  public async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Check current notification permission status
   */
  public getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Subscribe user to push notifications
   */
  public async subscribe(): Promise<boolean> {
    try {
      if (!messaging || !this.currentUser) {
        console.log('Cannot subscribe: messaging not available or user not authenticated');
        return false;
      }

      // Request permission first
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('Permission denied for notifications');
        return false;
      }

      // Get FCM token
      const token = await getToken(messaging, { 
        vapidKey: VAPID_KEY 
      });

      if (!token) {
        console.log('Failed to get FCM token');
        return false;
      }

      // Create subscription data
      const subscriptionData: PushSubscriptionData = {
        endpoint: `https://fcm.googleapis.com/fcm/send/${token}`,
        expirationTime: null,
        keys: {
          p256dh: token, // In FCM, we use the token as the key
          auth: token.substring(0, 16) // Simple auth key derivation
        },
        userAgent: navigator.userAgent,
        createdAt: new Date(),
        lastUsed: new Date()
      };

      // Save subscription to Firestore
      const saved = await this.saveSubscription(subscriptionData);
      if (saved) {
        console.log('Successfully subscribed to push notifications');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  public async unsubscribe(): Promise<boolean> {
    try {
      if (!this.currentUser) {
        console.log('Cannot unsubscribe: user not authenticated');
        return false;
      }

      // Remove all subscriptions for this user from Firestore
      const removed = await this.removeAllSubscriptions();
      
      if (removed) {
        console.log('Successfully unsubscribed from push notifications');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  /**
   * Check if user is currently subscribed
   */
  public async isSubscribed(): Promise<boolean> {
    try {
      if (!this.currentUser) {
        return false;
      }

      const subscriptions = await this.getUserSubscriptions();
      return subscriptions.length > 0;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Save push subscription to Firestore
   */
  private async saveSubscription(subscriptionData: PushSubscriptionData): Promise<boolean> {
    try {
      if (!this.currentUser) {
        return false;
      }

      // Check if this subscription already exists
      const existing = await this.getUserSubscriptions();
      const isDuplicate = existing.some(sub => 
        sub.endpoint === subscriptionData.endpoint
      );

      if (isDuplicate) {
        console.log('Subscription already exists');
        return true;
      }

      // Save to users/{userId}/pushSubscriptions subcollection
      const subscriptionsRef = collection(db, 'users', this.currentUser.userId, 'pushSubscriptions');
      await addDoc(subscriptionsRef, {
        ...subscriptionData,
        fcmToken: subscriptionData.keys.p256dh, // Store FCM token separately for easier access
      });

      return true;
    } catch (error) {
      console.error('Error saving subscription:', error);
      return false;
    }
  }

  /**
   * Get all push subscriptions for current user
   */
  private async getUserSubscriptions(): Promise<PushSubscriptionData[]> {
    try {
      if (!this.currentUser) {
        return [];
      }

      const subscriptionsRef = collection(db, 'users', this.currentUser.userId, 'pushSubscriptions');
      const querySnapshot = await getDocs(subscriptionsRef);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (PushSubscriptionData & { id: string })[];
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      return [];
    }
  }

  /**
   * Remove all subscriptions for current user
   */
  private async removeAllSubscriptions(): Promise<boolean> {
    try {
      if (!this.currentUser) {
        return false;
      }

      const subscriptionsRef = collection(db, 'users', this.currentUser.userId, 'pushSubscriptions');
      const querySnapshot = await getDocs(subscriptionsRef);
      
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      return true;
    } catch (error) {
      console.error('Error removing subscriptions:', error);
      return false;
    }
  }

  /**
   * Handle foreground messages (when app is open)
   */
  private handleForegroundMessage(payload: any): void {
    console.log('Handling foreground message:', payload);

    // Create in-app notification or toast
    const title = payload.notification?.title || payload.data?.title || 'GoREAL';
    const body = payload.notification?.body || payload.data?.body || 'Bạn có thông báo mới!';

    // Show browser notification even when app is in foreground
    if (this.getPermissionStatus() === 'granted') {
      new Notification(title, {
        body,
        icon: payload.notification?.icon || '/logo192.png',
        badge: '/logo192.png',
        tag: payload.data?.tag || 'goreal-foreground',
        data: payload.data
      });
    }

    // Dispatch custom event for app to handle
    window.dispatchEvent(new CustomEvent('push-notification-received', {
      detail: payload
    }));
  }

  /**
   * Test notification (for development/testing)
   */
  public async testNotification(): Promise<void> {
    if (this.getPermissionStatus() === 'granted') {
      new Notification('GoREAL Test', {
        body: 'Thông báo test từ GoREAL!',
        icon: '/logo192.png',
        badge: '/logo192.png'
      });
    }
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();