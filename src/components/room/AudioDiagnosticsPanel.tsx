'use client';

import React, { useState } from 'react';
import {
  Activity,
  Mic,
  MicOff,
  Radio,
  Music2,
  Users,
  Volume2,
  HelpCircle,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AudioDiagnosticsProps {
  isMicMuted: boolean;
  voiceConnectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  musicPlaybackStatus: 'playing' | 'paused' | 'buffering';
  remoteParticipantsCount: number;
}

export function AudioDiagnosticsPanel({
  isMicMuted,
  voiceConnectionStatus,
  musicPlaybackStatus,
  remoteParticipantsCount,
}: AudioDiagnosticsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);

  return (
    <>
      <div className="bg-lounge-surface border border-lounge-border rounded-2xl overflow-hidden shadow-lg">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-lounge-card transition select-none"
        >
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-amber-500" />
            <span className="text-xs font-bold text-white">Audio Diagnostics</span>
            <span
              className={`w-2 h-2 rounded-full ${
                voiceConnectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 text-lounge-textMuted">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTroubleshooter(true);
              }}
              className="text-[11px] text-amber-500 hover:underline flex items-center gap-1 mr-1"
            >
              <HelpCircle size={13} /> Troubleshooting
            </button>
            {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </div>

        {isOpen && (
          <div className="p-4 border-t border-lounge-border space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-lounge-textSecondary">
              <span className="flex items-center gap-1.5 text-lounge-textMuted">
                {isMicMuted ? <MicOff size={13} className="text-red-400" /> : <Mic size={13} className="text-emerald-400" />}
                Microphone
              </span>
              <span className={`font-mono text-[11px] font-semibold ${isMicMuted ? 'text-red-400' : 'text-emerald-400'}`}>
                {isMicMuted ? 'Muted' : 'Transmitting'}
              </span>
            </div>

            <div className="flex items-center justify-between text-lounge-textSecondary">
              <span className="flex items-center gap-1.5 text-lounge-textMuted">
                <Radio size={13} className="text-cyan-400" />
                LiveKit Voice Session
              </span>
              <span className="font-mono text-[11px] font-semibold capitalize text-emerald-400">
                {voiceConnectionStatus}
              </span>
            </div>

            <div className="flex items-center justify-between text-lounge-textSecondary">
              <span className="flex items-center gap-1.5 text-lounge-textMuted">
                <Music2 size={13} className="text-amber-400" />
                Shared Music Stream
              </span>
              <span className="font-mono text-[11px] font-semibold capitalize text-amber-400">
                {musicPlaybackStatus}
              </span>
            </div>

            <div className="flex items-center justify-between text-lounge-textSecondary">
              <span className="flex items-center gap-1.5 text-lounge-textMuted">
                <Users size={13} className="text-purple-400" />
                Remote Voice Channels
              </span>
              <span className="font-mono text-[11px] text-white">
                {remoteParticipantsCount} participants
              </span>
            </div>

            <div className="flex items-center justify-between text-lounge-textSecondary">
              <span className="flex items-center gap-1.5 text-lounge-textMuted">
                <Volume2 size={13} className="text-gray-400" />
                Audio Architecture
              </span>
              <span className="font-mono text-[11px] text-lounge-textMuted">
                Independent GainNodes
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Audio Troubleshooting Modal */}
      {showTroubleshooter && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-lounge-surface border border-lounge-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-lounge-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <HelpCircle size={18} />
                </div>
                <h3 className="text-sm font-bold text-white">Audio Troubleshooting Checklist</h3>
              </div>
              <button
                onClick={() => setShowTroubleshooter(false)}
                className="p-1.5 rounded-lg text-lounge-textMuted hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-lounge-textMuted leading-relaxed">
              If you cannot hear a friend or background music is silent, verify these 5 common checks:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-lounge-card border border-lounge-border space-y-1">
                <strong className="text-white block">1. Check their Individual Voice Slider</strong>
                <p className="text-[11px] text-lounge-textMuted">
                  In the Audio Mixer, ensure that participant&apos;s voice slider is not set to 0% and they are not muted.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-lounge-card border border-lounge-border space-y-1">
                <strong className="text-white block">2. Check their Microphone Status</strong>
                <p className="text-[11px] text-lounge-textMuted">
                  Look at their voice card. If a red microphone icon is shown, they are currently muted on their device.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-lounge-card border border-lounge-border space-y-1">
                <strong className="text-white block">3. Browser Autoplay Permissions</strong>
                <p className="text-[11px] text-lounge-textMuted">
                  Modern browsers require user interaction to play audio. Click anywhere on the lounge window to grant playback.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-lounge-card border border-lounge-border space-y-1">
                <strong className="text-white block">4. Wear Headphones</strong>
                <p className="text-[11px] text-lounge-textMuted">
                  Headphones avoid microphone feedback and allow you to turn up music and friends without echo.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-lounge-card border border-lounge-border space-y-1">
                <strong className="text-white block">5. Check LiveKit Voice Connection</strong>
                <p className="text-[11px] text-lounge-textMuted">
                  Ensure the status shows &quot;Connected&quot;. If reconnecting, verify your network or refresh the lounge.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowTroubleshooter(false)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

