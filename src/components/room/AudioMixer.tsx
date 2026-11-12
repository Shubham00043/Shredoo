'use client';

import React, { useState, useEffect } from 'react';
import { RoomMember } from '@/types';
import { webAudioEngine } from '@/lib/audio/webAudioManager';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Headphones,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

interface AudioMixerProps {
  members: RoomMember[];
  currentUserId: string;
  musicVolume: number;
  onMusicVolumeChange: (vol: number) => void;
  isMicMuted: boolean;
  onToggleMic: () => void;
  isDeafened: boolean;
  onToggleDeafened: () => void;
}

export function AudioMixer({
  members,
  currentUserId,
  musicVolume,
  onMusicVolumeChange,
  isMicMuted,
  onToggleMic,
  isDeafened,
  onToggleDeafened,
}: AudioMixerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [mutedStates, setMutedStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load persisted volumes
    const initialVols: Record<string, number> = {};
    const initialMutes: Record<string, boolean> = {};

    members.forEach((m) => {
      initialVols[m.userId] = webAudioEngine.getParticipantVolume(m.userId);
      initialMutes[m.userId] = webAudioEngine.isParticipantMuted(m.userId);
    });

    setVolumes(initialVols);
    setMutedStates(initialMutes);
  }, [members]);

  const handleVoiceVolumeChange = (userId: string, vol: number) => {
    webAudioEngine.setParticipantVolume(userId, vol);
    setVolumes((prev) => ({ ...prev, [userId]: vol }));
  };

  const handleToggleMuteUser = (userId: string) => {
    const isNowMuted = webAudioEngine.toggleMuteParticipant(userId);
    setMutedStates((prev) => ({ ...prev, [userId]: isNowMuted }));
  };

  const handleMusicSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    webAudioEngine.setMusicVolume(val);
    onMusicVolumeChange(val);
  };

  return (
    <div className="bg-lounge-surface border border-lounge-border rounded-2xl shadow-xl overflow-hidden transition-all">
      {/* Header bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 bg-lounge-surface flex items-center justify-between cursor-pointer hover:bg-lounge-card transition select-none border-b border-lounge-border"
      >
        <div className="flex items-center gap-2.5 text-white">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <SlidersHorizontal size={15} />
          </div>
          <div>
            <span className="text-xs font-bold tracking-tight block">Independent Audio Mixer</span>
            <span className="text-[10px] text-lounge-textMuted font-mono">
              Individual GainNodes • No Master Volume
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick mic toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMic();
            }}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              isMicMuted
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
            title={isMicMuted ? 'Microphone is Muted' : 'Microphone is Live'}
          >
            {isMicMuted ? <MicOff size={13} /> : <Mic size={13} />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleDeafened();
            }}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              isDeafened
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-lounge-card text-lounge-textSecondary'
            }`}
            title={isDeafened ? 'Deafened' : 'Listening'}
          >
            <Headphones size={13} />
          </button>

          {isOpen ? (
            <ChevronUp size={16} className="text-lounge-textMuted" />
          ) : (
            <ChevronDown size={16} className="text-lounge-textMuted" />
          )}
        </div>
      </div>

      {/* Expanded Mixer Controls */}
      {isOpen && (
        <div className="p-4 space-y-5 text-xs">
          {/* Control A: BACKGROUND MUSIC VOLUME (Local to this device only) */}
          <div className="p-3.5 rounded-xl bg-lounge-card border border-lounge-border space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Volume2 size={14} className="text-amber-500" /> Background Music Volume
                </span>
                <p className="text-[10px] text-lounge-textMuted">
                  Applies only to your device. Does not affect friends.
                </p>
              </div>
              <span className="font-mono text-amber-500 font-bold text-xs">
                {Math.round(musicVolume * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={musicVolume}
              onChange={handleMusicSlider}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-lounge-bg rounded-lg"
            />
          </div>

          {/* Control B: INDIVIDUAL PERSON VOICE VOLUME */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-lounge-textSecondary uppercase tracking-wider block">
                Individual Participant Voice
              </span>
              <span className="text-[10px] text-lounge-textMuted font-mono">
                Dedicated GainNodes
              </span>
            </div>

            {members.filter((m) => m.userId !== currentUserId).length === 0 ? (
              <p className="text-[11px] text-lounge-textMuted text-center py-4 bg-lounge-card/40 rounded-xl border border-dashed border-lounge-border">
                No remote participants yet. Share invite code to start talking.
              </p>
            ) : (
              members
                .filter((m) => m.userId !== currentUserId)
                .map((member) => {
                  const currentVol = volumes[member.userId] ?? 100;
                  const isMuted = mutedStates[member.userId] ?? false;

                  return (
                    <div
                      key={member.userId}
                      className="p-3 rounded-xl bg-lounge-card border border-lounge-border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={member.userAvatar}
                            alt={member.username}
                            className="w-7 h-7 rounded-lg bg-lounge-bg object-cover border border-lounge-border"
                          />
                          <div>
                            <span className="font-semibold text-white truncate text-xs block">
                              {member.username}
                            </span>
                            <span className="text-[10px] text-lounge-textMuted">
                              {member.isSpeaking ? 'Speaking' : 'Listening'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-lounge-textMuted w-9 text-right">
                            {isMuted ? 'Muted' : `${currentVol}%`}
                          </span>

                          <button
                            onClick={() => handleToggleMuteUser(member.userId)}
                            className={`p-1.5 rounded-lg transition ${
                              isMuted
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-lounge-bg text-lounge-textMuted hover:text-white'
                            }`}
                            title={isMuted ? 'Unmute on my device' : 'Mute on my device'}
                          >
                            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                          </button>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="200"
                        step="5"
                        disabled={isMuted}
                        value={currentVol}
                        onChange={(e) =>
                          handleVoiceVolumeChange(member.userId, parseInt(e.target.value))
                        }
                        className="w-full accent-amber-500 cursor-pointer h-1.5 bg-lounge-bg rounded-lg disabled:opacity-40"
                      />
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
