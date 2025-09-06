const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });
}

const db = admin.firestore();

// Cloud Function to approve submissions
functions.http('approveSubmission', async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submissionId' });
    }

    // Get submission data
    const submissionRef = db.collection('submissions').doc(submissionId);
    const submissionDoc = await submissionRef.get();

    if (!submissionDoc.exists) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submissionData = submissionDoc.data();
    const { userId, questId } = submissionData;
    
    console.log('Submission data:', { userId, questId, submissionData });
    
    if (!userId || !questId) {
      console.error('Missing required fields:', { userId, questId });
      return res.status(400).json({ error: `Missing required fields - userId: ${userId}, questId: ${questId}` });
    }

    // Get quest data to get aura reward
    const questRef = db.collection('quests').doc(questId);
    const questDoc = await questRef.get();

    if (!questDoc.exists) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    const questData = questDoc.data();
    const auraReward = questData.auraReward || 0;

    // Get user data
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    
    // Use transaction to ensure consistency
    await db.runTransaction(async (transaction) => {
      // Update submission status
      transaction.update(submissionRef, {
        status: 'approved',
        approvedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update user AURA and streak
      const oldAura = userData.currentAura || 0;
      const newAura = oldAura + auraReward;
      const newStreak = (userData.currentStreak || 0) + 1;

      transaction.update(userRef, {
        currentAura: newAura,
        currentStreak: newStreak,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });

      // Create approval notification
      const notificationRef = userRef.collection('notifications').doc();
      transaction.set(notificationRef, {
        message: `Chúc mừng! Nhiệm vụ "${questData.title}" đã được duyệt. Bạn nhận được ${auraReward} AURA! 🎉`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
        type: 'quest_approved',
        questId: questId,
        auraReward: auraReward,
        triggerCeremony: true
      });

      // Check for level up
      const levelThresholds = [0, 100, 500, 1500, 5000, 10000];
      const oldLevel = getLevelFromAura(oldAura, levelThresholds);
      const newLevel = getLevelFromAura(newAura, levelThresholds);

      if (newLevel > oldLevel) {
        // Create level up notification
        const levelUpNotificationRef = userRef.collection('notifications').doc();
        const levelNames = ['Khởi Sinh', 'Môn Sinh', 'Chấp Sự', 'Sư Huynh/Tỷ', 'Chân Nhân', 'Huyền Thoại'];
        transaction.set(levelUpNotificationRef, {
          message: `🌟 THĂNG CẤP! Bạn đã đạt cấp độ "${levelNames[newLevel]}"! Sức mạnh của bạn ngày càng mạnh mẽ! ⚔️`,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          isRead: false,
          type: 'level_up',
          oldLevel: oldLevel,
          newLevel: newLevel
        });
      }
    });

    res.status(200).json({
      success: true,
      message: 'Submission approved successfully',
      auraRewarded: auraReward
    });

  } catch (error) {
    console.error('Error approving submission:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Cloud Function to reject submissions
functions.http('rejectSubmission', async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submissionId' });
    }

    // Get submission data
    const submissionRef = db.collection('submissions').doc(submissionId);
    const submissionDoc = await submissionRef.get();

    if (!submissionDoc.exists) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Update submission status to rejected
    await submissionRef.update({
      status: 'rejected',
      rejectedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      success: true,
      message: 'Submission rejected successfully'
    });

  } catch (error) {
    console.error('Error rejecting submission:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Helper function to determine level from AURA
function getLevelFromAura(aura, thresholds) {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (aura >= thresholds[i]) {
      return i;
    }
  }
  return 0;
}

// Multi-Guild Daily Quest Assignment Function
functions.http('assignDailyQuest', async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log('Starting multi-guild daily quest assignment...');

    const guilds = ['titans', 'illumination', 'envoys'];
    const guildDisplayNames = {
      'titans': 'Vệ Thần',
      'illumination': 'Khai Sáng', 
      'envoys': 'Ngôn Sứ'
    };

    // Get app config reference
    const configRef = db.collection('config').doc('appConfig');
    const configDoc = await configRef.get();
    let configData = {};

    if (configDoc.exists) {
      configData = configDoc.data();
    }

    const selectedQuests = {};
    const notificationPromises = [];

    // Loop through each guild
    for (const guild of guilds) {
      console.log(`Processing guild: ${guild}`);

      // Get active quests for this guild
      const questsSnapshot = await db.collection('quests')
        .where('isActive', '==', true)
        .where('guild', '==', guild)
        .get();

      if (questsSnapshot.empty) {
        console.log(`No active quests found for guild: ${guild}`);
        continue;
      }

      // Select a random quest for this guild
      const quests = questsSnapshot.docs;
      const randomIndex = Math.floor(Math.random() * quests.length);
      const selectedQuest = quests[randomIndex];
      const selectedQuestId = selectedQuest.id;
      const selectedQuestData = selectedQuest.data();

      console.log(`Selected quest for ${guild}: ${selectedQuestData.title} (ID: ${selectedQuestId})`);

      // Update config data for this guild
      configData[`dailyQuest_${guild}`] = selectedQuestId;
      configData[`dailyQuestAssignedAt_${guild}`] = admin.firestore.FieldValue.serverTimestamp();
      
      selectedQuests[guild] = {
        id: selectedQuestId,
        title: selectedQuestData.title,
        auraReward: selectedQuestData.auraReward
      };

      // Send notifications to users of this guild
      const usersSnapshot = await db.collection('users')
        .where('guild', '==', guild)
        .get();

      if (!usersSnapshot.empty) {
        const batch = db.batch();
        let notificationCount = 0;

        for (const userDoc of usersSnapshot.docs) {
          const notificationRef = userDoc.ref.collection('notifications').doc();
          batch.set(notificationRef, {
            message: `🎯 Nhiệm vụ hằng ngày mới cho Guild ${guildDisplayNames[guild]}: "${selectedQuestData.title}"! Hãy hoàn thành để nhận ${selectedQuestData.auraReward} AURA! ⚔️`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            isRead: false,
            type: 'daily_quest',
            questId: selectedQuestId
          });
          notificationCount++;

          // Commit batch every 500 operations (Firestore limit)
          if (notificationCount % 500 === 0) {
            await batch.commit();
          }
        }

        // Commit remaining notifications
        if (notificationCount % 500 !== 0) {
          await batch.commit();
        }

        console.log(`Notifications sent to ${notificationCount} users in guild: ${guild}`);
      }
    }

    // Update general config timestamps
    configData.lastDailyQuestUpdate = admin.firestore.FieldValue.serverTimestamp();
    
    // Preserve existing config data
    if (!configData.homePageBackgroundUrl) {
      configData.homePageBackgroundUrl = '';
    }

    // Update app config
    if (configDoc.exists) {
      await configRef.update(configData);
    } else {
      await configRef.set(configData);
    }

    console.log('Multi-guild daily quest assignment completed successfully');

    res.status(200).json({
      success: true,
      message: 'Multi-guild daily quest assignment completed successfully',
      selectedQuests: selectedQuests,
      guildsProcessed: Object.keys(selectedQuests)
    });

  } catch (error) {
    console.error('Error assigning multi-guild daily quests:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check endpoint
functions.http('health', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'goreal-backend-functions'
  });
});