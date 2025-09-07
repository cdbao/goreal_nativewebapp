// Strava OAuth 2.0 Integration for GoREAL AURA Stream
// Cloud Functions for secure Strava authentication and token management

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const https = require('https');
const querystring = require('querystring');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Helper function to get redirect URI based on request
function getRedirectUri(req) {
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000/strava/callback';
  }
  
  // Get the origin from the request or fall back to default Firebase domain
  const origin = req.get('origin') || req.get('referer') || 'https://goreal-native.web.app';
  const hostname = new URL(origin).hostname;
  
  // Support both Firebase default domain and custom domain
  if (hostname === 'www.gorealvn.com' || hostname === 'gorealvn.com') {
    return 'https://www.gorealvn.com/strava/callback';
  }
  
  return 'https://goreal-native.web.app/strava/callback';
}

// Strava API Configuration
const STRAVA_CONFIG = {
  CLIENT_ID: process.env.STRAVA_CLIENT_ID || functions.config().strava?.client_id, // Support both new and legacy config
  CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET || functions.config().strava?.client_secret, // Support both new and legacy config
  SCOPE: 'read,activity:read',
  BASE_URL: 'https://www.strava.com/api/v3'
};

// Validate critical environment variables on startup
if (!STRAVA_CONFIG.CLIENT_ID) {
  console.error('🚨 CRITICAL: STRAVA_CLIENT_ID environment variable is not set!');
  console.error('Run: firebase functions:config:set strava.client_id="YOUR_REAL_STRAVA_CLIENT_ID"');
}
if (!STRAVA_CONFIG.CLIENT_SECRET) {
  console.error('🚨 CRITICAL: STRAVA_CLIENT_SECRET environment variable is not set!');
  console.error('Run: firebase functions:config:set strava.client_secret="YOUR_REAL_STRAVA_CLIENT_SECRET"');
}

