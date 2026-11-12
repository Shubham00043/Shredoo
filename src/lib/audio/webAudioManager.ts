// Real-time Web Audio Engine for Shredoo Lounge
// strictly enforces 2 INDEPENDENT volume types with separate GainNodes:
// 1. Background Music GainNode (local to this device only)
// 2. Individual Remote Participant Voice GainNodes (each participant has their own GainNode)
// NO MASTER VOLUME.

class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private musicSourceNode: MediaElementAudioSourceNode | null = null;
  private musicGainNode: GainNode | null = null;

  // Map of userId -> GainNode
  private participantGains: Map<string, GainNode> = new Map();
  // Map of userId -> SourceNode
  private participantSources: Map<string, MediaStreamAudioSourceNode> = new Map();

  // Local persisted volumes
  private musicVolume: number = 0.5; // 0 to 1
  private participantVolumes: Record<string, number> = {}; // 0 to 200%
  private mutedParticipants: Set<string> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedMusicVol = localStorage.getItem('shredoo_music_vol');
        if (savedMusicVol !== null) this.musicVolume = parseFloat(savedMusicVol);

        const savedVoiceVols = localStorage.getItem('shredoo_voice_vols');
        if (savedVoiceVols) this.participantVolumes = JSON.parse(savedVoiceVols);
      } catch (e) {}
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // ==========================================
  // BACKGROUND MUSIC GAIN NODE (INDEPENDENT)
  // ==========================================

  public attachMusicElement(audioElement: HTMLAudioElement) {
    const ctx = this.initContext();
    if (!ctx) return;

    if (!this.musicGainNode) {
      this.musicGainNode = ctx.createGain();
      this.musicGainNode.gain.setValueAtTime(this.musicVolume, ctx.currentTime);
      this.musicGainNode.connect(ctx.destination);
    }

    if (!this.musicSourceNode) {
      try {
        this.musicSourceNode = ctx.createMediaElementSource(audioElement);
        this.musicSourceNode.connect(this.musicGainNode);
      } catch (e) {
        // Already attached
      }
    }
  }

  public setMusicVolume(volume: number) {
    const clamped = Math.max(0, Math.min(volume, 1));
    this.musicVolume = clamped;

    const ctx = this.initContext();
    if (ctx && this.musicGainNode) {
      this.musicGainNode.gain.setValueAtTime(clamped, ctx.currentTime);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('shredoo_music_vol', clamped.toString());
      } catch (e) {}
    }
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  // ==========================================
  // INDIVIDUAL PARTICIPANT VOICE GAIN NODES
  // ==========================================

  public attachParticipantAudioStream(userId: string, stream: MediaStream) {
    const ctx = this.initContext();
    if (!ctx) return;

    // Get or create dedicated GainNode for this specific participant
    let gainNode = this.participantGains.get(userId);
    if (!gainNode) {
      gainNode = ctx.createGain();
      const currentVol = (this.participantVolumes[userId] ?? 100) / 100;
      const isMuted = this.mutedParticipants.has(userId);
      gainNode.gain.setValueAtTime(isMuted ? 0 : currentVol, ctx.currentTime);
      gainNode.connect(ctx.destination);
      this.participantGains.set(userId, gainNode);
    }

    // Connect MediaStream
    try {
      const source = ctx.createMediaStreamSource(stream);
      source.connect(gainNode);
      this.participantSources.set(userId, source);
    } catch (e) {
      console.warn(`Could not attach audio stream for participant ${userId}:`, e);
    }
  }

  public setParticipantVolume(userId: string, volumePercent: number) {
    const clampedPercent = Math.max(0, Math.min(volumePercent, 200));
    this.participantVolumes[userId] = clampedPercent;

    const ctx = this.initContext();
    const gainNode = this.participantGains.get(userId);

    if (ctx && gainNode && !this.mutedParticipants.has(userId)) {
      gainNode.gain.setValueAtTime(clampedPercent / 100, ctx.currentTime);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('shredoo_voice_vols', JSON.stringify(this.participantVolumes));
      } catch (e) {}
    }
  }

  public getParticipantVolume(userId: string): number {
    return this.participantVolumes[userId] ?? 100;
  }

  public toggleMuteParticipant(userId: string): boolean {
    const ctx = this.initContext();
    const gainNode = this.participantGains.get(userId);
    const nowMuted = !this.mutedParticipants.has(userId);

    if (nowMuted) {
      this.mutedParticipants.add(userId);
      if (ctx && gainNode) {
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
      }
    } else {
      this.mutedParticipants.delete(userId);
      const currentVol = (this.participantVolumes[userId] ?? 100) / 100;
      if (ctx && gainNode) {
        gainNode.gain.setValueAtTime(currentVol, ctx.currentTime);
      }
    }

    return nowMuted;
  }

  public isParticipantMuted(userId: string): boolean {
    return this.mutedParticipants.has(userId);
  }

  public removeParticipant(userId: string) {
    const source = this.participantSources.get(userId);
    if (source) {
      try {
        source.disconnect();
      } catch (e) {}
      this.participantSources.delete(userId);
    }

    const gain = this.participantGains.get(userId);
    if (gain) {
      try {
        gain.disconnect();
      } catch (e) {}
      this.participantGains.delete(userId);
    }

    this.mutedParticipants.delete(userId);
  }
}

export const webAudioEngine = new WebAudioEngine();

