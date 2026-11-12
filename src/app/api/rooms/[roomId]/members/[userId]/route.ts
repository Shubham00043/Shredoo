import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyRoomModerator } from '@/lib/auth';
import { getRoom, getMember, removeMember, getMembers } from '@/lib/firestore';
import { removeLiveKitParticipant } from '@/lib/livekit';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string; userId: string }> }
) {
  try {
    const { roomId, userId: targetUserId } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const { canModerate, error: permError } = await verifyRoomModerator(roomId, user.userId);
    if (!canModerate) {
      return NextResponse.json({ error: permError || 'Unauthorized: Only room owner or moderator can remove participants' }, { status: 403 });
    }

    const room = await getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.hostId === targetUserId) {
      return NextResponse.json({ error: 'Cannot remove the room host/owner' }, { status: 400 });
    }

    const targetMember = await getMember(roomId, targetUserId);
    if (!targetMember) {
      return NextResponse.json({ error: 'Target user is not a member of this room' }, { status: 404 });
    }

    await removeMember(roomId, targetUserId);
    await removeLiveKitParticipant(roomId, targetUserId);

    const updatedMembers = await getMembers(roomId);

    return NextResponse.json({
      success: true,
      removedUserId: targetUserId,
      members: updatedMembers,
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/rooms/[roomId]/members/[userId]:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

