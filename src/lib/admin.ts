import { NextRequest } from 'next/server';
import crypto from 'crypto';
import {
  AdminRoleType,
  AdminPermission,
  AdminRoleRecord,
  UserRestriction,
  ModerationReport,
  AdminAuditLog,
  PlatformSettings,
  ReportStatus,
  ReportReason,
  RestrictionType,
} from '@/types';
import {
  getStore,
  saveStore,
  getUserProfile,
  getRoom,
  deleteRoom,
  removeMember,
  regenerateRoomCode,
  releaseUsername,
} from '@/lib/firestore';
import { getAuthenticatedUser, validateGmailUser } from '@/lib/auth';
import { removeLiveKitParticipant, deleteLiveKitRoom } from '@/lib/livekit';

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
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
];

export const DEFAULT_MODERATOR_PERMISSIONS: AdminPermission[] = [
  'users.read',
  'users.suspend',
  'users.block',
  'rooms.read',
  'rooms.close',
  'rooms.remove_members',
  'reports.manage',
  'analytics.read',
];

/**
 * Retrieve admin role and granted permissions for a Clerk user
 */
export async function getAdminRole(clerkUserId: string): Promise<{
  role: AdminRoleType;
  permissions: AdminPermission[];
  isSuperAdmin: boolean;
}> {
  if (!clerkUserId) {
    return { role: 'NORMAL_USER', permissions: [], isSuperAdmin: false };
  }

  // 1. Check if user is configured as Super Admin in server environment
  const envSuperAdmin = process.env.SUPER_ADMIN_CLERK_ID;
  if (envSuperAdmin && envSuperAdmin === clerkUserId) {
    return {
      role: 'SUPER_ADMIN',
      permissions: ALL_ADMIN_PERMISSIONS,
      isSuperAdmin: true,
    };
  }

  // 2. Check persistent admin_roles collection
  const store = getStore();
  const record = store.admin_roles?.[clerkUserId];
  if (record && record.role === 'SUPER_ADMIN') {
    return {
      role: 'SUPER_ADMIN',
      permissions: ALL_ADMIN_PERMISSIONS,
      isSuperAdmin: true,
    };
  }

  if (record && record.role === 'MODERATOR') {
    return {
      role: 'MODERATOR',
      permissions: record.permissions || DEFAULT_MODERATOR_PERMISSIONS,
      isSuperAdmin: false,
    };
  }

  return { role: 'NORMAL_USER', permissions: [], isSuperAdmin: false };
}

/**
 * Check if user holds a specific administrative permission
 */
export async function hasAdminPermission(
  clerkUserId: string,
  permission: AdminPermission
): Promise<boolean> {
  const { role, permissions } = await getAdminRole(clerkUserId);
  if (role === 'SUPER_ADMIN') return true;
  return permissions.includes(permission);
}

/**
 * Server-side guard for administrative API routes
 */
export async function requireAdminAuth(
  req: NextRequest,
  requiredPermission?: AdminPermission
): Promise<
  | { authorized: false; status: number; error: string }
  | {
      authorized: true;
      user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>;
      role: AdminRoleType;
      permissions: AdminPermission[];
      isSuperAdmin: boolean;
    }
> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return { authorized: false, status: 401, error: 'Authentication required. Please sign in.' };
  }

  const gmailCheck = validateGmailUser(user);
  if (!gmailCheck.authorized) {
    return { authorized: false, status: 403, error: gmailCheck.error || 'Access denied.' };
  }

  const { role, permissions, isSuperAdmin } = await getAdminRole(user.userId);
  if (role === 'NORMAL_USER') {
    return {
      authorized: false,
      status: 403,
      error: 'Forbidden: You do not have administrative privileges on SHREDoo.',
    };
  }

  if (requiredPermission && !isSuperAdmin && !permissions.includes(requiredPermission)) {
    return {
      authorized: false,
      status: 403,
      error: `Forbidden: Missing required permission "${requiredPermission}".`,
    };
  }

  return {
    authorized: true,
    user,
    role,
    permissions,
    isSuperAdmin,
  };
}

// ==========================================
// IMMUTABLE AUDIT LOGGING
// ==========================================

