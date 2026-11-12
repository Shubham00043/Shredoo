import { MusicCategory, MusicTrack } from '@/types';
import { MusicProvider } from './types';
import { JamendoMusicProvider } from './jamendo';
import { BollywoodMusicProvider } from './bollywood';

export const jamendoProvider = new JamendoMusicProvider();
export const bollywoodProvider = new BollywoodMusicProvider();

export const providers: Record<string, MusicProvider> = {
  jamendo: jamendoProvider,
  bollywood_partner: bollywoodProvider,
};

export async function searchMusic(
  query: string,
  category: MusicCategory | 'all' = 'all'
): Promise<{ bollywood: MusicTrack[]; independent: MusicTrack[] }> {
  if (category === 'bollywood') {
    const bollywood = await bollywoodProvider.searchTracks(query);
    return { bollywood, independent: [] };
  }

  if (category === 'independent') {
    const independent = await jamendoProvider.searchTracks(query);
    return { bollywood: [], independent };
  }

  const [bollywood, independent] = await Promise.all([
    bollywoodProvider.searchTracks(query),
    jamendoProvider.searchTracks(query),
  ]);

  return { bollywood, independent };
}

export async function getTrackById(trackId: string): Promise<MusicTrack | null> {
  if (trackId.startsWith('jamendo-')) {
    return await jamendoProvider.getTrackDetails(trackId);
  }
  if (trackId.startsWith('bolly-')) {
    return await bollywoodProvider.getTrackDetails(trackId);
  }
  return null;
}

export async function getPlaybackSource(track: MusicTrack): Promise<{
  authorized: boolean;
  streamUrl?: string;
  previewUrl?: string;
  reason?: string;
}> {
  if (track.providerId === 'jamendo' || track.category === 'independent') {
    return await jamendoProvider.getAuthorizedPlaybackSource(track.trackId);
  }
  if (track.providerId === 'bollywood_partner' || track.category === 'bollywood') {
    return await bollywoodProvider.getAuthorizedPlaybackSource(track.trackId);
  }
  if (track.sourceUrl) {
    return { authorized: true, streamUrl: track.sourceUrl };
  }
  return { authorized: false, reason: 'No authorized source available' };
}
