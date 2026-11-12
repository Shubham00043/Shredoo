import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyRoomOwner } from '@/lib/auth';
import { getRoom, getMember, blockMember, getBlockedMembers, getMembers } from '@/lib/firestore';
import { removeLiveKitParticipant } from '@/lib/livekit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const { isOwner } = await verifyRoomOwner(roomId, user.userId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized: Only the room owner can block participants' }, { status: 403 });
    }

    const body = await req.json();
    const { userId: targetUserId, reason } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    const room = await getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Host cannot block themselves
    if (room.hostId === targetUserId) {
      return NextResponse.json({ error: 'Cannot block the room host/owner' }, { status: 400 });
    }

    const targetMember = await getMember(roomId, targetUserId);
    const targetUsername = targetMember?.username || body.username || 'Participant';
    const targetAvatar = targetMember?.userAvatar || body.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUserId}`;

    // 1. Add to ROOM_BLOCKED_MEMBERS collection in Firestore
    const blockedRecord = await blockMember({
      roomId,
      userId: targetUserId,
      username: targetUsername,
      userAvatar: targetAvatar,
      blockedBy: user.userId,
      blockedByName: user.username,
      reason: reason || 'Blocked by room host',
    });

    // 2. Revoke active LiveKit voice access
    await removeLiveKitParticipant(roomId, targetUserId);

    // 3. Return updated members & blocked list
    const updatedMembers = await getMembers(roomId);
    const blockedMembers = await getBlockedMembers(roomId);

    return NextResponse.json({
      success: true,
      action: 'block',
      blockedRecord,
      members: updatedMembers,
      blockedMembers,
    });
  } catch (err: any) {
    console.error('Error in /api/rooms/[roomId]/block:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

