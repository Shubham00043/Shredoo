import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminAuth,
  assignModeratorRole,
  demoteToNormalUser,
  ALL_ADMIN_PERMISSIONS,
  DEFAULT_MODERATOR_PERMISSIONS,
} from '@/lib/admin';
import { getStore } from '@/lib/firestore';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'roles.manage');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const store = getStore();
    const envSuperAdminId = process.env.SUPER_ADMIN_CLERK_ID;
    const rolesList: any[] = [];

    // Include env Super Admin
    if (envSuperAdminId) {
      const userProfile = store.users?.[envSuperAdminId];
      rolesList.push({
        clerkUserId: envSuperAdminId,
        username: userProfile?.username || 'Super Admin',
        email: userProfile?.email || 'shubhu1887@gmail.com',
        role: 'SUPER_ADMIN',
        permissions: ALL_ADMIN_PERMISSIONS,
        assignedAt: userProfile?.createdAt || new Date().toISOString(),
        assignedBy: 'System Environment',
        isSuperAdmin: true,
      });
    }

    // List all records from admin_roles
    for (const [userId, record] of Object.entries(store.admin_roles || {})) {
      if (userId === envSuperAdminId) continue;
      const userProfile = store.users?.[userId];
      rolesList.push({
        clerkUserId: userId,
        username: userProfile?.username || 'Unknown',
        email: userProfile?.email || '',
        role: record.role,
        permissions: record.permissions || DEFAULT_MODERATOR_PERMISSIONS,
        assignedAt: record.assignedAt,
        assignedBy: record.assignedBy,
        isSuperAdmin: record.role === 'SUPER_ADMIN',
      });
    }

    return NextResponse.json({
      success: true,
      roles: rolesList,
      availablePermissions: ALL_ADMIN_PERMISSIONS,
      defaultModeratorPermissions: DEFAULT_MODERATOR_PERMISSIONS,
    });
  } catch (error: any) {
    console.error('Error fetching admin roles:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list roles.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'roles.manage');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!auth.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Only Super Admins can assign or alter administrative roles.' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { targetUserId, permissions } = body;

  if (!targetUserId) {
    return NextResponse.json({ error: 'targetUserId is required.' }, { status: 400 });
  }

  const result = await assignModeratorRole({
    targetUserId,
    adminId: auth.user.userId,
    adminUsername: auth.user.username,
    permissions: permissions || DEFAULT_MODERATOR_PERMISSIONS,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: 'User promoted to Moderator successfully with specified permissions.',
    record: result.record,
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'roles.manage');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!auth.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Only Super Admins can demote moderators.' },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get('userId');

  if (!targetUserId) {
    return NextResponse.json({ error: 'userId query parameter is required.' }, { status: 400 });
  }

  const result = await demoteToNormalUser(
    targetUserId,
    auth.user.userId,
    auth.user.username
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: 'User demoted to Normal User successfully.',
  });
}

