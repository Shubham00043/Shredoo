'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Room, MusicTrack, RoomMember } from '@/types';
import { webAudioEngine } from '@/lib/audio/webAudioManager';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Plus,
  ListMusic,
  Disc3,
  Lock,
  Search,
  Upload,
  Globe,
  Radio,
  ExternalLink,
  ShieldAlert,
  Info,
  Check,
  X,
  Volume2,
} from 'lucide-react';

interface MusicPlayerProps {
  room: Room;
  playlist: MusicTrack[];
  isHostOrMod: boolean;
  currentUserId: string;
  musicVolume: number;
  onRefreshRoom: () => void;
}

export function MusicPlayer({
  room,
  playlist,
  isHostOrMod,
  currentUserId,
  musicVolume,
  onRefreshRoom,
}: MusicPlayerProps) {
  const currentTrack = room.playback?.currentTrack || room.currentSong || null;
  const isPlaying = room.playback?.playbackStatus === 'playing' || Boolean(room.isPlaying);
  const serverPosition = room.playback?.playbackPosition || room.playbackPosition || 0;

  const [localTime, setLocalTime] = useState(serverPosition);
  const [duration, setDuration] = useState(currentTrack?.duration || 210);
  const [showLibrary, setShowLibrary] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'independent' | 'bollywood' | 'upload'>('independent');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ bollywood: MusicTrack[]; independent: MusicTrack[] }>({
    bollywood: [],
    independent: [],
  });
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [licensingNotice, setLicensingNotice] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const canAddSongs = room.musicPermissions.whoCanAdd === 'everyone' || isHostOrMod;
  const canControlPlayback = room.musicPermissions.whoCanControl === 'everyone' || isHostOrMod;

  // Route audio through Web Audio background music GainNode
  useEffect(() => {
    if (audioRef.current) {
      webAudioEngine.attachMusicElement(audioRef.current);
      webAudioEngine.setMusicVolume(musicVolume);
    }
  }, [musicVolume, currentTrack]);

  // Synchronized playback engine
  useEffect(() => {
    if (audioRef.current && currentTrack?.sourceUrl) {
      if (isPlaying) {
        // Sync position if drifted > 2 seconds
        if (Math.abs(audioRef.current.currentTime - serverPosition) > 2) {
          audioRef.current.currentTime = serverPosition;
        }
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, serverPosition, currentTrack]);

  // Search catalogues
  const handleSearch = async (query: string, cat: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}&category=${cat}`);
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (showLibrary) {
      handleSearch(searchQuery, activeCategory);
    }
  }, [showLibrary, activeCategory]);

  const togglePlay = async () => {
    if (!canControlPlayback) return;
    const nextAction = isPlaying ? 'pause' : 'play';

    try {
      await fetch(`/api/rooms/${room.id}/music/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({
          action: nextAction,
          position: localTime,
        }),
      });
      onRefreshRoom();
    } catch (e) {
      console.error(e);
    }
  };

  const handleNextTrack = async () => {
    if (!canControlPlayback) return;
    try {
      await fetch(`/api/rooms/${room.id}/music/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({ action: 'next' }),
      });
      onRefreshRoom();
    } catch (e) {
      console.error(e);
    }
  };

  const handleQueueTrack = async (track: MusicTrack) => {
    if (!canAddSongs) return;

    // Check licensing
    if (track.playbackAvailability === 'licensing_pending') {
      setLicensingNotice(
        `Commercial Licensing Notice for "${track.title}": Indian popular music catalogues require an enterprise B2B partner key (T-Series / Sony Music / Saregama) for streaming. Track metadata and licensing terms are visible.`
      );
    }

    try {
      await fetch(`/api/rooms/${room.id}/music/queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({ track }),
      });
      onRefreshRoom();
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
    formData.append('artist', 'User Audio Upload');

    try {
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.track) {
        await handleQueueTrack(data.track);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="bg-lounge-surface border border-lounge-border rounded-2xl shadow-xl overflow-hidden p-5 space-y-4">
      {/* Hidden Audio element routed through Web Audio GainNode */}
      {currentTrack?.sourceUrl && (
        <audio
          ref={audioRef}
          src={currentTrack.sourceUrl}
          onTimeUpdate={(e) => setLocalTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || currentTrack.duration || 210)}
          onEnded={handleNextTrack}
        />
      )}

      {/* Track Info Display */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-lounge-bg border border-lounge-border flex-shrink-0 shadow-md">
          {currentTrack?.artworkUrl ? (
            <img
              src={currentTrack.artworkUrl}
              alt="Track thumbnail"
              className={`w-full h-full object-cover transition duration-300 ${
                isPlaying ? 'scale-105' : 'opacity-80'
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lounge-textMuted bg-lounge-card">
              <Disc3 size={28} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white truncate">
              {currentTrack?.title || 'No song playing'}
            </h3>
            {isPlaying && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                SYNCHRONIZED
              </span>
            )}
          </div>
          <p className="text-xs text-lounge-textMuted truncate mt-0.5">
            {currentTrack?.artist || 'Open library to queue licensed independent or Bollywood tracks'}
          </p>

          {currentTrack?.licenseType && (
            <div className="flex items-center gap-2 mt-1 text-[10px] text-lounge-textMuted font-mono">
              <span className="truncate">{currentTrack.licenseType}</span>
              <span>•</span>
              <span className="capitalize">{currentTrack.category}</span>
            </div>
          )}
        </div>
      </div>

      {/* Playback Progress */}
      <div className="space-y-1">
        <div className="w-full bg-lounge-bg rounded-full h-1.5 overflow-hidden border border-lounge-border">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-200"
            style={{ width: `${Math.min(100, (localTime / (duration || 1)) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-lounge-textMuted font-mono">
          <span>{formatSeconds(localTime)}</span>
          <span>{formatSeconds(duration)}</span>
        </div>
      </div>

      {/* Control Buttons Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {canControlPlayback ? (
            <>
              <button
                onClick={togglePlay}
                className="p-3 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-950/40 transition active:scale-95"
                title={isPlaying ? 'Pause shared music' : 'Play shared music'}
              >
                {isPlaying ? <Pause size={17} /> : <Play size={17} className="translate-x-0.5" />}
              </button>
              <button
                onClick={handleNextTrack}
                className="p-2.5 rounded-xl bg-lounge-card hover:bg-lounge-cardHover text-lounge-textSecondary hover:text-white transition border border-lounge-border"
                title="Next track"
              >
                <SkipForward size={16} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-lounge-textMuted bg-lounge-card px-3 py-1.5 rounded-xl border border-lounge-border">
              <Lock size={12} className="text-amber-500" />
              <span>Playback synchronized by Host</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLibrary(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition"
          >
            <Plus size={14} /> Browse Music Catalogues
          </button>
        </div>
      </div>

      {/* Upcoming Room Queue */}
      <div className="pt-3 border-t border-lounge-border space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-white">
          <span className="flex items-center gap-1.5">
            <ListMusic size={14} className="text-amber-500" /> Room Queue ({playlist.length})
          </span>
          <span className="text-[10px] text-lounge-textMuted font-mono">
            {room.musicPermissions.whoCanAdd === 'host_only' ? 'Host Only Queue' : 'Open to All'}
          </span>
        </div>

        {playlist.length === 0 ? (
          <p className="text-xs text-lounge-textMuted text-center py-4 bg-lounge-card/40 rounded-xl border border-dashed border-lounge-border">
            Queue is empty. Click &quot;Browse Music Catalogues&quot; to add tracks.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {playlist.map((track, idx) => (
              <div
                key={track.trackId || idx}
                className="flex items-center justify-between p-2 rounded-xl bg-lounge-card border border-lounge-border hover:border-lounge-borderSubtle transition text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-lounge-textMuted text-[10px] w-4 text-center">{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{track.title}</p>
                    <p className="text-[10px] text-lounge-textMuted truncate">{track.artist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono text-lounge-textMuted">
                  <span className="capitalize">{track.category}</span>
                  <span>{formatSeconds(track.duration)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DUAL CATALOGUE MUSIC LIBRARY MODAL */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-lounge-surface border border-lounge-border rounded-3xl p-6 shadow-2xl space-y-5 max-h-[88vh] flex flex-col animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-lounge-border">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Disc3 size={18} className="text-amber-500" /> Shredoo Music Catalogue
                </h3>
                <p className="text-xs text-lounge-textMuted">
                  Browse Independent music (Jamendo & CC) or Popular Indian & Bollywood music
                </p>
              </div>
              <button
                onClick={() => setShowLibrary(false)}
                className="p-1.5 rounded-lg text-lounge-textMuted hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Category Switcher Tabs */}
            <div className="flex gap-2 border-b border-lounge-border pb-3">
              <button
                onClick={() => setActiveCategory('independent')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeCategory === 'independent'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-lounge-card text-lounge-textSecondary hover:text-white'
                }`}
              >
                <Globe size={13} /> Independent Music (Jamendo / CC)
              </button>

              <button
                onClick={() => setActiveCategory('bollywood')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeCategory === 'bollywood'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-lounge-card text-lounge-textSecondary hover:text-white'
                }`}
              >
                <Radio size={13} /> Bollywood & Indian Music
              </button>

              <button
                onClick={() => setActiveCategory('upload')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeCategory === 'upload'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-lounge-card text-lounge-textSecondary hover:text-white'
                }`}
              >
                <Upload size={13} /> Upload Audio
              </button>
            </div>

            {/* Search Input for Catalogues */}
            {activeCategory !== 'upload' && (
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-3.5 text-lounge-textMuted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value, activeCategory);
                  }}
                  placeholder={`Search ${activeCategory === 'independent' ? 'indie, ambient, lofi, or electronic' : 'Hindi film tracks, Arijit Singh, A.R. Rahman, Pritam...'}...`}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-lounge-bg border border-lounge-border text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Licensing notice banner */}
            {licensingNotice && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert size={15} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] leading-relaxed">{licensingNotice}</p>
                </div>
                <button onClick={() => setLicensingNotice(null)} className="text-lounge-textMuted hover:text-white">
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Results Content Area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {activeCategory === 'upload' ? (
                <div className="p-8 text-center rounded-2xl bg-lounge-card border border-dashed border-lounge-border space-y-3">
                  <Upload size={32} className="mx-auto text-amber-500" />
                  <h4 className="text-sm font-bold text-white">Upload Your Personal Audio Track</h4>
                  <p className="text-xs text-lounge-textMuted max-w-sm mx-auto">
                    Select an MP3 or WAV file from your device to stream in this private lounge.
                  </p>
                  <label className="inline-block px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer">
                    {uploading ? 'Processing & Uploading...' : 'Choose Audio File'}
                    <input
                      type="file"
                      accept="audio/*"
                      disabled={uploading}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : searching ? (
                <div className="py-12 text-center text-xs text-lounge-textMuted">
                  Searching {activeCategory} catalog...
                </div>
              ) : (
                (activeCategory === 'independent' ? searchResults.independent : searchResults.bollywood).map(
                  (track) => {
                    const isB2BRequired = track.playbackAvailability === 'licensing_pending';

                    return (
                      <div
                        key={track.trackId}
                        className="p-3 rounded-xl bg-lounge-card border border-lounge-border hover:border-lounge-borderSubtle transition flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={track.artworkUrl}
                            alt={track.title}
                            className="w-11 h-11 rounded-lg bg-lounge-bg object-cover border border-lounge-border flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{track.title}</h4>
                            <p className="text-[11px] text-lounge-textMuted truncate">{track.artist}</p>
                            <span className="text-[10px] text-lounge-textMuted block font-mono">
                              {track.album} • {track.licenseType}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isB2BRequired ? (
                            <button
                              onClick={() => handleQueueTrack(track)}
                              className="px-3 py-1.5 rounded-lg bg-lounge-bg hover:bg-lounge-surface text-amber-400 border border-amber-500/30 text-[11px] font-semibold transition"
                              title="Commercial B2B License needed for full audio stream"
                            >
                              Catalogue Info
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                handleQueueTrack(track);
                                setShowLibrary(false);
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition flex items-center gap-1"
                            >
                              <Plus size={12} /> Add to Lounge
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
