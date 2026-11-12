import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyRoomOwner } from '@/lib/auth';
import { unblockMember, getBlockedMembers } from '@/lib/firestore';

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
      return NextResponse.json({ error: 'Unauthorized: Only the room owner can unblock participants' }, { status: 403 });
    }

    const body = await req.json();
    const { userId: targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    const unblocked = await unblockMember(roomId, targetUserId);
    const updatedBlocked = await getBlockedMembers(roomId);

    return NextResponse.json({
      success: true,
      action: 'unblock',
      unblockedUserId: targetUserId,
      unblocked,
      blockedMembers: updatedBlocked,
    });
  } catch (err: any) {
    console.error('Error in /api/rooms/[roomId]/unblock:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