export async function logAdminAction(entry: {
  adminId: string;
  adminUsername: string;
  action: string;
  targetId: string;
  targetType: 'user' | 'room' | 'role' | 'report' | 'settings';
  reason: string;
  previousState?: any;
  newState?: any;
}): Promise<AdminAuditLog> {
  const store = getStore();
  if (!store.admin_audit_logs) {
    store.admin_audit_logs = [];
  }

  const auditLog: AdminAuditLog = {
    actionId: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    ...entry,
    createdAt: new Date().toISOString(),
  };

  store.admin_audit_logs.push(auditLog);
  saveStore();
  return auditLog;
}

export async function getAuditLogs(limitCount = 100): Promise<AdminAuditLog[]> {
  const store = getStore();
  const logs = store.admin_audit_logs || [];
  // Latest first
  return [...logs].reverse().slice(0, limitCount);
}

// ==========================================
// GLOBAL USER RESTRICTIONS & BANS
// ==========================================

export async function getUserRestrictions(userId: string): Promise<UserRestriction[]> {
  const store = getStore();
  return store.user_restrictions?.[userId] || [];
}

export async function getActiveUserRestriction(userId: string): Promise<UserRestriction | null> {
  const store = getStore();
  const list = store.user_restrictions?.[userId] || [];
  const now = new Date();

  for (const r of list) {
    if (r.isActive) {
      if (!r.expiresAt || new Date(r.expiresAt) > now) {
        return r;
      }
    }
  }
  return null;
}

