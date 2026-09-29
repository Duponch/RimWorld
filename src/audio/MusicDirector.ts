/** Long-form, non-spatial music is streamed by the browser rather than decoded
 * into the one-shot SFX buffer pool. It never reads or changes simulation state. */
export type MusicMood = 'day' | 'night' | 'tension';

export interface MusicTrack {
  id: string;
  src: string;
  mood: MusicMood;
  /** Balances the original mastered files without another lossy encode. */
  gain: number;
}

export const MUSIC_TRACKS: readonly MusicTrack[] = [
  { id: 'aube', src: '/assets/audio/music/lisiere-aube-v1.mp3', mood: 'day', gain: 0.40 },
  { id: 'veille', src: '/assets/audio/music/lisiere-veille-v1.mp3', mood: 'night', gain: 0.75 },
  { id: 'alerte', src: '/assets/audio/music/lisiere-alerte-v1.mp3', mood: 'tension', gain: 0.32 },
];

/** Calm tracks alternate, starting in the matching day/night mood. A threat
 * has its own track; returning to calm does not replay the previous track. */
export function chooseMusicTrack(mood: MusicMood, previousId: string | null,
  tracks: readonly MusicTrack[] = MUSIC_TRACKS): MusicTrack | null {
  const eligible = tracks.filter(track => mood === 'tension' ? track.mood === 'tension' : track.mood !== 'tension');
  if (!eligible.length) return null;
  if (mood === 'tension') return eligible.find(track => track.id !== previousId) ?? eligible[0]!;
  if (previousId === null) return eligible.find(track => track.mood === mood) ?? eligible[0]!;
  return eligible.find(track => track.id !== previousId && track.mood === mood)
    ?? eligible.find(track => track.id !== previousId) ?? eligible[0]!;
}

interface Playback { track: MusicTrack; audio: HTMLAudioElement }
const MUSIC_GAIN = 0.36;
const FADE_MS = 3600;
const CALM_GAPS_MS = [24000, 37000, 29000] as const;

export class MusicDirector {
  private readonly tracks: readonly MusicTrack[];
  private readonly createAudio: () => HTMLAudioElement;
  private mood: MusicMood = 'day';
  private active: Playback | null = null;
  private retiring: Playback | null = null;
  private lastTrackId: string | null = null;
  private volume = 0.5;
  private enabled = true;
  private hidden = false;
  private started = false;
  private disposed = false;
  private starting = false;
  private generation = 0;
  private playedCount = 0;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private gapTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(tracks: readonly MusicTrack[] = MUSIC_TRACKS,
    createAudio: () => HTMLAudioElement = () => new Audio()) {
    this.tracks = tracks;
    this.createAudio = createAudio;
  }

  /** Invoke synchronously from a trusted pointer/keyboard gesture. */
  unlock(): void {
    if (this.disposed || !this.enabled || this.hidden || this.volume === 0) return;
    this.started = true;
    if (this.active) {
      // The world can change mood while playback is suspended (hidden tab,
      // disabled music or zero volume). Never resume a calm track into a raid.
      if ((this.mood === 'tension') !== (this.active.track.mood === 'tension')) {
        this.release(this.active);
        this.active = null;
        this.startSelected();
        return;
      }
      if (this.active.audio.paused) {
        this.active.audio.volume = this.levelFor(this.active.track);
        void this.active.audio.play().catch(() => undefined);
      }
      return;
    }
    this.startSelected();
  }

  setMood(mood: MusicMood): void {
    if (this.mood === mood) return;
    const wasTense = this.mood === 'tension';
    this.mood = mood;
    if (!this.started || !this.enabled || this.hidden) return;
    if (wasTense !== (mood === 'tension')) {
      this.clearGap();
      this.startSelected();
    } else if (!this.active) this.startSelected();
  }

