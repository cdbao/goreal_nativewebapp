export type UserRole = 'student' | 'player' | 'admin' | 'super_admin';
export type GuildId = 'titans' | 'illumination' | 'envoys';

export interface User {
  userId: string;
  displayName: string;
  email: string;
  guild: GuildId | ''; // Allow empty string for unassigned users
  level: string;
  currentAura: number;
  currentStreak: number;
  role: UserRole;
  createdAt?: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
  lastLoginAt?: FirebaseTimestamp;
}

// Firebase Timestamp type for better type safety
export type FirebaseTimestamp = {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
} | any; // Allow any for server timestamps

export type ReportType = 'image' | 'text' | 'audio' | 'video';
export type QuestStatus = 'accepted' | 'in_progress' | 'submitted' | 'completed' | 'rejected';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Quest {
  questId: string;
  title: string;
  description: string;
  auraReward: number;
  isActive: boolean;
  guild: GuildId;
  reportType: ReportType;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  requiredLevel?: number;
  estimatedDuration?: number; // in minutes
  createdAt?: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
  createdBy?: string; // Admin user ID
}

export interface ActiveQuest {
  id?: string; // Document ID in Firestore
  questId: string;
  userId: string;
  acceptedAt: FirebaseTimestamp;
  status: QuestStatus;
  quest?: Quest; // Populated quest data
  submissionCount?: number;
  lastSubmissionAt?: FirebaseTimestamp;
  completedAt?: FirebaseTimestamp;
  auraAwarded?: number;
}

export interface Submission {
  submissionId?: string; // Document ID in Firestore
  id?: string; // Alternative document ID field
  userId: string;
  questId: string;
  proofData: string; // URL or text content (File handled separately)
  proofType: ReportType;
  proofFile?: File; // Actual file object for uploads
  status: SubmissionStatus;
  submittedAt: FirebaseTimestamp;
  reviewedAt?: FirebaseTimestamp;
  reviewedBy?: string; // Admin user ID
  feedback?: string; // Admin feedback
  auraAwarded?: number;
  metadata?: {
    fileSize?: number;
    mimeType?: string;
    duration?: number; // for audio/video files
  };
}

export interface BackgroundImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  name: string;
  originalName: string;
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  uploadedAt: FirebaseTimestamp;
  uploadedBy?: string; // User ID who uploaded
  isActive?: boolean;
  tags?: string[];
}

export interface AppConfig {
  homePageBackgroundUrl: string;
  dailyQuestId?: string;
  dailyQuestAssignedAt?: FirebaseTimestamp;
  lastDailyQuestUpdate?: FirebaseTimestamp;
  // Multi-guild daily quests
  dailyQuest_titans?: string;
  dailyQuest_illumination?: string;
  dailyQuest_envoys?: string;
  dailyQuestAssignedAt_titans?: FirebaseTimestamp;
  dailyQuestAssignedAt_illumination?: FirebaseTimestamp;
  dailyQuestAssignedAt_envoys?: FirebaseTimestamp;
  // System settings
  maintenanceMode?: boolean;
  systemMessage?: string;
  maxQuestsPerDay?: number;
  maxAuraPerQuest?: number;
}

export type NotificationType = 'quest_approved' | 'level_up' | 'daily_quest' | 'general' | 'system' | 'ceremony';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  timestamp: FirebaseTimestamp;
  createdAt: FirebaseTimestamp;
  isRead: boolean;
  type: NotificationType;
  questId?: string;
  auraReward?: number;
  oldLevel?: number;
  newLevel?: number;
  triggerCeremony?: boolean;
  priority?: 'low' | 'medium' | 'high';
  expiresAt?: FirebaseTimestamp;
}

export interface GuildInfo {
  id: GuildId;
  name: string;
  displayName: string;
  description: string;
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  icon: string;
  memberCount?: number;
  establishedAt?: FirebaseTimestamp;
}

// Error handling types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
  lastUpdated?: FirebaseTimestamp;
}

// Form types
export interface QuestFormData {
  title: string;
  description: string;
  auraReward: number;
  guild: GuildId;
  reportType: ReportType;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  requiredLevel?: number;
  estimatedDuration?: number;
}

export interface SubmissionFormData {
  proofData: string;
  proofType: ReportType;
  proofFile?: File;
  notes?: string;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Firebase document with ID
export interface FirebaseDocument<T = Record<string, unknown>> {
  id: string;
  data: T;
}

// Pagination
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// Search and filter
export interface FilterOptions {
  guild?: GuildId;
  status?: QuestStatus | SubmissionStatus;
  dateRange?: {
    start: FirebaseTimestamp;
    end: FirebaseTimestamp;
  };
  searchTerm?: string;
}

// Statistics
export interface UserStats {
  totalQuestsCompleted: number;
  totalAuraEarned: number;
  currentStreak: number;
  maxStreak: number;
  averageQuestsPerDay: number;
  favoriteReportType: ReportType;
  guildRanking: number;
}

export interface GuildStats {
  totalMembers: number;
  activeMembers: number;
  totalQuestsCompleted: number;
  averageAuraPerMember: number;
  topPerformers: Array<{
    userId: string;
    displayName: string;
    aura: number;
  }>;
}