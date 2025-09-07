// GoREAL Push Notification Cloud Functions
// Handles subscription management and notification sending

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

const db = admin.firestore();

/**
 * Save a push subscription for a user
 * Callable Cloud Function that stores FCM tokens in Firestore
 */
exports.savePushSubscription = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { subscription, fcmToken } = data;

    // Validate required data
    if (!subscription || !fcmToken) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Subscription and FCM token are required'
      );
    }

    // Validate subscription structure
    if (!subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid subscription format'
      );
    }

    console.log(`Saving push subscription for user: ${userId}`);

    // Prepare subscription data
    const subscriptionData = {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime || null,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      },
      fcmToken: fcmToken,
      userAgent: data.userAgent || 'Unknown',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsed: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };

    // Check if this FCM token already exists for this user
    const existingSubscriptionsRef = db.collection('users').doc(userId).collection('pushSubscriptions');
    const existingQuery = await existingSubscriptionsRef.where('fcmToken', '==', fcmToken).get();

    if (!existingQuery.empty) {
      // Update existing subscription
      const existingDoc = existingQuery.docs[0];
      await existingDoc.ref.update({
        ...subscriptionData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Updated existing subscription for user: ${userId}`);
      return { 
        success: true, 
        subscriptionId: existingDoc.id, 
        message: 'Subscription updated successfully' 
      };
    } else {
      // Create new subscription
      const docRef = await existingSubscriptionsRef.add(subscriptionData);
      
      console.log(`Created new subscription for user: ${userId}`);
      return { 
        success: true, 
        subscriptionId: docRef.id, 
        message: 'Subscription saved successfully' 
      };
    }

  } catch (error) {
    console.error('Error saving push subscription:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to save push subscription'
    );
  }
});

/**
 * Remove a push subscription for a user
 * Callable Cloud Function to unsubscribe users
 */
exports.removePushSubscription = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { fcmToken, removeAll } = data;

    console.log(`Removing push subscription for user: ${userId}`);

    const subscriptionsRef = db.collection('users').doc(userId).collection('pushSubscriptions');

    if (removeAll) {
      // Remove all subscriptions for this user
      const allSubscriptions = await subscriptionsRef.get();
      const batch = db.batch();
      
      allSubscriptions.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Removed all subscriptions for user: ${userId}`);
      
      return { 
        success: true, 
        message: `Removed ${allSubscriptions.size} subscriptions` 
      };
    } else if (fcmToken) {
      // Remove specific subscription by FCM token
      const query = await subscriptionsRef.where('fcmToken', '==', fcmToken).get();
      
      if (query.empty) {
        return { 
          success: false, 
          message: 'Subscription not found' 
        };
      }
      
      const batch = db.batch();
      query.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Removed specific subscription for user: ${userId}`);
      
      return { 
        success: true, 
        message: 'Subscription removed successfully' 
      };
    } else {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Either fcmToken or removeAll must be specified'
      );
    }

  } catch (error) {
    console.error('Error removing push subscription:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to remove push subscription'
    );
  }
});

/**
 * Send push notification to users
 * Callable Cloud Function for admins to send targeted notifications
 */
exports.sendPushNotification = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated and is admin
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check if user is admin
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || !['admin', 'super_admin'].includes(userDoc.data().role)) {
      throw new functions.https.HttpsError(
        'permission-denied', 
        'Only administrators can send push notifications'
      );
    }

    const { 
      target, 
      payload, 
      targetUserId,
      targetGuild,
      scheduleTime 
    } = data;

    // Validate required data
    if (!target || !payload || !payload.title) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Target, payload with title are required'
      );
    }

    console.log(`Admin ${context.auth.uid} sending notification to target: ${target}`);

    // Get target user IDs based on target type
    let targetUserIds = [];
    
    switch (target) {
      case 'all':
        targetUserIds = await getAllUserIds();
        break;
        
      case 'guild':
        if (!targetGuild) {
          throw new functions.https.HttpsError('invalid-argument', 'Guild ID required for guild target');
        }
        targetUserIds = await getGuildUserIds(targetGuild);
        break;
        
      case 'user':
        if (!targetUserId) {
          throw new functions.https.HttpsError('invalid-argument', 'User ID required for user target');
        }
        targetUserIds = [targetUserId];
        break;
        
      default:
        throw new functions.https.HttpsError('invalid-argument', 'Invalid target type');
    }

    if (targetUserIds.length === 0) {
      return {
        success: false,
        message: 'No users found for the specified target'
      };
    }

    // If scheduled for later, save as pending notification
    if (scheduleTime && new Date(scheduleTime) > new Date()) {
      const pendingNotification = {
        target,
        targetUserId,
        targetGuild,
        payload,
        scheduleTime: admin.firestore.Timestamp.fromDate(new Date(scheduleTime)),
        createdBy: context.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending'
      };

      await db.collection('pendingNotifications').add(pendingNotification);
      
      return {
        success: true,
        message: `Notification scheduled for ${new Date(scheduleTime).toLocaleString('vi-VN')}`
      };
    }

    // Send notifications immediately
    const result = await sendNotificationsToUsers(targetUserIds, payload, context.auth.uid);

    return result;

  } catch (error) {
    console.error('Error sending push notification:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send push notification'
    );
  }
});

/**
 * Scheduled function to process pending notifications
 */
exports.processPendingNotifications = functions.pubsub.schedule('every 5 minutes')
  .timeZone('Asia/Ho_Chi_Minh')
  .onRun(async (context) => {
    try {
      console.log('Processing pending notifications...');

      const now = admin.firestore.Timestamp.now();
      const pendingQuery = await db.collection('pendingNotifications')
        .where('status', '==', 'pending')
        .where('scheduleTime', '<=', now)
        .limit(50) // Process in batches
        .get();

      if (pendingQuery.empty) {
        console.log('No pending notifications to process');
        return null;
      }

      const batch = db.batch();
      const processPromises = [];

      for (const doc of pendingQuery.docs) {
        const notification = doc.data();
        
        // Get target user IDs
        let targetUserIds = [];
        switch (notification.target) {
          case 'all':
            targetUserIds = await getAllUserIds();
            break;
          case 'guild':
            targetUserIds = await getGuildUserIds(notification.targetGuild);
            break;
          case 'user':
            targetUserIds = [notification.targetUserId];
            break;
        }

        // Send notification
        if (targetUserIds.length > 0) {
          processPromises.push(
            sendNotificationsToUsers(targetUserIds, notification.payload, notification.createdBy)
              .then(result => {
                // Update notification status
                batch.update(doc.ref, {
                  status: 'sent',
                  sentAt: admin.firestore.FieldValue.serverTimestamp(),
                  sentCount: result.successCount,
                  failedCount: result.failedCount
                });
              })
              .catch(error => {
                console.error(`Failed to process notification ${doc.id}:`, error);
                batch.update(doc.ref, {
                  status: 'failed',
                  failedAt: admin.firestore.FieldValue.serverTimestamp(),
                  error: error.message
                });
              })
          );
        } else {
          // No target users found
          batch.update(doc.ref, {
            status: 'failed',
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
            error: 'No target users found'
          });
        }
      }

      await Promise.all(processPromises);
      await batch.commit();

      console.log(`Processed ${pendingQuery.size} pending notifications`);
      return null;

    } catch (error) {
      console.error('Error processing pending notifications:', error);
      return null;
    }
  });

/**
 * Helper function to get all user IDs
 */
async function getAllUserIds() {
  const usersQuery = await db.collection('users').select().get();
  return usersQuery.docs.map(doc => doc.id);
}

/**
 * Helper function to get user IDs for a specific guild
 */
async function getGuildUserIds(guildId) {
  const usersQuery = await db.collection('users').where('guild', '==', guildId).select().get();
  return usersQuery.docs.map(doc => doc.id);
}

/**
 * Helper function to send notifications to multiple users
 */
async function sendNotificationsToUsers(userIds, payload, senderId) {
  console.log(`Sending notifications to ${userIds.length} users`);

  let successCount = 0;
  let failedCount = 0;
  let invalidTokens = [];
  
  // Collect all FCM tokens from all users
  const tokenPromises = userIds.map(async (userId) => {
    try {
      const subscriptionsSnapshot = await db.collection('users').doc(userId).collection('pushSubscriptions').get();
      return subscriptionsSnapshot.docs.map(doc => ({
        userId,
        token: doc.data().fcmToken,
        subscriptionId: doc.id
      }));
    } catch (error) {
      console.error(`Error fetching subscriptions for user ${userId}:`, error);
      return [];
    }
  });

  const tokenArrays = await Promise.all(tokenPromises);
  const allTokens = tokenArrays.flat();
  
  if (allTokens.length === 0) {
    return {
      success: false,
      message: 'No FCM tokens found for target users',
      successCount: 0,
      failedCount: userIds.length
    };
  }

  // Prepare notification message
  const message = {
    notification: {
      title: payload.title,
      body: payload.body || 'Bạn có thông báo mới từ GoREAL!',
      icon: payload.icon || '/logo192.png'
    },
    data: {
      ...payload.data,
      sentBy: senderId,
      sentAt: new Date().toISOString(),
      tag: payload.tag || 'goreal-admin-notification',
      click_action: payload.clickAction || '/dashboard'
    },
    webpush: {
      headers: {
        'Urgency': payload.urgent ? 'high' : 'normal'
      },
      notification: {
        title: payload.title,
        body: payload.body || 'Bạn có thông báo mới từ GoREAL!',
        icon: payload.icon || '/logo192.png',
        badge: '/logo192.png',
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        vibrate: payload.vibrate || [200, 100, 200],
        actions: payload.actions || [
          {
            action: 'open',
            title: 'Mở GoREAL'
          },
          {
            action: 'dismiss',
            title: 'Đóng'
          }
        ]
      },
      fcm_options: {
        link: payload.clickAction || '/dashboard'
      }
    }
  };

  // Send notifications in batches of 500 (FCM limit)
  const BATCH_SIZE = 500;
  const batches = [];
  
  for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
    batches.push(allTokens.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const tokens = batch.map(item => item.token);
      const response = await admin.messaging().sendMulticast({
        tokens,
        ...message
      });

      successCount += response.successCount;
      failedCount += response.failureCount;

      // Handle invalid tokens
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code;
          if (errorCode === 'messaging/invalid-registration-token' || 
              errorCode === 'messaging/registration-token-not-registered') {
            invalidTokens.push(batch[idx]);
          }
        }
      });

    } catch (error) {
      console.error('Error sending notification batch:', error);
      failedCount += batch.length;
    }
  }

  // Clean up invalid tokens
  if (invalidTokens.length > 0) {
    console.log(`Cleaning up ${invalidTokens.length} invalid tokens`);
    const cleanupPromises = invalidTokens.map(async (tokenInfo) => {
      try {
        await db.collection('users')
          .doc(tokenInfo.userId)
          .collection('pushSubscriptions')
          .doc(tokenInfo.subscriptionId)
          .delete();
      } catch (error) {
        console.error(`Error cleaning up token for user ${tokenInfo.userId}:`, error);
      }
    });
    
    await Promise.all(cleanupPromises);
  }

  // Log notification to database for analytics
  await db.collection('notificationLogs').add({
    senderId,
    targetType: payload.targetType || 'manual',
    payload: payload.title,
    totalTargets: userIds.length,
    totalTokens: allTokens.length,
    successCount,
    failedCount,
    invalidTokensRemoved: invalidTokens.length,
    sentAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    success: successCount > 0,
    message: `Notification sent successfully to ${successCount} devices, ${failedCount} failed`,
    successCount,
    failedCount,
    invalidTokensRemoved: invalidTokens.length
  };
}