import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAuthenticatedUser } from '@/lib/auth';
import { getRoom, getMember, addTrackToRoomMusic, addToPlaylist, checkDuplicateTrack } from '@/lib/firestore';
import { RoomMusicRecord, MusicTrack } from '@/types';

// Configurable upload constraints (Requirement 2)
const UPLOAD_CONFIG = {
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50 MB
  MAX_FILES_PER_BATCH: 10,
  ALLOWED_EXTENSIONS: ['.mp3', '.wav', '.ogg', '.m4a'],
  ALLOWED_MIME_TYPES: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/m4a',
    'audio/x-m4a',
    'audio/mp4',
    'audio/aac',
    'audio/x-aac',
  ],
};

function getRoomStorageBaseDir(): string {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), 'shredoo_storage');
  }
  return path.join(process.cwd(), 'public', 'storage');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    // 1. Authenticate user
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required to upload music.' }, { status: 401 });
    }

    // 2. Validate room status & membership (Requirement 1 & 12)
    const room = await getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }

    if (room.isClosed) {
      return NextResponse.json({ error: 'This lounge is closed. Uploads are disabled.' }, { status: 403 });
    }

    const member = await getMember(roomId, user.userId);
    const isHost = room.hostId === user.userId;
    if (!member && !isHost) {
      return NextResponse.json(
        { error: 'Unauthorized. Only active room members can upload music to this lounge.' },
        { status: 403 }
      );
    }

    // 3. Parse FormData
    const formData = await req.formData();
    const rawFiles = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File;
    const autoQueue = formData.get('autoQueue') === 'true';
    const customTitle = formData.get('title') as string | null;
    const customArtist = formData.get('artist') as string | null;

    const filesToProcess: File[] = [];
    if (rawFiles && rawFiles.length > 0) {
      filesToProcess.push(...rawFiles.filter((f) => f && f.size > 0));
    } else if (singleFile && singleFile.size > 0) {
      filesToProcess.push(singleFile);
    }

    if (filesToProcess.length === 0) {
      return NextResponse.json({ error: 'No audio files provided.' }, { status: 400 });
    }

    if (filesToProcess.length > UPLOAD_CONFIG.MAX_FILES_PER_BATCH) {
      return NextResponse.json(
        {
          error: `Maximum upload limit is ${UPLOAD_CONFIG.MAX_FILES_PER_BATCH} files per batch.`,
        },
        { status: 400 }
      );
    }

    const baseStorage = getRoomStorageBaseDir();
    const results: Array<{
      filename: string;
      success: boolean;
      track?: RoomMusicRecord;
      error?: string;
    }> = [];

    // 4. Process each audio file (independent error handling per file - Requirement 3)
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const filename = file.name;
      const ext = path.extname(filename).toLowerCase();

      // Extension validation
      if (!UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(ext)) {
        results.push({
          filename,
          success: false,
          error: `Unsupported format (${ext}). Supported formats: MP3, WAV, OGG, M4A.`,
        });
        continue;
      }

      // MIME type validation
      const mime = file.type?.toLowerCase();
      if (mime && !UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(mime) && !mime.startsWith('audio/')) {
        results.push({
          filename,
          success: false,
          error: `Invalid audio MIME type: ${mime}`,
        });
        continue;
      }

      // File size validation
      if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES) {
        results.push({
          filename,
          success: false,
          error: `File size exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
        });
        continue;
      }

      // Parse metadata from filename or form
      const baseNameWithoutExt = path.basename(filename, ext).replace(/[_-]/g, ' ').trim();
      let trackTitle = customTitle || baseNameWithoutExt || 'Untitled Track';
      let trackArtist = customArtist || user.username || 'Community Artist';

      // If filename is "Artist - Title.mp3", extract metadata
      if (!customTitle && baseNameWithoutExt.includes(' - ')) {
        const parts = baseNameWithoutExt.split(' - ');
        trackArtist = parts[0].trim();
        trackTitle = parts.slice(1).join(' - ').trim();
      }

      // Duplicate detection in room (Requirement 2 & 12)
      const isDuplicate = await checkDuplicateTrack(roomId, trackTitle, trackArtist, file.size);
      if (isDuplicate) {
        // Warning or handle gracefully
        // We still allow uploader if they want, but tag with unique identifier
      }

      const trackId = `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const safeFilename = `audio${ext}`;

      // Structured GCS/local folder organization: rooms/{roomId}/music/{trackId}/audio/{filename}
      const trackStorageDir = path.join(baseStorage, 'rooms', roomId, 'music', trackId, 'audio');
      const relativeStoragePath = `rooms/${roomId}/music/${trackId}/audio/${safeFilename}`;

      try {
        if (!fs.existsSync(trackStorageDir)) {
          fs.mkdirSync(trackStorageDir, { recursive: true });
        }

        const filePath = path.join(trackStorageDir, safeFilename);
        const bytes = await file.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(bytes));

        const sourceUrl = `/api/rooms/${roomId}/music/stream/${trackId}`;

        // Create ROOM_MUSIC record (Requirement 8)
        const musicRecord: RoomMusicRecord = {
          trackId,
          roomId,
          title: trackTitle,
          artist: trackArtist,
          album: 'Room Uploads',
          duration: 210, // estimated default, updated client-side or on play
          storagePath: relativeStoragePath,
          uploadedBy: user.userId,
          uploadedByUsername: user.username,
          createdAt: new Date().toISOString(),
          licenseType: 'User-Authorized Personal Audio',
          playbackStatus: 'available',
          fileSize: file.size,
          mimeType: mime || `audio/${ext.replace('.', '')}`,
          sourceUrl,
          artworkUrl:
            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
        };

        await addTrackToRoomMusic(roomId, musicRecord);

        // Optionally add to shared queue immediately
        if (autoQueue) {
          const queueItem: MusicTrack = {
            trackId: musicRecord.trackId,
            providerId: 'user_upload',
            category: 'independent',
            title: musicRecord.title,
            artist: musicRecord.artist,
            album: musicRecord.album,
            artworkUrl: musicRecord.artworkUrl!,
            duration: musicRecord.duration,
            playbackAvailability: 'full_playback',
            licenseType: musicRecord.licenseType,
            territory: 'Worldwide',
            attribution: `Uploaded by ${user.username}`,
            sourceUrl: musicRecord.sourceUrl,
            storagePath: musicRecord.storagePath,
            addedBy: user.userId,
            addedByName: user.username,
            addedAt: new Date().toISOString(),
            uploadedBy: user.userId,
            uploadedByUsername: user.username,
          };
          await addToPlaylist(roomId, queueItem);
        }

        results.push({
          filename,
          success: true,
          track: musicRecord,
        });
      } catch (saveErr: any) {
        console.error(`Failed to save audio file ${filename}:`, saveErr);
        results.push({
          filename,
          success: false,
          error: saveErr?.message || 'Failed to save audio to storage',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      totalCount: filesToProcess.length,
      successCount,
      failedCount: filesToProcess.length - successCount,
      results,
    });
  } catch (err: any) {
    console.error('Error in /api/rooms/[roomId]/music/upload:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
