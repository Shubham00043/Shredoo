import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyRoomModerator } from '@/lib/auth';
import { getRoom, addToPlaylist, getPlaylist, getMember } from '@/lib/firestore';
import { MusicTrack } from '@/types';

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
    if (!member && room.hostId !== user.userId) {
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
      artworkUrl: body.artworkUrl || body.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      duration: body.duration || 210,
      playbackAvailability: body.playbackAvailability || 'full_playback',
      licenseType: body.licenseType || 'Creative Commons CC BY-SA 4.0',
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
    console.error('Error in /api/rooms/[roomId]/music/queue:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
