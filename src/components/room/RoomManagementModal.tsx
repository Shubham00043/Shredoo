'use client';

import React, { useState } from 'react';
import { Room, RoomMember, BlockedMember } from '@/types';
import {
  X,
  Settings,
  Users,
  Key,
  Music,
  Palette,
  Ban,
  Crown,
  MoreVertical,
  UserX,
  ShieldAlert,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Eye,
  Sliders,
  AlertTriangle,
  Lock,
  Unlock,
  Clock,
  Upload,
} from 'lucide-react';
import { MemberProfileModal } from './MemberProfileModal';

interface RoomManagementModalProps {
  room: Room;
  members: RoomMember[];
  blockedMembers: BlockedMember[];
  currentUserId: string;
  isHost: boolean;
  onClose: () => void;
  onRefreshRoom: () => void;
}

type TabType =
  | 'general'
  | 'members'
  | 'invitation'
  | 'music'
  | 'appearance'
  | 'blocked'
  | 'ownership';

export function RoomManagementModal({
  room,
  members,
  blockedMembers,
  currentUserId,
  isHost,
  onClose,
  onRefreshRoom,
}: RoomManagementModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [profileMember, setProfileMember] = useState<RoomMember | null>(null);

  // General Settings state
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description);
  const [maxCapacity, setMaxCapacity] = useState(room.maxCapacity);
  const [isClosed, setIsClosed] = useState(room.isClosed);
  const [coverImage, setCoverImage] = useState(room.coverImage);

  // Music Permissions state
  const [whoCanAdd, setWhoCanAdd] = useState(room.musicPermissions.whoCanAdd);
  const [whoCanControl, setWhoCanControl] = useState(room.musicPermissions.whoCanControl);

  // Confirmation Modals state
  const [confirmKickMember, setConfirmKickMember] = useState<RoomMember | null>(null);
  const [confirmBlockMember, setConfirmBlockMember] = useState<RoomMember | null>(null);
  const [blockReason, setBlockReason] = useState('Violated lounge listening rules');
  const [confirmTransferMember, setConfirmTransferMember] = useState<RoomMember | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Actions loading & feedback
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // 1. Kick Member (Temporary removal)
  const handleKickParticipant = async () => {
    if (!confirmKickMember) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({
          userId: confirmKickMember.userId,
          reason: 'Removed by host',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove participant');

      showFeedback('success', `${confirmKickMember.username} was removed from the room and disconnected.`);
      setConfirmKickMember(null);
      onRefreshRoom();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Block Member (Permanent room restriction)
  const handleBlockParticipant = async () => {
    if (!confirmBlockMember) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({
          userId: confirmBlockMember.userId,
          reason: blockReason,
          username: confirmBlockMember.username,
          userAvatar: confirmBlockMember.userAvatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to block participant');

      showFeedback('success', `${confirmBlockMember.username} is permanently blocked from rejoining this room.`);
      setConfirmBlockMember(null);
      onRefreshRoom();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Unblock Member
  const handleUnblock = async (targetUserId: string, username: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}/unblock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({ userId: targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unblock participant');

      showFeedback('success', `${username} has been unblocked. They can rejoin with a valid code.`);
      onRefreshRoom();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Transfer Ownership
  const handleTransferOwnership = async () => {
    if (!confirmTransferMember) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}/transfer-host`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({ newHostId: confirmTransferMember.userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to transfer ownership');

      showFeedback('success', `Ownership successfully transferred to ${confirmTransferMember.username}.`);
      setConfirmTransferMember(null);
      onRefreshRoom();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Update General Settings
  const handleSaveGeneral = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({
          name,
          description,
          maxCapacity: Number(maxCapacity),
          isClosed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      showFeedback('success', 'Room settings updated.');
      onRefreshRoom();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 6. Regenerate Invitation Code
  const handleRegenerateCode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({ regenerateInviteCode: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to regenerate code');

      showFeedback('success', `New invitation code generated: ${data.room.inviteCode}`);
      onRefreshRoom();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 7. Save Music Permissions
  const handleSaveMusicPermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({
          musicPermissions: { whoCanAdd, whoCanControl },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save music permissions');

      showFeedback('success', 'Music permissions updated.');
      onRefreshRoom();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 8. Save Cover Image
  const handleSaveAppearance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': currentUserId,
        },
        body: JSON.stringify({ coverImage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save appearance');

      showFeedback('success', 'Room cover image updated.');
      onRefreshRoom();
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cover image file upload from user device gallery
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setCoverImage(data.url);
        showFeedback('success', 'Cover photo uploaded from your device.');
      }
    } catch (err) {
      console.error(err);
      showFeedback('error', 'Failed to upload photo.');
    } finally {
      setUploadingCover(false);
    }
  };

  // 9. Delete Room
  const handleDeleteRoom = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: 'DELETE',
        headers: {
          'x-shredoo-user-id': currentUserId,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete room');

      alert('Room has been deleted.');
      window.location.href = '/';
    } catch (err: any) {
      showFeedback('error', err.message);
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, isLink: boolean) => {
    navigator.clipboard.writeText(text);
    if (isLink) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Minimal Understated Themes (Requirement 14)
  const appearancePresets = [
    {
      title: 'Warm Charcoal',
      url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Nordic Sage',
      url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Smoked Bronze',
      url: 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Minimal Dark',
      url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-lounge-surface border border-lounge-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-lounge-border bg-lounge-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Settings size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Room Management Panel</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  HOST CONTROL
                </span>
              </div>
              <p className="text-xs text-lounge-textMuted">{room.name} • Up to 5 Participants</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-lounge-textMuted hover:text-white hover:bg-lounge-surface transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between transition ${
              message.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border-b border-emerald-900'
                : 'bg-red-950/60 text-red-300 border-b border-red-900'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-lounge-textMuted hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Main Body with Sidebar Tabs */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Navigation Tabs */}
          <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-lounge-border bg-lounge-surface p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {[
              { id: 'members', label: 'Members', icon: Users, count: members.length },
              { id: 'general', label: 'General Settings', icon: Sliders },
              { id: 'invitation', label: 'Invitation & Privacy', icon: Key },
              { id: 'music', label: 'Music Permissions', icon: Music },
              { id: 'appearance', label: 'Room Appearance', icon: Palette },
              { id: 'blocked', label: 'Blocked Members', icon: Ban, count: blockedMembers.length },
              { id: 'ownership', label: 'Transfer Ownership', icon: Crown },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition text-left whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-lounge-textSecondary hover:text-white hover:bg-lounge-card'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isActive ? 'bg-black/30 text-white' : 'bg-lounge-card text-lounge-textMuted'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-6 overflow-y-auto bg-lounge-card/40">
            {/* TAB 1: MEMBERS */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-lounge-border">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Users size={15} className="text-amber-500" /> Active Participants
                    </h3>
                    <p className="text-[11px] text-lounge-textMuted">
                      Capacity: {members.length} / {room.maxCapacity} participants
                    </p>
                  </div>
                  <button
                    onClick={onRefreshRoom}
                    className="p-1.5 rounded-lg text-lounge-textMuted hover:text-white hover:bg-lounge-surface transition"
                    title="Refresh participant list"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>

                <div className="space-y-2">
                  {members.map((member) => {
                    const isSelf = member.userId === currentUserId;
                    const isMemberHost = member.role === 'owner' || member.userId === room.hostId;
                    const isMenuOpen = activeMenuUserId === member.userId;

                    return (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-lounge-surface border border-lounge-border hover:border-lounge-borderSubtle transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={member.userAvatar}
                              alt={member.username}
                              className="w-9 h-9 rounded-xl bg-lounge-bg object-cover border border-lounge-border"
                            />
                            <span
                              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-lounge-surface ${
                                member.status === 'connected'
                                  ? 'bg-emerald-500'
                                  : member.status === 'reconnecting'
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">{member.username}</span>
                              {isSelf && (
                                <span className="text-[10px] text-lounge-textMuted bg-lounge-card px-1.5 py-0.2 rounded font-mono">
                                  You
                                </span>
                              )}
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
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

                            <div className="flex items-center gap-2 text-[11px] text-lounge-textMuted mt-0.5 font-mono">
                              <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {new Date(member.joinedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span>•</span>
                              <span className="capitalize">{member.status}</span>
                            </div>
                          </div>
                        </div>

                        {/* Three-Dot Actions Menu */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActiveMenuUserId(isMenuOpen ? null : member.userId)
                            }
                            className="p-1.5 rounded-lg text-lounge-textMuted hover:text-white hover:bg-lounge-card transition"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 mt-1 w-52 rounded-xl bg-lounge-surface border border-lounge-border shadow-2xl py-1.5 z-30 animate-in fade-in">
                              <button
                                onClick={() => {
                                  setProfileMember(member);
                                  setActiveMenuUserId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-lounge-textSecondary hover:text-white hover:bg-lounge-card transition"
                              >
                                <Eye size={14} className="text-amber-500" />
                                View Profile
                              </button>

                              {isHost && !isMemberHost && (
                                <>
                                  <div className="my-1 border-t border-lounge-border" />
                                  <button
                                    onClick={() => {
                                      setConfirmKickMember(member);
                                      setActiveMenuUserId(null);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-400 hover:bg-amber-950/20 transition"
                                  >
                                    <UserX size={14} />
                                    Remove from Room (Kick)
                                  </button>

                                  <button
                                    onClick={() => {
                                      setConfirmBlockMember(member);
                                      setActiveMenuUserId(null);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-950/20 transition font-semibold"
                                  >
                                    <Ban size={14} />
                                    Block from Rejoining
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: GENERAL SETTINGS */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-lounge-border">
                  <Sliders size={15} className="text-amber-500" /> General Room Settings
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-lounge-textSecondary mb-1">Room Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-lounge-surface border border-lounge-border text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-lounge-textSecondary mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-lounge-surface border border-lounge-border text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Capacity Slider */}
                <div className="p-4 rounded-xl bg-lounge-surface border border-lounge-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white">Maximum Room Capacity</span>
                      <p className="text-[11px] text-lounge-textMuted">Intimate lounges up to 5 participants</p>
                    </div>
                    <span className="text-xs font-bold text-amber-500 font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      {maxCapacity} participants
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="5"
                    step="1"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Room Access Status */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-lounge-surface border border-lounge-border">
                  <div>
                    <span className="text-xs font-semibold text-white">Room Access Status</span>
                    <p className="text-[11px] text-lounge-textMuted">
                      {isClosed ? 'Room is Closed to new participants' : 'Room is Open for code joins'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsClosed(!isClosed)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      isClosed
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {isClosed ? <Lock size={13} /> : <Unlock size={13} />}
                    {isClosed ? 'Reopen Room' : 'Close Room'}
                  </button>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-950/20 border border-red-900/40 transition"
                  >
                    <Trash2 size={13} /> Delete Room
                  </button>

                  <button
                    onClick={handleSaveGeneral}
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm"
                  >
                    {loading ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: INVITATION & PRIVACY */}
            {activeTab === 'invitation' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-lounge-border">
                  <Key size={15} className="text-amber-500" /> Room Invitation Code & Security
                </h3>

                <div className="p-4 rounded-xl bg-lounge-surface border border-lounge-border space-y-3">
                  <span className="text-xs font-semibold text-lounge-textSecondary">Active Invitation Code</span>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 px-4 py-3 rounded-xl bg-lounge-bg border border-lounge-border font-mono text-xl tracking-widest text-amber-500 font-bold select-all text-center sm:text-left">
                      {room.inviteCode}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(room.inviteCode);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl bg-lounge-card hover:bg-lounge-cardHover text-white text-xs font-semibold transition border border-lounge-border"
                      >
                        {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        {copiedCode ? 'Copied' : 'Copy Code'}
                      </button>

                      <button
                        onClick={() => {
                          const origin = typeof window !== 'undefined' ? window.location.origin : '';
                          navigator.clipboard.writeText(`${origin}/room/${room.id}?code=${room.inviteCode}`);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl bg-lounge-card hover:bg-lounge-cardHover text-amber-400 text-xs font-semibold transition border border-lounge-border"
                      >
                        {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-amber-500" />}
                        {copiedLink ? 'Copied Link' : 'Copy Link'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-lounge-border/60">
                    <button
                      onClick={handleRegenerateCode}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 text-xs font-semibold transition cursor-pointer"
                    >
                      <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                      Regenerate Invitation Code
                    </button>
                    <p className="text-[11px] text-lounge-textMuted mt-1.5 leading-relaxed">
                      <strong className="text-amber-400">Security Invalidation:</strong> Regenerating a code generates a brand new cryptographically random code and immediately invalidates all previous room codes and invite links.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MUSIC PERMISSIONS */}
            {activeTab === 'music' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-lounge-border">
                  <Music size={15} className="text-amber-500" /> Music Permissions
                </h3>

                <div className="p-4 rounded-xl bg-lounge-surface border border-lounge-border space-y-3">
                  <span className="text-xs font-semibold text-white">Who can add songs to the queue?</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => setWhoCanAdd('everyone')}
                      className={`p-3 rounded-xl border text-left transition ${
                        whoCanAdd === 'everyone'
                          ? 'bg-amber-500/10 border-amber-500 text-white'
                          : 'bg-lounge-card border-lounge-border text-lounge-textMuted'
                      }`}
                    >
                      <strong className="block text-white">Everyone</strong>
                      <span className="text-[11px]">All members can queue songs</span>
                    </button>

                    <button
                      onClick={() => setWhoCanAdd('host_only')}
                      className={`p-3 rounded-xl border text-left transition ${
                        whoCanAdd === 'host_only'
                          ? 'bg-amber-500/10 border-amber-500 text-white'
                          : 'bg-lounge-card border-lounge-border text-lounge-textMuted'
                      }`}
                    >
                      <strong className="block text-white">Host Only</strong>
                      <span className="text-[11px]">Only host manages queue</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-lounge-surface border border-lounge-border space-y-3">
                  <span className="text-xs font-semibold text-white">Who can control playback?</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => setWhoCanControl('everyone')}
                      className={`p-3 rounded-xl border text-left transition ${
                        whoCanControl === 'everyone'
                          ? 'bg-amber-500/10 border-amber-500 text-white'
                          : 'bg-lounge-card border-lounge-border text-lounge-textMuted'
                      }`}
                    >
                      <strong className="block text-white">Everyone</strong>
                      <span className="text-[11px]">Any member can play/pause</span>
                    </button>

                    <button
                      onClick={() => setWhoCanControl('host_only')}
                      className={`p-3 rounded-xl border text-left transition ${
                        whoCanControl === 'host_only'
                          ? 'bg-amber-500/10 border-amber-500 text-white'
                          : 'bg-lounge-card border-lounge-border text-lounge-textMuted'
                      }`}
                    >
                      <strong className="block text-white">Host Only</strong>
                      <span className="text-[11px]">Strict host sync control</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveMusicPermissions}
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition"
                  >
                    Save Music Permissions
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: ROOM APPEARANCE (Upload from gallery or select understated theme) */}
            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-lounge-border">
                  <Palette size={15} className="text-amber-500" /> Room Appearance & Cover Image
                </h3>

                <div>
                  <span className="block text-xs font-semibold text-lounge-textSecondary mb-1.5">
                    Current Cover Preview
                  </span>
                  <div className="h-32 rounded-xl border border-lounge-border overflow-hidden relative">
                    <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* Upload from Gallery / Device */}
                <div className="p-4 rounded-xl bg-lounge-surface border border-lounge-border space-y-2">
                  <span className="text-xs font-semibold text-white block">Upload Image from Gallery</span>
                  <p className="text-[11px] text-lounge-textMuted">
                    Choose a photo from your device to use as the room cover.
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lounge-card hover:bg-lounge-cardHover border border-lounge-border text-xs text-white font-semibold transition cursor-pointer">
                    <Upload size={13} /> {uploadingCover ? 'Uploading photo...' : 'Select Device Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingCover}
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Understated Minimalist Themes */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-lounge-textSecondary block">
                    Or Choose an Understated Theme Preset
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {appearancePresets.map((preset) => (
                      <button
                        key={preset.title}
                        onClick={() => setCoverImage(preset.url)}
                        className={`h-16 rounded-xl overflow-hidden border relative text-left transition ${
                          coverImage === preset.url
                            ? 'border-amber-500 ring-2 ring-amber-500/30'
                            : 'border-lounge-border'
                        }`}
                      >
                        <img src={preset.url} alt={preset.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 p-2 flex items-end">
                          <span className="text-[11px] font-semibold text-white">{preset.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveAppearance}
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition"
                  >
                    Save Appearance
                  </button>
                </div>
              </div>
            )}

            {/* TAB 6: BLOCKED MEMBERS */}
            {activeTab === 'blocked' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-lounge-border">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Ban size={15} className="text-red-400" /> Room-Level Blocklist
                    </h3>
                    <p className="text-[11px] text-lounge-textMuted">
                      Blocked users cannot rejoin even with a valid invitation code.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-red-950/40 text-red-400 border border-red-900">
                    {blockedMembers.length} blocked
                  </span>
                </div>

                {blockedMembers.length === 0 ? (
                  <p className="text-xs text-lounge-textMuted text-center py-8 bg-lounge-surface rounded-xl border border-dashed border-lounge-border">
                    No blocked members in this room.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {blockedMembers.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-lounge-surface border border-lounge-border"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={b.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${b.userId}`}
                            alt={b.username}
                            className="w-8 h-8 rounded-lg bg-lounge-bg object-cover"
                          />
                          <div>
                            <span className="text-xs font-semibold text-red-400 block">{b.username}</span>
                            <span className="text-[10px] text-lounge-textMuted font-mono">
                              Reason: {b.reason || 'Restricted by host'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnblock(b.userId, b.username)}
                          disabled={loading}
                          className="px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800 text-[11px] font-semibold transition"
                        >
                          Unblock User
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 7: TRANSFER OWNERSHIP */}
            {activeTab === 'ownership' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-lounge-border">
                  <Crown size={15} className="text-amber-500" /> Transfer Room Ownership
                </h3>

                <p className="text-xs text-lounge-textMuted">
                  Select an active room member to grant them complete administrative control over this lounge.
                </p>

                <div className="space-y-2">
                  {members.filter((m) => m.userId !== currentUserId).length === 0 ? (
                    <p className="text-xs text-lounge-textMuted text-center py-6 bg-lounge-surface rounded-xl border border-dashed border-lounge-border">
                      No other participants in the room. Invite friends before transferring.
                    </p>
                  ) : (
                    members
                      .filter((m) => m.userId !== currentUserId)
                      .map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between p-3 rounded-xl bg-lounge-surface border border-lounge-border hover:border-amber-500/40 transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={member.userAvatar}
                              alt={member.username}
                              className="w-8 h-8 rounded-lg bg-lounge-bg object-cover"
                            />
                            <div>
                              <span className="text-xs font-semibold text-white block">{member.username}</span>
                              <span className="text-[10px] text-lounge-textMuted font-mono">{member.role}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => setConfirmTransferMember(member)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold transition flex items-center gap-1"
                          >
                            <Crown size={12} /> Transfer Host
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-lounge-border bg-lounge-card flex items-center justify-between text-xs text-lounge-textMuted">
          <span>Room: {room.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-lounge-surface hover:bg-lounge-card border border-lounge-border text-white text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* CONFIRMATION DIALOG 1: REMOVE (KICK) */}
      {confirmKickMember && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-lounge-surface border border-amber-500/60 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserX size={18} className="text-amber-500" /> Remove {confirmKickMember.username} from Room?
            </h3>
            <p className="text-xs text-lounge-textMuted leading-relaxed">
              They will be disconnected from the active voice session immediately. This is a temporary kick (they can rejoin with a valid code if not blocked).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmKickMember(null)}
                className="px-4 py-2 rounded-xl bg-lounge-card text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleKickParticipant}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition"
              >
                {loading ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG 2: BLOCK */}
      {confirmBlockMember && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-lounge-surface border border-red-500/60 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Ban size={18} className="text-red-400" /> Block {confirmBlockMember.username} from Room?
            </h3>
            <p className="text-xs text-lounge-textMuted leading-relaxed">
              They will be disconnected immediately and prevented from rejoining, even with a valid invitation code. Only the room owner can unblock them.
            </p>
            <div>
              <label className="block text-[11px] text-lounge-textMuted mb-1">Reason for Room Block</label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-lounge-bg border border-lounge-border text-white text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmBlockMember(null)}
                className="px-4 py-2 rounded-xl bg-lounge-card text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockParticipant}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition"
              >
                {loading ? 'Blocking...' : 'Confirm Block'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG 3: TRANSFER */}
      {confirmTransferMember && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-lounge-surface border border-amber-500/60 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Crown size={18} className="text-amber-500" /> Confirm Host Transfer
            </h3>
            <p className="text-xs text-lounge-textMuted leading-relaxed">
              Make <span className="font-bold text-white">{confirmTransferMember.username}</span> the new Owner of this room? You will become a regular member.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmTransferMember(null)}
                className="px-4 py-2 rounded-xl bg-lounge-card text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferOwnership}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition"
              >
                {loading ? 'Transferring...' : 'Transfer Ownership'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG 4: DELETE */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-lounge-surface border border-red-500 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trash2 size={18} className="text-red-400" /> Delete Room Permanently?
            </h3>
            <p className="text-xs text-lounge-textMuted leading-relaxed">
              All participants will be disconnected, LiveKit session destroyed, and all records deleted.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-lounge-card text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRoom}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition"
              >
                {loading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER PROFILE MODAL */}
      {profileMember && (
        <MemberProfileModal member={profileMember} onClose={() => setProfileMember(null)} />
      )}
    </div>
  );
}
