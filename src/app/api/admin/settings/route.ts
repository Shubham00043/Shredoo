import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, getPlatformSettings, updatePlatformSettings } from '@/lib/admin';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'platform.settings');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const settings = await getPlatformSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Error fetching platform settings:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to get platform settings.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'platform.settings');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!auth.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Only Super Admins can modify platform settings.' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { settings, reason } = body;

  if (!settings || typeof settings !== 'object') {
    return NextResponse.json({ error: 'Settings object is required.' }, { status: 400 });
  }

  try {
    const result = await updatePlatformSettings({
      adminId: auth.user.userId,
      adminUsername: auth.user.username,
      settings,
      reason: reason || 'Settings updated via Super Admin dashboard.',
    });

    return NextResponse.json({
      success: true,
      message: 'Platform settings updated successfully.',
      settings: result.settings,
    });
  } catch (error: any) {
    console.error('Error updating platform settings:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update platform settings.' },
      { status: 500 }
    );
  }
}

