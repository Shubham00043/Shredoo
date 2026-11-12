import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyRoomModerator } from '@/lib/auth';
import { getRoom, getMember, removeMember, getMembers } from '@/lib/firestore';
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

    const { canModerate, error: permError } = await verifyRoomModerator(roomId, user.userId);
    if (!canModerate) {
      return NextResponse.json({ error: permError || 'Unauthorized: Only room owner or moderator can remove participants' }, { status: 403 });
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

    // Protect the room owner from being kicked
    if (room.hostId === targetUserId) {
      return NextResponse.json({ error: 'Cannot remove the room host/owner' }, { status: 400 });
    }

    const targetMember = await getMember(roomId, targetUserId);
    if (!targetMember) {
      return NextResponse.json({ error: 'Target user is not a member of this room' }, { status: 404 });
    }

    // 1. Remove member from Firestore collection
    await removeMember(roomId, targetUserId);

    // 2. Revoke active LiveKit access and disconnect voice session
    await removeLiveKitParticipant(roomId, targetUserId);

    // 3. Return updated member list
    const updatedMembers = await getMembers(roomId);

    return NextResponse.json({
      success: true,
      action: 'kick',
      removedUserId: targetUserId,
      removedUsername: targetMember.username,
      reason: reason || 'Removed by host',
      members: updatedMembers,
    });
  } catch (err: any) {
    console.error('Error in /api/rooms/[roomId]/kick:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

