import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, validateActiveUser } from '@/lib/auth';
import { createRoom, reserveUniqueRoomCode } from '@/lib/firestore';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const accessCheck = validateActiveUser(user);
    if (!accessCheck.authorized) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    const body = await req.json().catch(() => ({}));

    const roomId = 'room-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    
    // Atomically reserve cryptographically secure unique room code & hash
    const { code: inviteCode, codeHash: inviteCodeHash } = await reserveUniqueRoomCode(roomId);

    const name = body.name?.trim() || 'Audiophile Listening Den';
    const description = body.description?.trim() || 'Private collaborative music listening and high-fidelity shred sessions.';
    const coverImage = body.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80';
    const maxCapacity = Math.min(Math.max(body.maxCapacity || 5, 2), 5); // strict max 5

    const room = await createRoom({
      id: roomId,
      name,
      description,
      coverImage,
      hostId: user!.userId,
      hostName: user!.username,
      hostAvatar: user!.avatarUrl,
      inviteCode,
      inviteCodeHash,
      maxCapacity,
      isClosed: false,
      musicPermissions: {
        whoCanAdd: body.whoCanAdd || 'everyone',
        whoCanControl: body.whoCanControl || 'host_only',
      },
    });

    return NextResponse.json({
      success: true,
      room,
    });
  } catch (err: any) {
    console.error('Error in /api/rooms/create:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
