import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAuthenticatedUser } from '@/lib/auth';
import { getRoom, getMember, addMember, isMemberBlocked, getRoomMusicLibrary } from '@/lib/firestore';

function getRoomStorageBaseDir(): string {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), 'shredoo_storage');
  }
  return path.join(process.cwd(), 'public', 'storage');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string; trackId: string }> }
) {
  try {
    const { roomId, trackId } = await params;

    const queryUserId = req.nextUrl.searchParams.get('userId');
    const authUser = await getAuthenticatedUser(req);
    const effectiveUserId = authUser?.userId || queryUserId;
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const room = await getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isBlocked = await isMemberBlocked(roomId, effectiveUserId);
    if (isBlocked) {
      return NextResponse.json({ error: 'Access blocked in this room' }, { status: 403 });
    }

    let member = await getMember(roomId, effectiveUserId);
    const isHost = room.hostId === effectiveUserId;
    if (!member && !isHost) {
      member = await addMember({
        roomId,
        userId: effectiveUserId,
        username: authUser?.username || 'Room Listener',
        userAvatar: authUser?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${effectiveUserId}`,
        role: 'member',
        joinedAt: new Date().toISOString(),
        status: 'connected',
      });
    }

    const library = await getRoomMusicLibrary(roomId);
    const track = library.find((t) => t.trackId === trackId);

    // Locate physical file on disk
    const baseStorage = getRoomStorageBaseDir();
    let targetFilePath: string | null = null;

    if (track?.storagePath) {
      const candidate = path.join(baseStorage, track.storagePath);
      if (fs.existsSync(candidate)) {
        targetFilePath = candidate;
      }
    }

    // Fallback: check audio folder in trackId
    if (!targetFilePath) {
      const audioFolder = path.join(baseStorage, 'rooms', roomId, 'music', trackId, 'audio');
      if (fs.existsSync(audioFolder)) {
        const files = fs.readdirSync(audioFolder);
        if (files.length > 0) {
          targetFilePath = path.join(audioFolder, files[0]);
        }
      }
    }

    // Fallback: check public uploads
    if (!targetFilePath) {
      const publicUploads = path.join(process.cwd(), 'public', 'uploads');
      if (fs.existsSync(publicUploads)) {
        const files = fs.readdirSync(publicUploads);
        const match = files.find((f) => f.includes(trackId));
        if (match) targetFilePath = path.join(publicUploads, match);
      }
    }

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
      return NextResponse.json({ error: 'Audio file not found on server' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(targetFilePath);
    const fileSize = fileBuffer.length;
    const ext = path.extname(targetFilePath).toLowerCase();

    let mimeType = 'audio/mpeg';
    if (ext === '.wav') mimeType = 'audio/wav';
    else if (ext === '.ogg') mimeType = 'audio/ogg';
    else if (ext === '.m4a') mimeType = 'audio/mp4';

    // Handle HTTP 206 Range requests for smooth continuous streaming and scrubbing
    const range = req.headers.get('range');
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const rawEnd = parts[1] ? parseInt(parts[1], 10) : NaN;
      const end = !isNaN(rawEnd) && rawEnd < fileSize ? rawEnd : fileSize - 1;

      if (!isNaN(start) && start < fileSize && start <= end) {
        const slice = fileBuffer.subarray(start, end + 1);

        return new NextResponse(slice, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': slice.length.toString(),
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // Full audio stream
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('Error in /api/rooms/[roomId]/music/stream:', err);
    return NextResponse.json({ error: err?.message || 'Streaming error' }, { status: 500 });
  }
}

