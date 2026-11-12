import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, validateGmailUser } from '@/lib/auth';
import { reserveUsername, getUserProfile } from '@/lib/firestore';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const gmailCheck = validateGmailUser(authUser);
    if (!gmailCheck.authorized) {
      return NextResponse.json({ error: gmailCheck.error }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const username = (body.username || '').trim();

    if (!username) {
      return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
    }

    const result = await reserveUsername(authUser!.userId, username);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const profile = await getUserProfile(authUser!.userId);

    return NextResponse.json({
      success: true,
      username: result.username,
      normalizedUsername: result.normalizedUsername,
      profile,
    });
  } catch (err: any) {
    console.error('Error in /api/username/reserve:', err);
    return NextResponse.json({ error: err?.message || 'Failed to reserve username' }, { status: 500 });
  }
}

