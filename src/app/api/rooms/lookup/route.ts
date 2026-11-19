import { NextRequest, NextResponse } from 'next/server';
import { findRoomByCode } from '@/lib/firestore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code') || '';
    const clean = code.trim().toUpperCase();

    if (!clean) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const room = await findRoomByCode(clean);
    if (!room) {
      return NextResponse.json(
        {
          found: false,
          error: `No active listening room found for code "${clean}". Please verify with the room host.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      found: true,
      roomId: room.id,
      roomName: room.name,
      hostName: room.hostName,
      isClosed: room.isClosed,
    });
  } catch (err: any) {
    console.error('Error looking up room by code:', err);
    return NextResponse.json({ error: 'Failed to lookup room' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = (body.code || '').trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const room = await findRoomByCode(code);
    if (!room) {
      return NextResponse.json(
        {
          found: false,
          error: `No active listening room found for code "${code}". Please verify with the room host.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      found: true,
      roomId: room.id,
      roomName: room.name,
      hostName: room.hostName,
      isClosed: room.isClosed,
    });
  } catch (err: any) {
    console.error('Error looking up room by code:', err);
    return NextResponse.json({ error: 'Failed to lookup room' }, { status: 500 });
  }
}
