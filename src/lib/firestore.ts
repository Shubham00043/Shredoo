import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Room,
  RoomMember,
  BlockedMember,
  MusicTrack,
  RoomPlaybackState,
  RoomRole,
  UserProfile,
  UsernameReservation,
  RoomCodeReservation,
  AdminRoleRecord,
  AdminRoleType,
  AdminPermission,
  UserRestriction,
  ModerationReport,
  AdminAuditLog,
  PlatformSettings,
  ReportStatus,
} from '@/types';

// Storage file for persistent local data (fallback when GCP Firestore env is not set)
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'shredoo_store.json');

export interface ShredooStore {
  rooms: Record<string, Room>;
  members: Record<string, RoomMember[]>; // key: roomId
  blockedMembers: Record<string, BlockedMember[]>; // key: roomId
  playlists: Record<string, MusicTrack[]>; // key: roomId
  playback: Record<string, RoomPlaybackState>; // key: roomId
  users: Record<string, UserProfile>;
  usernames: Record<string, UsernameReservation>; // key: normalizedUsername
  roomCodes: Record<string, RoomCodeReservation>; // key: codeHash
  admin_roles: Record<string, AdminRoleRecord>; // key: clerkUserId
  user_restrictions: Record<string, UserRestriction[]>; // key: userId
  moderation_reports: Record<string, ModerationReport>; // key: reportId
  admin_audit_logs: AdminAuditLog[];
  platform_settings: PlatformSettings;
  music_tracks: Record<string, MusicTrack>;
}

/**
 * Async mutex lock to guarantee atomic operations and prevent race conditions
 */
class AsyncLock {
  private queue: Promise<void> = Promise.resolve();

