import { AudioCueScheduler, type AudioCue } from './scheduler';
import { audibleRange, listenerPose, sourceDistance, type AudioCamera } from './spatial';
import { selectContinuousSources, type ContinuousSource, type ContinuousEventInfo } from './continuous';
import { cueHash, cueVariation, selectOneShots } from './selection';

export type { AudioCue } from './scheduler';
export type { AudioCamera } from './spatial';
export type { ContinuousSource } from './continuous';

interface SoundVariant { src: string; gain: number }
interface SoundEvent extends ContinuousEventInfo { variants: SoundVariant[]; gain: number }
export interface AudioManifest { version: 1; events: Record<string, SoundEvent> }

const MAX_VOICES = 24;
const MAX_ONE_SHOTS_PER_FRAME = 12;
const DEFAULT_RANGE = 24;
const PREVIEW_KIND = 'mining.hit';

function level(value: unknown, fallback: number, ceiling: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= ceiling ? value : fallback;
}

/** Rejects external URLs and malformed assets rather than fetching arbitrary saved data. */
export function parseAudioManifest(input: unknown): AudioManifest {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid audio manifest');
  const source = input as Record<string, unknown>;
  if (source.version !== 1 || !source.events || typeof source.events !== 'object' || Array.isArray(source.events))
    throw new Error('Unsupported audio manifest');
  const events: Record<string, SoundEvent> = Object.create(null);
  for (const [kind, raw] of Object.entries(source.events)) {
    if (!kind || !raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const event = raw as Record<string, unknown>;
    if (!Array.isArray(event.variants)) continue;
    const loop = event.loop === true;
    const ceiling = loop ? 2 : 8;
    const variants: SoundVariant[] = [];
    for (const value of event.variants) {
      const variant = typeof value === 'string' ? { src: value } : value;
      if (!variant || typeof variant !== 'object') continue;
      const candidate = variant as Record<string, unknown>;
      if (typeof candidate.src !== 'string' || !candidate.src.startsWith('/assets/audio/') ||
        candidate.src.includes('..') || candidate.src.includes('?') || candidate.src.includes('#')) continue;
      variants.push({ src: candidate.src, gain: level(candidate.gain, 1, ceiling) });
    }
    if (!variants.length) continue;
    const maxDistance = typeof event.maxDistance === 'number' && Number.isFinite(event.maxDistance)
      ? Math.max(2, Math.min(36, event.maxDistance)) : DEFAULT_RANGE;
    events[kind] = {
      variants, gain: level(event.gain, 1, ceiling), maxDistance,
      loop,
      spatial: event.spatial !== false,
    };
  }
  return { version: 1, events };
}

interface Voice { source: AudioBufferSourceNode; gain: GainNode; panner: PannerNode | null; kind: string; variantGain: number }

/** Plays short world sounds on the confirmed presentation clock. No World state. */
export class AudioDirector {
  private readonly scheduler = new AudioCueScheduler();
  private readonly manifestUrl: string;
  private camera: AudioCamera = { x: 0, y: 30, z: 0, targetX: 0, targetZ: 0, span: 32, mode: 'orthographic' };
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private manifest: AudioManifest | null = null;
  private readonly buffers = new Map<string, AudioBuffer | null>();
  private readonly voices = new Set<Voice>();
  private readonly continuous = new Map<string, Voice>();
  private continuousSources: readonly ContinuousSource[] = [];
  private lastSelection = { x: Infinity, z: Infinity, span: 0 };
  private unlockPromise: Promise<void> | null = null;
  private previewPromise: Promise<void> | null = null;
  private previewOutput: GainNode | null = null;
  private previewSource: AudioBufferSourceNode | null = null;
  private disposed = false;
  private volume = 0.75;
  private muted = false;
  private paused = false;
  private hidden = false;
  private lastPose = '';
  private lastGain = -1;

  constructor(manifestUrl = '/assets/audio/manifest.json') { this.manifestUrl = manifestUrl; }

  /** Call directly from a trusted pointer/keyboard gesture before any await. */
  unlock(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (typeof AudioContext === 'undefined') return Promise.reject(new Error('Web Audio is unavailable'));
    if (this.context?.state === 'closed') {
      this.stopPreview();
      this.previewOutput?.disconnect();
      this.previewOutput = null;
      for (const voice of [...this.voices]) this.stopVoice(voice);
      this.master?.disconnect();
      this.context = null;
      this.master = null;
      this.unlockPromise = null;
    }
    if (this.unlockPromise) {
      if (this.context && this.context.state !== 'running') {
        // Repeat directly in the new gesture if the device/browser suspended it.
        try {
          const resumed = this.context.resume();
          return Promise.all([resumed, this.unlockPromise]).then(() => {
            this.updateMaster();
            this.reconcileContinuous();
          });
        } catch (error) { return Promise.reject(error); }
      }
      return this.unlockPromise;
    }
    try {
      if (!this.context || this.context.state === 'closed') {
        const context = new AudioContext();
        const master = context.createGain();
        master.gain.value = 0;
        master.connect(context.destination);
        this.context = context;
        this.master = master;
        this.lastGain = -1;
        this.lastPose = '';
      }
      // Resume is invoked synchronously while browser gesture activation exists.
      const resumed = this.context.resume();
      this.unlockPromise = Promise.resolve(resumed).then(async () => {
        if (!this.manifest) await this.loadAssets();
        if (this.loadedCount === 0) throw new Error('Aucun MP3 du manifeste audio n’a pu être décodé.');
        this.updateListener();
        this.updateMaster();
        this.reconcileContinuous();
      }).catch(error => {
        this.unlockPromise = null; // A later gesture may retry autoplay or fetch failure.
        throw error;
      });
      return this.unlockPromise;
    } catch (error) {
      this.unlockPromise = null;
      return Promise.reject(error);
    }
  }

  updateCamera(camera: AudioCamera): void {
    if (!Number.isFinite(camera.x) || !Number.isFinite(camera.y) || !Number.isFinite(camera.z)) return;
    this.camera = camera;
    this.updateListener();
    const pose = listenerPose(camera);
    const span = camera.span ?? 32;
    if (Math.hypot(pose.x - this.lastSelection.x, pose.z - this.lastSelection.z) >= 4 ||
      span > this.lastSelection.span * 1.25 || span < this.lastSelection.span * 0.8) {
      this.lastSelection = { x: pose.x, z: pose.z, span };
      this.reconcileContinuous();
    }
  }

  ingestCues(cues: readonly AudioCue[]): void { if (!this.disposed) this.scheduler.ingest(cues); }

  /** Replaces the current list on snapshot adoption; no world scan on RAF. */
  setContinuousSources(sources: readonly ContinuousSource[]): void {
    if (this.disposed) return;
    this.continuousSources = sources.slice();
    this.reconcileContinuous();
  }

  /** Called once per presented frame, including frames with no new snapshot. */
  update(state: { presentedTick: number; paused: boolean; hidden: boolean }): void {
    if (this.disposed) return;
    const wasInactive = this.paused || this.hidden || this.muted;
    this.paused = state.paused;
    this.hidden = state.hidden;
    this.updateMaster();
    const inactive = this.paused || this.hidden || this.muted;
    if (inactive && !wasInactive) {
      for (const [id, voice] of this.continuous) this.fadeOutContinuous(id, voice);
    } else if (!inactive && wasInactive) this.reconcileContinuous();
    if (state.paused) return;
    const due = this.scheduler.takeDue(state.presentedTick);
    if (state.hidden || this.muted || !this.manifest || this.context?.state !== 'running') return;
    const ready = due.filter(cue => this.manifest?.events[cue.kind]?.variants.some(variant => this.buffers.get(variant.src)));
    for (const cue of selectOneShots(ready, this.manifest.events, this.camera, MAX_ONE_SHOTS_PER_FRAME)) this.playCue(cue);
  }

  setVolume(volume: number): void {
    if (!Number.isFinite(volume)) return;
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.previewOutput) this.previewOutput.gain.value = this.muted ? 0 : Math.min(8, this.volume * (this.manifest?.events[PREVIEW_KIND]?.gain ?? 1) * (this.manifest?.events[PREVIEW_KIND]?.variants[0]?.gain ?? 1));
    this.updateMaster();
  }

  setMuted(muted: boolean): void {
    if (this.muted === muted) return;
    this.muted = muted;
    if (muted) this.stopPreview();
    this.updateMaster();
    if (muted) {
      for (const [id, voice] of this.continuous) this.fadeOutContinuous(id, voice);
    } else this.reconcileContinuous();
  }

  get loadedCount(): number {
    let count = 0;
    for (const buffer of this.buffers.values()) if (buffer) count++;
    return count;
  }

  get availableSounds(): number {
    if (!this.manifest) return 0;
    return Object.values(this.manifest.events).filter(event =>
      event.variants.some(variant => this.buffers.get(variant.src))).length;
  }

  get needsUnlock(): boolean {
    return !this.context || this.context.state !== 'running' || !this.manifest && !this.unlockPromise;
  }

  /** Plays a published MP3 from an explicit UI gesture, even while the simulation is paused. */
  playPreview(): Promise<void> {
    if (this.previewPromise) return this.previewPromise;
    if (this.muted) return Promise.reject(new Error('Activez les effets sonores pour faire l’essai.'));
    if (this.volume === 0) return Promise.reject(new Error('Montez le volume des effets pour faire l’essai.'));
    // resume() is called synchronously while this gesture still has browser activation.
    const hadManifest = !!this.manifest;
    const unlocked = this.unlock();
    const preview = unlocked.catch(error => {
      // A later explicit click can recover an asset after a failed first load.
      if (!hadManifest) throw error;
    }).then(async () => {
      if (this.disposed || this.muted || this.volume === 0) throw new Error('L’essai sonore a été annulé.');
      const event = this.manifest?.events[PREVIEW_KIND];
      if (!event || event.loop || !event.variants.length) throw new Error('Le son d’essai est absent du manifeste audio.');
      const variant = event.variants[0]!;
      // A click retries each failed MP3 once, so other world sounds can recover too.
      await this.retryFailedAssets();
      const buffer = this.buffers.get(variant.src);
      if (!buffer) throw new Error(`Le MP3 d’essai ne peut pas être chargé ou décodé : ${variant.src}`);
      const context = this.context;
      if (!context || context.state !== 'running') throw new Error('Le navigateur n’a pas activé la sortie audio.');
      if (this.disposed || this.muted || this.volume === 0) throw new Error('L’essai sonore a été annulé.');
      if (!this.previewOutput) {
        this.previewOutput = context.createGain();
        this.previewOutput.connect(context.destination);
      }
      this.previewOutput.gain.value = Math.min(8, this.volume * event.gain * variant.gain);
      this.stopPreview();
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.previewOutput);
      this.previewSource = source;
      source.onended = () => {
        if (this.previewSource === source) this.previewSource = null;
        source.disconnect();
      };
      try { source.start(); }
      catch (error) { this.stopPreview(); throw error; }
    });
    this.previewPromise = preview.finally(() => { this.previewPromise = null; });
    return this.previewPromise;
  }

  /** Loading/new map must not inherit old queued or currently playing sounds. */
  reset(): void {
    this.scheduler.reset();
    this.stopPreview();
    this.continuousSources = [];
    this.continuous.clear();
    for (const voice of [...this.voices]) this.stopVoice(voice);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
    this.buffers.clear();
    this.manifest = null;
    this.previewOutput?.disconnect();
    this.previewOutput = null;
    this.master?.disconnect();
    this.master = null;
    void this.context?.close().catch(() => undefined);
    this.context = null;
  }

  private async loadAssets(): Promise<void> {
    const context = this.context;
    if (!context) return;
    const response = await fetch(this.manifestUrl, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Audio manifest HTTP ${response.status}`);
    const manifest = parseAudioManifest(await response.json());
    const paths = [...new Set(Object.values(manifest.events).flatMap(event => event.variants.map(variant => variant.src)))];
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(3, paths.length) }, async () => {
      while (next < paths.length && !this.disposed) {
        const src = paths[next++]!;
        const buffer = await this.fetchBuffer(src, 'force-cache');
        if (!this.disposed) this.buffers.set(src, buffer);
      }
    }));
    if (!this.disposed) {
      this.manifest = manifest;
      if (this.loadedCount === 0) throw new Error('Aucun MP3 du manifeste audio n’a pu être décodé.');
    }
  }

  private async fetchBuffer(src: string, cache: RequestCache): Promise<AudioBuffer | null> {
    const context = this.context;
    if (!context || this.disposed) return null;
    try {
      const file = await fetch(src, { cache });
      if (!file.ok) throw new Error(`Audio asset HTTP ${file.status}`);
      return await context.decodeAudioData(await file.arrayBuffer());
    } catch { return null; }
  }

  private async retryFailedAssets(): Promise<void> {
    if (!this.manifest) return;
    const paths = [...new Set(Object.values(this.manifest.events).flatMap(event =>
      event.variants.map(variant => variant.src)))].filter(src => !this.buffers.get(src));
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(3, paths.length) }, async () => {
      while (next < paths.length && !this.disposed) {
        const src = paths[next++]!;
        const buffer = await this.fetchBuffer(src, 'reload');
        if (!this.disposed) this.buffers.set(src, buffer);
      }
    }));
  }

  private stopPreview(): void {
    const source = this.previewSource;
    if (!source) return;
    this.previewSource = null;
    source.onended = null;
    try { source.stop(); } catch { /* It may have ended already. */ }
    source.disconnect();
  }

  private updateMaster(): void {
    const context = this.context; const master = this.master;
    if (!context || !master || context.state === 'closed') return;
    const desired = this.muted || this.paused || this.hidden ? 0 : this.volume;
    if (desired === this.lastGain) return;
    this.lastGain = desired;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(desired, now, desired === 0 ? 0.035 : 0.06);
  }

  private updateListener(): void {
    const context = this.context;
    if (!context || context.state === 'closed') return;
    const pose = listenerPose(this.camera);
    const key = [pose.x, pose.z, pose.forwardX, pose.forwardZ].map(value => value.toFixed(3)).join(',');
    if (key === this.lastPose) return;
    this.lastPose = key;
    const listener = context.listener;
    const now = context.currentTime;
    listener.positionX.setValueAtTime(pose.x, now);
    listener.positionY.setValueAtTime(pose.y, now);
    listener.positionZ.setValueAtTime(pose.z, now);
    listener.forwardX.setValueAtTime(pose.forwardX, now);
    listener.forwardY.setValueAtTime(0, now);
    listener.forwardZ.setValueAtTime(pose.forwardZ, now);
  }

  private playCue(cue: AudioCue): void {
    const context = this.context; const master = this.master;
    const event = this.manifest?.events[cue.kind];
    if (!context || !master || !event || event.loop || !event.gain) return;
    const pose = listenerPose(this.camera);
    const range = audibleRange(event.maxDistance, this.camera);
    if (event.spatial && sourceDistance(cue.x, cue.z, pose) >= range) return;
    const available = event.variants.filter(variant => this.buffers.get(variant.src));
    if (!available.length) return;
    const variant = available[cueHash(cue.id) % available.length]!;
    const buffer = this.buffers.get(variant.src)!;
    if (this.voices.size >= MAX_VOICES) {
      const loops = new Set(this.continuous.values());
      const victim = [...this.voices].find(voice => !loops.has(voice));
      if (victim) this.stopVoice(victim);
      else return;
    }
    let voice: Voice | null = null;
    try {
      const source = context.createBufferSource(); source.buffer = buffer;
      const variation = cueVariation(cue.id);
      source.playbackRate.value = variation.playbackRate;
      const panner = event.spatial ? context.createPanner() : null;
      if (panner) {
        panner.panningModel = 'equalpower';
        panner.distanceModel = 'linear';
        panner.refDistance = 2;
        panner.maxDistance = range;
        panner.rolloffFactor = 1;
        panner.positionX.value = cue.x;
        panner.positionY.value = 0;
        panner.positionZ.value = cue.z;
      }
      const gain = context.createGain();
      const intensity = Number.isFinite(cue.intensity) ? Math.max(0, Math.min(2, cue.intensity!)) : 1;
      gain.gain.value = Math.min(8, event.gain * variant.gain * intensity * variation.gain);
      if (panner) { source.connect(panner); panner.connect(gain); }
      else source.connect(gain);
      gain.connect(master);
      voice = { source, panner, gain, kind: cue.kind, variantGain: variant.gain };
      const playingVoice = voice;
      source.onended = () => this.releaseVoice(playingVoice);
      this.voices.add(voice);
      source.start();
    } catch {
      if (voice) this.releaseVoice(voice);
      // A decoding/device failure is silent and never affects the game.
    }
  }

  private stopVoice(voice: Voice): void {
    try { voice.source.stop(); } catch { /* Source may have already ended. */ }
    this.releaseVoice(voice);
  }

  private releaseVoice(voice: Voice): void {
    if (!this.voices.delete(voice)) return;
    for (const [id, active] of this.continuous) if (active === voice) this.continuous.delete(id);
    voice.source.onended = null;
    voice.source.disconnect();
    voice.panner?.disconnect();
    voice.gain.disconnect();
  }

  private reconcileContinuous(): void {
    const context = this.context; const master = this.master; const manifest = this.manifest;
    if (this.disposed || this.paused || this.hidden || this.muted || !context || !master || !manifest || context.state !== 'running') return;
    const selected = selectContinuousSources(this.continuousSources, manifest.events, this.camera);
    const selectedIds = new Set(selected.map(source => source.id));
    for (const [id, voice] of this.continuous) {
      if (!selectedIds.has(id)) this.fadeOutContinuous(id, voice);
    }
    for (const source of selected) {
      const event = manifest.events[source.kind]!;
      const existing = this.continuous.get(source.id);
      if (existing && existing.kind !== source.kind) this.fadeOutContinuous(source.id, existing);
      else if (existing) {
        if (existing.panner) {
          existing.panner.positionX.value = source.x;
          existing.panner.positionZ.value = source.z;
          existing.panner.maxDistance = audibleRange(event.maxDistance, this.camera);
        }
        existing.gain.gain.setTargetAtTime(this.continuousLevel(event, source) * existing.variantGain, context.currentTime, 0.12);
        continue;
      }
      const available = event.variants.filter(variant => this.buffers.get(variant.src));
      if (!available.length) continue;
      const variant = available[cueHash(source.id) % available.length]!;
      const buffer = this.buffers.get(variant.src)!;
      if (this.voices.size >= MAX_VOICES) {
        const victim = this.voices.values().next().value as Voice | undefined;
        if (victim) this.stopVoice(victim);
      }
      let voice: Voice | null = null;
      try {
        const node = context.createBufferSource();
        node.buffer = buffer;
        node.loop = true;
        const panner = event.spatial ? context.createPanner() : null;
        if (panner) {
          panner.panningModel = 'equalpower';
          panner.distanceModel = 'linear';
          panner.refDistance = 2;
          panner.maxDistance = audibleRange(event.maxDistance, this.camera);
          panner.rolloffFactor = 1;
          panner.positionX.value = source.x;
          panner.positionY.value = 0;
          panner.positionZ.value = source.z;
        }
        const gain = context.createGain();
        gain.gain.value = 0;
        if (panner) { node.connect(panner); panner.connect(gain); }
        else node.connect(gain);
        gain.connect(master);
        voice = { source: node, panner, gain, kind: source.kind, variantGain: variant.gain };
        const playingVoice = voice;
        node.onended = () => this.releaseVoice(playingVoice);
        this.voices.add(voice);
        this.continuous.set(source.id, voice);
        node.start();
        gain.gain.setTargetAtTime(this.continuousLevel(event, source) * variant.gain, context.currentTime, 0.12);
      } catch {
        if (voice) {
          this.continuous.delete(source.id);
          this.releaseVoice(voice);
        }
        // Missing device/asset leaves game state untouched.
      }
    }
  }

  private continuousLevel(event: SoundEvent, source: ContinuousSource): number {
    const gain = Number.isFinite(source.gain) ? Math.max(0, Math.min(2, source.gain!)) : 1;
    return Math.min(2, event.gain * gain);
  }

  private fadeOutContinuous(id: string, voice: Voice): void {
    this.continuous.delete(id);
    const context = this.context;
    if (!context || context.state === 'closed') { this.stopVoice(voice); return; }
    voice.gain.gain.cancelScheduledValues(context.currentTime);
    voice.gain.gain.setTargetAtTime(0, context.currentTime, 0.08);
    try { voice.source.stop(context.currentTime + 0.45); } catch { this.releaseVoice(voice); }
  }
}
