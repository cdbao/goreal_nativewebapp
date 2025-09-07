// Strava Activities Sync for GoREAL AURA Stream
// Core logic for fetching activities and calculating stamina points

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const https = require('https');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Game configuration
const STAMINA_RATES = {
  'Run': 1,
  'VirtualRun': 1,
  'Swim': 50,
  'Ride': 0.3,
  'VirtualRide': 0.3,
  'Walk': 0.5,
  'Hike': 0.8
};

const AVATAR_THRESHOLDS = [0, 100, 500, 1500, 3000, 5000, 8000, 12000, 17000, 25000, 50000];

// Helper function to make HTTPS requests to Strava API
function makeStravaRequest(path, accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.strava.com',
      path: `/api/v3${path}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'GoREAL-AuraStream/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject(new Error(`Strava API Error ${res.statusCode}: ${parsedData.message || responseData}`));
          }
        } catch (error) {
          reject(new Error(`JSON Parse Error: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Calculate stamina points for an activity
function calculateStaminaPoints(activityType, distanceKm) {
  const rate = STAMINA_RATES[activityType] || 0.1; // Default rate for unknown activities
  return Math.floor(distanceKm * rate);
}

// Determine avatar tier based on stamina points
function getAvatarTier(staminaPoints) {
  for (let i = AVATAR_THRESHOLDS.length - 1; i >= 0; i--) {
    if (staminaPoints >= AVATAR_THRESHOLDS[i]) {
      return i;
    }
  }
  return 0;
}

// Create notification for tier upgrade with Kael's messages
async function createTierUpgradeNotification(userId, fromTier, toTier, staminaGained, currentStamina) {
  // Kael's milestone messages from dialogue system
  const kaelMilestones = {
    1: {
      title: "First Steps on the Iron Path",
      message: "⚔️ Remarkable, young warrior! You have taken your first steps on the Iron Path. 100 points of Stamina now flow through your being - I can sense your avatar's aura beginning to strengthen. The journey of a thousand miles begins with a single stride, and yours resonates with promise."
    },
    2: {
      title: "The Warrior's Resolve", 
      message: "🛡️ Exceptional dedication! Your spirit burns brighter as 500 Stamina points course through your essence. You have proven you possess the warrior's resolve - consistency in the face of challenge. Your avatar now radiates with the power of a true Chiến Binh. Continue this path, for greater trials await."
    },
    3: {
      title: "Guardian's Recognition",
      message: "⚡ Outstanding! 1,500 points of pure Stamina energy - you have earned my recognition as a Guardian. Your physical trials in the mortal realm have forged an unbreakable link to the AURA Stream. The Vệ Binh within you awakens, and your avatar's power transcends ordinary limits."
    },
    4: {
      title: "Divine Soldier's Ascension",
      message: "🔥 Magnificent! 3,000 Stamina points - a feat that echoes through the halls of eternity! You have ascended to become a Thần Binh, a divine soldier whose dedication bridges worlds. Your avatar now channels the strength of legends. The AURA Stream flows like a mighty river through your being."
    },
    5: {
      title: "Hero's Awakening",
      message: "🌟 Legendary! 5,000 points of Stamina - you have awakened the hero within! As an Anh Hùng, your physical achievements inspire others and your avatar radiates with heroic power. The ancient prophecies spoke of warriors like you, who transform their earthly struggles into cosmic strength."
    },
    6: {
      title: "Legend Incarnate", 
      message: "⚡🌟 Extraordinary! 8,000 Stamina points courses through your legendary spirit! You have become Huyền Thoại - a living legend whose physical prowess transcends mortal understanding. Your avatar now embodies mythical power, and the AURA Stream itself bends to your indomitable will."
    },
    7: {
      title: "Mythical Transcendence",
      message: "🔮✨ Phenomenal! 12,000 points of pure Stamina energy! You have achieved Siêu Huyền Thoại status - transcending even legend itself. Your physical dedication has reached mythical proportions, and your avatar now wields power that reshapes reality. The very cosmos acknowledges your strength!"
    },
    8: {
      title: "Demigod's Realm",
      message: "⚔️👑 Incredible! 17,000 Stamina points - you walk among demigods! As Bán Thần, you have bridged the gap between mortal determination and divine power. Your avatar radiates with celestial energy, and your physical achievements echo through both earthly and heavenly realms."
    },
    9: {
      title: "Divine Sanctification",
      message: "👑🌟 Magnificent beyond words! 25,000 Stamina points - you have achieved Thần Thánh, true divinity through dedication! Your physical trials have sanctified your very essence. Your avatar now commands divine authority, and the AURA Stream flows with unprecedented power through your being."
    },
    10: {
      title: "Infinite Transcendence", 
      message: "🌌⚡👑 BEYOND LEGENDARY! 50,000 Stamina points - you have achieved Vô Cực, the infinite realm beyond all mortal comprehension! Your dedication has transcended every boundary, every limit. You stand as the ultimate fusion of physical mastery and spiritual evolution. The AURA Stream itself bows to your infinite will. You have become eternal!"
    }
  };

  const milestone = kaelMilestones[toTier];
  if (!milestone) return;

  await db.collection('notifications').add({
    userId: userId,
    type: 'milestone_unlocked',
    title: `Kael Speaks: ${milestone.title}`,
    message: milestone.message,
    read: false,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days for milestones
    tier_info: {
      from: fromTier,
      to: toTier,
      threshold: AVATAR_THRESHOLDS[toTier]
    },
    stamina_info: {
      gained: staminaGained,
      current: currentStamina,
      threshold: AVATAR_THRESHOLDS[toTier]
    },
    kael_message: true,
    celebration: true
  });
}

// Create notification for activity sync with Kael's encouragement
async function createActivitySyncNotification(userId, activityName, activityType, distance, staminaGained) {
  // Kael's encouraging sync messages
  const kaelSyncMessages = [
    "🔥 Well done, warrior! The AURA Stream flows stronger with your latest triumph!",
    "⚔️ Your physical dedication fuels the cosmic fire within! The stream acknowledges your effort!",
    "🛡️ Excellent! Each step you take in the mortal realm strengthens your avatar's power!",
    "⚡ The AURA Stream surges with your determination! Your spirit grows ever stronger!",
    "🌟 Magnificent work! Your earthly trials continue to forge your digital destiny!",
    "🔥 Outstanding! The connection between your physical and spiritual self grows stronger!",
    "⚔️ Your persistence is worthy of legend! The AURA Stream responds to your call!",
    "🛡️ Impressive dedication! Each activity adds another spark to your inner flame!",
    "⚡ The Iron Path approves of your consistency! Your avatar's aura brightens!",
    "🌟 Superb! Your commitment to the physical realm empowers your digital evolution!"
  ];

  // Select a random message from Kael
  const kaelMessage = kaelSyncMessages[Math.floor(Math.random() * kaelSyncMessages.length)];

  await db.collection('notifications').add({
    userId: userId,
    type: 'activity_synced',
    title: '⚔️ Kael Acknowledges Your Effort',
    message: `${kaelMessage}\n\n${activityName}: ${distance.toFixed(1)}km (+${staminaGained} Stamina)`,
    read: false,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    stamina_info: {
      gained: staminaGained,
      activity_type: activityType,
      distance: distance
    },
    kael_message: true
  });
}

/**
 * Cloud Function: Sync Strava Activities
 * Main function for syncing user activities from Strava API
 */
exports.syncStravaActivities = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Verify user is authenticated
      const authHeader = req.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing auth token' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      console.log(`🔄 Starting Strava sync for user ${userId}`);

      // Get user document
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data();

      // Check if user has Strava connected
      if (!userData.strava_connected || !userData.strava_token) {
        return res.status(400).json({ 
          error: 'Strava not connected',
          message: 'Please connect your Strava account first'
        });
      }

      // Check rate limiting (prevent too frequent syncs)
      const lastSync = userData.last_activity_sync;
      const cooldownMinutes = 15;
      if (lastSync && (new Date() - lastSync.toDate()) < (cooldownMinutes * 60 * 1000)) {
        const remainingTime = Math.ceil((cooldownMinutes * 60 * 1000 - (new Date() - lastSync.toDate())) / 60000);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Please wait ${remainingTime} more minutes before syncing again`
        });
      }

      // Get access token
      let accessToken = userData.strava_token.access_token;
      const expiresAt = userData.strava_token.expires_at;

      // Check if token needs refresh
      if (!expiresAt || (expiresAt * 1000) < (Date.now() + 3600000)) {
        console.log(`🔄 Refreshing expired token for user ${userId}`);
        
        try {
          const refreshResult = await exports.refreshStravaToken({ userId });
          if (!refreshResult.success) {
            throw new Error('Token refresh failed');
          }
          
          // Get updated token
          const updatedUserDoc = await db.collection('users').doc(userId).get();
          accessToken = updatedUserDoc.data().strava_token.access_token;
          
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          return res.status(401).json({
            error: 'Strava token expired',
            message: 'Please reconnect your Strava account'
          });
        }
      }

      // Determine sync timeframe
      const syncAfter = Math.floor((lastSync ? lastSync.toDate() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) / 1000);
      
      console.log(`📅 Fetching activities after ${new Date(syncAfter * 1000).toISOString()}`);

      // Fetch recent activities from Strava
      const activities = await makeStravaRequest(
        `/athlete/activities?after=${syncAfter}&per_page=50`,
        accessToken
      );

      console.log(`📊 Found ${activities.length} activities to process`);

      if (activities.length === 0) {
        return res.json({
          success: true,
          message: 'No new activities to sync',
          activities_processed: 0,
          stamina_gained: 0
        });
      }

      // Process activities
      let totalStaminaGained = 0;
      let activitiesProcessed = 0;
      let tierUpgraded = false;
      let newTier = userData.avatar_tier || 0;
      const currentStamina = userData.stamina_points || 0;

      const batch = db.batch();

      for (const activity of activities) {
        try {
          // Check if activity already exists
          const existingActivity = await db.collection('strava_activities')
            .where('activityId', '==', activity.id)
            .where('userId', '==', userId)
            .get();

          if (!existingActivity.empty) {
            console.log(`⏭️ Skipping duplicate activity ${activity.id}`);
            continue;
          }

          // Calculate stamina for this activity
          const distanceKm = activity.distance / 1000; // Convert meters to kilometers
          const staminaPoints = calculateStaminaPoints(activity.type, distanceKm);
          
          if (staminaPoints === 0) {
            console.log(`⏭️ Skipping activity ${activity.id} - no stamina earned`);
            continue;
          }

          const previousTier = getAvatarTier(currentStamina + totalStaminaGained);
          const newTotalStamina = currentStamina + totalStaminaGained + staminaPoints;
          const activityNewTier = getAvatarTier(newTotalStamina);

          // Create activity document
          const activityDocRef = db.collection('strava_activities').doc();
          const activityData = {
            activityId: activity.id,
            userId: userId,
            displayName: userData.displayName,
            guild: userData.guild,
            
            // Activity details
            type: activity.type,
            name: activity.name,
            distance: distanceKm,
            moving_time: activity.moving_time,
            elapsed_time: activity.elapsed_time,
            average_speed: activity.average_speed,
            max_speed: activity.max_speed,
            elevation_gain: activity.total_elevation_gain,
            
            // GoREAL calculations
            stamina_gained: staminaPoints,
            tier_before: previousTier,
            tier_after: activityNewTier,
            tier_upgraded: activityNewTier > previousTier,
            
            // Timestamps
            start_date: new Date(activity.start_date),
            synced_at: admin.firestore.FieldValue.serverTimestamp(),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            
            // Optional metadata
            polyline: activity.map ? activity.map.summary_polyline : null,
            city: activity.location_city,
            country: activity.location_country
          };

          batch.set(activityDocRef, activityData);

          totalStaminaGained += staminaPoints;
          activitiesProcessed++;

          // Check for tier upgrade
          if (activityNewTier > previousTier) {
            tierUpgraded = true;
            newTier = activityNewTier;
            console.log(`🎉 Tier upgrade! ${previousTier} → ${activityNewTier} for user ${userId}`);
            
            // Create tier upgrade notification
            await createTierUpgradeNotification(userId, previousTier, activityNewTier, staminaPoints, newTotalStamina);
          }

          // Create activity sync notification
          await createActivitySyncNotification(userId, activity.name, activity.type, distanceKm, staminaPoints);

          console.log(`✅ Processed ${activity.type}: ${distanceKm.toFixed(1)}km (+${staminaPoints} stamina)`);

        } catch (activityError) {
          console.error(`❌ Error processing activity ${activity.id}:`, activityError);
          continue;
        }
      }

      // Update user document
      const userUpdateData = {
        stamina_points: admin.firestore.FieldValue.increment(totalStaminaGained),
        avatar_tier: newTier,
        last_activity_sync: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Update activity type totals
      const activityTypeTotals = {};
      activities.forEach(activity => {
        const distanceKm = activity.distance / 1000;
        if (activity.type === 'Run' || activity.type === 'VirtualRun') {
          activityTypeTotals.total_distance_run = admin.firestore.FieldValue.increment(distanceKm);
        } else if (activity.type === 'Swim') {
          activityTypeTotals.total_distance_swim = admin.firestore.FieldValue.increment(distanceKm);
        } else if (activity.type === 'Ride' || activity.type === 'VirtualRide') {
          activityTypeTotals.total_distance_cycle = admin.firestore.FieldValue.increment(distanceKm);
        }
      });

      Object.assign(userUpdateData, activityTypeTotals);

      batch.update(db.collection('users').doc(userId), userUpdateData);

      // Commit the batch
      await batch.commit();

      console.log(`🎉 Successfully synced ${activitiesProcessed} activities for user ${userId}`);
      console.log(`💪 Total stamina gained: ${totalStaminaGained}`);

      // Trigger leaderboard update if significant changes
      if (totalStaminaGained > 0) {
        try {
          await exports.updateStaminaLeaderboard();
        } catch (leaderboardError) {
          console.warn('Failed to update leaderboard:', leaderboardError);
        }
      }

      res.json({
        success: true,
        message: `Successfully synced ${activitiesProcessed} activities`,
        activities_processed: activitiesProcessed,
        stamina_gained: totalStaminaGained,
        tier_upgraded: tierUpgraded,
        new_tier: newTier,
        current_stamina: currentStamina + totalStaminaGained
      });

    } catch (error) {
      console.error('Error in syncStravaActivities:', error);
      res.status(500).json({ 
        error: 'Failed to sync Strava activities', 
        details: error.message 
      });
    }
  });
});

/**
 * Helper function to refresh Strava token
 * Used internally by syncStravaActivities
 */
exports.refreshStravaToken = async (data) => {
  const { userId } = data;
  
  // This function would contain the token refresh logic
  // For brevity, assuming it works similar to the stravaAuth.js implementation
  // In a real implementation, you'd import and call the refresh function
  
  return { success: true };
};