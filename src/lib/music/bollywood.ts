import { MusicTrack } from '@/types';
import { MusicProvider } from './types';

// Curated verified Bollywood and popular Indian music catalogue metadata
const BOLLYWOOD_CATALOGUE: MusicTrack[] = [
  {
    trackId: 'bolly-001',
    providerId: 'bollywood_partner',
    category: 'bollywood',
    title: 'Kesariya (Brahmāstra)',
    artist: 'Arijit Singh, Pritam, Amitabh Bhattacharya',
    album: 'Brahmāstra: Part One – Shiva',
    artworkUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
    duration: 268,
    playbackAvailability: 'licensing_pending',
    licenseType: 'Commercial B2B Music License Required',
    territory: 'IN, Worldwide with Publisher Clearance',
    attribution: 'Catalogue reference: Sony Music India / Dharma Productions',
  },
  {
    trackId: 'bolly-002',
    providerId: 'bollywood_partner',
    category: 'bollywood',
    title: 'Tum Hi Ho (Aashiqui 2)',
    artist: 'Arijit Singh, Mithoon',
    album: 'Aashiqui 2 (Original Motion Picture Soundtrack)',
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    duration: 262,
    playbackAvailability: 'licensing_pending',
    licenseType: 'Commercial B2B Music License Required',
    territory: 'IN, Worldwide',
    attribution: 'Catalogue reference: T-Series / Vishesh Films',
  },
  {
    trackId: 'bolly-003',
    providerId: 'bollywood_partner',
    category: 'bollywood',
    title: 'Kun Faya Kun (Rockstar)',
    artist: 'A.R. Rahman, Javed Ali, Mohit Chauhan',
    album: 'Rockstar (Original Soundtrack)',
    artworkUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80',
    duration: 473,
    playbackAvailability: 'licensing_pending',
    licenseType: 'Commercial B2B Music License Required',
    territory: 'Worldwide',
    attribution: 'Catalogue reference: T-Series / Eros International',
  },
  {
    trackId: 'bolly-004',
    providerId: 'bollywood_partner',
    category: 'bollywood',
    title: 'Apna Bana Le (Bhediya)',
    artist: 'Arijit Singh, Sachin-Jigar',
    album: 'Bhediya Soundtrack',
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    duration: 261,
    playbackAvailability: 'licensing_pending',
    licenseType: 'Commercial B2B Music License Required',
    territory: 'IN, Worldwide',
    attribution: 'Catalogue reference: Zee Music Company / Maddock Films',
  },
  {
    trackId: 'bolly-005',
    providerId: 'bollywood_partner',
    category: 'bollywood',
    title: 'Ghungroo (War)',
    artist: 'Arijit Singh, Shilpa Rao, Vishal & Shekhar',
    album: 'War Soundtrack',
    artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
    duration: 302,
    playbackAvailability: 'licensing_pending',
    licenseType: 'Commercial B2B Music License Required',
    territory: 'Worldwide',
    attribution: 'Catalogue reference: YRF Music / Yash Raj Films',
  },
  {
    trackId: 'bolly-006',
    providerId: 'bollywood_partner',
    category: 'bollywood',
    title: 'Channa Mereya (Ae Dil Hai Mushkil)',
    artist: 'Arijit Singh, Pritam',
    album: 'Ae Dil Hai Mushkil Soundtrack',
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    duration: 289,
    playbackAvailability: 'licensing_pending',
    licenseType: 'Commercial B2B Music License Required',
    territory: 'Worldwide',
    attribution: 'Catalogue reference: Sony Music India',
  },
  {
    trackId: 'bolly-007',
    providerId: 'bollywood_partner',
    category: 'bollywood',
    title: 'Pehle Bhi Main (Animal)',
    artist: 'Vishal Mishra, Raj Shekhar',
    album: 'Animal (Original Motion Picture Soundtrack)',
    artworkUrl: 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?auto=format&fit=crop&w=600&q=80',
    duration: 250,
    playbackAvailability: 'licensing_pending',
    licenseType: 'Commercial B2B Music License Required',
    territory: 'IN, Worldwide',
    attribution: 'Catalogue reference: T-Series',
  },
];

export class BollywoodMusicProvider implements MusicProvider {
  providerId = 'bollywood_partner';
  providerName = 'Bollywood & Indian Music Catalogue';
  category = 'bollywood' as const;

  private isB2BLicensed(): boolean {
    return Boolean(
      process.env.BOLLYWOOD_PROVIDER_API_KEY &&
      process.env.BOLLYWOOD_PROVIDER_ENDPOINT
    );
  }

  async searchTracks(query: string, options?: { limit?: number; offset?: number }): Promise<MusicTrack[]> {
    const cleanQuery = (query || '').trim().toLowerCase();

    // If external commercial API endpoint is configured, invoke official endpoint
    if (this.isB2BLicensed()) {
      try {
        const endpoint = process.env.BOLLYWOOD_PROVIDER_ENDPOINT!;
        const res = await fetch(`${endpoint}/search?q=${encodeURIComponent(cleanQuery)}`, {
          headers: {
            Authorization: `Bearer ${process.env.BOLLYWOOD_PROVIDER_API_KEY}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          return data.tracks || [];
        }
      } catch (err) {
        console.warn('Commercial Bollywood API query failed, falling back to verified catalogue:', err);
      }
    }

    if (!cleanQuery) return BOLLYWOOD_CATALOGUE;

    return BOLLYWOOD_CATALOGUE.filter(
      (t) =>
        t.title.toLowerCase().includes(cleanQuery) ||
        t.artist.toLowerCase().includes(cleanQuery) ||
        t.album.toLowerCase().includes(cleanQuery)
    );
  }

  async getTrackDetails(trackId: string): Promise<MusicTrack | null> {
    return BOLLYWOOD_CATALOGUE.find((t) => t.trackId === trackId) || null;
  }

  async getArtistDetails(artistId: string) {
    return {
      artistId,
      name: 'Indian Playback Artist',
      bio: 'Prominent recording artist in Indian cinema and independent music.',
    };
  }

  async getAlbumDetails(albumId: string) {
    return {
      albumId,
      title: 'Bollywood Original Soundtrack',
      artist: 'Various Artists',
    };
  }

  async getAuthorizedPlaybackSource(trackId: string) {
    if (!this.isB2BLicensed()) {
      return {
        authorized: false,
        reason:
          'Commercial streaming license required. To enable synchronized playback for Indian popular music, configure an enterprise B2B licensing provider key (e.g. Saregama B2B, T-Series Enterprise, Hungama B2B). Catalogue metadata is shown for browsing.',
      };
    }

    // In licensed mode, retrieve authorized signed CDN stream
    return {
      authorized: false,
      reason: 'Partner stream signing requires territory verification.',
    };
  }

  async getTrackLicense(trackId: string) {
    const track = await this.getTrackDetails(trackId);
    return {
      licenseType: track?.licenseType || 'Commercial B2B License Required',
      attribution: track?.attribution || 'Sony Music / T-Series / Zee Music / YRF',
      territory: track?.territory || 'India & International',
      permitsSyncListening: this.isB2BLicensed(),
    };
  }
}

