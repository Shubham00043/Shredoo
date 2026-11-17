'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Room, MusicTrack, RoomMusicRecord } from '@/types';
import { webAudioEngine } from '@/lib/audio/webAudioManager';
import { MusicUploadModal } from '@/components/room/MusicUploadModal';
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
  Trash2,
  Library,
  User,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface MusicPlayerProps {
  room: Room;
  playlist: MusicTrack[];
  isHostOrMod: boolean;
  currentUserId: string;
  musicVolume: number;
  onRefreshRoom: () => void;
}

type PlayerTab = 'now_playing' | 'queue' | 'room_library' | 'my_uploads' | 'catalogues';

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

  const [activeTab, setActiveTab] = useState<PlayerTab>('now_playing');
  const [localTime, setLocalTime] = useState(serverPosition);
  const [duration, setDuration] = useState(currentTrack?.duration || 210);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Room library state
  const [roomLibrary, setRoomLibrary] = useState<RoomMusicRecord[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  // Search catalogues state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'independent' | 'bollywood'>('independent');
  const [searchResults, setSearchResults] = useState<{ bollywood: MusicTrack[]; independent: MusicTrack[] }>({
    bollywood: [],
    independent: [],
  });
  const [searching, setSearching] = useState(false);
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

  // Synchronized playback engine & drift correction
  useEffect(() => {
    if (audioRef.current && currentTrack?.sourceUrl) {
      if (isPlaying) {
        if (Math.abs(audioRef.current.currentTime - serverPosition) > 2) {
          audioRef.current.currentTime = serverPosition;
        }
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, serverPosition, currentTrack]);

  // Fetch Room Library
  const fetchRoomLibrary = async () => {
    setLibraryLoading(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}/music/library`, {
        headers: { 'x-shredoo-user-id': currentUserId },
      });
      const data = await res.json();
      if (data.tracks) {
        setRoomLibrary(data.tracks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'room_library' || activeTab === 'my_uploads') {
      fetchRoomLibrary();
    }
  }, [activeTab, room.id]);

  // Catalogue search
  const handleSearchCatalogues = async (query: string, cat: string) => {
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
    if (activeTab === 'catalogues') {
      handleSearchCatalogues(searchQuery, activeCategory);
    }
  }, [activeTab, activeCategory]);

  // Host playback controls
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
        body: JSON.stringify({ action: nextAction, position: localTime }),
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

  const handlePreviousTrack = async () => {
    if (!canControlPlayback) return;
    try {
      await fetch(`/api/rooms/${room.id}/music/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({ action: 'previous' }),
      });
      onRefreshRoom();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canControlPlayback) return;
    const newPos = parseFloat(e.target.value);
    setLocalTime(newPos);
    if (audioRef.current) audioRef.current.currentTime = newPos;

    try {
      await fetch(`/api/rooms/${room.id}/music/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({ action: 'seek', position: newPos }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlayNow = async (track: MusicTrack | RoomMusicRecord) => {
    if (!canControlPlayback) return;
    const playItem: MusicTrack = {
      trackId: track.trackId,
      providerId: (track as any).providerId || 'user_upload',
      category: 'independent',
      title: track.title,
      artist: track.artist,
      album: track.album,
      artworkUrl:
        track.artworkUrl ||
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      duration: track.duration,
      playbackAvailability: 'full_playback',
      licenseType: track.licenseType,
      territory: 'Worldwide',
      attribution: `Queued by ${(track as any).uploadedByUsername || 'Member'}`,
      sourceUrl: track.sourceUrl,
    };

    try {
      await fetch(`/api/rooms/${room.id}/music/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({ action: 'play_track', track: playItem }),
      });
      onRefreshRoom();
      setActiveTab('now_playing');
    } catch (e) {
      console.error(e);
    }
  };

  // Queue track handler
  const handleQueueTrack = async (track: MusicTrack | RoomMusicRecord) => {
    if (!canAddSongs) return;

    if ((track as any).playbackAvailability === 'licensing_pending') {
      setLicensingNotice(
        `Commercial Licensing Notice for "${track.title}": Indian popular music catalogues require an enterprise B2B partner key for full streaming. Metadata preview active.`
      );
    }

    const queueItem: MusicTrack = {
      trackId: track.trackId,
      providerId: (track as any).providerId || 'user_upload',
      category: 'independent',
      title: track.title,
      artist: track.artist,
      album: track.album,
      artworkUrl:
        track.artworkUrl ||
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      duration: track.duration,
      playbackAvailability: 'full_playback',
      licenseType: track.licenseType,
      territory: 'Worldwide',
      attribution: `Queued by ${(track as any).uploadedByUsername || 'Member'}`,
      sourceUrl: track.sourceUrl,
    };

    try {
      await fetch(`/api/rooms/${room.id}/music/queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({ track: queueItem }),
      });
      onRefreshRoom();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveFromQueue = async (trackId: string) => {
    try {
      await fetch(`/api/rooms/${room.id}/music/queue?trackId=${encodeURIComponent(trackId)}`, {
        method: 'DELETE',
        headers: { 'x-shredoo-user-id': currentUserId },
      });
      onRefreshRoom();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearQueue = async () => {
    if (!isHostOrMod) return;
    try {
      await fetch(`/api/rooms/${room.id}/music/queue?action=clear`, {
        method: 'DELETE',
        headers: { 'x-shredoo-user-id': currentUserId },
      });
      onRefreshRoom();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLibraryTrack = async (trackId: string) => {
    try {
      await fetch(`/api/rooms/${room.id}/music/library?trackId=${encodeURIComponent(trackId)}`, {
        method: 'DELETE',
        headers: { 'x-shredoo-user-id': currentUserId },
      });
      await fetchRoomLibrary();
      onRefreshRoom();
    } catch (e) {
      console.error(e);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="bg-lounge-surface border border-lounge-border rounded-2xl shadow-xl overflow-hidden flex flex-col">
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

      {/* Music Header & Navigation Tabs */}
      <div className="p-4 border-b border-lounge-border bg-lounge-card/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Radio size={16} />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Shared Lounge Audio</span>
            <span className="text-[10px] text-lounge-textMuted font-mono">
              Independent Local Volume: {Math.round(musicVolume * 100)}%
            </span>
          </div>
        </div>

        {/* Action Button: Upload Music (Opens modal) */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-md shadow-amber-950/30 active:scale-95"
        >
          <Upload size={13} /> Upload Songs
        </button>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-lounge-border px-4 bg-lounge-bg/50 overflow-x-auto gap-1 py-1.5 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('now_playing')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
            activeTab === 'now_playing'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-lounge-textMuted hover:text-white'
          }`}
        >
          <Disc3 size={13} /> Now Playing
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
            activeTab === 'queue'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-lounge-textMuted hover:text-white'
          }`}
        >
          <ListMusic size={13} /> Shared Queue ({playlist.length})
        </button>

        <button
          onClick={() => setActiveTab('room_library')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
            activeTab === 'room_library'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-lounge-textMuted hover:text-white'
          }`}
        >
          <Library size={13} /> Room Library ({roomLibrary.length})
        </button>

        <button
          onClick={() => setActiveTab('my_uploads')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
            activeTab === 'my_uploads'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-lounge-textMuted hover:text-white'
          }`}
        >
          <User size={13} /> My Uploads
        </button>

        <button
          onClick={() => setActiveTab('catalogues')}
          className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
            activeTab === 'catalogues'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-lounge-textMuted hover:text-white'
          }`}
        >
          <Globe size={13} /> Catalogues
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-5 flex-1 space-y-4">
        {/* TAB 1: NOW PLAYING */}
        {activeTab === 'now_playing' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-lounge-bg border border-lounge-border flex-shrink-0 shadow-lg">
                {currentTrack?.artworkUrl ? (
                  <img
                    src={currentTrack.artworkUrl}
                    alt="Album Artwork"
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      isPlaying ? 'scale-105' : 'opacity-85'
                    }`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lounge-textMuted bg-lounge-card">
                    <Disc3 size={32} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white truncate">
                    {currentTrack?.title || 'No track playing'}
                  </h3>
                  {isPlaying && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                      SYNCHRONIZED
                    </span>
                  )}
                </div>

                <p className="text-xs text-lounge-textMuted truncate mt-0.5">
                  {currentTrack?.artist || 'Upload music or select a song from the library to start'}
                </p>

                {currentTrack && (
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-lounge-textMuted font-mono">
                    <span className="truncate">{currentTrack.licenseType}</span>
                    <span>•</span>
                    <span className="capitalize">{currentTrack.providerId?.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Progress Bar for Host / Visual Progress for Member */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max={duration || 1}
                step="1"
                value={localTime}
                onChange={handleSeek}
                disabled={!canControlPlayback}
                className={`w-full h-1.5 rounded-full appearance-none bg-lounge-bg cursor-pointer transition ${
                  canControlPlayback ? 'accent-amber-500' : 'accent-amber-600/40 cursor-default'
                }`}
              />
              <div className="flex justify-between text-[10px] text-lounge-textMuted font-mono">
                <span>{formatSeconds(localTime)}</span>
                <span>{formatSeconds(duration)}</span>
              </div>
            </div>

            {/* Host Controls Bar */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                {canControlPlayback ? (
                  <>
                    <button
                      onClick={handlePreviousTrack}
                      className="p-2.5 rounded-xl bg-lounge-card hover:bg-lounge-cardHover text-lounge-textSecondary hover:text-white transition border border-lounge-border"
                      title="Previous"
                    >
                      <SkipBack size={16} />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="p-3.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-950/40 transition active:scale-95"
                      title={isPlaying ? 'Pause for all' : 'Play for all'}
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
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
                  onClick={() => setActiveTab('room_library')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lounge-card hover:bg-lounge-cardHover text-white text-xs font-semibold border border-lounge-border transition"
                >
                  <Library size={13} /> Room Music
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SHARED QUEUE */}
        {activeTab === 'queue' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-white">
              <span>Upcoming Queue ({playlist.length})</span>
              {isHostOrMod && playlist.length > 0 && (
                <button
                  onClick={handleClearQueue}
                  className="text-[11px] text-red-400 hover:text-red-300 transition"
                >
                  Clear Queue
                </button>
              )}
            </div>

            {playlist.length === 0 ? (
              <div className="text-center py-8 bg-lounge-card/40 rounded-2xl border border-dashed border-lounge-border space-y-2">
                <ListMusic size={28} className="mx-auto text-lounge-textMuted opacity-40" />
                <p className="text-xs text-lounge-textMuted font-medium">Shared queue is currently empty</p>
                <button
                  onClick={() => setActiveTab('room_library')}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline font-semibold"
                >
                  Pick from Room Library <ArrowRight size={12} />
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {playlist.map((track, idx) => (
                  <div
                    key={track.trackId || idx}
                    className="p-3 rounded-xl bg-lounge-card border border-lounge-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="font-mono text-lounge-textMuted text-xs w-4 text-center">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white truncate">{track.title}</p>
                        <p className="text-[10px] text-lounge-textMuted truncate">
                          {track.artist} {track.addedByName && `• Queued by ${track.addedByName}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-lounge-textMuted">
                        {formatSeconds(track.duration)}
                      </span>
                      {canControlPlayback && (
                        <button
                          onClick={() => handlePlayNow(track)}
                          className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-semibold hover:bg-amber-500/20 transition"
                        >
                          Play Now
                        </button>
                      )}
                      {(isHostOrMod || track.addedBy === currentUserId) && (
                        <button
                          onClick={() => handleRemoveFromQueue(track.trackId)}
                          className="p-1 rounded text-lounge-textMuted hover:text-red-400 transition"
                          title="Remove from queue"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3 & 4: ROOM MUSIC LIBRARY / MY UPLOADS */}
        {(activeTab === 'room_library' || activeTab === 'my_uploads') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-white">
              <span>
                {activeTab === 'my_uploads' ? 'Songs Uploaded by You' : 'Room Uploaded Library'}
              </span>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus size={12} /> Upload More Songs
              </button>
            </div>

            {roomLibrary.length === 0 ? (
              <div className="text-center py-8 bg-lounge-card/40 rounded-2xl border border-dashed border-lounge-border space-y-2">
                <Library size={28} className="mx-auto text-lounge-textMuted opacity-40" />
                <p className="text-xs text-lounge-textMuted font-medium">No songs uploaded to this room yet</p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-md shadow-amber-950/40"
                >
                  Upload First Song
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(activeTab === 'my_uploads'
                  ? roomLibrary.filter((t) => t.uploadedBy === currentUserId)
                  : roomLibrary
                ).map((track) => (
                  <div
                    key={track.trackId}
                    className="p-3 rounded-xl bg-lounge-card border border-lounge-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white truncate">{track.title}</p>
                      <p className="text-[10px] text-lounge-textMuted truncate">
                        {track.artist} • Uploaded by {track.uploadedByUsername}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-lounge-textMuted">
                        {formatSeconds(track.duration)}
                      </span>
                      {canAddSongs && (
                        <button
                          onClick={() => handleQueueTrack(track)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-semibold hover:bg-amber-500/20 transition flex items-center gap-1"
                          title="Add to shared queue"
                        >
                          <Plus size={10} /> Queue
                        </button>
                      )}
                      {canControlPlayback && (
                        <button
                          onClick={() => handlePlayNow(track)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[10px] font-bold hover:bg-amber-700 transition"
                          title="Play now"
                        >
                          Play
                        </button>
                      )}
                      {(isHostOrMod || track.uploadedBy === currentUserId) && (
                        <button
                          onClick={() => handleDeleteLibraryTrack(track.trackId)}
                          className="p-1 rounded text-lounge-textMuted hover:text-red-400 transition"
                          title="Delete from library"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CATALOGUES */}
        {activeTab === 'catalogues' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-lounge-textMuted" />
                <input
                  type="text"
                  placeholder="Search Jamendo Creative Commons or Bollywood catalogue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchCatalogues(searchQuery, activeCategory)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-lounge-bg border border-lounge-border text-white text-xs focus:outline-none focus:border-amber-500 transition"
                />
              </div>
              <div className="flex bg-lounge-bg border border-lounge-border rounded-xl p-0.5 text-[11px] font-semibold">
                <button
                  onClick={() => setActiveCategory('independent')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    activeCategory === 'independent' ? 'bg-amber-600 text-white' : 'text-lounge-textMuted'
                  }`}
                >
                  Independent (CC)
                </button>
                <button
                  onClick={() => setActiveCategory('bollywood')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    activeCategory === 'bollywood' ? 'bg-amber-600 text-white' : 'text-lounge-textMuted'
                  }`}
                >
                  Bollywood
                </button>
              </div>
            </div>

            {licensingNotice && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs">
                {licensingNotice}
              </div>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(activeCategory === 'independent' ? searchResults.independent : searchResults.bollywood).map(
                (track) => (
                  <div
                    key={track.trackId}
                    className="p-3 rounded-xl bg-lounge-card border border-lounge-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white truncate">{track.title}</p>
                      <p className="text-[10px] text-lounge-textMuted truncate">
                        {track.artist} • {track.licenseType}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-lounge-textMuted">
                        {formatSeconds(track.duration)}
                      </span>
                      {canAddSongs && (
                        <button
                          onClick={() => handleQueueTrack(track)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-semibold hover:bg-amber-500/20 transition flex items-center gap-1"
                        >
                          <Plus size={10} /> Queue
                        </button>
                      )}
                      {canControlPlayback && track.playbackAvailability === 'full_playback' && (
                        <button
                          onClick={() => handlePlayNow(track)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[10px] font-bold hover:bg-amber-700 transition"
                        >
                          Play
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Multiple-Song Upload Modal */}
      <MusicUploadModal
        roomId={room.id}
        currentUserId={currentUserId}
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={(tracks) => {
          fetchRoomLibrary();
          onRefreshRoom();
          setActiveTab('room_library');
        }}
      />
    </div>
  );
}
