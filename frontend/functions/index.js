// GoREAL Cloud Functions with AURA Stream Integration
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Import AURA Stream functions
const stravaAuth = require('./stravaAuth');
const syncStravaActivities = require('./syncStravaActivities');
const communityStats = require('./communityStats');
const pushNotifications = require('./pushNotifications');

// Export Strava Auth functions
exports.getStravaAuthUrl = stravaAuth.getStravaAuthUrl;
exports.handleStravaCallback = stravaAuth.handleStravaCallback;
exports.disconnectStrava = stravaAuth.disconnectStrava;
exports.refreshStravaToken = stravaAuth.refreshStravaToken;

// Export Celestial Record leaderboard functions
exports.updateCelestialRecord = stravaAuth.updateCelestialRecord;
exports.triggerCelestialUpdate = stravaAuth.triggerCelestialUpdate;

// Export Strava Activity sync functions
exports.syncStravaActivities = syncStravaActivities.syncStravaActivities;

// Export Community Stats functions
exports.updateCommunityStats = communityStats.updateCommunityStats;
exports.getCommunityStats = communityStats.getCommunityStats;

// Export Push Notification functions
exports.savePushSubscription = pushNotifications.savePushSubscription;
exports.removePushSubscription = pushNotifications.removePushSubscription;
exports.sendPushNotification = pushNotifications.sendPushNotification;
exports.processPendingNotifications = pushNotifications.processPendingNotifications;

// Health check for AURA Stream functions
exports.auraStreamHealth = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'aura-stream-functions',
      version: '1.0.0'
    });
  });
});