import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyRoomModerator } from '@/lib/auth';
import { getRoom, updateRoomPlayback, getPlaylist, removeFromPlaylist, getRoomPlayback } from '@/lib/firestore';

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

    // Check playback permission
    if (room.musicPermissions.whoCanControl === 'host_only') {
      const { canModerate } = await verifyRoomModerator(roomId, user.userId);
      if (!canModerate) {
        return NextResponse.json(
          { error: 'Music playback controls are restricted to the room Host/Moderators.' },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { action, position, songId, track } = body;

    const playlist = await getPlaylist(roomId);
    const currentPlayback = await getRoomPlayback(roomId);

    let nextTrack = currentPlayback?.currentTrack || (playlist.length > 0 ? playlist[0] : null);
    let playbackStatus: 'playing' | 'paused' | 'buffering' | 'stopped' = currentPlayback?.playbackStatus || 'paused';
    let playbackPosition = typeof position === 'number' ? position : (currentPlayback?.playbackPosition || 0);

    if (action === 'play') {
      playbackStatus = 'playing';
      if (typeof position === 'number') playbackPosition = position;
      if (!nextTrack && playlist.length > 0) {
        nextTrack = playlist[0];
      }
    } else if (action === 'pause') {
      playbackStatus = 'paused';
      if (typeof position === 'number') playbackPosition = position;
    } else if (action === 'seek') {
      if (typeof position === 'number') playbackPosition = position;
    } else if (action === 'next') {
      if (playlist.length > 0) {
        nextTrack = playlist[0];
        playbackStatus = 'playing';
        playbackPosition = 0;
        await removeFromPlaylist(roomId, nextTrack.trackId);
      } else {
        nextTrack = null;
        playbackStatus = 'paused';
        playbackPosition = 0;
      }
    } else if (action === 'select' && songId) {
      const selected = playlist.find((s) => s.trackId === songId);
      if (selected) {
        nextTrack = selected;
        playbackStatus = 'playing';
        playbackPosition = 0;
        await removeFromPlaylist(roomId, selected.trackId);
      }
    } else if (action === 'play_track' && track) {
      nextTrack = track;
      playbackStatus = 'playing';
      playbackPosition = 0;
    } else if (action === 'stop') {
      playbackStatus = 'paused';
      playbackPosition = 0;
    } else if (action === 'previous') {
      playbackPosition = 0;
      playbackStatus = 'playing';
    }

    const updatedPlayback = await updateRoomPlayback(roomId, {
      currentTrackId: nextTrack?.trackId || null,
      currentTrack: nextTrack,
      playbackStatus,
      playbackPosition,
      updatedBy: user.userId,
    });

    const updatedPlaylist = await getPlaylist(roomId);

    return NextResponse.json({
      success: true,
      playback: updatedPlayback,
      playlist: updatedPlaylist,
    });
  } catch (err: any) {
    console.error('Error in /api/rooms/[roomId]/music/control:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
