# SHREDoo – Bollywood & Commercial Indian Music Provider Integration Guide

## 1. Executive Summary & Legal Compliance

SHREDoo includes a modular **Dual Music Provider Architecture**:
1. **Independent Music Provider (Jamendo API v3.0 + Creative Commons)**: Pre-configured, fully operational for royalty-free and CC-licensed streaming with attribution.
2. **Bollywood & Popular Indian Music Provider (`BollywoodMusicProvider`)**: Configured for legitimate catalog discovery, metadata browsing, and authorized B2B playback.

> **CRITICAL LEGAL NOTICE**:
> SHREDoo strictly complies with Indian copyright law (The Copyright Act, 1957) and international intellectual property treaties (WIPO, Berne Convention). 
> - **We NEVER scrape Spotify, YouTube, JioSaavn, Gaana, Wynk, or Apple Music.**
> - **We NEVER extract protected DRM streams or reverse-engineer private consumer APIs.**
> - **We NEVER bypass subscription gates or distribute unauthorized audio binaries.**
> 
> Until an enterprise licensing partnership is executed with a recognized Indian record label or B2B distributor, Indian film songs are displayed in **Catalogue & Metadata Discovery Mode** (`playbackAvailability: 'licensing_pending'`), informing users of licensing requirements transparently.

---

## 2. Supported Commercial Licensing Partners

The `BollywoodMusicProvider` interface is designed to seamlessly ingest feeds and playback tokens from:

| Licensing Partner | Catalog Coverage | Target Use Case | Reference |
| :--- | :--- | :--- | :--- |
| **Saregama India Ltd** | Vintage & Golden Age Classics, Ghazals, Regional Indian | B2B Streaming & Synchronization API | [Saregama B2B Licensing](https://www.saregama.com) |
| **T-Series (Super Cassettes)** | Mainstream Bollywood Soundtracks, Indi-pop, Bhangra | Digital Streaming & Enterprise Syndication | [T-Series Commercial Licensing](https://www.tseries.com) |
| **Hungama Digital Media** | Pan-Indian Film Music, Multilingual Soundtracks | Hungama B2B Enterprise API | [Hungama B2B Solutions](https://www.hungama.com) |
| **TuneCore / Believe Enterprise** | Independent Indian Pop, Regional Artists | Digital Distribution Partner API | [TuneCore India](https://www.tunecore.com) |

---

## 3. Architecture & Interface Implementation

The provider is implemented in `src/lib/music/bollywood.ts` adhering to the common `MusicProvider` contract:

```typescript
export interface MusicProvider {
  providerId: string;
  providerName: string;
  category: 'bollywood' | 'independent';
  searchTracks(query: string): Promise<MusicTrack[]>;
  getTrackDetails(trackId: string): Promise<MusicTrack | null>;
  getPlaybackSource(trackId: string): Promise<AuthorizedPlaybackSource>;
  validateLicense(trackId: string): Promise<boolean>;
}
```

### Track Metadata Schema

Each Bollywood track returned contains rigorous metadata and licensing tags:

```typescript
{
  trackId: "bolly_tum_hi_ho",
  providerId: "bollywood_official",
  category: "bollywood",
  title: "Tum Hi Ho",
  artist: "Arijit Singh",
  album: "Aashiqui 2",
  duration: 262,
  artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819",
  playbackAvailability: "licensing_pending", // Switches to 'available' when authorized key is provided
  licenseType: "Commercial B2B License Required",
  territory: "IN, US, UK, CA, AE",
  attribution: "Label: T-Series / Composer: Mithoon / Artist: Arijit Singh"
}
```

---

## 4. Configuration & Environment Variables

To activate authorized commercial playback once your licensing agreement is secured:

1. Open `.env.local` in your SHREDoo project root.
2. Provide your licensed enterprise credentials:

```bash
# ==========================================
# BOLLYWOOD & COMMERCIAL B2B MUSIC LICENSING
# ==========================================
BOLLYWOOD_PROVIDER_API_KEY="your_enterprise_b2b_api_key_here"
BOLLYWOOD_PROVIDER_ENDPOINT="https://api.partner-licensing.com/v1"
BOLLYWOOD_PARTNER_LABEL="Saregama B2B / T-Series Enterprise"
```

3. When `BOLLYWOOD_PROVIDER_API_KEY` is set and verified:
   - `playbackAvailability` flips from `'licensing_pending'` to `'available'`.
   - The Play button becomes active in the lounge player.
   - Authorized, signed CDN audio streams are supplied directly to participants' Web Audio gain nodes.

---

## 5. Testing & Verification

1. **Catalog Search Test**:
   - Navigate to `/api/music/search?q=Arijit&category=bollywood`.
   - Returns structured track listings with album metadata, artist credit, and licensing notices.
2. **Playback Rights Verification**:
   - Query `/api/music/validate-playback` with `trackId`.
   - Returns whether the track is authorized for playback or requires enterprise B2B licensing.
3. **Independent Alternative**:
   - Query `/api/music/search?q=lofi&category=independent`.
   - Fully active Jamendo streaming engine is always available for immediate playback.

