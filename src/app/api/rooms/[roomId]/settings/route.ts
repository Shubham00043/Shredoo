import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyRoomOwner } from '@/lib/auth';
import { getRoom, updateRoom, regenerateRoomCode } from '@/lib/firestore';

export async function PATCH(
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
      return NextResponse.json({ error: 'Unauthorized: Only the room owner can update room settings' }, { status: 403 });
    }

    const body = await req.json();
    const updates: any = {};

    if (typeof body.name === 'string' && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (typeof body.description === 'string') {
      updates.description = body.description.trim();
    }
    if (typeof body.coverImage === 'string' && body.coverImage.trim()) {
      updates.coverImage = body.coverImage.trim();
    }
    if (typeof body.maxCapacity === 'number') {
      // Strict cap between 2 and 5
      updates.maxCapacity = Math.min(Math.max(body.maxCapacity, 2), 5);
    }
    if (typeof body.isClosed === 'boolean') {
      updates.isClosed = body.isClosed;
    }
    if (body.regenerateInviteCode) {
      // Atomically invalidate old code and reserve cryptographically secure unique room code & hash
      const { code, codeHash } = await regenerateRoomCode(roomId);
      updates.inviteCode = code;
      updates.inviteCodeHash = codeHash;
    }
    if (body.musicPermissions) {
      const { whoCanAdd, whoCanControl } = body.musicPermissions;
      const validOpts = ['everyone', 'host_only'];
      updates.musicPermissions = {
        whoCanAdd: validOpts.includes(whoCanAdd) ? whoCanAdd : 'everyone',
        whoCanControl: validOpts.includes(whoCanControl) ? whoCanControl : 'host_only',
      };
    }

    const updatedRoom = await updateRoom(roomId, updates);
    if (!updatedRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      room: updatedRoom,
    });
  } catch (err: any) {
    console.error('Error in /api/rooms/[roomId]/settings:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

