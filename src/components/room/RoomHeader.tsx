'use client';

import React, { useState } from 'react';
import { Room, RoomRole } from '@/types';
import {
  Settings,
  Users,
  Copy,
  Check,
  Crown,
  LogOut,
  Sliders,
  UserCheck,
  Volume2,
  Flag,
} from 'lucide-react';

interface RoomHeaderProps {
  room: Room;
  currentUserId: string;
  currentUserRole: RoomRole | null;
  membersCount: number;
  onOpenManagement: () => void;
  onSwitchUser: (userId: string, username: string) => void;
}

export function RoomHeader({
  room,
  currentUserId,
  currentUserRole,
  membersCount,
  onOpenManagement,
  onSwitchUser,
}: RoomHeaderProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const isHost = currentUserRole === 'owner' || room.hostId === currentUserId;

  const copyInvite = () => {
    navigator.clipboard.writeText(room.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteUrl = `${origin}/room/${room.id}?code=${room.inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const simulationUsers = [
    { id: room.hostId, name: `${room.hostName} (Host)`, role: 'owner' },
    { id: 'user_member_2', name: 'Elena Riff', role: 'member' },
    { id: 'user_member_3', name: 'Marcus Bass', role: 'member' },
    { id: 'user_member_4', name: 'Chloe Drums', role: 'moderator' },
    { id: 'user_bad_actor', name: 'Noise Troll (Blocked)', role: 'guest' },
  ];

  return (
    <div className="relative rounded-3xl overflow-hidden border border-lounge-border bg-lounge-surface shadow-2xl mb-6">
      {/* Background Banner with Cover Image */}
      <div className="relative h-44 sm:h-52 w-full overflow-hidden">
        <img
          src={room.coverImage}
          alt={room.name}
          className="w-full h-full object-cover filter brightness-60 contrast-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-lounge-surface via-lounge-surface/60 to-transparent" />

        {/* Top Floating Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          {/* Identity Simulation Switcher */}
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <span className="text-[10px] text-lounge-textMuted font-mono flex items-center gap-1">
              <UserCheck size={12} className="text-amber-500" /> Perspective:
            </span>
            <select
              value={currentUserId}
              onChange={(e) => {
                const selected = simulationUsers.find((u) => u.id === e.target.value);
                if (selected) onSwitchUser(selected.id, selected.name);
              }}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer text-xs"
            >
              {simulationUsers.map((u) => (
                <option key={u.id} value={u.id} className="bg-lounge-surface text-white">
                  {u.name} [{u.role.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Host Management Button */}
            {isHost && (
              <button
                onClick={onOpenManagement}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition shadow-md shadow-amber-950/40 border border-amber-500/30 group"
              >
                <Settings size={14} className="group-hover:rotate-90 transition duration-300" />
                <span>Room Management</span>
              </button>
            )}

            <button
              onClick={async () => {
                const details = prompt('Please explain why you are reporting this room:');
                if (!details || !details.trim()) return;
                try {
                  const res = await fetch('/api/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      roomId: room.id,
                      roomName: room.name,
                      reason: 'room_misconduct',
                      details: details.trim(),
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  alert('Thank you. Room report submitted to the moderation team.');
                } catch (e: any) {
                  alert(e.message || 'Failed to submit report');
                }
              }}
              className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-rose-400 hover:text-rose-300 border border-white/10 text-xs transition"
              title="Report Room Misconduct"
            >
              <Flag size={15} />
            </button>

            <button
              onClick={() => (window.location.href = '/')}
              className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-lounge-textMuted hover:text-white border border-white/10 text-xs transition"
              title="Leave Room"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Room Details Bar */}
      <div className="px-6 pb-6 pt-0 relative -mt-14 sm:-mt-16 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          <div className="relative">
            <img
              src={room.hostAvatar}
              alt={room.hostName}
              className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl border-4 border-lounge-surface bg-lounge-bg object-cover shadow-xl"
            />
            <span
              className="absolute -top-2 -right-2 p-1.5 rounded-xl bg-amber-500 text-black shadow"
              title="Room Host"
            >
              <Crown size={13} />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{room.name}</h1>
              {room.isClosed ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Closed to joins
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Open Lounge
                </span>
              )}
            </div>
            <p className="text-xs text-lounge-textMuted max-w-xl mt-1 line-clamp-2">{room.description}</p>
            <p className="text-[11px] text-lounge-textMuted font-mono mt-0.5">Host: {room.hostName}</p>
          </div>
        </div>

        {/* Right Badges: Invite Code & Link & Capacity */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button
            onClick={copyInvite}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lounge-bg hover:bg-lounge-card border border-lounge-border text-xs font-mono text-amber-400 transition"
            title="Click to copy invitation code"
          >
            <span>Code: <strong>{room.inviteCode}</strong></span>
            {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-lounge-textMuted" />}
          </button>

          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lounge-bg hover:bg-lounge-card border border-lounge-border text-xs text-lounge-textSecondary hover:text-white transition"
            title="Click to copy invitation link"
          >
            {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-amber-500" />}
            <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lounge-bg border border-lounge-border text-xs font-semibold text-lounge-textSecondary">
            <Users size={14} className="text-amber-500" />
            <span className="font-mono text-white">{membersCount}</span>
            <span className="text-lounge-textMuted">/</span>
            <span className="font-mono text-lounge-textMuted">{room.maxCapacity}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