  async acquire<T>(fn: () => Promise<T> | T): Promise<T> {
    let release: () => void;
    const nextPromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    const currentPromise = this.queue;
    this.queue = nextPromise;
    await currentPromise;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

const dbLock = new AsyncLock();

// Hash function for room codes (SHA-256)
export function hashRoomCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

// Cryptographically secure room code generator (e.g. SHR8K92P, SH7D92XQ, SHR4M8T2)
export function generateCryptoRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const prefix = Math.random() > 0.5 ? 'SHR' : 'SH';
  const randomLen = 8 - prefix.length;
  const randomBytes = crypto.randomBytes(randomLen);
  let code = prefix;
  for (let i = 0; i < randomLen; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

function initStore(): ShredooStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (!parsed.playback) parsed.playback = {};
      if (!parsed.users) parsed.users = {};
      if (!parsed.usernames) parsed.usernames = {};
      if (!parsed.roomCodes) parsed.roomCodes = {};
      if (!parsed.admin_roles) parsed.admin_roles = {};
      if (!parsed.user_restrictions) parsed.user_restrictions = {};
      if (!parsed.moderation_reports) parsed.moderation_reports = {};
      if (!parsed.admin_audit_logs) parsed.admin_audit_logs = [];
      if (!parsed.platform_settings) {
        parsed.platform_settings = {
          allowNewRooms: true,
          allowNewRegistrations: true,
          maxRoomCapacityDefault: 5,
          maintenanceMode: false,
          jamendoEnabled: true,
          bollywoodCatalogueEnabled: true,
          updatedAt: new Date().toISOString(),
          updatedBy: 'system',
        };
      }
      if (!parsed.music_tracks) parsed.music_tracks = {};

      // Provision initial Super Admin from environment if configured
      const envSuperAdminId = process.env.SUPER_ADMIN_CLERK_ID;
      if (envSuperAdminId && !parsed.admin_roles[envSuperAdminId]) {
        parsed.admin_roles[envSuperAdminId] = {
          clerkUserId: envSuperAdminId,
          role: 'SUPER_ADMIN',
          permissions: [
            'users.read',
            'users.suspend',
            'users.block',
            'users.delete',
            'rooms.read',
            'rooms.close',
            'rooms.delete',
            'rooms.remove_members',
            'reports.manage',
            'analytics.read',
            'platform.settings',
            'roles.manage',
            'music_providers.manage',
          ],
          assignedBy: 'system_bootstrap',
          assignedByName: 'System Bootstrapper',
          assignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return parsed;
    }
  } catch (err) {
    console.warn('Error reading store file, creating fresh store:', err);
  }

  // Initial seed room - Warm audiophile lounge
  const demoRoomId = 'room-101';
  const demoCode = 'SHR8K92P';
  const demoCodeHash = hashRoomCode(demoCode);

  const initialStore: ShredooStore = {
    rooms: {
      [demoRoomId]: {
        id: demoRoomId,
        name: 'Velvet Charcoal Lounge',
        description: 'Warm acoustic sessions, independent jazz, and low-latency voice.',
        coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
        hostId: 'user_host_1',
        hostName: 'Alex Shredder (Host)',
        hostAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex',
        inviteCode: demoCode,
        inviteCodeHash: demoCodeHash,
        maxCapacity: 5,
        isClosed: false,
        musicPermissions: {
          whoCanAdd: 'everyone',
          whoCanControl: 'host_only',
        },
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
    roomCodes: {
      [demoCodeHash]: {
        codeHash: demoCodeHash,
        code: demoCode,
        roomId: demoRoomId,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        active: true,
      },
    },
    usernames: {
      alex_shredder: {
        normalizedUsername: 'alex_shredder',
        originalUsername: 'Alex_Shredder',
        clerkUserId: 'user_host_1',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    },
    users: {
      user_host_1: {
        userId: 'user_host_1',
        email: 'alex.shredder@gmail.com',
        username: 'Alex_Shredder',
        normalizedUsername: 'alex_shredder',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex',
        emailVerified: true,
        hasCompletedOnboarding: true,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
    members: {
      [demoRoomId]: [
        {
          roomId: demoRoomId,
          userId: 'user_host_1',
          username: 'Alex Shredder (Host)',
          userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex',
          role: 'owner',
          joinedAt: new Date(Date.now() - 3600000).toISOString(),
          status: 'connected',
          volume: 100,
          isMuted: false,
          isSpeaking: false,
        },
        {
          roomId: demoRoomId,
          userId: 'user_member_2',
          username: 'Elena Riff',
          userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Elena',
          role: 'member',
          joinedAt: new Date(Date.now() - 2500000).toISOString(),
          status: 'connected',
          volume: 90,
          isMuted: false,
          isSpeaking: false,
        },
        {
          roomId: demoRoomId,
          userId: 'user_member_3',
          username: 'Marcus Bass',
          userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Marcus',
          role: 'member',
          joinedAt: new Date(Date.now() - 1800000).toISOString(),
          status: 'connected',
          volume: 100,
          isMuted: true,
          isSpeaking: false,
        },
        {
          roomId: demoRoomId,
          userId: 'user_member_4',
          username: 'Chloe Drums',
          userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Chloe',
          role: 'moderator',
          joinedAt: new Date(Date.now() - 1200000).toISOString(),
          status: 'connected',
          volume: 85,
          isMuted: false,
          isSpeaking: false,
        },
      ],
    },
    blockedMembers: {
      [demoRoomId]: [
        {
          id: 'block-1',
          roomId: demoRoomId,
          userId: 'user_bad_actor',
          username: 'Noise Troll',
          userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Troll',
          blockedBy: 'user_host_1',
          blockedByName: 'Alex Shredder',
          blockedAt: new Date(Date.now() - 5000000).toISOString(),
          reason: 'Disruptive static noise on open microphone',
        },
      ],
    },
    playlists: {
      [demoRoomId]: [
        {
          trackId: 'jamendo-1941234',
          providerId: 'jamendo',
          category: 'independent',
          title: 'Northern Lights (Ambient Lounge)',
          artist: 'Plexus Sound',
          album: 'Atmospheres Vol. 1',
          artworkUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
          duration: 218,
          playbackAvailability: 'full_playback',
          licenseType: 'Creative Commons CC BY-SA 4.0',
          territory: 'Worldwide',
          attribution: 'Plexus Sound via Jamendo',
          sourceUrl: 'https://prod-1.storage.jamendo.com/?trackid=1941234&format=mp31&from=app-56d30c95',
        },
        {
          trackId: 'jamendo-1889452',
          providerId: 'jamendo',
          category: 'independent',
          title: 'Warm Acoustic Solitude',
          artist: 'Leonell Cassio',
          album: 'Unwind & Reflect',
          artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
          duration: 184,
          playbackAvailability: 'full_playback',
          licenseType: 'Creative Commons CC BY 3.0',
          territory: 'Worldwide',
          attribution: 'Leonell Cassio via Jamendo',
          sourceUrl: 'https://prod-1.storage.jamendo.com/?trackid=1889452&format=mp31&from=app-56d30c95',
        },
      ],
    },
    playback: {
      [demoRoomId]: {
        roomId: demoRoomId,
        currentTrackId: 'jamendo-1941234',
        currentTrack: {
          trackId: 'jamendo-1941234',
          providerId: 'jamendo',
          category: 'independent',
          title: 'Northern Lights (Ambient Lounge)',
          artist: 'Plexus Sound',
          album: 'Atmospheres Vol. 1',
          artworkUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
          duration: 218,
          playbackAvailability: 'full_playback',
          licenseType: 'Creative Commons CC BY-SA 4.0',
          territory: 'Worldwide',
          attribution: 'Plexus Sound via Jamendo',
          sourceUrl: 'https://prod-1.storage.jamendo.com/?trackid=1941234&format=mp31&from=app-56d30c95',
        },
        playbackStatus: 'paused',
        playbackPosition: 0,
        updatedAt: new Date().toISOString(),
        updatedBy: 'user_host_1',
        playbackVersion: 1,
      },
    },
    admin_roles: {},
    user_restrictions: {},
    moderation_reports: {},
    admin_audit_logs: [],
    platform_settings: {
      allowNewRooms: true,
      allowNewRegistrations: true,
      maxRoomCapacityDefault: 5,
      maintenanceMode: false,
      jamendoEnabled: true,
      bollywoodCatalogueEnabled: true,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    },
    music_tracks: {},
  };

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialStore, null, 2));
  } catch (err) {
    console.warn('Failed to write initial store:', err);
  }
  return initialStore;
}

let memoryStore: ShredooStore | null = null;

export function getStore(): ShredooStore {
  if (!memoryStore) {
    memoryStore = initStore();
  }
  return memoryStore;
}

export function saveStore(): void {
  if (!memoryStore) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2));
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
}

// ==========================================
// USERNAME OPERATIONS (ATOMIC RESERVATIONS)
// ==========================================

const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'shredoo',
  'system',
  'root',
  'moderator',
  'mod',
  'host',
  'owner',
  'support',
  'staff',
  'null',
  'undefined',
  'api',
  'bot',
  'guest',
  'everyone',
  'official',
];

export function validateUsernameFormat(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const trimmed = (raw || '').trim();
  if (trimmed.length < 3) {
    return { valid: false, normalized: '', error: 'Username must be at least 3 characters long.' };
  }
  if (trimmed.length > 20) {
    return { valid: false, normalized: '', error: 'Username cannot exceed 20 characters.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return {
      valid: false,
      normalized: '',
      error: 'Username can only contain letters, numbers, and underscores.',
    };
  }
  const normalized = trimmed.toLowerCase();
  if (RESERVED_USERNAMES.includes(normalized)) {
    return { valid: false, normalized, error: 'This username is reserved and cannot be claimed.' };
  }
  return { valid: true, normalized };
}

export async function checkUsernameAvailability(
  rawUsername: string,
  excludeUserId?: string
): Promise<{
  valid: boolean;
  normalized: string;
  available: boolean;
  error?: string;
  suggestions?: string[];
}> {
  const validation = validateUsernameFormat(rawUsername);
  if (!validation.valid) {
    return {
      valid: false,
      normalized: validation.normalized,
      available: false,
      error: validation.error,
    };
  }

  const store = getStore();
  const existing = store.usernames[validation.normalized];
  const isAvailable = !existing || (excludeUserId && existing.clerkUserId === excludeUserId);

  if (isAvailable) {
    return {
      valid: true,
      normalized: validation.normalized,
      available: true,
    };
  }

  // Generate smart alternatives
  const clean = validation.normalized;
  const currentYear = new Date().getFullYear();
  const rawSuggestions = [
    `${clean}_43`,
    `its_${clean}`,
    `${clean}_${currentYear}`,
    `${clean}_shred`,
    `${clean}_${Math.floor(10 + Math.random() * 89)}`,
  ];

  // Filter out any suggestions that might already be taken
  const suggestions = rawSuggestions
    .filter((s) => !store.usernames[s.toLowerCase()])
    .slice(0, 3);

  return {
    valid: true,
    normalized: validation.normalized,
    available: false,
    error: `Username "${rawUsername.trim()}" is already taken.`,
    suggestions,
  };
}

export async function reserveUsername(
  clerkUserId: string,
  rawUsername: string
): Promise<{
  success: boolean;
  username?: string;
  normalizedUsername?: string;
  error?: string;
}> {
  return await dbLock.acquire(async () => {
    const validation = validateUsernameFormat(rawUsername);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const store = getStore();
    const existing = store.usernames[validation.normalized];

    // Check if taken by someone else
    if (existing && existing.clerkUserId !== clerkUserId) {
      return {
        success: false,
        error: `Username "${rawUsername.trim()}" is already taken by another user.`,
      };
    }

    const now = new Date().toISOString();
    const trimmedOriginal = rawUsername.trim();

    // Release any previous reservation held by this user
    for (const [key, res] of Object.entries(store.usernames)) {
      if (res.clerkUserId === clerkUserId && key !== validation.normalized) {
        delete store.usernames[key];
      }
    }

    // Atomically reserve new username
    store.usernames[validation.normalized] = {
      normalizedUsername: validation.normalized,
      originalUsername: trimmedOriginal,
      clerkUserId,
      createdAt: now,
    };

    // Update corresponding user profile
    if (!store.users[clerkUserId]) {
      store.users[clerkUserId] = {
        userId: clerkUserId,
        email: '',
        username: trimmedOriginal,
        normalizedUsername: validation.normalized,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${clerkUserId}`,
        emailVerified: true,
        hasCompletedOnboarding: true,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      store.users[clerkUserId].username = trimmedOriginal;
      store.users[clerkUserId].normalizedUsername = validation.normalized;
      store.users[clerkUserId].hasCompletedOnboarding = true;
      store.users[clerkUserId].updatedAt = now;
    }

    saveStore();

    return {
      success: true,
      username: trimmedOriginal,
      normalizedUsername: validation.normalized,
    };
  });
}

export async function releaseUsername(clerkUserId: string): Promise<boolean> {
  return await dbLock.acquire(async () => {
    const store = getStore();
    let released = false;
    for (const [key, res] of Object.entries(store.usernames)) {
      if (res.clerkUserId === clerkUserId) {
        delete store.usernames[key];
        released = true;
      }
    }
    if (store.users[clerkUserId]) {
      store.users[clerkUserId].normalizedUsername = undefined;
      store.users[clerkUserId].hasCompletedOnboarding = false;
      store.users[clerkUserId].updatedAt = new Date().toISOString();
    }
    if (released) saveStore();
    return released;
  });
}

// ==========================================
// USER PROFILE OPERATIONS
// ==========================================

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const store = getStore();
  return store.users[userId] || null;
}

export async function syncUserProfile(
  data: Partial<UserProfile> & { userId: string }
): Promise<UserProfile> {
  return await dbLock.acquire(async () => {
    const store = getStore();
    const existing = store.users[data.userId];
    const now = new Date().toISOString();

    if (existing) {
      // Retain existing username, onboarding status, and creation date
      const updated: UserProfile = {
        ...existing,
        email: data.email || existing.email,
        avatarUrl: data.avatarUrl || existing.avatarUrl,
        emailVerified: data.emailVerified !== undefined ? data.emailVerified : existing.emailVerified,
        updatedAt: now,
      };
      store.users[data.userId] = updated;
      saveStore();
      return updated;
    }

    // New profile creation
    const newProfile: UserProfile = {
      userId: data.userId,
      email: data.email || '',
      username: data.username || 'Listener',
      normalizedUsername: data.normalizedUsername,
      avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.userId}`,
      emailVerified: data.emailVerified ?? false,
      hasCompletedOnboarding: !!data.normalizedUsername,
      createdAt: now,
      updatedAt: now,
    };

    store.users[data.userId] = newProfile;
    saveStore();
    return newProfile;
  });
}

// ==========================================
// ROOM CODE OPERATIONS (ATOMIC & CRYPTOGRAPHIC)
// ==========================================

export async function reserveUniqueRoomCode(
  roomId: string,
  maxAttempts = 15
): Promise<{ code: string; codeHash: string }> {
  return await dbLock.acquire(async () => {
    const store = getStore();
    const now = new Date().toISOString();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const code = generateCryptoRoomCode();
      const codeHash = hashRoomCode(code);

      // Check for collision against active room codes
      if (!store.roomCodes[codeHash] || !store.roomCodes[codeHash].active) {
        store.roomCodes[codeHash] = {
          codeHash,
          code,
          roomId,
          createdAt: now,
          active: true,
        };

        if (store.rooms[roomId]) {
          store.rooms[roomId].inviteCode = code;
          store.rooms[roomId].inviteCodeHash = codeHash;
          store.rooms[roomId].updatedAt = now;
        }

        saveStore();
        return { code, codeHash };
      }
    }

    throw new Error('Could not generate a unique room code. Please try again.');
  });
}

export async function regenerateRoomCode(
  roomId: string
): Promise<{ code: string; codeHash: string }> {
  return await dbLock.acquire(async () => {
    const store = getStore();
    const room = store.rooms[roomId];
    if (!room) {
      throw new Error('Room not found');
    }

    // Immediately invalidate all previous codes for this room
    for (const [hash, rc] of Object.entries(store.roomCodes)) {
      if (rc.roomId === roomId) {
        rc.active = false;
      }
    }

    // Generate and reserve brand new unique code
    const now = new Date().toISOString();
    let newCode = '';
    let newCodeHash = '';

    for (let attempt = 0; attempt < 15; attempt++) {
      const candidate = generateCryptoRoomCode();
      const candidateHash = hashRoomCode(candidate);
      if (!store.roomCodes[candidateHash] || !store.roomCodes[candidateHash].active) {
        newCode = candidate;
        newCodeHash = candidateHash;
        break;
      }
    }

    if (!newCode) {
      throw new Error('Failed to generate unique room code.');
    }

    store.roomCodes[newCodeHash] = {
      codeHash: newCodeHash,
      code: newCode,
      roomId,
      createdAt: now,
      active: true,
    };

    room.inviteCode = newCode;
    room.inviteCodeHash = newCodeHash;
    room.updatedAt = now;

    saveStore();

    return { code: newCode, codeHash: newCodeHash };
  });
}

export function validateRoomInviteCode(room: Room, inputCode: string): boolean {
  if (!inputCode) return false;
  const cleanInput = inputCode.trim().toUpperCase();
  const inputHash = hashRoomCode(cleanInput);

  // 1. Direct hash check on room document
  if (room.inviteCodeHash && room.inviteCodeHash === inputHash) {
    return true;
  }

  // 2. Active entry check in roomCodes collection
  const store = getStore();
  const entry = store.roomCodes[inputHash];
  if (entry && entry.active && entry.roomId === room.id) {
    return true;
  }

  // 3. Fallback direct code comparison
  if (room.inviteCode && room.inviteCode.toUpperCase() === cleanInput) {
    return true;
  }

  return false;
}

/**
 * Strips invitation codes from room objects for public safety
 */
export function sanitizeRoomForPublic(room: Room, viewerUserId?: string): Room {
  const isHost = viewerUserId && room.hostId === viewerUserId;
  if (isHost) {
    return room;
  }

  return {
    ...room,
    inviteCode: '', // Masked for non-hosts
    inviteCodeHash: undefined,
  };
}

// ==========================================
// ROOM OPERATIONS
// ==========================================

export async function getRoom(roomId: string): Promise<Room | null> {
  const store = getStore();
  const room = store.rooms[roomId] || null;
  if (!room) return null;

  // attach playback state
  const playback = store.playback[roomId];
  return {
    ...room,
    playback,
    currentSong: playback?.currentTrack || null,
    isPlaying: playback?.playbackStatus === 'playing',
    playbackPosition: playback?.playbackPosition || 0,
  };
}

export async function createRoom(data: Omit<Room, 'createdAt' | 'updatedAt'>): Promise<Room> {
  const store = getStore();
  const now = new Date().toISOString();

  // Guarantee unique cryptographic room code and reservation
  let inviteCode = data.inviteCode;
  let inviteCodeHash = data.inviteCodeHash;

  if (!inviteCode) {
    const reserved = await reserveUniqueRoomCode(data.id);
    inviteCode = reserved.code;
    inviteCodeHash = reserved.codeHash;
  } else {
    inviteCodeHash = hashRoomCode(inviteCode);
    store.roomCodes[inviteCodeHash] = {
      codeHash: inviteCodeHash,
      code: inviteCode,
      roomId: data.id,
      createdAt: now,
      active: true,
    };
  }

  const newRoom: Room = {
    ...data,
    inviteCode,
    inviteCodeHash,
    maxCapacity: Math.min(Math.max(data.maxCapacity || 5, 2), 5), // strict cap at 5
    createdAt: now,
    updatedAt: now,
  };

  store.rooms[newRoom.id] = newRoom;
  store.members[newRoom.id] = [
    {
      roomId: newRoom.id,
      userId: newRoom.hostId,
      username: newRoom.hostName,
      userAvatar: newRoom.hostAvatar,
      role: 'owner',
      joinedAt: now,
      status: 'connected',
      volume: 100,
      isMuted: false,
      isSpeaking: false,
    },
  ];
  store.blockedMembers[newRoom.id] = [];
  store.playlists[newRoom.id] = [];
  store.playback[newRoom.id] = {
    roomId: newRoom.id,
    currentTrackId: null,
    currentTrack: null,
    playbackStatus: 'paused',
    playbackPosition: 0,
    updatedAt: now,
    updatedBy: newRoom.hostId,
    playbackVersion: 1,
  };

  saveStore();
  return newRoom;
}

export async function updateRoom(roomId: string, updates: Partial<Room>): Promise<Room | null> {
  const store = getStore();
  const room = store.rooms[roomId];
  if (!room) return null;

  if (updates.maxCapacity !== undefined) {
    updates.maxCapacity = Math.min(Math.max(updates.maxCapacity, 2), 5);
  }

  const updated: Room = {
    ...room,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  store.rooms[roomId] = updated;
  saveStore();
  return updated;
}

export async function deleteRoom(roomId: string): Promise<boolean> {
  const store = getStore();
  if (!store.rooms[roomId]) return false;

  delete store.rooms[roomId];
  delete store.members[roomId];
  delete store.blockedMembers[roomId];
  delete store.playlists[roomId];
  delete store.playback[roomId];

  saveStore();
  return true;
}

// ==========================================
// SYNCHRONIZED PLAYBACK OPERATIONS
// ==========================================

export async function getRoomPlayback(roomId: string): Promise<RoomPlaybackState | null> {
  const store = getStore();
  return store.playback[roomId] || null;
}

export async function updateRoomPlayback(
  roomId: string,
  updates: Partial<RoomPlaybackState> & { updatedBy: string }
): Promise<RoomPlaybackState | null> {
  const store = getStore();
  const current = store.playback[roomId] || {
    roomId,
    currentTrackId: null,
    currentTrack: null,
    playbackStatus: 'paused',
    playbackPosition: 0,
    updatedAt: new Date().toISOString(),
    updatedBy: updates.updatedBy,
    playbackVersion: 1,
  };

  const updated: RoomPlaybackState = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
    playbackVersion: (current.playbackVersion || 1) + 1,
  };

  store.playback[roomId] = updated;

  // Also update room document
  if (store.rooms[roomId]) {
    store.rooms[roomId].isPlaying = updated.playbackStatus === 'playing';
    store.rooms[roomId].currentSong = updated.currentTrack;
    store.rooms[roomId].playbackPosition = updated.playbackPosition;
    store.rooms[roomId].updatedAt = new Date().toISOString();
  }

  saveStore();
  return updated;
}

// ==========================================
// MEMBERS OPERATIONS
// ==========================================

export async function getMembers(roomId: string): Promise<RoomMember[]> {
  const store = getStore();
  return store.members[roomId] || [];
}

export async function getMember(roomId: string, userId: string): Promise<RoomMember | null> {
  const store = getStore();
  const members = store.members[roomId] || [];
  return members.find((m) => m.userId === userId) || null;
}

export async function addMember(member: RoomMember): Promise<RoomMember> {
  const store = getStore();
  if (!store.members[member.roomId]) {
    store.members[member.roomId] = [];
  }

  const existingIdx = store.members[member.roomId].findIndex((m) => m.userId === member.userId);
  if (existingIdx >= 0) {
    store.members[member.roomId][existingIdx] = {
      ...store.members[member.roomId][existingIdx],
      ...member,
      status: 'connected',
    };
    saveStore();
    return store.members[member.roomId][existingIdx];
  }

  store.members[member.roomId].push(member);
  saveStore();
  return member;
}

export async function updateMember(
  roomId: string,
  userId: string,
  updates: Partial<RoomMember>
): Promise<RoomMember | null> {
  const store = getStore();
  const members = store.members[roomId] || [];
  const idx = members.findIndex((m) => m.userId === userId);
  if (idx === -1) return null;

  const updated = {
    ...members[idx],
    ...updates,
  };
  members[idx] = updated;
  saveStore();
  return updated;
}

export async function removeMember(roomId: string, userId: string): Promise<boolean> {
  const store = getStore();
  if (!store.members[roomId]) return false;

  const initialLen = store.members[roomId].length;
  store.members[roomId] = store.members[roomId].filter((m) => m.userId !== userId);

  const removed = store.members[roomId].length < initialLen;
  if (removed) {
    saveStore();
  }
  return removed;
}

export async function getBlockedMembers(roomId: string): Promise<BlockedMember[]> {
  const store = getStore();
  return store.blockedMembers[roomId] || [];
}

export async function isMemberBlocked(roomId: string, userId: string): Promise<boolean> {
  const store = getStore();
  const blockedList = store.blockedMembers[roomId] || [];
  return blockedList.some((b) => b.userId === userId);
}

export async function blockMember(blockedData: Omit<BlockedMember, 'id' | 'blockedAt'>): Promise<BlockedMember> {
  const store = getStore();
  if (!store.blockedMembers[blockedData.roomId]) {
    store.blockedMembers[blockedData.roomId] = [];
  }

  await removeMember(blockedData.roomId, blockedData.userId);

  const existing = store.blockedMembers[blockedData.roomId].find((b) => b.userId === blockedData.userId);
  if (existing) {
    existing.reason = blockedData.reason || existing.reason;
    existing.blockedAt = new Date().toISOString();
    saveStore();
    return existing;
  }

  const newBlock: BlockedMember = {
    ...blockedData,
    id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    blockedAt: new Date().toISOString(),
  };

  store.blockedMembers[blockedData.roomId].push(newBlock);
  saveStore();
  return newBlock;
}

export async function unblockMember(roomId: string, userId: string): Promise<boolean> {
  const store = getStore();
  if (!store.blockedMembers[roomId]) return false;

  const initialLen = store.blockedMembers[roomId].length;
  store.blockedMembers[roomId] = store.blockedMembers[roomId].filter((b) => b.userId !== userId);

  const unblocked = store.blockedMembers[roomId].length < initialLen;
  if (unblocked) {
    saveStore();
  }
  return unblocked;
}

export async function transferOwnership(
  roomId: string,
  newHostId: string,
  newHostName: string
): Promise<{ success: boolean; error?: string }> {
  const store = getStore();
  const room = store.rooms[roomId];
  if (!room) return { success: false, error: 'Room not found' };

  const members = store.members[roomId] || [];
  const targetMember = members.find((m) => m.userId === newHostId);
  if (!targetMember) return { success: false, error: 'Target user is not a member of this room' };

  const oldHostId = room.hostId;

  room.hostId = targetMember.userId;
  room.hostName = targetMember.username;
  room.hostAvatar = targetMember.userAvatar;
  room.updatedAt = new Date().toISOString();

  for (const m of members) {
    if (m.userId === newHostId) {
      m.role = 'owner';
    } else if (m.userId === oldHostId) {
      m.role = 'member';
    }
  }

  saveStore();
  return { success: true };
}

// ==========================================
// PLAYLIST OPERATIONS
// ==========================================

export async function getPlaylist(roomId: string): Promise<MusicTrack[]> {
  const store = getStore();
  return store.playlists[roomId] || [];
}

export async function addToPlaylist(roomId: string, song: MusicTrack): Promise<MusicTrack> {
  const store = getStore();
  if (!store.playlists[roomId]) {
    store.playlists[roomId] = [];
  }
  store.playlists[roomId].push(song);
  saveStore();
  return song;
}

export async function removeFromPlaylist(roomId: string, songId: string): Promise<boolean> {
  const store = getStore();
  if (!store.playlists[roomId]) return false;
  const initial = store.playlists[roomId].length;
  store.playlists[roomId] = store.playlists[roomId].filter((s) => s.trackId !== songId);
  const changed = store.playlists[roomId].length < initial;
  if (changed) saveStore();
  return changed;
}

// ==========================================
// PRIVATE ROOM QUERYING
// IMPORTANT: Private rooms must never appear in a public discoverable directory!
// Only return rooms where user is host or active member.
// ==========================================

export async function getUserRooms(userId: string): Promise<{ owned: Room[]; joined: Room[] }> {
  const store = getStore();
  const owned: Room[] = [];
  const joined: Room[] = [];

  for (const room of Object.values(store.rooms)) {
    if (room.hostId === userId) {
      owned.push(room);
    } else {
      const roomMembers = store.members[room.id] || [];
      if (roomMembers.some((m) => m.userId === userId)) {
        joined.push(room);
      }
    }
  }

  return { owned, joined };
}

export async function getAllRooms(): Promise<Room[]> {
  const store = getStore();
  return Object.values(store.rooms);
}
