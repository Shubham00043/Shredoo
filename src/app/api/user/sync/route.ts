import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, isGmailAddress } from '@/lib/auth';
import { syncUserProfile, getUserProfile } from '@/lib/firestore';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const body = await req.json().catch(() => ({}));

    const userId = body.userId || authUser?.userId;
    const email = (body.email || authUser?.email || '').trim().toLowerCase();
    const username = body.username || authUser?.username;
    const avatarUrl = body.avatarUrl || authUser?.avatarUrl;
    const emailVerified = body.emailVerified !== undefined ? body.emailVerified : (authUser?.isVerifiedGmail ?? false);

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Server-side Gmail domain validation (never trust frontend alone)
    if (email && !isGmailAddress(email)) {
      return NextResponse.json(
        {
          error: 'Only verified @gmail.com accounts are permitted to register on SHREDoo.',
          code: 'NON_GMAIL_ADDRESS',
        },
        { status: 403 }
      );
    }

    // Sync or retrieve profile (preserves existing data on subsequent logins)
    const profile = await syncUserProfile({
      userId,
      email,
      username,
      avatarUrl,
      emailVerified,
    });

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (err: any) {
    console.error('Error syncing user:', err);
    return NextResponse.json({ error: err?.message || 'Sync failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const profile = await getUserProfile(authUser.userId);
    return NextResponse.json({
      success: true,
      profile: profile || {
        userId: authUser.userId,
        username: authUser.username,
        avatarUrl: authUser.avatarUrl,
        email: authUser.email,
        hasCompletedOnboarding: false,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to get profile' }, { status: 500 });
  }
}

