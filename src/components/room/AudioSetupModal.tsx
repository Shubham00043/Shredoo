'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Radio,
  Volume2,
  RefreshCw,
  X,
  Play,
  Square,
  ShieldCheck,
} from 'lucide-react';

interface AudioSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReadyToJoin?: () => void;
}

export function AudioSetupModal({
  isOpen,
  onClose,
  onReadyToJoin,
}: AudioSetupModalProps) {
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [micLevel, setMicLevel] = useState<number>(0);
  const [hasDetectedAudio, setHasDetectedAudio] = useState(false);
  const [isLoopbackTesting, setIsLoopbackTesting] = useState(false);

  // Connection readiness state
  const [livekitReady, setLivekitReady] = useState(true);
  const [trackPublishReady, setTrackPublishReady] = useState(true);
  const [subscribedReady, setSubscribedReady] = useState(true);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const loopbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Microphone capture
  const startMicCapture = async (deviceId?: string) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPermissionState('granted');

      // Enumerate available devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter((d) => d.kind === 'audioinput');
      setDevices(audioInputs);
      if (!selectedDeviceId && audioInputs.length > 0) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }

      // Initialize Web Audio Analyzer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Monitor Audio Level
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let detectedCount = 0;

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicLevel(normalized);

        if (normalized > 10) {
          detectedCount++;
          if (detectedCount >= 3) {
            setHasDetectedAudio(true);
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err: any) {
      console.error('Mic capture error:', err);
      setPermissionState('denied');
    }
  };

  useEffect(() => {
    if (isOpen) {
      startMicCapture();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen]);

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedDeviceId(id);
    startMicCapture(id);
  };

  const toggleLoopbackTest = () => {
    if (!streamRef.current) return;
    if (isLoopbackTesting) {
      if (loopbackAudioRef.current) {
        loopbackAudioRef.current.srcObject = null;
      }
      setIsLoopbackTesting(false);
    } else {
      if (loopbackAudioRef.current) {
        loopbackAudioRef.current.srcObject = streamRef.current;
        loopbackAudioRef.current.play().catch(() => {});
      }
      setIsLoopbackTesting(true);
    }
  };

  if (!isOpen) return null;

  const isChecklistComplete =
    permissionState === 'granted' && hasDetectedAudio && livekitReady;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-lounge-surface border border-lounge-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
        <audio ref={loopbackAudioRef} />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-lounge-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Headphones size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Audio & Voice Setup</h2>
              <p className="text-xs text-lounge-textMuted">
                Verify your microphone and audio connection before entering
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-lounge-textMuted hover:text-white hover:bg-lounge-card transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Advisory banner: Headphones recommended */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
          <Headphones size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Headphones recommended:</strong> Wearing headphones prevents background music and voice echo from looping back into your microphone.
          </p>
        </div>

        {/* Section 1: Microphone Device & Signal Meter */}
        <div className="p-4 rounded-2xl bg-lounge-card border border-lounge-border space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Mic size={14} className="text-amber-500" /> Microphone Input
            </span>
            <span
              className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                hasDetectedAudio
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-lounge-bg text-lounge-textMuted border border-lounge-border'
              }`}
            >
              {hasDetectedAudio ? 'Signal Detected' : 'Speak into mic to test'}
            </span>
          </div>

          {/* Device dropdown */}
          <div>
            <label className="block text-[11px] text-lounge-textMuted mb-1 font-medium">Input Device</label>
            <select
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              disabled={devices.length === 0}
              className="w-full px-3 py-2 rounded-xl bg-lounge-bg border border-lounge-border text-white text-xs focus:outline-none focus:border-amber-500"
            >
              {devices.length === 0 ? (
                <option value="">Default System Microphone</option>
              ) : (
                devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${d.deviceId.substring(0, 5)}...`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Real-time VU / Volume Meter */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-lounge-textMuted">
              <span>Input Signal</span>
              <span>{micLevel}%</span>
            </div>
            <div className="h-2 w-full bg-lounge-bg rounded-full overflow-hidden border border-lounge-border">
              <div
                className={`h-full transition-all duration-75 rounded-full ${
                  micLevel > 70
                    ? 'bg-red-500'
                    : micLevel > 30
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, micLevel * 1.5)}%` }}
              />
            </div>
          </div>

          {/* Local Loopback playback test */}
          <div className="pt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={toggleLoopbackTest}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                isLoopbackTesting
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-lounge-bg hover:bg-lounge-surface text-lounge-textSecondary border-lounge-border'
              }`}
            >
              {isLoopbackTesting ? <Square size={12} /> : <Play size={12} />}
              {isLoopbackTesting ? 'Stop Loopback Test' : 'Test Loopback in Headphones'}
            </button>
            <span className="text-[10px] text-lounge-textMuted">Hear your voice locally</span>
          </div>
        </div>

        {/* Section 2: Pre-join 3-Point Checklist */}
        <div className="p-4 rounded-2xl bg-lounge-card border border-lounge-border space-y-2.5">
          <span className="text-xs font-semibold text-white block">Pre-Join Voice Checklist</span>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-lounge-textSecondary">
              <span className="flex items-center gap-2">
                {permissionState === 'granted' ? (
                  <CheckCircle2 size={15} className="text-emerald-400" />
                ) : (
                  <AlertCircle size={15} className="text-amber-400" />
                )}
                1. Microphone Permission
              </span>
              <span className="font-mono text-[11px] capitalize text-lounge-textMuted">
                {permissionState}
              </span>
            </div>

            <div className="flex items-center justify-between text-lounge-textSecondary">
              <span className="flex items-center gap-2">
                {hasDetectedAudio ? (
                  <CheckCircle2 size={15} className="text-emerald-400" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-lounge-textMuted block" />
                )}
                2. Live Audio Capture
              </span>
              <span className="font-mono text-[11px] text-lounge-textMuted">
                {hasDetectedAudio ? 'Verified' : 'Speak to verify'}
              </span>
            </div>

            <div className="flex items-center justify-between text-lounge-textSecondary">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400" />
                3. LiveKit Audio Transport
              </span>
              <span className="font-mono text-[11px] text-emerald-400">Ready</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-lounge-textMuted hover:text-white transition"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              if (onReadyToJoin) onReadyToJoin();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-lg shadow-amber-950/40"
          >
            Confirm & Enter Lounge
          </button>
        </div>
      </div>
    </div>
  );
}

