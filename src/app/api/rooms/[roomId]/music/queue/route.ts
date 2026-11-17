import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyRoomModerator } from '@/lib/auth';
import {
  getRoom,
  addToPlaylist,
  getPlaylist,
  removeFromPlaylist,
  reorderRoomPlaylist,
  clearRoomPlaylist,
  getMember,
  getRoomPlayback,
} from '@/lib/firestore';
import { MusicTrack } from '@/types';

// GET: Fetch real-time shared playlist & current playback state
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

    const playlist = await getPlaylist(roomId);
    const playback = await getRoomPlayback(roomId);

    return NextResponse.json({
      success: true,
      roomId,
      queue: playlist,
      currentTrack: playback?.currentTrack || null,
      playbackStatus: playback?.playbackStatus || 'paused',
      playbackPosition: playback?.playbackPosition || 0,
      playbackVersion: playback?.playbackVersion || 1,
    });
  } catch (err: any) {
    console.error('Error in GET /api/rooms/[roomId]/music/queue:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Add a track to the shared room queue
export async function POST(
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
      return NextResponse.json({ error: 'Must be a member of this room to add songs' }, { status: 403 });
    }

    if (room.musicPermissions.whoCanAdd === 'host_only') {
      const { canModerate } = await verifyRoomModerator(roomId, user.userId);
      if (!canModerate) {
        return NextResponse.json(
          { error: 'Adding songs is restricted to the room Host/Moderators.' },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const track: MusicTrack = body.track || {
      trackId: body.trackId || `track-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      providerId: body.providerId || 'user_upload',
      category: body.category || 'independent',
      title: body.title?.trim() || 'Untitled Track',
      artist: body.artist?.trim() || 'Independent Artist',
      album: body.album?.trim() || 'Single',
      artworkUrl:
        body.artworkUrl ||
        body.thumbnail ||
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      duration: body.duration || 210,
      playbackAvailability: body.playbackAvailability || 'full_playback',
      licenseType: body.licenseType || 'User-Authorized Personal Audio',
      territory: body.territory || 'Worldwide',
      attribution: body.attribution || `Queued by ${user.username}`,
      sourceUrl: body.url || body.sourceUrl,
    };

    track.addedBy = user.userId;
    track.addedByName = user.username;
    track.addedAt = new Date().toISOString();

    await addToPlaylist(roomId, track);
    const updatedPlaylist = await getPlaylist(roomId);

    return NextResponse.json({
      success: true,
      track,
      playlist: updatedPlaylist,
    });
  } catch (err: any) {
    console.error('Error in POST /api/rooms/[roomId]/music/queue:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove track from queue or clear entire queue
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
    const action = url.searchParams.get('action');
    const trackId = url.searchParams.get('trackId');

    const isHost = room.hostId === user.userId;
    const { canModerate } = await verifyRoomModerator(roomId, user.userId);

    // Clear whole queue: Host/Mod only
    if (action === 'clear') {
      if (!isHost && !canModerate) {
        return NextResponse.json({ error: 'Only Host/Moderators can clear the entire queue' }, { status: 403 });
      }
      await clearRoomPlaylist(roomId);
      return NextResponse.json({ success: true, message: 'Queue cleared', playlist: [] });
    }

    // Remove single track: Host/Mod or the member who added it
    if (trackId) {
      const playlist = await getPlaylist(roomId);
      const target = playlist.find((t) => t.trackId === trackId);
      if (!target) {
        return NextResponse.json({ error: 'Track not found in queue' }, { status: 404 });
      }

      const isAdder = target.addedBy === user.userId;
      if (!isHost && !canModerate && !isAdder) {
        return NextResponse.json(
          { error: 'Unauthorized. Only Host or the member who queued this song can remove it.' },
          { status: 403 }
        );
      }

      await removeFromPlaylist(roomId, trackId);
      const updatedPlaylist = await getPlaylist(roomId);
      return NextResponse.json({
        success: true,
        message: `Removed "${target.title}" from queue`,
        playlist: updatedPlaylist,
      });
    }

    return NextResponse.json({ error: 'trackId or action=clear required' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in DELETE /api/rooms/[roomId]/music/queue:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT: Reorder tracks in queue (Host/Mod only)
export async function PUT(
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

    const isHost = room.hostId === user.userId;
    const { canModerate } = await verifyRoomModerator(roomId, user.userId);
    if (!isHost && !canModerate) {
      return NextResponse.json({ error: 'Only Host/Moderators can reorder the queue.' }, { status: 403 });
    }

    const body = await req.json();
    const { fromIndex, toIndex } = body;

    if (typeof fromIndex !== 'number' || typeof toIndex !== 'number') {
      return NextResponse.json({ error: 'fromIndex and toIndex numbers required' }, { status: 400 });
    }

    const reordered = await reorderRoomPlaylist(roomId, fromIndex, toIndex);

    return NextResponse.json({
      success: true,
      playlist: reordered,
    });
  } catch (err: any) {
    console.error('Error in PUT /api/rooms/[roomId]/music/queue:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
