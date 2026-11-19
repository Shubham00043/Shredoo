import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyRoomOwner } from '@/lib/auth';
import {
  getRoom,
  getMembers,
  getBlockedMembers,
  isMemberBlocked,
  getPlaylist,
  deleteRoom,
  getMember,
  sanitizeRoomForPublic,
} from '@/lib/firestore';
import { deleteLiveKitRoom } from '@/lib/livekit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const user = await getAuthenticatedUser(req);
    const room = await getRoom(roomId);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const members = await getMembers(roomId);
    const playlist = await getPlaylist(roomId);

    const callerUserId = user?.userId || '';
    const currentMember = await getMember(roomId, callerUserId);
    const isOwner = room.hostId === callerUserId || currentMember?.role === 'owner';
    const isModerator = currentMember?.role === 'moderator';
    const isBlocked = await isMemberBlocked(roomId, callerUserId);

    let blockedMembersList = undefined;
    if (isOwner || isModerator) {
      blockedMembersList = await getBlockedMembers(roomId);
    }

    const responseRoom = isOwner ? room : sanitizeRoomForPublic(room, callerUserId);

    return NextResponse.json({
      room: responseRoom,
      members,
      playlist,
      currentUserRole: currentMember?.role || (isOwner ? 'owner' : null),
      isCurrentUserMember: !!currentMember || isOwner,
      isCurrentUserBlocked: isBlocked,
      blockedMembers: blockedMembersList,
    });
  } catch (err: any) {
    console.error('Error in GET /api/rooms/[roomId]:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
      return NextResponse.json({ error: 'Unauthorized: Only the room owner can delete the room' }, { status: 403 });
    }

    // 1. Delete LiveKit room
    await deleteLiveKitRoom(roomId);

    // 2. Delete room from Firestore
    await deleteRoom(roomId);

    return NextResponse.json({
      success: true,
      message: 'Room deleted successfully',
      deletedRoomId: roomId,
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/rooms/[roomId]:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

