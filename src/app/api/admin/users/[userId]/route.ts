import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, deleteUserAccount } from '@/lib/admin';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const auth = await requireAdminAuth(req, 'users.delete');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Double check Super Admin status for deletion
  if (!auth.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Only the Super Admin can permanently delete user accounts.' },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const reason = url.searchParams.get('reason') || 'Account deleted by Super Admin.';

  const result = await deleteUserAccount(
    userId,
    auth.user.userId,
    auth.user.username,
    reason
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: 'User account and associated data deleted permanently.',
  });
}