  setVolume(value: number): void {
    if (!Number.isFinite(value)) return;
    const wasSilent = this.volume === 0;
    this.volume = Math.max(0, Math.min(1, value));
    if (this.volume === 0) this.suspend();
    else if (wasSilent && this.started && this.enabled && !this.hidden) this.unlock();
    else if (!this.fadeTimer && this.active) this.active.audio.volume = this.levelFor(this.active.track);
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) this.suspend();
    else this.unlock();
  }

  setHidden(hidden: boolean): void {
    if (this.hidden === hidden) return;
    this.hidden = hidden;
    if (hidden) this.suspend();
    else if (this.started) this.unlock();
  }

  get diagnostics(): { state: string; track: string | null } {
    return {
      state: !this.enabled ? 'coupée' : this.hidden ? 'masquée' : this.active?.audio.paused ? 'en pause'
        : this.active ? 'active' : this.starting ? 'chargement' : 'attente',
      track: this.active?.track.id ?? null,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation++;
    this.clearGap();
    this.clearFade();
    this.release(this.active);
    this.release(this.retiring);
    this.active = this.retiring = null;
  }

  private get targetVolume(): number { return this.volume * MUSIC_GAIN; }
  private levelFor(track: MusicTrack): number { return this.targetVolume * track.gain; }

  private startSelected(): void {
    if (this.starting || this.disposed || !this.started || !this.enabled || this.hidden) return;
    const track = chooseMusicTrack(this.mood, this.lastTrackId, this.tracks);
    if (!track) return;
    this.starting = true;
    const generation = ++this.generation;
    const audio = this.createAudio();
    audio.preload = 'auto';
    audio.src = track.src;
    audio.loop = false;
    audio.volume = 0;
    // play() must be called before the initiating user gesture loses activation.
    void audio.play().then(() => {
      if (generation !== this.generation || this.disposed || !this.enabled || this.hidden) {
        this.release({ track, audio });
        return;
      }
      this.starting = false;
      if ((this.mood === 'tension') !== (track.mood === 'tension')) {
        this.release({ track, audio });
        this.startSelected();
        return;
      }
      this.clearGap();
      this.clearFade();
      this.release(this.retiring);
      this.retiring = this.active;
      this.active = { track, audio };
      this.lastTrackId = track.id;
      this.playedCount++;
      audio.onended = () => this.onEnded(audio);
      this.startFade();
    }).catch(() => {
      if (generation === this.generation) this.starting = false;
      this.release({ track, audio });
    });
  }

  private onEnded(audio: HTMLAudioElement): void {
    if (this.active?.audio !== audio) return;
    this.release(this.active);
    this.active = null;
    this.clearFade();
    this.release(this.retiring);
    this.retiring = null;
    if (!this.enabled || this.hidden || this.disposed) return;
    const gap = this.mood === 'tension' ? 7000 : CALM_GAPS_MS[this.playedCount % CALM_GAPS_MS.length]!;
    this.gapTimer = setTimeout(() => { this.gapTimer = null; this.startSelected(); }, gap);
  }

  private startFade(): void {
    const current = this.active;
    const old = this.retiring;
    if (!current) return;
    const beginning = performance.now();
    this.fadeTimer = setInterval(() => {
      const fraction = Math.min(1, (performance.now() - beginning) / FADE_MS);
      current.audio.volume = this.levelFor(current.track) * fraction;
      if (old) old.audio.volume = this.levelFor(old.track) * (1 - fraction);
      if (fraction >= 1) {
        this.clearFade();
        this.release(this.retiring);
        this.retiring = null;
      }
    }, 80);
  }

  private suspend(): void {
    this.generation++;
    this.starting = false;
    this.clearGap();
    this.clearFade();
    this.active?.audio.pause();
    this.release(this.retiring);
    this.retiring = null;
  }

  private clearFade(): void {
    if (this.fadeTimer !== null) clearInterval(this.fadeTimer);
    this.fadeTimer = null;
  }

  private clearGap(): void {
    if (this.gapTimer !== null) clearTimeout(this.gapTimer);
    this.gapTimer = null;
  }

  private release(playback: Playback | null): void {
    if (!playback) return;
    playback.audio.onended = null;
    playback.audio.pause();
    playback.audio.removeAttribute('src');
    playback.audio.load();
  }
}
