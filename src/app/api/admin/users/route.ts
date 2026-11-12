import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin';
import { getStore } from '@/lib/firestore';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'users.read');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const store = getStore();
    const url = new URL(req.url);
    const search = (url.searchParams.get('q') || '').toLowerCase().trim();
    const statusFilter = url.searchParams.get('status') || 'all';

    const usersList: any[] = [];
    const rooms = Object.values(store.rooms || {});

    for (const [userId, userProfile] of Object.entries(store.users || {})) {
      const restriction = store.user_restrictions?.[userId];
      const roleRecord = store.admin_roles?.[userId];
      const isSuperAdminEnv = process.env.SUPER_ADMIN_CLERK_ID === userId;

      let role = 'NORMAL_USER';
      if (isSuperAdminEnv || roleRecord?.role === 'SUPER_ADMIN') {
        role = 'SUPER_ADMIN';
      } else if (roleRecord?.role === 'MODERATOR') {
        role = 'MODERATOR';
      }

      // Determine active status
      let status = 'active';
      const rList = store.user_restrictions?.[userId];
      const activeRestriction = Array.isArray(rList)
        ? rList.find((x) => x.isActive)
        : rList;

      if (activeRestriction && activeRestriction.isActive) {
        if (activeRestriction.restrictionType === 'banned') status = 'banned';
        else if (activeRestriction.restrictionType === 'blocked') status = 'blocked';
        else if (activeRestriction.restrictionType === 'suspended') {
          if (!activeRestriction.expiresAt || new Date(activeRestriction.expiresAt) > new Date()) {
            status = 'suspended';
          }
        }
      }

      // Count owned rooms
      const roomsCreated = rooms.filter((r) => r.hostId === userId).length;

      // Filter by status
      if (statusFilter !== 'all' && status !== statusFilter) {
        continue;
      }

      // Search match (username, email, userId)
      if (search) {
        const matchUsername = userProfile.username?.toLowerCase().includes(search);
        const matchEmail = userProfile.email?.toLowerCase().includes(search);
        const matchId = userId.toLowerCase().includes(search);
        if (!matchUsername && !matchEmail && !matchId) {
          continue;
        }
      }

      usersList.push({
        userId,
        username: userProfile.username || 'Anonymous',
        email: userProfile.email || '',
        avatar: userProfile.avatarUrl || '',
        createdAt: userProfile.createdAt || new Date().toISOString(),
        role,
        status,
        roomsCreated,
        restriction: activeRestriction && activeRestriction.isActive ? activeRestriction : null,
      });
    }

    // Sort newest first
    usersList.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      users: usersList,
      total: usersList.length,
    });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list users.' },
      { status: 500 }
    );
  }
}
