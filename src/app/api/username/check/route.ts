import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { checkUsernameAvailability } from '@/lib/firestore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username') || '';
    const authUser = await getAuthenticatedUser(req);

    const result = await checkUsernameAvailability(username, authUser?.userId);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in /api/username/check:', err);
    return NextResponse.json({ error: err?.message || 'Check failed' }, { status: 500 });
  }
}

