import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAuthenticatedUser } from '@/lib/auth';
import { getRoom, getMember, isMemberBlocked, getRoomMusicLibrary } from '@/lib/firestore';

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

    // 1. Authenticate user
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 2. Validate room & membership
    const room = await getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if user is blocked
    const isBlocked = await isMemberBlocked(roomId, user.userId);
    if (isBlocked) {
      return NextResponse.json({ error: 'Access blocked in this room' }, { status: 403 });
    }

    // Validate membership
    const member = await getMember(roomId, user.userId);
    const isHost = room.hostId === user.userId;
    if (!member && !isHost) {
      return NextResponse.json(
        { error: 'Private room audio. Must be a member to stream.' },
        { status: 403 }
      );
    }

    // 3. Find track record in ROOM_MUSIC
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

    const stat = fs.statSync(targetFilePath);
    const fileSize = stat.size;
    const ext = path.extname(targetFilePath).toLowerCase();

    let mimeType = 'audio/mpeg';
    if (ext === '.wav') mimeType = 'audio/wav';
    else if (ext === '.ogg') mimeType = 'audio/ogg';
    else if (ext === '.m4a') mimeType = 'audio/mp4';

    // 4. Handle Range requests for smooth scrubbing/seeking
    const range = req.headers.get('range');
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(targetFilePath, { start, end });
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
      });

      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': mimeType,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      });
    }

    // Full audio stream
    const fileBuffer = fs.readFileSync(targetFilePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('Error in /api/rooms/[roomId]/music/stream:', err);
    return NextResponse.json({ error: err?.message || 'Streaming error' }, { status: 500 });
  }
}
