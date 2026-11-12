import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyRoomOwner } from '@/lib/auth';
import { getRoom, getMember, transferOwnership, getMembers } from '@/lib/firestore';

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
      return NextResponse.json({ error: 'Unauthorized: Only the current owner can transfer room ownership' }, { status: 403 });
    }

    const body = await req.json();
    const { newHostId } = body;

    if (!newHostId) {
      return NextResponse.json({ error: 'newHostId is required' }, { status: 400 });
    }

    if (newHostId === user.userId) {
      return NextResponse.json({ error: 'You are already the owner of this room' }, { status: 400 });
    }

    const targetMember = await getMember(roomId, newHostId);
    if (!targetMember) {
      return NextResponse.json({ error: 'Target user must be an active member of this room' }, { status: 404 });
    }

    // Execute transfer
    const result = await transferOwnership(roomId, targetMember.userId, targetMember.username);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to transfer ownership' }, { status: 400 });
    }

    const updatedRoom = await getRoom(roomId);
    const updatedMembers = await getMembers(roomId);

    return NextResponse.json({
      success: true,
      action: 'transfer_host',
      newHostId: targetMember.userId,
      newHostName: targetMember.username,
      room: updatedRoom,
      members: updatedMembers,
    });
  } catch (err: any) {
    console.error('Error in /api/rooms/[roomId]/transfer-host:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