export async function restrictUser(data: {
  targetUserId: string;
  restrictionType?: RestrictionType;
  type?: RestrictionType;
  reason: string;
  adminId: string;
  adminUsername: string;
  durationDays?: number;
  expiresAt?: string;
}): Promise<{ success: boolean; restriction?: UserRestriction; error?: string }> {
  const restrictionType: RestrictionType =
    data.restrictionType || data.type || 'blocked';

  // 1. Prevent restricting a Super Admin
  const targetAdminCheck = await getAdminRole(data.targetUserId);
  if (targetAdminCheck.isSuperAdmin) {
    return { success: false, error: 'Protected account: Super Admins cannot be suspended or blocked.' };
  }

  // 2. Prevent self-restriction
  if (data.targetUserId === data.adminId) {
    return { success: false, error: 'Operation prohibited: You cannot restrict your own account.' };
  }

  const store = getStore();
  if (!store.user_restrictions) store.user_restrictions = {};
  if (!store.user_restrictions[data.targetUserId]) store.user_restrictions[data.targetUserId] = [];

  const now = new Date();
  let expiresAt: string | null = data.expiresAt || null;
  if (data.durationDays && data.durationDays > 0) {
    const exp = new Date(now.getTime() + data.durationDays * 24 * 60 * 60 * 1000);
    expiresAt = exp.toISOString();
  }

  const newRestriction: UserRestriction = {
    id: `restr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    userId: data.targetUserId,
    restrictionType,
    reason: data.reason,
    restrictedBy: data.adminId,
    restrictedByName: data.adminUsername,
    startAt: now.toISOString(),
    expiresAt,
    isActive: true,
    createdAt: now.toISOString(),
  };

  store.user_restrictions[data.targetUserId].push(newRestriction);

  // 3. Immediately disconnect user from all active rooms and revoke LiveKit access
  for (const [roomId, membersList] of Object.entries(store.members)) {
    if (membersList.some((m) => m.userId === data.targetUserId)) {
      await removeMember(roomId, data.targetUserId);
      await removeLiveKitParticipant(roomId, data.targetUserId);
    }
  }

  saveStore();

  // 4. Log audit record
  await logAdminAction({
    adminId: data.adminId,
    adminUsername: data.adminUsername,
    action: `USER_${restrictionType.toUpperCase()}`,
    targetId: data.targetUserId,
    targetType: 'user',
    reason: data.reason,
    newState: { restrictionType, expiresAt },
  });

  return { success: true, restriction: newRestriction };
}

export async function restoreUserAccount(
  targetUserId: string,
  adminId: string,
  adminUsername: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const store = getStore();
  const list = store.user_restrictions?.[targetUserId] || [];
  let found = false;

  for (const r of list) {
    if (r.isActive) {
      r.isActive = false;
      found = true;
    }
  }

  if (!found) {
    return { success: false, error: 'User does not currently have any active restrictions.' };
  }

  saveStore();

  await logAdminAction({
    adminId,
    adminUsername,
    action: 'USER_RESTORED',
    targetId: targetUserId,
    targetType: 'user',
    reason,
  });

  return { success: true };
}

export async function deleteUserAccount(
  targetUserId: string,
  adminId: string,
  adminUsername: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  // Prevent deleting self or Super Admin
  if (targetUserId === adminId) {
    return { success: false, error: 'Protected account: You cannot delete your own Super Admin account.' };
  }

  const targetAdmin = await getAdminRole(targetUserId);
  if (targetAdmin.isSuperAdmin) {
    return { success: false, error: 'Protected account: Super Admins cannot be deleted.' };
  }

  const store = getStore();

  // 1. Disconnect and leave all rooms
  for (const [roomId, membersList] of Object.entries(store.members)) {
    if (membersList.some((m) => m.userId === targetUserId)) {
      await removeMember(roomId, targetUserId);
      await removeLiveKitParticipant(roomId, targetUserId);
    }
  }

  // 2. Delete all rooms owned by the user
  for (const [roomId, room] of Object.entries(store.rooms)) {
    if (room.hostId === targetUserId) {
      await deleteLiveKitRoom(roomId);
      await deleteRoom(roomId);
    }
  }

  // 3. Release username reservation
  await releaseUsername(targetUserId);

  // 4. Delete user record & role
  const prevProfile = store.users[targetUserId];
  delete store.users[targetUserId];
  delete store.admin_roles[targetUserId];
  saveStore();

  // 5. Log audit action
  await logAdminAction({
    adminId,
    adminUsername,
    action: 'USER_DELETED',
    targetId: targetUserId,
    targetType: 'user',
    reason,
    previousState: prevProfile,
  });

  return { success: true };
}

// ==========================================
// ADMIN ROOM MANAGEMENT OPERATIONS
// ==========================================

export async function adminCloseRoom(
  roomId: string,
  adminId: string,
  adminUsername: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const room = await getRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  const store = getStore();
  store.rooms[roomId].isClosed = true;
  store.rooms[roomId].updatedAt = new Date().toISOString();
  saveStore();

  await logAdminAction({
    adminId,
    adminUsername,
    action: 'ROOM_CLOSED',
    targetId: roomId,
    targetType: 'room',
    reason,
    previousState: { isClosed: false },
    newState: { isClosed: true },
  });

  return { success: true };
}

export async function adminReopenRoom(
  roomId: string,
  adminId: string,
  adminUsername: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const room = await getRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  const store = getStore();
  store.rooms[roomId].isClosed = false;
  store.rooms[roomId].updatedAt = new Date().toISOString();
  saveStore();

  await logAdminAction({
    adminId,
    adminUsername,
    action: 'ROOM_REOPENED',
    targetId: roomId,
    targetType: 'room',
    reason,
    previousState: { isClosed: true },
    newState: { isClosed: false },
  });

  return { success: true };
}

export async function adminDeleteRoom(
  roomId: string,
  adminId: string,
  adminUsername: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const room = await getRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  await deleteLiveKitRoom(roomId);
  await deleteRoom(roomId);

  await logAdminAction({
    adminId,
    adminUsername,
    action: 'ROOM_DELETED',
    targetId: roomId,
    targetType: 'room',
    reason,
    previousState: room,
  });

  return { success: true };
}

export async function adminRemoveParticipant(
  roomId: string,
  targetUserId: string,
  adminId: string,
  adminUsername: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const room = await getRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  await removeMember(roomId, targetUserId);
  await removeLiveKitParticipant(roomId, targetUserId);

  await logAdminAction({
    adminId,
    adminUsername,
    action: 'PARTICIPANT_REMOVED',
    targetId: `${roomId}:${targetUserId}`,
    targetType: 'room',
    reason,
  });

  return { success: true };
}

export async function adminRevokeRoomCode(
  roomId: string,
  adminId: string,
  adminUsername: string,
  reason: string
): Promise<{ success: boolean; newCode?: string; error?: string }> {
  const room = await getRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  const { code: newCode } = await regenerateRoomCode(roomId);

  await logAdminAction({
    adminId,
    adminUsername,
    action: 'ROOM_CODE_REVOKED',
    targetId: roomId,
    targetType: 'room',
    reason,
    previousState: { oldCode: room.inviteCode },
    newState: { newCode },
  });

  return { success: true, newCode };
}

// ==========================================
// ROLE & PERMISSIONS MANAGEMENT (SUPER ADMIN ONLY)
// ==========================================

export async function assignModeratorRole(
  arg1:
    | string
    | {
        targetUserId: string;
        permissions?: AdminPermission[];
        adminId: string;
        adminUsername: string;
      },
  arg2?: AdminPermission[],
  arg3?: string,
  arg4?: string
): Promise<{ success: boolean; record?: AdminRoleRecord; error?: string }> {
  const store = getStore();
  const now = new Date().toISOString();

  let targetUserId: string;
  let permissions: AdminPermission[];
  let adminId: string;
  let adminUsername: string;

  if (typeof arg1 === 'object') {
    targetUserId = arg1.targetUserId;
    permissions = arg1.permissions && arg1.permissions.length > 0 ? arg1.permissions : DEFAULT_MODERATOR_PERMISSIONS;
    adminId = arg1.adminId;
    adminUsername = arg1.adminUsername;
  } else {
    targetUserId = arg1;
    permissions = arg2 && arg2.length > 0 ? arg2 : DEFAULT_MODERATOR_PERMISSIONS;
    adminId = arg3 || 'admin';
    adminUsername = arg4 || 'Admin';
  }

  const record: AdminRoleRecord = {
    clerkUserId: targetUserId,
    role: 'MODERATOR',
    permissions: permissions.length > 0 ? permissions : DEFAULT_MODERATOR_PERMISSIONS,
    assignedBy: adminId,
    assignedByName: adminUsername,
    assignedAt: now,
    updatedAt: now,
  };

  store.admin_roles[targetUserId] = record;
  saveStore();

  await logAdminAction({
    adminId,
    adminUsername,
    action: 'ROLE_PROMOTED_MODERATOR',
    targetId: targetUserId,
    targetType: 'role',
    reason: 'Promoted to platform moderator with assigned permissions',
    newState: record,
  });

  return { success: true, record };
}

export async function demoteToNormalUser(
  targetUserId: string,
  adminId: string,
  adminUsername: string,
  reason = 'Demoted to normal user by Super Admin'
): Promise<{ success: boolean; error?: string }> {
  // Prevent demoting self or Super Admin
  if (targetUserId === adminId) {
    return { success: false, error: 'Protected account: You cannot demote your own Super Admin account.' };
  }

  const targetRole = await getAdminRole(targetUserId);
  if (targetRole.isSuperAdmin) {
    return { success: false, error: 'Protected account: Super Admins cannot be demoted.' };
  }

  const store = getStore();
  const prev = store.admin_roles[targetUserId];
  delete store.admin_roles[targetUserId];
  saveStore();

  await logAdminAction({
    adminId,
    adminUsername,
    action: 'ROLE_DEMOTED_NORMAL_USER',
    targetId: targetUserId,
    targetType: 'role',
    reason,
    previousState: prev,
  });

  return { success: true };
}

// ==========================================
// USER REPORTING SYSTEM
// ==========================================

export async function createReport(data: {
  reportedBy: string;
  reportedByName: string;
  targetUserId?: string;
  targetUsername?: string;
  roomId?: string;
  roomName?: string;
  reason: ReportReason;
  details: string;
}): Promise<ModerationReport> {
  const store = getStore();
  if (!store.moderation_reports) store.moderation_reports = {};

  const reportId = `rep_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const report: ModerationReport = {
    reportId,
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  store.moderation_reports[reportId] = report;
  saveStore();
  return report;
}

export async function updateReportStatus(data: {
  reportId: string;
  status: ReportStatus;
  adminId: string;
  adminUsername: string;
  resolutionNote?: string;
}): Promise<{ success: boolean; report?: ModerationReport; error?: string }> {
  const store = getStore();
  const report = store.moderation_reports?.[data.reportId];
  if (!report) return { success: false, error: 'Report not found' };

  report.status = data.status;
  report.resolvedBy = data.adminId;
  report.resolvedByName = data.adminUsername;
  report.resolutionNote = data.resolutionNote || report.resolutionNote;
  report.resolvedAt = new Date().toISOString();

  saveStore();

  await logAdminAction({
    adminId: data.adminId,
    adminUsername: data.adminUsername,
    action: `REPORT_${data.status.toUpperCase()}`,
    targetId: data.reportId,
    targetType: 'report',
    reason: data.resolutionNote || `Marked report as ${data.status}`,
    newState: { status: data.status },
  });

  return { success: true, report };
}

// ==========================================
// PLATFORM OVERVIEW & ANALYTICS
// ==========================================

export async function getPlatformOverviewStats(): Promise<{
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  blockedUsers: number;
  totalRooms: number;
  activeRooms: number;
  connectedParticipants: number;
  musicProviders: {
    jamendo: { status: 'operational' | 'degraded'; details: string; hasClientId: boolean };
    bollywood: { status: 'licensing_pending'; details: string };
  };
  recentAuditLogs: AdminAuditLog[];
  pendingReportsCount: number;
}> {
  const store = getStore();

  const users = Object.values(store.users || {});
  const restrictions = Object.values(store.user_restrictions || {});
  const rooms = Object.values(store.rooms || {});
  const reports = Object.values(store.moderation_reports || {});

  let activeUsersCount = 0;
  let suspendedUsersCount = 0;
  let blockedUsersCount = 0;

  for (const u of users) {
    const rList = store.user_restrictions?.[u.userId];
    const r = Array.isArray(rList) ? rList.find((x) => x.isActive || (x as any).active) : rList;
    if (r && (r.isActive || (r as any).active)) {
      const rType = r.restrictionType || (r as any).type;
      if (rType === 'suspended') {
        if (!r.expiresAt || new Date(r.expiresAt) > new Date()) {
          suspendedUsersCount++;
          continue;
        }
      } else {
        blockedUsersCount++;
        continue;
      }
    }
    activeUsersCount++;
  }

  let activeRoomsCount = 0;
  let connectedParticipantsCount = 0;

  for (const room of rooms) {
    if (!room.isClosed) {
      activeRoomsCount++;
      const membersList = store.members?.[room.id] || [];
      connectedParticipantsCount += membersList.length;
    }
  }

  const hasJamendoId = Boolean(process.env.JAMENDO_CLIENT_ID);
  const pendingReportsCount = reports.filter((rep) => rep.status === 'pending').length;
  const recentAuditLogs = await getAuditLogs(10);

  return {
    totalUsers: users.length,
    activeUsers: activeUsersCount,
    suspendedUsers: suspendedUsersCount,
    blockedUsers: blockedUsersCount,
    totalRooms: rooms.length,
    activeRooms: activeRoomsCount,
    connectedParticipants: connectedParticipantsCount,
    musicProviders: {
      jamendo: {
        status: hasJamendoId ? 'operational' : 'degraded',
        details: hasJamendoId
          ? 'Jamendo Creative Commons API operational with server-side client ID.'
          : 'Jamendo Client ID missing in server environment variables.',
        hasClientId: hasJamendoId,
      },
      bollywood: {
        status: 'licensing_pending',
        details: 'Catalogue metadata available; audio streaming strictly blocked pending commercial provider license.',
      },
    },
    recentAuditLogs,
    pendingReportsCount,
  };
}

// ==========================================
// PLATFORM SETTINGS
// ==========================================

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  allowNewRooms: true,
  allowNewRegistrations: true,
  maxRoomCapacityDefault: 5,
  maintenanceMode: false,
  jamendoEnabled: true,
  bollywoodCatalogueEnabled: false,
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Bootstrap',
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const store = getStore();
  if (!store.platform_settings) {
    store.platform_settings = { ...DEFAULT_PLATFORM_SETTINGS };
    saveStore();
  }
  return store.platform_settings;
}

export async function updatePlatformSettings(data: {
  adminId: string;
  adminUsername: string;
  settings: Partial<PlatformSettings>;
  reason: string;
}): Promise<{ success: boolean; settings: PlatformSettings }> {
  const store = getStore();
  const current = await getPlatformSettings();
  const previousState = { ...current };

  const updated: PlatformSettings = {
    ...current,
    ...data.settings,
  };

  store.platform_settings = updated;
  saveStore();

  await logAdminAction({
    adminId: data.adminId,
    adminUsername: data.adminUsername,
    action: 'PLATFORM_SETTINGS_UPDATED',
    targetId: 'global_settings',
    targetType: 'settings',
    reason: data.reason || 'Admin updated platform settings',
    previousState,
    newState: updated,
  });

  return { success: true, settings: updated };
}
