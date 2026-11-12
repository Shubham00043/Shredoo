'use client';

import React, { useState } from 'react';
import { RoomMember } from '@/types';
import {
  MoreVertical,
  UserX,
  Ban,
  Eye,
  Mic,
  MicOff,
  Clock,
  Radio,
  Sliders,
} from 'lucide-react';

interface LiveVoiceGridProps {
  members: RoomMember[];
  currentUserId: string;
  isHost: boolean;
  onOpenProfile: (member: RoomMember) => void;
  onKickMember: (member: RoomMember) => void;
  onBlockMember: (member: RoomMember) => void;
  onAdjustVolume?: (member: RoomMember) => void;
}

export function LiveVoiceGrid({
  members,
  currentUserId,
  isHost,
  onOpenProfile,
  onKickMember,
  onBlockMember,
  onAdjustVolume,
}: LiveVoiceGridProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
      {members.map((member) => {
        const isSelf = member.userId === currentUserId;
        const isOwner = member.role === 'owner';
        const isSpeaking = Boolean(member.isSpeaking && !member.isMuted && member.status === 'connected');
        const isMenuOpen = activeMenuId === member.userId;

        return (
          <div
            key={member.userId}
            className={`relative rounded-2xl bg-lounge-surface border transition-all duration-300 p-4 flex flex-col justify-between overflow-hidden shadow-md group ${
              isSpeaking
                ? 'border-amber-500/80 shadow-lg shadow-amber-950/20 bg-lounge-card'
                : 'border-lounge-border hover:border-lounge-borderSubtle'
            }`}
          >
            {/* Top Bar with Connection and Three-Dot Menu */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    member.status === 'connected'
                      ? 'bg-emerald-500'
                      : member.status === 'reconnecting'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-red-500'
                  }`}
                />
                <span className="text-[10px] uppercase font-semibold text-lounge-textMuted tracking-wider font-mono">
                  {member.status}
                </span>
              </div>

              {/* Three-Dot Menu */}
              <div className="relative">
                <button
                  onClick={() => setActiveMenuId(isMenuOpen ? null : member.userId)}
                  className="p-1 rounded-lg text-lounge-textMuted hover:text-white hover:bg-lounge-card transition"
                >
                  <MoreVertical size={15} />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-1 w-48 rounded-xl bg-lounge-card border border-lounge-border shadow-2xl py-1 z-30 animate-in fade-in">
                    <button
                      onClick={() => {
                        onOpenProfile(member);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-lounge-textSecondary hover:text-white hover:bg-lounge-surface transition"
                    >
                      <Eye size={13} className="text-amber-500" /> View Profile
                    </button>

                    {onAdjustVolume && !isSelf && (
                      <button
                        onClick={() => {
                          onAdjustVolume(member);
                          setActiveMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-lounge-textSecondary hover:text-white hover:bg-lounge-surface transition"
                      >
                        <Sliders size={13} /> Adjust Voice Volume
                      </button>
                    )}

                    {isHost && !isOwner && (
                      <>
                        <div className="my-1 border-t border-lounge-border" />
                        <button
                          onClick={() => {
                            onKickMember(member);
                            setActiveMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-950/20 transition"
                        >
                          <UserX size={13} /> Remove from Room
                        </button>
                        <button
                          onClick={() => {
                            onBlockMember(member);
                            setActiveMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/20 transition font-semibold"
                        >
                          <Ban size={13} /> Block from Rejoining
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Avatar & Speaking Waves */}
            <div className="flex flex-col items-center my-2">
              <div className="relative">
                <img
                  src={member.userAvatar}
                  alt={member.username}
                  className={`w-20 h-20 rounded-2xl object-cover bg-lounge-bg transition-all duration-300 ${
                    isSpeaking
                      ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-lounge-surface scale-105 shadow-md'
                      : 'border border-lounge-border'
                  }`}
                />
                <span
                  className={`absolute -bottom-1 -right-1 p-1 rounded-full text-black shadow ${
                    member.isMuted ? 'bg-red-500 text-white' : 'bg-emerald-500 text-black'
                  }`}
                  title={member.isMuted ? 'Microphone muted' : 'Microphone active'}
                >
                  {member.isMuted ? <MicOff size={11} /> : <Mic size={11} />}
                </span>
              </div>

              <h4 className="text-sm font-semibold text-white mt-3 truncate max-w-[140px] text-center">
                {member.username}
              </h4>

              {/* Speaking indicator and waveform */}
              <div className="h-5 flex items-center justify-center mt-1">
                {isSpeaking ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                    <div className="flex items-end gap-0.5 h-3">
                      <span className="w-0.5 bg-amber-400 rounded-full animate-soundbar" />
                      <span className="w-0.5 bg-amber-400 rounded-full animate-soundbar [animation-delay:0.15s]" />
                      <span className="w-0.5 bg-amber-400 rounded-full animate-soundbar [animation-delay:0.3s]" />
                    </div>
                    <span>Speaking</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {isSelf && (
                      <span className="text-[9px] font-mono text-lounge-textMuted bg-lounge-card px-1.5 py-0.2 rounded">
                        You
                      </span>
                    )}
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        member.role === 'owner'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : member.role === 'moderator'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : 'bg-lounge-card text-lounge-textMuted border border-lounge-border'
                      }`}
                    >
                      {member.role}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Metadata */}
            <div className="pt-3 border-t border-lounge-border flex items-center justify-between text-[11px] text-lounge-textMuted font-mono">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {new Date(member.joinedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span>{member.isMuted ? 'Muted' : 'Live Voice'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
