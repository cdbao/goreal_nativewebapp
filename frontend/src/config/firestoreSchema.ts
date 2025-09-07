// GoREAL Firestore Schema for AURA Stream System
// This file defines the data structure for the enhanced PWA with Strava integration

export interface ExtendedUserData {
  // Existing user fields
  userId: string;
  email: string;
  displayName: string;
  guild: 'titans' | 'illumination' | 'envoys';
  role: 'member' | 'admin';
  aura: number;
  level: number;
  createdAt: Date;
  lastLogin: Date;
  
  // NEW AURA Stream fields
  stamina_points: number; // Total stamina accumulated from activities
  avatar_tier: number; // Current avatar evolution tier (0-10)
  strava_token?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    scope: string;
    athlete_id: number;
  };
  strava_connected: boolean; // Quick check for Strava connection status
  last_activity_sync: Date; // Timestamp of last Strava sync
  total_distance_run: number; // Lifetime running distance in km
  total_distance_swim: number; // Lifetime swimming distance in km
  total_distance_cycle: number; // Lifetime cycling distance in km
  streak_days: number; // Current activity streak
  longest_streak: number; // Best activity streak achieved
}

export interface StravaActivity {
  id: string; // Firestore document ID
  activityId: number; // Strava activity ID
  userId: string; // GoREAL user ID
  displayName: string; // User's display name for leaderboards
  guild: 'titans' | 'illumination' | 'envoys'; // User's guild
  
  // Activity details
  type: 'Run' | 'Swim' | 'Ride' | 'Walk' | 'Hike' | 'VirtualRun' | 'VirtualRide';
  name: string; // Activity name from Strava
  distance: number; // Distance in kilometers
  moving_time: number; // Moving time in seconds
  elapsed_time: number; // Total time in seconds
  average_speed: number; // Average speed in m/s
  max_speed: number; // Max speed in m/s
  elevation_gain: number; // Elevation gain in meters
  
  // GoREAL calculations
  stamina_gained: number; // Stamina points earned from this activity
  tier_before: number; // Avatar tier before this activity
  tier_after: number; // Avatar tier after this activity (if changed)
  tier_upgraded: boolean; // Whether this activity caused a tier upgrade
  
  // Timestamps
  start_date: Date; // Activity start time from Strava
  synced_at: Date; // When this was synced to GoREAL
  timestamp: Date; // Firestore timestamp
  
  // Metadata
  polyline?: string; // Encoded polyline for route visualization
  city?: string; // Activity location
  country?: string; // Activity country
}

export interface StaminaLeaderboard {
  id: 'stamina_leaderboard'; // Fixed document ID
  last_updated: Date;
  total_participants: number;
  
  // Guild-specific leaderboards
  titans: LeaderboardEntry[];
  illumination: LeaderboardEntry[];
  envoys: LeaderboardEntry[];
  
  // Overall leaderboard (top 100 across all guilds)
  overall: LeaderboardEntry[];
  
  // Weekly and monthly snapshots
  weekly_leaders: LeaderboardEntry[];
  monthly_leaders: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  guild: 'titans' | 'illumination' | 'envoys';
  stamina_points: number;
  avatar_tier: number;
  total_activities: number;
  last_activity: Date;
  rank: number;
  
  // Activity breakdown
  total_distance_run: number;
  total_distance_swim: number;
  total_distance_cycle: number;
  
  // Streaks
  current_streak: number;
  longest_streak: number;
}

export interface AuraStreamStats {
  id: 'global_stats'; // Fixed document ID
  last_updated: Date;
  
  // Global statistics
  total_users_connected: number;
  total_activities_synced: number;
  total_stamina_earned: number;
  total_distance_covered: number;
  
  // Guild distribution
  guild_distribution: {
    titans: number;
    illumination: number;
    envoys: number;
  };
  
  // Activity type distribution
  activity_distribution: {
    Run: number;
    Swim: number;
    Ride: number;
    Walk: number;
    other: number;
  };
  
  // Tier distribution
  tier_distribution: {
    [key: string]: number; // tier_0: count, tier_1: count, etc.
  };
  
  // Performance metrics
  average_stamina_per_user: number;
  most_active_guild: string;
  top_activity_type: string;
  
  // Time-based stats
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
}

export interface NotificationLog {
  id: string; // Auto-generated document ID
  userId: string;
  type: 'tier_upgrade' | 'activity_synced' | 'streak_milestone' | 'guild_challenge';
  title: string;
  message: string;
  
  // Metadata
  read: boolean;
  created_at: Date;
  expires_at: Date;
  
  // Action data (for interactive notifications)
  action_url?: string;
  action_label?: string;
  
  // Context data
  related_activity_id?: string;
  tier_info?: {
    from: number;
    to: number;
  };
  stamina_info?: {
    gained: number;
    total: number;
  };
}

// Firestore Collection References
export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  STRAVA_ACTIVITIES: 'strava_activities',
  LEADERBOARDS: 'leaderboards',
  AURA_STREAM_STATS: 'aura_stream_stats',
  NOTIFICATIONS: 'notifications',
  GUILDS: 'guilds'
} as const;

// Firestore Security Rules Template
export const SECURITY_RULES_TEMPLATE = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - users can read/write their own data, admins can read all
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
                  exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                  get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Strava activities - users can read their own, all can read for leaderboards
    match /strava_activities/{activityId} {
      allow create, update: if request.auth != null && 
                            request.auth.uid == resource.data.userId;
      allow read: if request.auth != null;
      allow delete: if request.auth != null && 
                    (request.auth.uid == resource.data.userId ||
                     exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Leaderboards - read-only for authenticated users
    match /leaderboards/{leaderboardId} {
      allow read: if request.auth != null;
      allow write: if false; // Only server can update
    }
    
    // AURA Stream stats - read-only for authenticated users
    match /aura_stream_stats/{statsId} {
      allow read: if request.auth != null;
      allow write: if false; // Only server can update
    }
    
    // Notifications - users can read/update their own
    match /notifications/{notificationId} {
      allow read, update: if request.auth != null && 
                          request.auth.uid == resource.data.userId;
      allow create: if false; // Only server can create
    }
    
    // Guild data - read for all, write for admins only
    match /guilds/{guildId} {
      allow read: if true; // Public read for Guild Selection
      allow write: if request.auth != null && 
                   exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
`;

// Helper functions for type checking
export function isValidActivityType(type: string): type is StravaActivity['type'] {
  return ['Run', 'Swim', 'Ride', 'Walk', 'Hike', 'VirtualRun', 'VirtualRide'].includes(type);
}

export function isValidGuild(guild: string): guild is ExtendedUserData['guild'] {
  return ['titans', 'illumination', 'envoys'].includes(guild);
}

export function calculateStaminaPoints(activityType: StravaActivity['type'], distance: number): number {
  const config = {
    Run: 1, // 1 point per km
    VirtualRun: 1,
    Swim: 50, // 50 points per km
    Ride: 0.3, // 0.3 points per km
    VirtualRide: 0.3,
    Walk: 0.5, // 0.5 points per km
    Hike: 0.8 // 0.8 points per km (more challenging)
  };
  
  return Math.floor(distance * (config[activityType] || 0.1));
}

export function getAvatarTierForStamina(staminaPoints: number): number {
  const thresholds = [0, 100, 500, 1500, 3000, 5000, 8000, 12000, 17000, 25000, 50000];
  
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (staminaPoints >= thresholds[i]) {
      return i;
    }
  }
  
  return 0;
}