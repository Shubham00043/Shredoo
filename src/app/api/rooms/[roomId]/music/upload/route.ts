import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAuthenticatedUser } from '@/lib/auth';
import { getRoom, getMember, addMember, isMemberBlocked, addTrackToRoomMusic, addToPlaylist, checkDuplicateTrack } from '@/lib/firestore';
import { RoomMusicRecord, MusicTrack } from '@/types';

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

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required to upload music.' }, { status: 401 });
    }

    const room = await getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }

    if (room.isClosed) {
      return NextResponse.json({ error: 'This lounge is closed. Uploads are disabled.' }, { status: 403 });
    }

    const isBlocked = await isMemberBlocked(roomId, user.userId);
    if (isBlocked) {
      return NextResponse.json({ error: 'Access blocked in this room' }, { status: 403 });
    }

    let member = await getMember(roomId, user.userId);
    const isHost = room.hostId === user.userId;
    if (!member && !isHost) {
      member = await addMember({
        roomId,
        userId: user.userId,
        username: user.username || 'Shredoo Member',
        userAvatar: user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.userId}`,
        role: 'member',
        joinedAt: new Date().toISOString(),
        status: 'connected',
      });
    }

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      const remoteUrl = body.remoteUrl as string | undefined;
      if (remoteUrl) {
        const filename = (body.filename as string) || 'audio.mp3';
        const ext = path.extname(filename).toLowerCase() || '.mp3';
        const baseNameWithoutExt = path.basename(filename, ext).replace(/[_-]/g, ' ').trim();
        let trackTitle = body.title || baseNameWithoutExt || 'Untitled Track';
        let trackArtist = body.artist || user.username || 'Community Artist';

        if (!body.title && baseNameWithoutExt.includes(' - ')) {
          const parts = baseNameWithoutExt.split(' - ');
          trackArtist = parts[0].trim();
          trackTitle = parts.slice(1).join(' - ').trim();
        }

        const trackId = `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const sourceUrl = `/api/rooms/${roomId}/music/stream/${trackId}`;

        const musicRecord: RoomMusicRecord = {
          trackId,
          roomId,
          title: trackTitle,
          artist: trackArtist,
          album: 'Room Uploads',
          duration: body.duration || 210,
          storagePath: `remote/${trackId}`,
          uploadedBy: user.userId,
          uploadedByUsername: user.username,
          createdAt: new Date().toISOString(),
          licenseType: 'User-Authorized Personal Audio',
          playbackStatus: 'available',
          fileSize: body.fileSize || 0,
          mimeType: `audio/${ext.replace('.', '')}`,
          sourceUrl,
          remoteUrl,
          artworkUrl:
            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
        };

        await addTrackToRoomMusic(roomId, musicRecord);

        if (body.autoQueue !== false) {
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
            remoteUrl,
            addedBy: user.userId,
            addedByName: user.username,
            addedAt: new Date().toISOString(),
            uploadedBy: user.userId,
            uploadedByUsername: user.username,
          };
          await addToPlaylist(roomId, queueItem);
        }

        return NextResponse.json({
          success: true,
          isComplete: true,
          totalCount: 1,
          successCount: 1,
          failedCount: 0,
          results: [
            {
              filename,
              success: true,
              track: musicRecord,
            },
          ],
        });
      }
    }

    const formData = await req.formData();

    // Check if this is a chunked slice upload (for large files to bypass Vercel's 4.5MB limit)
    const chunkBlob = (formData.get('chunk') || formData.get('slice')) as Blob | null;
    if (chunkBlob) {
      const uploadId = (formData.get('uploadId') as string) || `upl-${Date.now()}`;
      const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
      const totalChunks = parseInt(formData.get('totalChunks') as string, 10);
      const filename = (formData.get('filename') as string) || 'audio.mp3';
      const autoQueue = formData.get('autoQueue') === 'true';
      const customTitle = formData.get('title') as string | null;
      const customArtist = formData.get('artist') as string | null;

      const ext = path.extname(filename).toLowerCase() || '.mp3';
      if (!UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `Unsupported format (${ext}). Supported formats: MP3, WAV, OGG, M4A.` },
          { status: 400 }
        );
      }

      const chunkDir = path.join(os.tmpdir(), 'shredoo_chunks', uploadId);
      if (!fs.existsSync(chunkDir)) {
        fs.mkdirSync(chunkDir, { recursive: true });
      }

      const chunkBytes = await chunkBlob.arrayBuffer();
      fs.writeFileSync(path.join(chunkDir, `chunk_${chunkIndex}`), Buffer.from(chunkBytes));

      // If not the final chunk yet, acknowledge receipt
      if (chunkIndex < totalChunks - 1) {
        return NextResponse.json({
          success: true,
          chunkIndex,
          totalChunks,
          isComplete: false,
        });
      }

      // Final chunk arrived: assemble chunks into complete audio file
      const chunkBuffers: Buffer[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const cPath = path.join(chunkDir, `chunk_${i}`);
        if (!fs.existsSync(cPath)) {
          return NextResponse.json(
            { error: `Missing chunk ${i} of ${totalChunks}. Please retry upload.` },
            { status: 400 }
          );
        }
        chunkBuffers.push(fs.readFileSync(cPath));
      }
      const fullBuffer = Buffer.concat(chunkBuffers);

      // Clean up chunk temporary directory
      try {
        fs.rmSync(chunkDir, { recursive: true, force: true });
      } catch (e) {}

      // Validate total size
      if (fullBuffer.length > UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File size exceeds 50MB limit (${(fullBuffer.length / (1024 * 1024)).toFixed(1)}MB).` },
          { status: 400 }
        );
      }

      const baseNameWithoutExt = path.basename(filename, ext).replace(/[_-]/g, ' ').trim();
      let trackTitle = customTitle || baseNameWithoutExt || 'Untitled Track';
      let trackArtist = customArtist || user.username || 'Community Artist';

      if (!customTitle && baseNameWithoutExt.includes(' - ')) {
        const parts = baseNameWithoutExt.split(' - ');
        trackArtist = parts[0].trim();
        trackTitle = parts.slice(1).join(' - ').trim();
      }

      await checkDuplicateTrack(roomId, trackTitle, trackArtist, fullBuffer.length);

      const trackId = `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const safeFilename = `audio${ext}`;

      const baseStorage = getRoomStorageBaseDir();
      const trackStorageDir = path.join(baseStorage, 'rooms', roomId, 'music', trackId, 'audio');
      const relativeStoragePath = `rooms/${roomId}/music/${trackId}/audio/${safeFilename}`;

      if (!fs.existsSync(trackStorageDir)) {
        fs.mkdirSync(trackStorageDir, { recursive: true });
      }

      const filePath = path.join(trackStorageDir, safeFilename);
      fs.writeFileSync(filePath, fullBuffer);

      const sourceUrl = `/api/rooms/${roomId}/music/stream/${trackId}`;

      const musicRecord: RoomMusicRecord = {
        trackId,
        roomId,
        title: trackTitle,
        artist: trackArtist,
        album: 'Room Uploads',
        duration: 210,
        storagePath: relativeStoragePath,
        uploadedBy: user.userId,
        uploadedByUsername: user.username,
        createdAt: new Date().toISOString(),
        licenseType: 'User-Authorized Personal Audio',
        playbackStatus: 'available',
        fileSize: fullBuffer.length,
        mimeType: `audio/${ext.replace('.', '')}`,
        sourceUrl,
        artworkUrl:
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      };

      await addTrackToRoomMusic(roomId, musicRecord);

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

      return NextResponse.json({
        success: true,
        isComplete: true,
        totalCount: 1,
        successCount: 1,
        failedCount: 0,
        results: [
          {
            filename,
            success: true,
            track: musicRecord,
          },
        ],
      });
    }

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

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const filename = file.name;
      const ext = path.extname(filename).toLowerCase();

      if (!UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(ext)) {
        results.push({
          filename,
          success: false,
          error: `Unsupported format (${ext}). Supported formats: MP3, WAV, OGG, M4A.`,
        });
        continue;
      }

      const mime = file.type?.toLowerCase();
      if (mime && !UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(mime) && !mime.startsWith('audio/')) {
        results.push({
          filename,
          success: false,
          error: `Invalid audio MIME type: ${mime}`,
        });
        continue;
      }

      if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES) {
        results.push({
          filename,
          success: false,
          error: `File size exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
        });
        continue;
      }

      const baseNameWithoutExt = path.basename(filename, ext).replace(/[_-]/g, ' ').trim();
      let trackTitle = customTitle || baseNameWithoutExt || 'Untitled Track';
      let trackArtist = customArtist || user.username || 'Community Artist';

      if (!customTitle && baseNameWithoutExt.includes(' - ')) {
        const parts = baseNameWithoutExt.split(' - ');
        trackArtist = parts[0].trim();
        trackTitle = parts.slice(1).join(' - ').trim();
      }

      await checkDuplicateTrack(roomId, trackTitle, trackArtist, file.size);

      const trackId = `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const safeFilename = `audio${ext}`;

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

        const musicRecord: RoomMusicRecord = {
          trackId,
          roomId,
          title: trackTitle,
          artist: trackArtist,
          album: 'Room Uploads',
          duration: 210,
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