// Helper function to make HTTPS requests
function makeHttpsRequest(hostname, path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GoREAL-AuraStream/1.0',
        ...headers
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
            reject(new Error(`HTTP ${res.statusCode}: ${parsedData.message || responseData}`));
          }
        } catch (error) {
          reject(new Error(`JSON Parse Error: ${error.message}`));
        }
      });
    });

    req.on('error', reject);

    if (data && method !== 'GET') {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Cloud Function: Get Strava Authorization URL
 * Returns the URL to redirect users to Strava for authentication
 */
exports.getStravaAuthUrl = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // CRITICAL: Validate Strava configuration before processing
      if (!STRAVA_CONFIG.CLIENT_ID) {
        console.error('🚨 CRITICAL: STRAVA_CLIENT_ID is not configured');
        return res.status(500).json({ 
          error: 'Strava configuration error: CLIENT_ID not set',
          details: 'Server configuration is incomplete. Contact administrator.'
        });
      }
      
      if (!STRAVA_CONFIG.CLIENT_SECRET) {
        console.error('🚨 CRITICAL: STRAVA_CLIENT_SECRET is not configured');
        return res.status(500).json({ 
          error: 'Strava configuration error: CLIENT_SECRET not set',
          details: 'Server configuration is incomplete. Contact administrator.'
        });
      }

      // Verify user is authenticated
      const authHeader = req.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing auth token' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Generate state parameter for security
      const state = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store state in Firestore for verification
      await db.collection('strava_auth_states').doc(state).set({
        userId: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      // Get dynamic redirect URI based on request
      const redirectUri = getRedirectUri(req);
      
      // Build Strava authorization URL
      const authUrl = `https://www.strava.com/oauth/authorize?${querystring.stringify({
        client_id: STRAVA_CONFIG.CLIENT_ID,
        response_type: 'code',
        redirect_uri: redirectUri,
        approval_prompt: 'auto',
        scope: STRAVA_CONFIG.SCOPE,
        state: state
      })}`;

      res.json({ 
        authUrl,
        state,
        message: 'Redirect user to this URL to begin Strava authentication'
      });

    } catch (error) {
      console.error('Error generating Strava auth URL:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });
});

/**
 * Cloud Function: Handle Strava OAuth Callback
 * Processes the authorization code and stores tokens securely
 */
exports.handleStravaCallback = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // CRITICAL: Validate Strava configuration before processing
      if (!STRAVA_CONFIG.CLIENT_ID || !STRAVA_CONFIG.CLIENT_SECRET) {
        console.error('🚨 CRITICAL: STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET is not configured');
        return res.status(500).json({ 
          error: 'Strava configuration error: Missing credentials',
          details: 'Server configuration is incomplete. Contact administrator.'
        });
      }

      const { code, state, error, error_description } = req.query;

      // Handle OAuth errors
      if (error) {
        console.error('Strava OAuth error:', error, error_description);
        return res.status(400).json({ 
          error: 'Strava authorization failed', 
          details: error_description 
        });
      }

      // Validate required parameters
      if (!code || !state) {
        return res.status(400).json({ error: 'Missing required parameters: code or state' });
      }

      // Verify state parameter
      const stateDoc = await db.collection('strava_auth_states').doc(state).get();
      if (!stateDoc.exists) {
        return res.status(400).json({ error: 'Invalid or expired state parameter' });
      }

      const stateData = stateDoc.data();
      const userId = stateData.userId;

      // Check if state is expired
      if (stateData.expiresAt.toDate() < new Date()) {
        await db.collection('strava_auth_states').doc(state).delete();
        return res.status(400).json({ error: 'State parameter expired' });
      }

      // Exchange authorization code for access token
      console.log(`🔄 Starting token exchange for user ${userId}`);
      console.log(`📝 Using CLIENT_ID: ${STRAVA_CONFIG.CLIENT_ID ? 'CONFIGURED' : 'MISSING'}`);
      console.log(`🔐 Using CLIENT_SECRET: ${STRAVA_CONFIG.CLIENT_SECRET ? 'CONFIGURED' : 'MISSING'}`);

      const tokenData = querystring.stringify({
        client_id: STRAVA_CONFIG.CLIENT_ID,
        client_secret: STRAVA_CONFIG.CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code'
      });

      console.log(`📤 Sending token request to Strava...`);
      let tokenResponse;
      try {
        tokenResponse = await makeHttpsRequest(
          'www.strava.com',
          '/oauth/token',
          'POST',
          tokenData,
          { 'Content-Type': 'application/x-www-form-urlencoded' }
        );
        console.log(`✅ Token exchange successful. Response keys: ${Object.keys(tokenResponse || {}).join(', ')}`);
      } catch (tokenError) {
        console.error(`❌ Token exchange failed:`, tokenError);
        return res.status(500).json({ 
          error: 'Failed to exchange authorization code', 
          details: tokenError.message 
        });
      }

      // Validate token response structure
      if (!tokenResponse || !tokenResponse.access_token) {
        console.error(`❌ Invalid token response structure:`, tokenResponse);
        return res.status(500).json({ 
          error: 'Invalid token response from Strava',
          details: 'Missing access_token in response'
        });
      }

      // Get athlete information
      console.log(`📤 Fetching athlete data...`);
      let athleteData;
      try {
        athleteData = await makeHttpsRequest(
          'www.strava.com',
          '/api/v3/athlete',
          'GET',
          null,
          { 'Authorization': `Bearer ${tokenResponse.access_token}` }
        );
        console.log(`✅ Athlete data fetched. Athlete ID: ${athleteData?.id}`);
      } catch (athleteError) {
        console.error(`❌ Failed to fetch athlete data:`, athleteError);
        return res.status(500).json({ 
          error: 'Failed to fetch athlete information', 
          details: athleteError.message 
        });
      }

      // Update user document with Strava tokens and info
      console.log(`💾 Updating user document for ${userId}...`);
      const userRef = db.collection('users').doc(userId);
      
      try {
        const updateData = {
          strava_token: {
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            expires_at: tokenResponse.expires_at,
            scope: tokenResponse.scope || 'read,activity:read', // Use default scope if undefined
            athlete_id: tokenResponse.athlete?.id || athleteData?.id
          },
          strava_connected: true,
          strava_athlete_info: {
            id: athleteData?.id,
            firstname: athleteData?.firstname || '',
            lastname: athleteData?.lastname || '',
            profile: athleteData?.profile || '',
            city: athleteData?.city || null,
            country: athleteData?.country || null,
            sex: athleteData?.sex || null
          },
          last_strava_sync: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await userRef.update(updateData);
        console.log(`✅ User document updated successfully`);
      } catch (firestoreError) {
        console.error(`❌ Failed to update user document:`, firestoreError);
        return res.status(500).json({ 
          error: 'Failed to save Strava connection data', 
          details: firestoreError.message 
        });
      }

      // Clean up state document
      await db.collection('strava_auth_states').doc(state).delete();

      // Log successful connection
      console.log(`✅ User ${userId} successfully connected to Strava athlete ${athleteData?.id}`);

      // Return success response
      res.json({
        success: true,
        message: 'Strava account connected successfully!',
        athlete: {
          name: `${athleteData.firstname} ${athleteData.lastname}`,
          profile: athleteData.profile,
          location: athleteData.city && athleteData.country ? `${athleteData.city}, ${athleteData.country}` : null
        }
      });

    } catch (error) {
      console.error('Error in Strava callback:', error);
      res.status(500).json({ error: 'Failed to process Strava authorization', details: error.message });
    }
  });
});

