import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, restrictUser, restoreUserAccount } from '@/lib/admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, type, reason, durationDays } = body;

  if (action === 'restore') {
    const auth = await requireAdminAuth(req, 'users.suspend');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await restoreUserAccount(
      userId,
      auth.user.userId,
      auth.user.username,
      reason || 'Account restored by administrator.'
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'User account restored successfully.' });
  }

  // Restricting user (blocked, suspended, banned)
  const requiredPermission = type === 'suspended' ? 'users.suspend' : 'users.block';
  const auth = await requireAdminAuth(req, requiredPermission);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return NextResponse.json(
      { error: 'A valid moderation reason of at least 3 characters is required.' },
      { status: 400 }
    );
  }

  if (!['blocked', 'suspended', 'banned'].includes(type)) {
    return NextResponse.json(
      { error: 'Invalid restriction type. Must be blocked, suspended, or banned.' },
      { status: 400 }
    );
  }

  let expiresAt: string | undefined;
  if (type === 'suspended') {
    const days = Number(durationDays) || 7;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    expiresAt = expiry.toISOString();
  }

  const result = await restrictUser({
    targetUserId: userId,
    adminId: auth.user.userId,
    adminUsername: auth.user.username,
    type,
    reason: reason.trim(),
    expiresAt,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: `User ${type} successfully. Active sessions and voice connections terminated.`,
    restriction: result.restriction,
  });
}

