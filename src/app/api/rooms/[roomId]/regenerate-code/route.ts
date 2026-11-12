import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyRoomOwner } from '@/lib/auth';
import { regenerateRoomCode, getRoom } from '@/lib/firestore';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { isOwner } = await verifyRoomOwner(roomId, user.userId);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Unauthorized: Only the room owner can regenerate the invitation code.' },
        { status: 403 }
      );
    }

    const room = await getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Atomically invalidates previous invitation code and generates a new cryptographic unique code
    const { code: newCode, codeHash: newCodeHash } = await regenerateRoomCode(roomId);

    return NextResponse.json({
      success: true,
      roomId,
      inviteCode: newCode,
      inviteCodeHash: newCodeHash,
      message: 'Invitation code successfully regenerated. Previous code is now invalid.',
    });
  } catch (err: any) {
    console.error('Error regenerating room code:', err);
    return NextResponse.json({ error: err?.message || 'Failed to regenerate code' }, { status: 500 });
  }
}