/**
 * Cloud Function: Disconnect Strava Account
 * Removes Strava tokens and resets connection status
 */
exports.disconnectStrava = functions.https.onRequest((req, res) => {
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

      // Get current user data
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data();
      
      // Revoke Strava token if possible
      if (userData.strava_token && userData.strava_token.access_token) {
        try {
          const revokeData = querystring.stringify({
            access_token: userData.strava_token.access_token
          });

          await makeHttpsRequest(
            'www.strava.com',
            '/oauth/deauthorize',
            'POST',
            revokeData,
            { 'Content-Type': 'application/x-www-form-urlencoded' }
          );
          
          console.log(`✅ Revoked Strava token for user ${userId}`);
        } catch (revokeError) {
          console.warn(`⚠️ Could not revoke Strava token for user ${userId}:`, revokeError.message);
        }
      }

      // Remove Strava data from user document
      await db.collection('users').doc(userId).update({
        strava_token: admin.firestore.FieldValue.delete(),
        strava_connected: false,
        strava_athlete_info: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Disconnected Strava for user ${userId}`);

      res.json({
        success: true,
        message: 'Strava account disconnected successfully'
      });

    } catch (error) {
      console.error('Error disconnecting Strava:', error);
      res.status(500).json({ error: 'Failed to disconnect Strava account', details: error.message });
    }
  });
});

/**
 * Cloud Function: Refresh Strava Token
 * Refreshes expired Strava access tokens
 */
exports.refreshStravaToken = functions.https.onCall(async (data, context) => {
  try {
    // CRITICAL: Validate Strava configuration before processing
    if (!STRAVA_CONFIG.CLIENT_ID || !STRAVA_CONFIG.CLIENT_SECRET) {
      console.error('🚨 CRITICAL: STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET is not configured');
      throw new functions.https.HttpsError('failed-precondition', 'Strava configuration error: Missing credentials');
    }

    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    
    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    if (!userData.strava_token || !userData.strava_token.refresh_token) {
      throw new functions.https.HttpsError('failed-precondition', 'No Strava refresh token available');
    }

    // Check if token needs refresh (expires within next hour)
    const expiresAt = userData.strava_token.expires_at;
    const needsRefresh = !expiresAt || (expiresAt * 1000) < (Date.now() + 3600000);

    if (!needsRefresh) {
      return { success: true, message: 'Token is still valid' };
    }

    // Refresh the token
    const refreshData = querystring.stringify({
      client_id: STRAVA_CONFIG.CLIENT_ID,
      client_secret: STRAVA_CONFIG.CLIENT_SECRET,
      refresh_token: userData.strava_token.refresh_token,
      grant_type: 'refresh_token'
    });

    const tokenResponse = await makeHttpsRequest(
      'www.strava.com',
      '/oauth/token',
      'POST',
      refreshData,
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    );

    // Update user document with new tokens
    await db.collection('users').doc(userId).update({
      'strava_token.access_token': tokenResponse.access_token,
      'strava_token.refresh_token': tokenResponse.refresh_token,
      'strava_token.expires_at': tokenResponse.expires_at,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Refreshed Strava token for user ${userId}`);

    return { 
      success: true, 
      message: 'Strava token refreshed successfully',
      expires_at: tokenResponse.expires_at
    };

  } catch (error) {
    console.error('Error refreshing Strava token:', error);
    throw new functions.https.HttpsError('internal', 'Failed to refresh Strava token', error.message);
  }
});

/**
 * Cloud Function: Update Celestial Record Leaderboard
 * Scheduled function that aggregates AURA Stream data and generates rankings
 */
