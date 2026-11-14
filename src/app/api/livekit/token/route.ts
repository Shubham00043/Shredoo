import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getRoom, isMemberBlocked, getMember } from '@/lib/firestore';
import { createLiveKitToken } from '@/lib/livekit';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json().catch(() => ({}));

    const roomId = body.roomId;
    const userId = body.userId || user?.userId;
    const username = body.username || user?.username || 'Participant';

    if (!roomId || !userId) {
      return NextResponse.json({ error: 'roomId and userId are required' }, { status: 400 });
    }

    const room = await getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if blocked
    const blocked = await isMemberBlocked(roomId, userId);
    if (blocked) {
      return NextResponse.json(
        { error: 'You are blocked from accessing voice session in this room.' },
        { status: 403 }
      );
    }

    // Check membership
    const member = await getMember(roomId, userId);
    if (!member && room.hostId !== userId) {
      return NextResponse.json(
        { error: 'You must join the room before getting a voice token.' },
        { status: 403 }
      );
    }

    const token = await createLiveKitToken(roomId, userId, username);

    return NextResponse.json({
      token,
      url: process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || 'wss://shredoo-demo.livekit.cloud',
    });
  } catch (err: any) {
    console.error('Error in /api/livekit/token:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

