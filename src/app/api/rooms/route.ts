import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserRooms, sanitizeRoomForPublic } from '@/lib/firestore';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.userId) {
      // Unauthenticated users see 0 private rooms
      return NextResponse.json({ owned: [], joined: [], rooms: [] });
    }

    const { owned, joined } = await getUserRooms(user.userId);

    // Sanitize rooms: Never expose invitation codes in public listings or to non-hosts
    const sanitizedJoined = joined.map((r) => sanitizeRoomForPublic(r, user.userId));
    const sanitizedRooms = [
      ...owned,
      ...sanitizedJoined,
    ];

    return NextResponse.json({
      owned,
      joined: sanitizedJoined,
      rooms: sanitizedRooms,
    });
  } catch (err: any) {
    console.error('Error listing rooms:', err);
    return NextResponse.json({ error: 'Failed to list rooms' }, { status: 500 });
  }
}