exports.updateCelestialRecord = functions.pubsub.schedule('0 */1 * * *').onRun(async (context) => {
  try {
    console.log('🌌 Starting Celestial Record update... v1.0');

    // Get all users with Strava connections
    const usersQuery = await db.collection('users')
      .where('strava_connected', '==', true)
      .get();

    if (usersQuery.empty) {
      console.log('📭 No users with Strava connections found');
      return null;
    }

    const playerStats = new Map();
    let processedUsers = 0;

    // Process each user's activities
    for (const userDoc of usersQuery.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      try {
        console.log(`📊 Processing user ${userId}...`);

        // Get all user's Strava activities
        const activitiesQuery = await db.collection('strava_activities')
          .where('userId', '==', userId)
          .get();

        // Calculate totals for different time periods
        const now = new Date();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let totalStamina = 0;
        let totalDistance = 0;
        let weeklyStamina = 0;
        let weeklyDistance = 0;
        let monthlyStamina = 0;
        let monthlyDistance = 0;

        activitiesQuery.forEach(activityDoc => {
          const activity = activityDoc.data();
          const activityDate = activity.start_date_local ? new Date(activity.start_date_local) : new Date();
          
          const stamina = activity.stamina_points || 0;
          const distance = activity.distance || 0;

          // All time totals
          totalStamina += stamina;
          totalDistance += distance;

          // Weekly totals
          if (activityDate >= weekStart) {
            weeklyStamina += stamina;
            weeklyDistance += distance;
          }

          // Monthly totals
          if (activityDate >= monthStart) {
            monthlyStamina += stamina;
            monthlyDistance += distance;
          }
        });

        // Determine avatar tier based on total stamina
        let avatarTier = 'common';
        if (totalStamina >= 50000) avatarTier = 'legendary';
        else if (totalStamina >= 25000) avatarTier = 'epic';
        else if (totalStamina >= 8000) avatarTier = 'rare';

        // Store player stats
        const playerData = {
          userId: userId,
          displayName: userData.displayName || 'Unnamed Player',
          guild: userData.guild || 'none',
          avatarTier: avatarTier,
          totalStamina: Math.round(totalStamina),
          totalDistance: Math.round(totalDistance),
          weeklyStamina: Math.round(weeklyStamina),
          weeklyDistance: Math.round(weeklyDistance),
          monthlyStamina: Math.round(monthlyStamina),
          monthlyDistance: Math.round(monthlyDistance)
        };

        playerStats.set(userId, playerData);
        processedUsers++;
        
      } catch (error) {
        console.error(`❌ Error processing user ${userId}:`, error);
      }
    }

    console.log(`✅ Processed ${processedUsers} users with Strava activities`);

    // Convert to arrays and sort by stamina
    const allPlayers = Array.from(playerStats.values());

    // Generate rankings for all time periods
    const allTimeRanking = allPlayers
      .sort((a, b) => b.totalStamina - a.totalStamina)
      .slice(0, 50) // Top 50
      .map((player, index) => ({ ...player, rank: index + 1 }));

    const weeklyRanking = allPlayers
      .sort((a, b) => b.weeklyStamina - a.weeklyStamina)
      .slice(0, 50)
      .map((player, index) => ({ 
        ...player, 
        rank: index + 1,
        totalStamina: player.weeklyStamina,
        totalDistance: player.weeklyDistance
      }));

    const monthlyRanking = allPlayers
      .sort((a, b) => b.monthlyStamina - a.monthlyStamina)
      .slice(0, 50)
      .map((player, index) => ({ 
        ...player, 
        rank: index + 1,
        totalStamina: player.monthlyStamina,
        totalDistance: player.monthlyDistance
      }));

    // Update the celestial_record document
    const celestialRecordRef = db.collection('leaderboards').doc('celestial_record');
    await celestialRecordRef.set({
      allTime: allTimeRanking,
      weekly: weeklyRanking,
      monthly: monthlyRanking,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      totalPlayers: allPlayers.length
    }, { merge: true });

    console.log(`🌟 Celestial Record updated successfully!`);
    console.log(`📈 Rankings: All-Time: ${allTimeRanking.length}, Weekly: ${weeklyRanking.length}, Monthly: ${monthlyRanking.length}`);

    if (allTimeRanking.length > 0) {
      console.log(`👑 Current #1: ${allTimeRanking[0].displayName} (${allTimeRanking[0].totalStamina} stamina)`);
    }

    return null;

  } catch (error) {
    console.error('❌ Error updating Celestial Record:', error);
    throw error;
  }
});

/**
 * HTTP Cloud Function: Manual Celestial Record Update
 * Allows manual triggering of leaderboard update
 */
exports.triggerCelestialUpdate = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Verify admin access (optional - you can add authentication here)
      console.log('🔄 Manual Celestial Record update triggered');
      
      // Call the update function directly
      await exports.updateCelestialRecord.run();
      
      res.json({
        success: true,
        message: 'Celestial Record updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Manual update failed:', error);
      res.status(500).json({ 
        error: 'Failed to update Celestial Record', 
        details: error.message 
      });
    }
  });
});