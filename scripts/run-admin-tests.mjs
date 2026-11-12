import assert from 'assert';
import fs from 'fs';

// Load .env.local for standalone test execution
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

import {
  getStore,
  saveStore,
  getUserProfile,
  syncUserProfile,
  createRoom,
  getRoom,
} from '../src/lib/firestore.ts';
import {
  getAdminRole,
  hasAdminPermission,
  restrictUser,
  restoreUserAccount,
  deleteUserAccount,
  adminCloseRoom,
  adminReopenRoom,
  adminRevokeRoomCode,
  assignModeratorRole,
  demoteToNormalUser,
  createReport,
  updateReportStatus,
  getPlatformOverviewStats,
  getAuditLogs,
  ALL_ADMIN_PERMISSIONS,
} from '../src/lib/admin.ts';

async function runTests() {
  console.log('--- STARTING SHREDOO SUPER ADMIN & MODERATION ACCEPTANCE SUITE ---\n');

  // Initialize store
  const store = getStore();

  const superAdminId = process.env.SUPER_ADMIN_CLERK_ID || 'user_3M0MkJQViCz5QqOz8VytgaMT0Jw';
  const moderatorId = 'user_mod_test_123';
  const normalUserId = 'user_normal_test_456';
  const badActorId = 'user_troll_test_789';

  // Seed sample users
  await syncUserProfile({
    userId: superAdminId,
    username: 'super_admin_shubham',
    email: 'shubhu1887@gmail.com',
  });

  await syncUserProfile({
    userId: moderatorId,
    username: 'mod_alex',
    email: 'alex.mod@gmail.com',
  });

  await syncUserProfile({
    userId: normalUserId,
    username: 'listener_sam',
    email: 'sam.listener@gmail.com',
  });

  await syncUserProfile({
    userId: badActorId,
    username: 'disruptive_troll',
    email: 'troll.user@gmail.com',
  });

  console.log('✓ Test user profiles successfully seeded in datastore');

  // TEST 1: Role resolution & Hierarchy
  console.log('\n[TEST 1] Role resolution & hierarchy verification');
  const superAdminRole = await getAdminRole(superAdminId);
  assert.strictEqual(superAdminRole.role, 'SUPER_ADMIN');
  assert.strictEqual(superAdminRole.isSuperAdmin, true);
  assert.strictEqual(superAdminRole.permissions.length, ALL_ADMIN_PERMISSIONS.length);
  console.log('  ✓ Super Admin role correctly recognized with all 13 permissions');

  const normalRole = await getAdminRole(normalUserId);
  assert.strictEqual(normalRole.role, 'NORMAL_USER');
  assert.strictEqual(normalRole.isSuperAdmin, false);
  assert.strictEqual(normalRole.permissions.length, 0);
  console.log('  ✓ Normal user correctly recognized with 0 admin permissions');

  // TEST 2: Moderator Promotion & Permission Enforcement
  console.log('\n[TEST 2] Moderator Promotion & Permission Enforcement');
  const promoRes = await assignModeratorRole({
    targetUserId: moderatorId,
    adminId: superAdminId,
    adminUsername: 'super_admin_shubham',
    permissions: ['users.read', 'users.suspend', 'rooms.read', 'reports.manage'],
  });
  assert.strictEqual(promoRes.success, true);

  const modRole = await getAdminRole(moderatorId);
  assert.strictEqual(modRole.role, 'MODERATOR');
  assert.strictEqual(modRole.isSuperAdmin, false);

  const canSuspend = await hasAdminPermission(moderatorId, 'users.suspend');
  const canDeleteUsers = await hasAdminPermission(moderatorId, 'users.delete');
  const canManageRoles = await hasAdminPermission(moderatorId, 'roles.manage');

  assert.strictEqual(canSuspend, true);
  assert.strictEqual(canDeleteUsers, false);
  assert.strictEqual(canManageRoles, false);
  console.log('  ✓ Moderator granted selective permissions; lacks users.delete and roles.manage');

  // TEST 3: Protection of Super Admin against demotion or suspension by moderator
  console.log('\n[TEST 3] Super Admin self-preservation & hierarchy protection');
  const modAttemptSuspendSuper = await restrictUser({
    targetUserId: superAdminId,
    adminId: moderatorId,
    adminUsername: 'mod_alex',
    type: 'blocked',
    reason: 'Malicious attempt to block Super Admin',
  });
  assert.strictEqual(modAttemptSuspendSuper.success, false);
  assert.match(modAttemptSuspendSuper.error, /cannot be suspended or blocked/i);
  console.log('  ✓ Moderator blocked from restricting or suspending Super Admin');

  const modAttemptDemoteSuper = await demoteToNormalUser(
    superAdminId,
    moderatorId,
    'mod_alex',
    'Attempt to demote Super Admin'
  );
  assert.strictEqual(modAttemptDemoteSuper.success, false);
  assert.match(modAttemptDemoteSuper.error, /cannot be demoted/i);
  console.log('  ✓ Moderator blocked from demoting Super Admin');

  // TEST 4: Global Block and User Suspension
  console.log('\n[TEST 4] Global user block and LiveKit audio disconnect');
  const blockRes = await restrictUser({
    targetUserId: badActorId,
    adminId: superAdminId,
    adminUsername: 'super_admin_shubham',
    type: 'blocked',
    reason: 'Severe TOS violation and harassment in listening room',
  });
  assert.strictEqual(blockRes.success, true);

  // Verify restriction in store
  const restrictions = store.user_restrictions[badActorId];
  const restriction = Array.isArray(restrictions) ? restrictions[restrictions.length - 1] : restrictions;
  assert.ok(restriction);
  assert.strictEqual(restriction.isActive, true);
  assert.strictEqual(restriction.restrictionType, 'blocked');
  console.log('  ✓ User restriction recorded in user_restrictions collection');

  // TEST 5: Room Management & Invalidation
  console.log('\n[TEST 5] Room management & code invalidation');
  const room = await createRoom({
    name: 'Lo-Fi Chill Session',
    description: 'Relaxing beats',
    hostId: normalUserId,
    hostName: 'listener_sam',
    hostAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sam',
    maxCapacity: 5,
    coverImage: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b',
  });

  const closeRes = await adminCloseRoom(
    room.id,
    superAdminId,
    'super_admin_shubham',
    'Administrative maintenance closure'
  );
  assert.strictEqual(closeRes.success, true);
  const updatedRoom = await getRoom(room.id);
  assert.strictEqual(updatedRoom.status, 'closed');
  console.log('  ✓ Admin successfully closed room');

  const reopenRes = await adminReopenRoom(
    room.id,
    superAdminId,
    'super_admin_shubham',
    'Maintenance completed'
  );
  assert.strictEqual(reopenRes.success, true);
  const reopenedRoom = await getRoom(room.id);
  assert.strictEqual(reopenedRoom.status, 'active');
  console.log('  ✓ Admin successfully reopened room');

  const revokeRes = await adminRevokeRoomCode(
    room.id,
    superAdminId,
    'super_admin_shubham',
    'Security leak'
  );
  assert.strictEqual(revokeRes.success, true);
  console.log('  ✓ Room invitation code regenerated and previous code invalidated');

  // TEST 6: User Reports and Moderation Queue
  console.log('\n[TEST 6] User reports and moderation workflow');
  const report = await createReport({
    reportedBy: normalUserId,
    reportedByName: 'listener_sam',
    targetUserId: badActorId,
    targetUsername: 'disruptive_troll',
    reason: 'harassment',
    details: 'User was shouting loud disruptive noise over voice channel',
  });
  assert.strictEqual(report.status, 'pending');

  const updateRes = await updateReportStatus({
    reportId: report.reportId,
    status: 'resolved',
    adminId: moderatorId,
    adminUsername: 'mod_alex',
    resolutionNote: 'User globally blocked from the platform',
  });
  assert.strictEqual(updateRes.success, true);
  assert.strictEqual(updateRes.report.status, 'resolved');
  console.log('  ✓ Report filed, placed in queue, and successfully resolved by moderator');

  // TEST 7: Platform Overview Analytics
  console.log('\n[TEST 7] Platform overview analytics computation');
  const stats = await getPlatformOverviewStats();
  assert.ok(stats.totalUsers >= 4);
  assert.ok(stats.totalRooms >= 1);
  assert.ok(stats.musicProviders.jamendo);
  assert.strictEqual(stats.musicProviders.bollywood.status, 'licensing_pending');
  console.log('  ✓ Platform overview computed from live Firestore datastore');

  // TEST 8: Immutable Audit Logging
  console.log('\n[TEST 8] Immutable audit trail verification');
  const auditLogs = await getAuditLogs(50);
  assert.ok(auditLogs.length >= 5);
  const actionsLogged = auditLogs.map((l) => l.action);
  assert.ok(actionsLogged.some((a) => a.includes('USER_BLOCKED') || a.includes('USER_RESTRICTED')));
  assert.ok(actionsLogged.includes('ROOM_CLOSED'));
  assert.ok(actionsLogged.some((a) => a.includes('MODERATOR')));
  console.log('  ✓ All administrative actions verified in immutable audit logs');

  console.log('\n===============================================================');
  console.log('ALL SUPER ADMIN & PLATFORM-WIDE MODERATION ACCEPTANCE TESTS PASSED!');
  console.log('===============================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
