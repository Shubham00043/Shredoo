'use client';

import React, { useEffect, useState, use } from 'react';
import { useUser } from '@clerk/nextjs';
import { Room, RoomMember, BlockedMember, Song, RoomRole, MusicTrack } from '@/types';
import { Navbar } from '@/components/Navbar';
import { RoomHeader } from '@/components/room/RoomHeader';
import { LiveVoiceGrid } from '@/components/room/LiveVoiceGrid';
import { AudioMixer } from '@/components/room/AudioMixer';
import { MusicPlayer } from '@/components/room/MusicPlayer';
import { RoomManagementModal } from '@/components/room/RoomManagementModal';
import { MemberProfileModal } from '@/components/room/MemberProfileModal';
import { AudioSetupModal } from '@/components/room/AudioSetupModal';
import { AudioDiagnosticsPanel } from '@/components/room/AudioDiagnosticsPanel';
import { AcceptanceTestPanel } from '@/components/AcceptanceTestPanel';
import {
  ShieldAlert,
  Ban,
  Lock,
  Loader2,
  AlertTriangle,
  Volume2,
  Key,
  Mic,
  Headphones,
} from 'lucide-react';

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;
  const { user } = useUser();

  // Active user identity for session & perspective testing
  const [currentUserId, setCurrentUserId] = useState<string>('user_host_1');
  const [currentUserName, setCurrentUserName] = useState<string>('Alex Shredder (Host)');

  // Sync Clerk user when loaded if not overridden
  useEffect(() => {
    if (user?.id && currentUserId === 'user_host_1') {
      setCurrentUserId(user.id);
      setCurrentUserName(user.fullName || user.username || 'Shredoo Member');
    }
  }, [user]);

  // Room data
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [blockedMembers, setBlockedMembers] = useState<BlockedMember[]>([]);
  const [playlist, setPlaylist] = useState<MusicTrack[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<RoomRole | null>('owner');
  const [isCurrentUserMember, setIsCurrentUserMember] = useState(true);
  const [isCurrentUserBlocked, setIsCurrentUserBlocked] = useState(false);

  // Audio mixer states (STRICTLY NO MASTER VOLUME: Only background music & individual voice gains)
  const [musicVolume, setMusicVolume] = useState(0.7);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // Audio Diagnostics state
  const [voiceConnectionStatus, setVoiceConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const [musicPlaybackStatus, setMusicPlaybackStatus] = useState<'playing' | 'paused' | 'buffering'>('playing');

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [isAudioSetupOpen, setIsAudioSetupOpen] = useState(false);
  const [profileMember, setProfileMember] = useState<RoomMember | null>(null);

  // Kicked / Blocked Notification Modal
  const [removalNotice, setRemovalNotice] = useState<{
    type: 'kicked' | 'blocked';
    message: string;
  } | null>(null);

  // Join form state (if not yet in room)
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // Fetch and sync room data
  const fetchRoomData = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        headers: {
          'x-shredoo-user-id': currentUserId,
          'x-shredoo-user-name': currentUserName,
        },
      });

      if (res.status === 404) {
        setError('Room not found or has been closed by the host.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch room');

      setRoom(data.room);
      setMembers(data.members || []);
      setPlaylist(data.playlist || []);
      setBlockedMembers(data.blockedMembers || []);
      setCurrentUserRole(data.currentUserRole);
      setIsCurrentUserMember(data.isCurrentUserMember);
      setIsCurrentUserBlocked(data.isCurrentUserBlocked);

      // Check if current user has been blocked
      if (data.isCurrentUserBlocked) {
        setRemovalNotice({
          type: 'blocked',
          message: 'The room host has blocked you from participating in this lounge.',
        });
      } else if (
        !data.isCurrentUserMember &&
        data.room.hostId !== currentUserId &&
        !loading &&
        members.some((m) => m.userId === currentUserId)
      ) {
        setRemovalNotice({
          type: 'kicked',
          message: 'You have been removed from the lounge by the host.',
        });
      }

      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomData();
    // Poll every 3 seconds for real-time synchronization
    const timer = setInterval(fetchRoomData, 3000);
    return () => clearInterval(timer);
  }, [roomId, currentUserId]);

  // Handle Switch User (Perspective test)
  const handleSwitchUser = (newId: string, newName: string) => {
    setCurrentUserId(newId);
    setCurrentUserName(newName);
    setLoading(true);
  };

  // Join Room with Code
  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true);
    setJoinError(null);

    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({
          userId: currentUserId,
          username: currentUserName,
          inviteCode: joinCodeInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      await fetchRoomData();
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const isHost = currentUserRole === 'owner' || room?.hostId === currentUserId;

  if (loading) {
    return (
      <div className="min-h-screen bg-lounge-bg text-lounge-text flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <Loader2 size={36} className="text-amber-500 animate-spin mb-3" />
          <p className="text-xs font-semibold text-lounge-textMuted">Connecting to Lounge & Audio Stream...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-lounge-bg text-lounge-text flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center max-w-md mx-auto">
          <ShieldAlert size={44} className="text-red-400 mb-3 mx-auto" />
          <h2 className="text-lg font-bold text-white mb-2">Lounge Unavailable</h2>
          <p className="text-xs text-lounge-textMuted mb-6">{error || 'This lounge does not exist or has been closed.'}</p>
          <a
            href="/"
            className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-lg shadow-amber-950/40"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // SCREEN 1: BLOCKED USER RESTRICTION
  if (isCurrentUserBlocked) {
    return (
      <div className="min-h-screen bg-lounge-bg text-lounge-text flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
          <div className="p-4 rounded-3xl bg-red-950/40 border border-red-800/60 text-red-400 mb-4 shadow-2xl">
            <Ban size={44} className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-xs text-red-300 font-semibold mb-2">
            You are blocked from entering &quot;{room.name}&quot;.
          </p>
          <p className="text-xs text-lounge-textMuted mb-6 bg-lounge-surface p-4 rounded-2xl border border-lounge-border leading-relaxed">
            The room host has restricted your access to this specific listening lounge.
            Even with an invitation code, you cannot enter unless the host explicitly unblocks your account in Room Management.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => handleSwitchUser(room.hostId, `${room.hostName} (Host)`)}
              className="px-4 py-2 rounded-xl bg-lounge-card hover:bg-lounge-border border border-lounge-border text-xs font-semibold text-lounge-text transition"
            >
              Switch to Host View
            </button>
            <a
              href="/"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white transition shadow-lg shadow-amber-950/40"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 2: NOT A MEMBER YET (Requires Join with Code)
  if (!isCurrentUserMember && !isHost) {
    return (
      <div className="min-h-screen bg-lounge-bg text-lounge-text flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-lounge-surface border border-lounge-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-1">{room.name}</h2>
              <p className="text-xs text-lounge-textMuted">{room.description}</p>
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-lounge-textMuted font-mono">
                <span>Capacity: {members.length} / {room.maxCapacity}</span>
                <span>•</span>
                <span>Host: {room.hostName}</span>
              </div>
            </div>

            {room.isClosed ? (
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs text-center space-y-1">
                <Lock size={20} className="mx-auto text-amber-400 mb-1" />
                <p className="font-bold">This lounge is currently closed</p>
                <p className="text-lounge-textMuted text-[11px]">The host is not accepting new participants right now.</p>
              </div>
            ) : members.length >= room.maxCapacity ? (
              <div className="p-4 rounded-2xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs text-center space-y-1">
                <AlertTriangle size={20} className="mx-auto text-red-400 mb-1" />
                <p className="font-bold">Lounge is at Capacity</p>
                <p className="text-lounge-textMuted text-[11px]">Maximum capacity is {room.maxCapacity} participants.</p>
              </div>
            ) : (
              <form onSubmit={handleJoinWithCode} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-lounge-textMuted mb-1.5">
                    Enter Invitation Code
                  </label>
                  <div className="flex items-center gap-2">
                    <Key size={16} className="text-amber-500" />
                    <input
                      type="text"
                      required
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. SHRED1"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-lounge-card border border-lounge-border text-white text-sm font-mono tracking-wider focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                {joinError && (
                  <p className="text-xs text-red-400 bg-red-950/50 p-2.5 rounded-xl border border-red-900 font-medium">
                    {joinError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={joining}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-lg shadow-amber-950/40"
                >
                  {joining ? 'Entering Lounge...' : 'Enter Listening Lounge'}
                </button>
              </form>
            )}

            <div className="pt-3 border-t border-lounge-border flex justify-between text-xs text-lounge-textMuted">
              <span>Identity: {currentUserName}</span>
              <button
                onClick={() => handleSwitchUser(room.hostId, `${room.hostName} (Host)`)}
                className="text-amber-500 hover:underline"
              >
                Switch to Host
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 3: ACTIVE ROOM EXPERIENCE
  return (
    <div className="min-h-screen bg-lounge-bg text-lounge-text flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Room Header with Cover Banner, Host Info, Invite Code, Capacity, and Host Controls */}
        <RoomHeader
          room={room}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          membersCount={members.length}
          onOpenManagement={() => setIsManagementOpen(true)}
          onSwitchUser={handleSwitchUser}
        />

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Left Section: Live Voice Cards + Synced Music Player */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Voice Participant Cards Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-lounge-textMuted flex items-center gap-1.5">
                  <Volume2 size={14} className="text-amber-500" /> Live Voice Channels ({members.length}/{room.maxCapacity})
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsAudioSetupOpen(true)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-500 hover:text-amber-400 transition"
                  >
                    <Mic size={12} /> Test Microphone
                  </button>
                  <span className="text-[11px] text-lounge-textMuted font-mono">WebRTC Voice Stream</span>
                </div>
              </div>

              <LiveVoiceGrid
                members={members}
                currentUserId={currentUserId}
                isHost={isHost}
                onOpenProfile={(m) => setProfileMember(m)}
                onKickMember={() => setIsManagementOpen(true)}
                onBlockMember={() => setIsManagementOpen(true)}
              />
            </div>

            {/* Synced Music Player & Queue (Dual Providers: Jamendo CC + Bollywood B2B Preview) */}
            <MusicPlayer
              room={room}
              playlist={playlist}
              isHostOrMod={isHost || currentUserRole === 'moderator'}
              currentUserId={currentUserId}
              musicVolume={musicVolume}
              onRefreshRoom={fetchRoomData}
            />
          </div>

          {/* Right Section: Individual Audio Mixer + Audio Diagnostics */}
          <div className="space-y-6">
            {/* Audio Mixer (Only 2 volume types: Background Music and Individual Voice gains) */}
            <AudioMixer
              members={members}
              currentUserId={currentUserId}
              musicVolume={musicVolume}
              onMusicVolumeChange={setMusicVolume}
              isMicMuted={isMicMuted}
              onToggleMic={() => setIsMicMuted(!isMicMuted)}
              isDeafened={isDeafened}
              onToggleDeafened={() => setIsDeafened(!isDeafened)}
            />

            {/* Live Audio Diagnostics & Troubleshooting Panel */}
            <AudioDiagnosticsPanel
              isMicMuted={isMicMuted}
              voiceConnectionStatus={voiceConnectionStatus}
              musicPlaybackStatus={musicPlaybackStatus}
              remoteParticipantsCount={Math.max(0, members.length - 1)}
            />

            {/* Room Information & Role Panel */}
            <div className="bg-lounge-surface border border-lounge-border rounded-2xl p-5 shadow-xl space-y-3">
              <span className="text-xs font-bold text-white block">Session Permissions</span>
              <div className="p-3 rounded-xl bg-lounge-card border border-lounge-border flex items-center justify-between text-xs">
                <span className="text-lounge-textMuted">Your Assigned Role:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                    currentUserRole === 'owner'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : currentUserRole === 'moderator'
                      ? 'bg-lounge-sage/20 text-lounge-sage border border-lounge-sage/30'
                      : 'bg-lounge-bg text-lounge-textMuted border border-lounge-border'
                  }`}
                >
                  {currentUserRole || 'member'}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-lounge-textMuted font-mono">
                <p>• Room ID: {room.id}</p>
                <p>• Maximum Capacity: {room.maxCapacity} participants</p>
                <p>• Music Control: {room.musicPermissions.whoCanControl === 'everyone' ? 'Open to All' : 'Host Only'}</p>
                <p>• Queue Access: {room.musicPermissions.whoCanAdd === 'everyone' ? 'Open to All' : 'Host/Mods Only'}</p>
              </div>

              {isHost && (
                <button
                  onClick={() => setIsManagementOpen(true)}
                  className="w-full mt-2 py-2 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  Configure Room Settings
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* DEDICATED ROOM MANAGEMENT PANEL MODAL */}
      {isManagementOpen && (
        <RoomManagementModal
          room={room}
          members={members}
          blockedMembers={blockedMembers}
          currentUserId={currentUserId}
          isHost={isHost}
          onClose={() => setIsManagementOpen(false)}
          onRefreshRoom={fetchRoomData}
        />
      )}

      {/* PRE-JOIN / ON-DEMAND AUDIO SETUP MODAL */}
      <AudioSetupModal
        isOpen={isAudioSetupOpen}
        onClose={() => setIsAudioSetupOpen(false)}
      />

      {/* MEMBER PROFILE MODAL */}
      {profileMember && (
        <MemberProfileModal member={profileMember} onClose={() => setProfileMember(null)} />
      )}

      {/* REAL-TIME KICK/BLOCK POPUP NOTIFICATION */}
      {removalNotice && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-lounge-surface border border-red-800/80 rounded-3xl p-6 shadow-2xl text-center animate-in zoom-in-95 space-y-4">
            <div className="p-3 rounded-2xl bg-red-950/60 border border-red-800 text-red-400 w-fit mx-auto">
              {removalNotice.type === 'blocked' ? <Ban size={36} /> : <AlertTriangle size={36} />}
            </div>
            <h3 className="text-lg font-bold text-white">
              {removalNotice.type === 'blocked' ? 'Access Restricted' : 'Removed from Lounge'}
            </h3>
            <p className="text-xs text-lounge-textMuted">{removalNotice.message}</p>
            <p className="text-[11px] text-lounge-textMuted bg-lounge-card p-3 rounded-xl border border-lounge-border">
              Your voice session and room permissions have been terminated by the room host.
            </p>
            <button
              onClick={() => (window.location.href = '/')}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition"
            >
              Exit to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ACCEPTANCE TEST SUITE PANEL */}
      <AcceptanceTestPanel onTestCompleted={fetchRoomData} />
    </div>
  );
}
