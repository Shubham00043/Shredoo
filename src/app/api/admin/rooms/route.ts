import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin';
import { getStore } from '@/lib/firestore';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, 'rooms.read');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const store = getStore();
    const url = new URL(req.url);
    const search = (url.searchParams.get('q') || '').toLowerCase().trim();
    const statusFilter = url.searchParams.get('status') || 'all';

    const roomsList: any[] = [];

    for (const [roomId, room] of Object.entries(store.rooms || {})) {
      const owner = store.users?.[room.hostId];
      const roomMembers = store.members?.[roomId] || [];
      const memberCount = roomMembers.length;

      // Status: active, closed, or inactive
      const isClosed = room.isClosed || (room as any).status === 'closed';
      const status = isClosed ? 'closed' : 'active';

      if (statusFilter !== 'all' && status !== statusFilter) {
        continue;
      }

      if (search) {
        const matchName = room.name?.toLowerCase().includes(search);
        const matchOwner = (room.hostName || owner?.username)?.toLowerCase().includes(search);
        const matchId = roomId.toLowerCase().includes(search);
        if (!matchName && !matchOwner && !matchId) {
          continue;
        }
      }

      // Security requirement: Never expose plaintext invitation code
      const codeStatus = room.inviteCodeHash
        ? 'Active (Protected Hash)'
        : room.inviteCode
        ? `${room.inviteCode.slice(0, 3)}•••• (Masked)`
        : 'None';

      roomsList.push({
        id: roomId,
        name: room.name || 'Untitled Room',
        ownerId: room.hostId,
        ownerUsername: room.hostName || owner?.username || 'Unknown Host',
        ownerEmail: owner?.email || '',
        participantCount: memberCount,
        maxParticipants: room.maxCapacity || 5,
        status,
        codeStatus,
        createdAt: room.createdAt || new Date().toISOString(),
        currentTrack: room.currentSong
          ? {
              id: room.currentSong.trackId,
              title: room.currentSong.title,
              artist: room.currentSong.artist,
            }
          : null,
        members: roomMembers.map((m) => ({
          userId: m.userId,
          username: m.username,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
      });
    }

    roomsList.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      rooms: roomsList,
      total: roomsList.length,
    });
  } catch (error: any) {
    console.error('Error fetching admin rooms:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list rooms.' },
      { status: 500 }
    );
  }
}
