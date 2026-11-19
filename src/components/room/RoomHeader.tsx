'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
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
  Share2,
  QrCode as QrCodeIcon,
  X,
  Smartphone,
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
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const isHost = currentUserRole === 'owner' || room.hostId === currentUserId;

  const getInviteUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/room/${room.id}?code=${room.inviteCode}`;
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(room.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(getInviteUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = async () => {
    const inviteUrl = getInviteUrl();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${room.name} on SHREDoo`,
          text: `Join my private SHREDoo listening lounge! Invite Code: ${room.inviteCode}`,
          url: inviteUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share not allowed, fall through to QR modal
      }
    }
    // Generate QR code and open modal
    openQrCodeModal();
  };

  const openQrCodeModal = async () => {
    const inviteUrl = getInviteUrl();
    try {
      const url = await QRCode.toDataURL(inviteUrl, {
        width: 320,
        margin: 1.5,
        color: {
          dark: '#0c0e12',
          light: '#ffffff',
        },
      });
      setQrDataUrl(url);
      setShowQrModal(true);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  const simulationUsers = [
    { id: room.hostId, name: `${room.hostName} (Host)`, role: 'owner' },
    { id: 'user_member_2', name: 'Elena Riff', role: 'member' },
    { id: 'user_member_3', name: 'Marcus Bass', role: 'member' },
    { id: 'user_member_4', name: 'Chloe Drums', role: 'moderator' },
    { id: 'user_bad_actor', name: 'Noise Troll (Blocked)', role: 'guest' },
  ];

  return (
    <>
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
                  <span className="hidden sm:inline">Room Management</span>
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
            <div className="relative flex-shrink-0">
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

          {/* Right Badges: Invite Code, QR Code, Native Share, & Capacity */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Share / Mobile Invite Button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-xs font-semibold text-amber-400 transition shadow-sm"
              title="Share Room / Invite Friends"
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>

            {/* QR Code Scan Button */}
            <button
              onClick={openQrCodeModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lounge-bg hover:bg-lounge-card border border-lounge-border text-xs text-lounge-textSecondary hover:text-white transition"
              title="View QR Code for Mobile Scanning"
            >
              <QrCodeIcon size={14} className="text-amber-500" />
              <span className="hidden sm:inline">QR Code</span>
            </button>

            {/* Room Code Badge */}
            <button
              onClick={copyInvite}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lounge-bg hover:bg-lounge-card border border-lounge-border text-xs font-mono text-amber-400 transition"
              title="Click to copy invitation code"
            >
              <span>Code: <strong>{room.inviteCode}</strong></span>
              {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-lounge-textMuted" />}
            </button>

            {/* Copy Link Button */}
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lounge-bg hover:bg-lounge-card border border-lounge-border text-xs text-lounge-textSecondary hover:text-white transition"
              title="Click to copy invitation link"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-amber-500" />}
              <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
            </button>

            {/* Capacity Pill */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lounge-bg border border-lounge-border text-xs font-semibold text-lounge-textSecondary">
              <Users size={14} className="text-amber-500" />
              <span className="font-mono text-white">{membersCount}</span>
              <span className="text-lounge-textMuted">/</span>
              <span className="font-mono text-lounge-textMuted">{room.maxCapacity}</span>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Instant Join Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-lounge-surface border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl shadow-amber-950/60 relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-lounge-textMuted hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div>
              <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-2">
                <Smartphone size={24} />
              </div>
              <h3 className="text-base font-bold text-white">Scan to Join on Mobile</h3>
              <p className="text-xs text-lounge-textMuted mt-1">
                Point your phone camera at this QR code to open & join &quot;{room.name}&quot; instantly.
              </p>
            </div>

            {qrDataUrl && (
              <div className="p-3 bg-white rounded-2xl inline-block shadow-inner">
                <img
                  src={qrDataUrl}
                  alt={`QR Code to join ${room.name}`}
                  className="w-56 h-56 mx-auto rounded-xl"
                />
              </div>
            )}

            <div className="p-3 rounded-xl bg-lounge-card border border-lounge-border text-xs flex items-center justify-between">
              <span className="text-lounge-textMuted font-mono">Invite Code:</span>
              <span className="font-mono font-bold text-amber-400 tracking-wider text-sm">{room.inviteCode}</span>
              <button
                onClick={copyInvite}
                className="px-2 py-1 rounded-lg bg-lounge-bg text-white hover:text-amber-400 transition font-sans text-[11px]"
              >
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
            </div>

            <button
              onClick={copyInviteLink}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2"
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink ? 'Invite Link Copied to Clipboard' : 'Copy Direct Room Link'}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
