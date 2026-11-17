'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  X,
  Music,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Trash2,
  RefreshCw,
  Plus,
  ShieldCheck,
  Loader2,
  Disc,
} from 'lucide-react';
import { RoomMusicRecord } from '@/types';

interface FileUploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  duration?: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  resultTrack?: RoomMusicRecord;
}

interface MusicUploadModalProps {
  roomId: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (tracks: RoomMusicRecord[]) => void;
}

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_BATCH_COUNT = 10;

export function MusicUploadModal({
  roomId,
  currentUserId,
  isOpen,
  onClose,
  onUploadSuccess,
}: MusicUploadModalProps) {
  const [fileList, setFileList] = useState<FileUploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [autoQueue, setAutoQueue] = useState(true);
  const [confirmedRights, setConfirmedRights] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  // Extract client-side audio duration preview
  const inspectAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve(Math.round(audio.duration) || 210);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(210);
        };
        audio.src = url;
      } catch (e) {
        resolve(210);
      }
    });
  };

  const processIncomingFiles = async (rawFiles: FileList | File[]) => {
    setGlobalError(null);
    const validCandidates: File[] = [];

    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setGlobalError(`Ignored unsupported file: "${file.name}". Supported: MP3, WAV, OGG, M4A.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setGlobalError(`File "${file.name}" exceeds 50MB limit.`);
        continue;
      }

      validCandidates.push(file);
    }

    if (fileList.length + validCandidates.length > MAX_BATCH_COUNT) {
      setGlobalError(`Maximum batch upload is ${MAX_BATCH_COUNT} songs at once.`);
      return;
    }

    const newItems: FileUploadItem[] = [];
    for (const file of validCandidates) {
      const duration = await inspectAudioDuration(file);
      newItems.push({
        id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        duration,
        status: 'pending',
        progress: 0,
      });
    }

    setFileList((prev) => [...prev, ...newItems]);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleBrowseChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processIncomingFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    if (isUploading) return;
    setFileList((prev) => prev.filter((item) => item.id !== id));
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsUploading(false);
  };

  // Execute upload
  const handleStartUpload = async () => {
    if (fileList.length === 0) return;
    if (!confirmedRights) {
      setGlobalError('Please confirm ownership or authorization before uploading.');
      return;
    }

    setIsUploading(true);
    setGlobalError(null);
    abortControllerRef.current = new AbortController();

    const succeededTracks: RoomMusicRecord[] = [];

    // Mark pending or error items as uploading
    setFileList((prev) =>
      prev.map((item) =>
        item.status === 'pending' || item.status === 'error'
          ? { ...item, status: 'uploading', progress: 10 }
          : item
      )
    );

    // Upload items sequentially or in parallel batches
    for (let i = 0; i < fileList.length; i++) {
      const item = fileList[i];
      if (item.status === 'success') continue;

      try {
        setFileList((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'uploading', progress: 40 } : it))
        );

        const formData = new FormData();
        formData.append('files', item.file);
        formData.append('autoQueue', autoQueue ? 'true' : 'false');

        const res = await fetch(`/api/rooms/${roomId}/music/upload`, {
          method: 'POST',
          headers: {
            'x-shredoo-user-id': currentUserId,
          },
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        const data = await res.json();

        if (res.ok && data.results && data.results.length > 0) {
          const resItem = data.results[0];
          if (resItem.success && resItem.track) {
            succeededTracks.push(resItem.track);
            setFileList((prev) =>
              prev.map((it) =>
                it.id === item.id
                  ? {
                      ...it,
                      status: 'success',
                      progress: 100,
                      resultTrack: resItem.track,
                    }
                  : it
              )
            );
          } else {
            setFileList((prev) =>
              prev.map((it) =>
                it.id === item.id
                  ? {
                      ...it,
                      status: 'error',
                      progress: 0,
                      error: resItem.error || 'Upload rejected',
                    }
                  : it
              )
            );
          }
        } else {
          setFileList((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: 'error',
                    progress: 0,
                    error: data.error || 'Server error',
                  }
                : it
            )
          );
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          break;
        }
        setFileList((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: 'error',
                  progress: 0,
                  error: err.message || 'Connection failed',
                }
              : it
          )
        );
      }
    }

    setIsUploading(false);

    if (succeededTracks.length > 0) {
      onUploadSuccess(succeededTracks);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const completedCount = fileList.filter((f) => f.status === 'success').length;
  const hasErrors = fileList.some((f) => f.status === 'error');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-lounge-surface border border-lounge-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-lounge-border flex items-center justify-between bg-lounge-card/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Upload Music to Room Library
              </h2>
              <p className="text-[11px] text-lounge-textMuted">
                Every member can upload single or multiple songs (MP3, WAV, OGG, M4A up to 50MB)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-lounge-textMuted hover:text-white hover:bg-lounge-card transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Global Alert */}
          {globalError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
              <AlertCircle size={15} className="flex-shrink-0 text-red-400" />
              <span>{globalError}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
              isDragging
                ? 'border-amber-500 bg-amber-500/10 scale-[0.99]'
                : 'border-lounge-border hover:border-amber-500/50 bg-lounge-card/30 hover:bg-lounge-card/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".mp3,.wav,.ogg,.m4a,audio/*"
              onChange={handleBrowseChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-1">
              <FileAudio size={24} />
            </div>
            <p className="text-xs font-bold text-white">
              Drag & drop audio files here, or <span className="text-amber-400 underline">browse files</span>
            </p>
            <p className="text-[11px] text-lounge-textMuted">
              Select multiple MP3, WAV, OGG, or M4A files at once (up to 10 files, 50MB each)
            </p>
          </div>

          {/* Selected File Previews */}
          {fileList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span className="flex items-center gap-1.5">
                  <Music size={14} className="text-amber-500" />
                  Selected Songs ({fileList.length})
                </span>
                {completedCount > 0 && (
                  <span className="text-[11px] text-emerald-400 font-mono">
                    ✓ {completedCount}/{fileList.length} Uploaded
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {fileList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-lounge-card border border-lounge-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-lounge-bg border border-lounge-border flex items-center justify-center text-amber-500 flex-shrink-0">
                        {item.status === 'uploading' ? (
                          <Loader2 size={16} className="animate-spin text-amber-500" />
                        ) : item.status === 'success' ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : item.status === 'error' ? (
                          <AlertCircle size={16} className="text-red-400" />
                        ) : (
                          <Music size={16} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white truncate">{item.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-lounge-textMuted font-mono">
                          <span>{formatSize(item.size)}</span>
                          <span>•</span>
                          <span>{formatSeconds(item.duration || 210)}</span>
                          {item.error && <span className="text-red-400 truncate">({item.error})</span>}
                        </div>
                      </div>
                    </div>

                    {/* Progress / Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.status === 'uploading' && (
                        <span className="text-[10px] text-amber-400 font-mono">Uploading...</span>
                      )}
                      {item.status === 'success' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          READY
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                          FAILED
                        </span>
                      )}
                      {item.status !== 'uploading' && item.status !== 'success' && (
                        <button
                          onClick={() => removeFile(item.id)}
                          className="p-1 rounded text-lounge-textMuted hover:text-red-400 hover:bg-lounge-bg transition"
                          title="Remove from batch"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Options & Authorization Checkbox */}
          <div className="p-3.5 rounded-xl bg-lounge-card/50 border border-lounge-border space-y-2.5">
            <label className="flex items-center gap-2 text-xs text-lounge-textSecondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoQueue}
                onChange={(e) => setAutoQueue(e.target.checked)}
                className="rounded border-lounge-border text-amber-500 focus:ring-amber-500"
              />
              <span>Automatically add uploaded tracks to the shared room queue</span>
            </label>

            <label className="flex items-start gap-2 text-xs text-lounge-textSecondary cursor-pointer select-none pt-1 border-t border-lounge-border/40">
              <input
                type="checkbox"
                checked={confirmedRights}
                onChange={(e) => setConfirmedRights(e.target.checked)}
                className="rounded border-lounge-border text-amber-500 focus:ring-amber-500 mt-0.5"
              />
              <span className="text-[11px] text-lounge-textMuted leading-tight">
                I confirm that I own this audio or have permission to share it for private listening with participants in this room.
              </span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-lounge-border flex items-center justify-between bg-lounge-card/40">
          <div>
            {isUploading && (
              <button
                onClick={cancelUpload}
                className="px-3 py-1.5 rounded-xl bg-red-950/40 text-red-400 border border-red-900 text-xs font-semibold hover:bg-red-900/40 transition"
              >
                Cancel Upload
              </button>
            )}
            {!isUploading && hasErrors && (
              <button
                onClick={handleStartUpload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/20 transition"
              >
                <RefreshCw size={12} /> Retry Failed
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl bg-lounge-card hover:bg-lounge-cardHover text-lounge-textSecondary hover:text-white text-xs font-semibold transition border border-lounge-border"
            >
              {completedCount > 0 ? 'Done' : 'Close'}
            </button>

            {fileList.length > 0 && completedCount < fileList.length && (
              <button
                onClick={handleStartUpload}
                disabled={isUploading || !confirmedRights}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-white text-xs font-bold transition shadow-lg ${
                  isUploading || !confirmedRights
                    ? 'bg-amber-800/40 cursor-not-allowed text-white/50'
                    : 'bg-amber-600 hover:bg-amber-700 active:scale-95 shadow-amber-950/40'
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Uploading ({fileList.length})...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> Upload {fileList.length} Song{fileList.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

