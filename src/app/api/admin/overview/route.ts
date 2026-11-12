import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, getPlatformOverviewStats } from '@/lib/admin';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'analytics.read');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const stats = await getPlatformOverviewStats();
    return NextResponse.json({
      success: true,
      stats,
      currentAdmin: {
        userId: auth.user.userId,
        email: auth.user.email,
        username: auth.user.username,
        role: auth.role,
        isSuperAdmin: auth.isSuperAdmin,
        permissions: auth.permissions,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin overview:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load platform analytics.' },
      { status: 500 }
    );
  }
}

