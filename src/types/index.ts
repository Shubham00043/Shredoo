export type RoomRole = 'owner' | 'moderator' | 'member';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface RoomMember {
  roomId: string;
  userId: string;
  username: string;
  userAvatar: string;
  role: RoomRole;
  joinedAt: string;
  status: ConnectionStatus;
  isMuted?: boolean;
  volume?: number;
  isSpeaking?: boolean;
}

export interface BlockedMember {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  blockedBy: string;
  blockedByName: string;
  blockedAt: string;
  reason?: string;
}

export interface MusicPermissions {
  whoCanAdd: 'everyone' | 'host_only';
  whoCanControl: 'everyone' | 'host_only';
}

export type MusicCategory = 'bollywood' | 'independent';

export type PlaybackAvailability =
  | 'full_playback'
  | 'preview_only'
  | 'licensing_pending'
  | 'territory_restricted';

export interface MusicTrack {
  trackId: string;
  providerId: 'jamendo' | 'bollywood_partner' | 'user_upload' | 'shredoo_independent';
  category: MusicCategory;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  duration: number; // in seconds
  playbackAvailability: PlaybackAvailability;
  licenseType: string;
  territory: string;
  attribution: string;
  sourceUrl?: string;
  previewUrl?: string;
  addedBy?: string;
  addedByName?: string;
  addedAt?: string;
  storagePath?: string;
  uploadedBy?: string;
  uploadedByUsername?: string;
}

// Dedicated ROOM_MUSIC record in Firestore
export interface RoomMusicRecord {
  trackId: string;
  roomId: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  storagePath: string;
  artworkPath?: string;
  uploadedBy: string; // userId
  uploadedByUsername: string;
  createdAt: string;
  licenseType: string;
  playbackStatus: 'available' | 'processing' | 'failed' | 'removed';
  fileSize?: number;
  mimeType?: string;
  sourceUrl: string;
  artworkUrl?: string;
}

// Dedicated ROOM_PLAYLISTS record in Firestore
export interface RoomPlaylistRecord {
  roomId: string;
  queue: MusicTrack[];
  currentTrackId: string | null;
  playbackStatus: 'playing' | 'paused' | 'buffering' | 'stopped';
  playbackPosition: number;
  updatedAt: string;
  updatedBy: string;
  playbackVersion: number;
}

// Backward compatibility alias
export type Song = MusicTrack;

export interface RoomPlaybackState {
  roomId: string;
  currentTrackId: string | null;
  currentTrack: MusicTrack | null;
  playbackStatus: 'playing' | 'paused' | 'buffering' | 'stopped';
  playbackPosition: number;
  updatedAt: string;
  updatedBy: string;
  playbackVersion: number;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  inviteCode: string;
  inviteCodeHash?: string;
  maxCapacity: number; // up to 5
  isClosed: boolean;
  musicPermissions: MusicPermissions;
  createdAt: string;
  updatedAt: string;
  playback?: RoomPlaybackState;
  currentSong?: MusicTrack | null;
  isPlaying?: boolean;
  playbackPosition?: number;
}

export interface UserProfile {
  userId: string;
  email: string;
  username: string;
  normalizedUsername?: string;
  avatarUrl: string;
  emailVerified?: boolean;
  hasCompletedOnboarding?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsernameReservation {
  normalizedUsername: string;
  originalUsername: string;
  clerkUserId: string;
  createdAt: string;
}

export interface RoomCodeReservation {
  codeHash: string;
  code: string;
  roomId: string;
  createdAt: string;
  active: boolean;
}

export interface RoomSyncData {
  room: Room;
  members: RoomMember[];
  blockedMembers?: BlockedMember[];
  playlist: MusicTrack[];
  playback?: RoomPlaybackState;
  currentUserRole: RoomRole | null;
  isCurrentUserBlocked: boolean;
  isCurrentUserMember: boolean;
}

// ==========================================
// SUPER ADMIN & PLATFORM MODERATION TYPES
// ==========================================

export type AdminRoleType = 'SUPER_ADMIN' | 'MODERATOR' | 'NORMAL_USER';

export type AdminPermission =
  | 'users.read'
  | 'users.suspend'
  | 'users.block'
  | 'users.delete'
  | 'rooms.read'
  | 'rooms.close'
  | 'rooms.delete'
  | 'rooms.remove_members'
  | 'reports.manage'
  | 'analytics.read'
  | 'platform.settings'
  | 'roles.manage'
  | 'music_providers.manage';

export interface AdminRoleRecord {
  clerkUserId: string;
  role: AdminRoleType;
  permissions: AdminPermission[];
  assignedBy: string;
  assignedByName: string;
  assignedAt: string;
  updatedAt: string;
}

export type RestrictionType =
  | 'block'
  | 'suspension'
  | 'ban'
  | 'blocked'
  | 'suspended'
  | 'banned';

export interface UserRestriction {
  id: string;
  userId: string;
  restrictionType: RestrictionType;
  reason: string;
  restrictedBy: string;
  restrictedByName: string;
  startAt: string;
  expiresAt: string | null; // null for permanent
  isActive: boolean;
  createdAt: string;
}

export type ReportReason =
  | 'inappropriate_username'
  | 'harassment'
  | 'abuse'
  | 'spam'
  | 'room_misconduct'
  | 'other';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

export interface ModerationReport {
  reportId: string;
  reportedBy: string;
  reportedByName: string;
  targetUserId?: string;
  targetUsername?: string;
  roomId?: string;
  roomName?: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  createdAt: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolutionNote?: string;
  resolvedAt?: string;
}

export interface AdminAuditLog {
  actionId: string;
  adminId: string;
  adminUsername: string;
  action: string;
  targetId: string;
  targetType: 'user' | 'room' | 'role' | 'report' | 'settings';
  reason: string;
  previousState?: any;
  newState?: any;
  createdAt: string;
}

export interface PlatformSettings {
  allowNewRooms: boolean;
  allowNewRegistrations: boolean;
  maxRoomCapacityDefault: number;
  maintenanceMode: boolean;
  jamendoEnabled: boolean;
  bollywoodCatalogueEnabled: boolean;
  updatedAt: string;
  updatedBy: string;
}
