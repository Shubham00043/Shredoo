import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAuthenticatedUser, verifyRoomModerator } from '@/lib/auth';
import { getRoom, getMember, getRoomMusicLibrary, removeTrackFromRoomMusic } from '@/lib/firestore';

function getRoomStorageBaseDir(): string {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), 'shredoo_storage');
  }
  return path.join(process.cwd(), 'public', 'storage');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const room = await getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const member = await getMember(roomId, user.userId);
    const isHost = room.hostId === user.userId;
    if (!member && !isHost) {
      return NextResponse.json({ error: 'Must be a member of this room' }, { status: 403 });
    }

    const url = new URL(req.url);
    const myUploadsOnly = url.searchParams.get('myUploads') === 'true';
    const searchQuery = (url.searchParams.get('q') || '').trim().toLowerCase();

    let tracks = await getRoomMusicLibrary(roomId);

    if (myUploadsOnly) {
      tracks = tracks.filter((t) => t.uploadedBy === user.userId);
    }

    if (searchQuery) {
      tracks = tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery) ||
          t.artist.toLowerCase().includes(searchQuery) ||
          t.uploadedByUsername.toLowerCase().includes(searchQuery)
      );
    }

    return NextResponse.json({
      success: true,
      roomId,
      totalCount: tracks.length,
      tracks,
    });
  } catch (err: any) {
    console.error('Error in GET /api/rooms/[roomId]/music/library:', err);
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const room = await getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const url = new URL(req.url);
    const trackId = url.searchParams.get('trackId');
    if (!trackId) {
      return NextResponse.json({ error: 'trackId query parameter required' }, { status: 400 });
    }

    const library = await getRoomMusicLibrary(roomId);
    const track = library.find((t) => t.trackId === trackId);
    if (!track) {
      return NextResponse.json({ error: 'Track not found in room library' }, { status: 404 });
    }

    // Permission check: Host, room moderator, or track uploader can delete
    const isHost = room.hostId === user.userId;
    const isUploader = track.uploadedBy === user.userId;
    const { canModerate } = await verifyRoomModerator(roomId, user.userId);

    if (!isHost && !isUploader && !canModerate) {
      return NextResponse.json(
        { error: 'Unauthorized to remove this track. Only host or uploader can delete.' },
        { status: 403 }
      );
    }

    const { removedTrack } = await removeTrackFromRoomMusic(roomId, trackId);

    if (removedTrack?.storagePath) {
      try {
        const baseStorage = getRoomStorageBaseDir();
        const fullPath = path.join(baseStorage, removedTrack.storagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        const trackDir = path.dirname(fullPath);
        if (fs.existsSync(trackDir)) {
          fs.rmdirSync(trackDir, { recursive: true });
        }
      } catch (cleanErr) {
        console.warn('Could not delete audio file from disk:', cleanErr);
      }
    }

    const updatedLibrary = await getRoomMusicLibrary(roomId);

    return NextResponse.json({
      success: true,
      message: `Track "${track.title}" removed from room library.`,
      tracks: updatedLibrary,
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/rooms/[roomId]/music/library:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

