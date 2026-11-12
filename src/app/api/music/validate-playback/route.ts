import { NextRequest, NextResponse } from 'next/server';
import { getTrackById, getPlaybackSource } from '@/lib/music';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trackId, track } = body;

    let targetTrack = track;
    if (!targetTrack && trackId) {
      targetTrack = await getTrackById(trackId);
    }

    if (!targetTrack) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }

    const authResult = await getPlaybackSource(targetTrack);

    return NextResponse.json({
      trackId: targetTrack.trackId,
      title: targetTrack.title,
      artist: targetTrack.artist,
      category: targetTrack.category,
      providerId: targetTrack.providerId,
      licenseType: targetTrack.licenseType,
      attribution: targetTrack.attribution,
      authorized: authResult.authorized,
      streamUrl: authResult.streamUrl,
      reason: authResult.reason,
      playbackSource: {
        canStream: authResult.authorized,
        streamUrl: authResult.streamUrl,
        reason: authResult.reason,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/music/validate-playback:', err);
    return NextResponse.json({ error: err?.message || 'Validation failed' }, { status: 500 });
  }
}
