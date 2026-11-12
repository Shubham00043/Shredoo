import { MusicTrack, MusicCategory } from '@/types';

export interface MusicProvider {
  providerId: string;
  providerName: string;
  category: MusicCategory;

  searchTracks(query: string, options?: { limit?: number; offset?: number }): Promise<MusicTrack[]>;
  getTrackDetails(trackId: string): Promise<MusicTrack | null>;
  getArtistDetails(artistId: string): Promise<{
    artistId: string;
    name: string;
    image?: string;
    bio?: string;
  } | null>;
  getAlbumDetails(albumId: string): Promise<{
    albumId: string;
    title: string;
    artist: string;
    releaseDate?: string;
    artworkUrl?: string;
    tracks?: MusicTrack[];
  } | null>;
  getAuthorizedPlaybackSource(trackId: string): Promise<{
    authorized: boolean;
    streamUrl?: string;
    previewUrl?: string;
    reason?: string;
  }>;
  getTrackLicense(trackId: string): Promise<{
    licenseType: string;
    attribution: string;
    territory: string;
    permitsSyncListening: boolean;
  }>;
}

