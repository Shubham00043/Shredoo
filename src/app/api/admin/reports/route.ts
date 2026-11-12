import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin';
import { getStore } from '@/lib/firestore';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'reports.manage');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const store = getStore();
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status') || 'all';

    let reports = Object.values(store.moderation_reports || {});

    if (statusFilter !== 'all') {
      reports = reports.filter((r) => r.status === statusFilter);
    }

    // Sort newest first
    reports.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      reports,
      total: reports.length,
      pendingCount: Object.values(store.moderation_reports || {}).filter(
        (r) => r.status === 'pending'
      ).length,
    });
  } catch (error: any) {
    console.error('Error listing reports:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list reports.' },
      { status: 500 }
    );
  }
}

