import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, validateGmailUser } from '@/lib/auth';
import { createReport } from '@/lib/admin';
import { ReportReason } from '@/types';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'You must be signed in to submit a report.' },
      { status: 401 }
    );
  }

  const gmailCheck = validateGmailUser(user);
  if (!gmailCheck.authorized) {
    return NextResponse.json({ error: gmailCheck.error }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { targetUserId, targetUsername, roomId, roomName, reason, details } = body;

  if (!reason || !details) {
    return NextResponse.json(
      { error: 'Both reason and details are required to submit a report.' },
      { status: 400 }
    );
  }

  if (!targetUserId && !roomId) {
    return NextResponse.json(
      { error: 'You must specify either a target user or a target room to report.' },
      { status: 400 }
    );
  }

  try {
    const report = await createReport({
      reportedBy: user.userId,
      reportedByName: user.username,
      targetUserId,
      targetUsername,
      roomId,
      roomName,
      reason: reason as ReportReason,
      details: String(details).trim(),
    });

    return NextResponse.json({
      success: true,
      message: 'Your report has been submitted to the moderation team.',
      reportId: report.reportId,
    });
  } catch (error: any) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to submit report.' },
      { status: 500 }
    );
  }
}

