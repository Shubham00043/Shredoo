import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, updateReportStatus } from '@/lib/admin';
import { ReportStatus } from '@/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  const auth = await requireAdminAuth(req, 'reports.manage');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const { status, note } = body;

  if (!status || !['pending', 'under_review', 'resolved', 'dismissed'].includes(status)) {
    return NextResponse.json(
      { error: 'Invalid report status. Must be pending, under_review, resolved, or dismissed.' },
      { status: 400 }
    );
  }

  const result = await updateReportStatus({
    reportId,
    adminId: auth.user.userId,
    adminUsername: auth.user.username,
    status: status as ReportStatus,
    resolutionNote: note,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: `Report status updated to ${status}.`,
    report: result.report,
  });
}

