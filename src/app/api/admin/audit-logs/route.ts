import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, getAuditLogs } from '@/lib/admin';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit')) || 100;
    const logs = await getAuditLogs(limit);

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length,
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list audit logs.' },
      { status: 500 }
    );
  }
}

