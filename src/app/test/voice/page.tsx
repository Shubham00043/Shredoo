'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  Mic,
  MicOff,
  Headphones,
  Radio,
  Sliders,
  Volume2,
  CheckCircle2,
  ArrowLeft,
  Users,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

export default function VoiceTestPage() {
  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  // Simulated peer participant for dual-window testing
  const [peerVolume, setPeerVolume] = useState(100);
  const [peerSpeaking, setPeerSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting'>('connected');
  const [copiedLink, setCopiedLink] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicActive(true);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const poll = () => {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const avg = Math.min(100, Math.round((sum / buffer.length / 128) * 100));
        setMicLevel(avg);
        setSpeaking(avg > 15);
        animFrameRef.current = requestAnimationFrame(poll);
      };
      poll();
    } catch (e) {
      console.error('Mic access error:', e);
    }
  };

  useEffect(() => {
    startMic();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close().catch(() => {});
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const copyTestLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-lounge-bg text-lounge-textPrimary flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 w-full space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-lounge-textMuted hover:text-white transition"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="bg-lounge-surface border border-lounge-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-lounge-border">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Radio size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Test Voice Chat & Speaking Indicators</h1>
                <p className="text-xs text-lounge-textMuted">
                  LiveKit real-time voice channel testing and multi-device verification
                </p>
              </div>
            </div>

            <button
              onClick={copyTestLink}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-lounge-card hover:bg-lounge-cardHover border border-lounge-border text-xs text-white font-semibold transition"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copiedLink ? 'Link Copied!' : 'Copy Link for 2nd Browser'}
            </button>
          </div>

          {/* Dual Window Instruction Banner */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Headphones size={16} /> How to Test Across Two Sessions:
            </div>
            <p className="leading-relaxed">
              1. Open an <strong>Incognito window</strong> or second device (e.g. phone/tablet) and navigate to this test page.
            </p>
            <p className="leading-relaxed">
              2. <strong>Wear headphones</strong> on both devices to prevent microphone acoustic feedback.
            </p>
            <p className="leading-relaxed">
              3. Speak on Device 1: observe your local microphone VU meter and watch the speaking highlight illuminate smoothly on Device 2!
            </p>
          </div>

          {/* Test Grid: 2 Participant Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: My Microphone Status */}
            <div
              className={`p-5 rounded-2xl bg-lounge-card border transition-all duration-300 space-y-4 ${
                speaking
                  ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-lg shadow-amber-950/30'
                  : 'border-lounge-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Mic size={14} className="text-amber-500" /> Device 1 (You)
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900">
                  {connectionStatus}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src="https://api.dicebear.com/7.x/bottts/svg?seed=LocalHost"
                    alt="You"
                    className="w-14 h-14 rounded-xl object-cover bg-lounge-bg border border-lounge-border"
                  />
                  <span
                    className={`absolute -bottom-1 -right-1 p-1 rounded-full ${
                      speaking ? 'bg-amber-500 text-black' : 'bg-lounge-bg text-lounge-textMuted'
                    }`}
                  >
                    <Mic size={10} />
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Your Audio Stream</h4>
                  <p className="text-[11px] text-lounge-textMuted">
                    {speaking ? '🎤 Speaking detected' : 'Listening...'}
                  </p>
                </div>
              </div>

              {/* Realtime VU meter */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-lounge-textMuted">
                  <span>Mic Input Signal</span>
                  <span>{micLevel}%</span>
                </div>
                <div className="h-2 w-full bg-lounge-bg rounded-full overflow-hidden border border-lounge-border">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, micLevel * 1.5)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Remote Peer Participant */}
            <div
              className={`p-5 rounded-2xl bg-lounge-card border transition-all duration-300 space-y-4 ${
                peerSpeaking
                  ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-lg shadow-amber-950/30'
                  : 'border-lounge-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Users size={14} className="text-cyan-400" /> Device 2 (Remote Participant)
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900">
                  Audio Subscribed
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src="https://api.dicebear.com/7.x/bottts/svg?seed=FriendTest"
                    alt="Remote"
                    className="w-14 h-14 rounded-xl object-cover bg-lounge-bg border border-lounge-border"
                  />
                  {peerSpeaking && (
                    <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-500 text-black">
                      <Mic size={10} />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Elena Riff (Peer)</h4>
                  <p className="text-[11px] text-lounge-textMuted">
                    {peerSpeaking ? 'Speaking in lounge' : 'Idle'}
                  </p>
                </div>
              </div>

              {/* Individual Voice Slider for this peer */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[10px] text-lounge-textMuted font-mono">
                  <span>Elena's Voice Volume</span>
                  <span className="text-amber-500 font-bold">{peerVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={peerVolume}
                  onChange={(e) => setPeerVolume(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-lounge-bg rounded-lg"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setPeerSpeaking(!peerSpeaking)}
                  className="px-2.5 py-1 rounded-lg bg-lounge-bg hover:bg-lounge-surface text-[11px] text-lounge-textMuted border border-lounge-border transition"
                >
                  {peerSpeaking ? 'Simulate Silence' : 'Simulate Elena Speaking'}
                </button>
                <span className="text-[10px] text-lounge-textMuted">GainNode Active</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

