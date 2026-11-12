import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminAuth,
  adminCloseRoom,
  adminReopenRoom,
  adminDeleteRoom,
  adminRemoveParticipant,
  adminRevokeRoomCode,
} from '@/lib/admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, reason, targetUserId } = body;

  if (!action) {
    return NextResponse.json({ error: 'Action parameter is required.' }, { status: 400 });
  }

  // 1. Close Room
  if (action === 'close') {
    const auth = await requireAdminAuth(req, 'rooms.close');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await adminCloseRoom(
      roomId,
      auth.user.userId,
      auth.user.username,
      reason || 'Room closed by administrator.'
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Room closed successfully and active LiveKit room terminated.',
    });
  }

  // 2. Reopen Room
  if (action === 'reopen') {
    const auth = await requireAdminAuth(req, 'rooms.close');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await adminReopenRoom(
      roomId,
      auth.user.userId,
      auth.user.username,
      reason || 'Room reopened by administrator.'
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Room reopened successfully.',
    });
  }

  // 3. Delete Room
  if (action === 'delete') {
    const auth = await requireAdminAuth(req, 'rooms.delete');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await adminDeleteRoom(
      roomId,
      auth.user.userId,
      auth.user.username,
      reason || 'Room permanently deleted by administrator.'
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Room deleted permanently.',
    });
  }

  // 4. Revoke / Invalidate Invitation Code
  if (action === 'revoke_code') {
    const auth = await requireAdminAuth(req, 'rooms.close');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await adminRevokeRoomCode(
      roomId,
      auth.user.userId,
      auth.user.username,
      reason || 'Invitation code revoked by administrator.'
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Room invitation code regenerated and previous code invalidated.',
    });
  }

  // 5. Remove Participant from Room
  if (action === 'remove_participant') {
    const auth = await requireAdminAuth(req, 'rooms.remove_members');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'targetUserId is required to remove a participant.' },
        { status: 400 }
      );
    }

    const result = await adminRemoveParticipant(
      roomId,
      targetUserId,
      auth.user.userId,
      auth.user.username,
      reason || 'Participant removed by administrator.'
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Participant removed and voice connection severed.',
    });
  }

  return NextResponse.json({ error: `Unknown room action "${action}".` }, { status: 400 });
}

