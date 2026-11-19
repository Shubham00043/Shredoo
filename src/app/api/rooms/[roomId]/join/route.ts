import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, validateActiveUser } from '@/lib/auth';
import {
  getRoom,
  getMembers,
  isMemberBlocked,
  addMember,
  getMember,
  validateRoomInviteCode,
} from '@/lib/firestore';
import { createLiveKitToken } from '@/lib/livekit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const authUser = await getAuthenticatedUser(req);
    const body = await req.json().catch(() => ({}));

    // Server-side authentication and active user status validation
    const accessCheck = validateActiveUser(authUser);
    if (!accessCheck.authorized) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    const userId = body.userId || authUser?.userId;
    const username = body.username || authUser?.username || 'Guest';
    const userAvatar = body.userAvatar || authUser?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;
    const inviteCode = (body.inviteCode || '').trim();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const room = await getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // 1. Check if participant is explicitly blocked
    const isBlocked = await isMemberBlocked(roomId, userId);
    if (isBlocked) {
      return NextResponse.json(
        {
          error: 'You are blocked from accessing this room. Only the host can unblock you.',
          blocked: true,
        },
        { status: 403 }
      );
    }

    // Direct room entry allowed for all authenticated users
    const isHost = room.hostId === userId;

    // 4. Strict Room Capacity (maximum 5 participants)
    const currentMembers = await getMembers(roomId);
    const existingMember = await getMember(roomId, userId);

    if (!existingMember && currentMembers.length >= (room.maxCapacity || 5)) {
      return NextResponse.json(
        {
          error: `Room is at full capacity (${currentMembers.length}/${room.maxCapacity || 5} participants max). Access denied.`,
        },
        { status: 403 }
      );
    }

    // 5. Add or reactivate membership
    const memberRole = isHost ? 'owner' : (existingMember?.role || 'member');
    const member = await addMember({
      roomId,
      userId,
      username,
      userAvatar,
      role: memberRole,
      joinedAt: existingMember?.joinedAt || new Date().toISOString(),
      status: 'connected',
    });

    // 6. Generate LiveKit token for audio room
    const livekitToken = await createLiveKitToken(roomId, userId, username);

    const updatedMembers = await getMembers(roomId);

    return NextResponse.json({
      success: true,
      room,
      member,
      livekitToken,
      members: updatedMembers,
    });
  } catch (err: any) {
    console.error('Error in /api/rooms/[roomId]/join:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

