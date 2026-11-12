'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Navbar } from '@/components/Navbar';
import {
  Plus,
  Users,
  Music,
  Palette,
  ArrowLeft,
  Loader2,
  Upload,
  Check,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const PRESET_COVERS = [
  {
    title: 'Warm Charcoal',
    subtitle: 'Muted studio textures',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Nordic Sage',
    subtitle: 'Calm ambient aesthetic',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Smoked Bronze',
    subtitle: 'Deep acoustic tones',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Minimal Dark',
    subtitle: 'Pure monochromatic lounge',
    url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
  },
];

export default function CreateRoomPage() {
  const router = useRouter();
  const { user } = useUser();

  const [name, setName] = useState('Acoustic & Progressive Lounge');
  const [description, setDescription] = useState('Warm tones, relaxed listening sessions, and shared high-fidelity audio.');
  const [maxCapacity, setMaxCapacity] = useState(5);
  const [whoCanAdd, setWhoCanAdd] = useState<'everyone' | 'host_only'>('everyone');
  const [whoCanControl, setWhoCanControl] = useState<'everyone' | 'host_only'>('host_only');
  const [coverImage, setCoverImage] = useState(PRESET_COVERS[0].url);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'cover');

      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload cover image');

      setCoverImage(data.url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const hostId = user?.id || 'user_host_1';
    const hostName = user?.fullName || user?.username || 'Host User';

    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shredoo-user-id': hostId,
          'x-shredoo-user-name': hostName,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          maxCapacity: Number(maxCapacity),
          coverImage,
          whoCanAdd,
          whoCanControl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');

      router.push(`/room/${data.room.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lounge-bg text-lounge-text flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-lounge-textMuted hover:text-white transition mb-6"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </a>

        <div className="bg-lounge-surface border border-lounge-border rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 pb-5 border-b border-lounge-border">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Plus size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Create Private Listening Lounge</h1>
              <p className="text-xs text-lounge-textMuted">
                You will automatically become the Room Host with complete administrative control.
              </p>
            </div>
          </div>

          {error && (
            <p className="p-3.5 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 font-semibold">
              {error}
            </p>
          )}

          <form onSubmit={handleCreate} className="space-y-6">
            {/* General Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-lounge-textMuted mb-1.5">Lounge Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Midnight Vinyl Session"
                  className="w-full px-4 py-3 rounded-xl bg-lounge-card border border-lounge-border text-white text-sm focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-lounge-textMuted mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your musical vibe, audio preferences, or guidelines..."
                  className="w-full px-4 py-3 rounded-xl bg-lounge-card border border-lounge-border text-white text-sm focus:outline-none focus:border-amber-500 transition resize-none"
                />
              </div>

              {/* Max Capacity Slider (Strict Cap up to 5) */}
              <div className="p-4 rounded-2xl bg-lounge-card border border-lounge-border space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Users size={14} className="text-amber-500" /> Maximum Capacity
                    </span>
                    <p className="text-[11px] text-lounge-textMuted">Intimate 2 to 5 participant limit for ultra low latency</p>
                  </div>
                  <span className="text-xs font-bold text-amber-500 font-mono px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
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
            </div>

            {/* Music Permissions */}
            <div className="p-4 rounded-2xl bg-lounge-card border border-lounge-border space-y-3">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Music size={14} className="text-amber-500" /> Music Queue & Playback Permissions
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-lounge-textMuted mb-1 font-medium">Who can add to queue?</label>
                  <select
                    value={whoCanAdd}
                    onChange={(e: any) => setWhoCanAdd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-lounge-bg border border-lounge-border text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="everyone">Everyone in Lounge</option>
                    <option value="host_only">Host Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-lounge-textMuted mb-1 font-medium">Who can control playback?</label>
                  <select
                    value={whoCanControl}
                    onChange={(e: any) => setWhoCanControl(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-lounge-bg border border-lounge-border text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="host_only">Host Only (Recommended)</option>
                    <option value="everyone">Everyone</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cover Appearance */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Palette size={14} className="text-amber-500" /> Room Appearance
                </span>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lounge-card hover:bg-lounge-border border border-lounge-border text-xs text-lounge-text transition">
                  <Upload size={12} className="text-amber-500" />
                  <span>{uploadingImage ? 'Uploading...' : 'Upload Gallery Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              </div>

              {/* Cover Preview & Themes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRESET_COVERS.map((preset) => {
                  const isSelected = coverImage === preset.url;
                  return (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => setCoverImage(preset.url)}
                      className={`group relative h-24 rounded-2xl overflow-hidden border text-left transition ${
                        isSelected
                          ? 'border-amber-500 ring-2 ring-amber-500/30'
                          : 'border-lounge-border hover:border-lounge-border/80'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.title}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2.5 flex flex-col justify-end">
                        <span className="text-[11px] font-bold text-white truncate">{preset.title}</span>
                        <span className="text-[9px] text-lounge-textMuted truncate">{preset.subtitle}</span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center shadow">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-lounge-border flex items-center justify-between">
              <span className="text-xs text-lounge-textMuted flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-amber-500" /> Private lounge code will be generated
              </span>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xl shadow-amber-950/40 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {loading ? 'Creating Lounge...' : 'Launch Private Lounge'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
