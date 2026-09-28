import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioDirector, parseAudioManifest } from '../src/audio/AudioDirector';
import { AudioCueScheduler } from '../src/audio/scheduler';
import { audibleRange, listenerPose, sourceDistance } from '../src/audio/spatial';
import { selectContinuousSources } from '../src/audio/continuous';
import { cueVariation, selectOneShots } from '../src/audio/selection';

describe('audio cue presentation queue', () => {
  it('orders cues by tick and deduplicates repeated snapshot delivery', () => {
    const queue = new AudioCueScheduler();
    const later = { id: 'hit:2', tick: 12, kind: 'mining.hit', x: 3, z: 4 };
    const first = { id: 'hit:1', tick: 10, kind: 'mining.hit', x: 3, z: 4 };
    queue.ingest([later, first, first]);
    expect(queue.takeDue(9.9)).toEqual([]);
    expect(queue.takeDue(10)).toEqual([first]);
    queue.ingest([first]);
    expect(queue.takeDue(12)).toEqual([later]);
    expect(queue.pendingCount).toBe(0);
  });

  it('drops stale cues after a stalled presentation and clears on a new world', () => {
    const queue = new AudioCueScheduler();
    queue.ingest([
      { id: 'old', tick: 1, kind: 'weapon.gunshot', x: 0, z: 0 },
      { id: 'fresh', tick: 20, kind: 'weapon.gunshot', x: 0, z: 0 },
    ]);
    expect(queue.takeDue(20)).toEqual([{ id: 'fresh', tick: 20, kind: 'weapon.gunshot', x: 0, z: 0 }]);
    queue.ingest([{ id: 'new-map', tick: 21, kind: 'mining.hit', x: 0, z: 0 }]);
    queue.reset();
    expect(queue.takeDue(21)).toEqual([]);
  });

  it('bounds a flood of future cues without scanning them on every frame', () => {
    const queue = new AudioCueScheduler();
    queue.ingest(Array.from({ length: 500 }, (_, i) => ({
      id: `event:${i}`, tick: i + 1, kind: 'woodcutting.hit', x: 1, z: 1,
    })));
    expect(queue.pendingCount).toBe(256);
    expect(queue.takeDue(1)).toHaveLength(1);
  });
});

describe('sound spatialisation', () => {
  it('anchors a high orthographic view on its target, not its distant camera body', () => {
    const pose = listenerPose({ x: 150, y: 300, z: 160, targetX: 20, targetZ: 30, span: 32, mode: 'orthographic' });
    expect(pose.x).toBe(20);
    expect(pose.z).toBe(30);
    expect(sourceDistance(21, 30, pose)).toBe(1);
    expect(Math.hypot(pose.forwardX, pose.forwardZ)).toBeCloseTo(1);
  });

  it('moves the listener toward a low perspective camera and narrows range at overview zoom', () => {
    const pose = listenerPose({ x: 0, y: 3, z: 0, targetX: 10, targetZ: 0, mode: 'perspective' });
    expect(pose.x).toBeLessThan(10);
    expect(pose.x).toBeGreaterThan(0);
    const near = audibleRange(24, { x: 0, y: 30, z: 0, span: 16 });
    const overview = audibleRange(24, { x: 0, y: 30, z: 0, span: 128 });
    expect(overview).toBeLessThan(near);
    expect(overview).toBeLessThanOrEqual(36);
  });
});

describe('audio manifest', () => {
  it('keeps valid local assets and rejects external or traversal URLs', () => {
    const manifest = parseAudioManifest({
      version: 1,
      events: {
        'mining.hit': {
          gain: 0.6, maxDistance: 20,
          variants: [
            { src: '/assets/audio/sfx/mining-1.ogg', gain: 0.8 },
            { src: 'https://example.org/a.ogg' },
            { src: '/assets/audio/../secret.ogg' },
          ],
        },
      },
    });
    expect(manifest.events['mining.hit']).toEqual({
      gain: 0.6, maxDistance: 20, loop: false, spatial: true,
      variants: [{ src: '/assets/audio/sfx/mining-1.ogg', gain: 0.8 }],
    });
  });

  it('accepts a QA gain of five for a one-shot while keeping loops conservatively capped', () => {
    const manifest = parseAudioManifest({
      version: 1,
      events: {
        'weapon.gunshot': { gain: 5, variants: [{ src: '/assets/audio/sfx/gun.mp3', gain: 1.5 }] },
        'ambient.fire': { loop: true, gain: 5, variants: [{ src: '/assets/audio/sfx/fire.mp3' }] },
      },
    });
    expect(manifest.events['weapon.gunshot']?.gain).toBe(5);
    expect(manifest.events['weapon.gunshot']?.variants[0]?.gain).toBe(1.5);
    expect(manifest.events['ambient.fire']?.gain).toBe(1);
  });
});

describe('continuous sound selection', () => {
  it('keeps the closest fires and a global rain bed within four voices', () => {
    const events = {
      'ambient.fire': { loop: true, spatial: true, maxDistance: 24 },
      'weather.rain': { loop: true, spatial: false, maxDistance: 24 },
    };
    const sources = [
      ...Array.from({ length: 8 }, (_, i) => ({ id: `fire:${i}`, kind: 'ambient.fire', x: i + 1, z: 0 })),
      { id: 'rain', kind: 'weather.rain', x: 999, z: 999 },
    ];
    expect(selectContinuousSources(sources, events, { x: 0, y: 100, z: 0, targetX: 0, targetZ: 0, span: 32 }, 4)
      .map(source => source.id)).toEqual(['rain', 'fire:0', 'fire:1', 'fire:2']);
  });
});

describe('one-shot burst budget', () => {
  it('prefers audible combat over nearby work and creates at most twelve candidates', () => {
    const cues = [
      ...Array.from({ length: 100 }, (_, i) => ({ id: `work:${i}`, tick: 10, kind: 'mining.hit', x: i % 10, z: 0 })),
      { id: 'gun', tick: 10, kind: 'weapon.gunshot', x: 18, z: 0 },
      { id: 'melee', tick: 10, kind: 'weapon.melee', x: 17, z: 0 },
      { id: 'far-gun', tick: 10, kind: 'weapon.gunshot', x: 100, z: 0 },
    ];
    const events = {
      'mining.hit': { loop: false, gain: 1, maxDistance: 24 },
      'weapon.gunshot': { loop: false, gain: 1, maxDistance: 24 },
      'weapon.melee': { loop: false, gain: 1, maxDistance: 24 },
    };
    const selected = selectOneShots(cues, events, { x: 0, y: 100, z: 0, targetX: 0, targetZ: 0, span: 32 });
    expect(selected).toHaveLength(12);
    expect(selected.slice(0, 2).map(cue => cue.id)).toEqual(['gun', 'melee']);
    expect(selected.some(cue => cue.id === 'far-gun')).toBe(false);
  });

  it('varies one-shot playback deterministically within three percent and one decibel', () => {
    for (let i = 0; i < 100; i++) {
      const id = `cue:${i}`;
      const variation = cueVariation(id);
      expect(variation).toEqual(cueVariation(id));
      expect(variation.playbackRate).toBeGreaterThanOrEqual(0.97);
      expect(variation.playbackRate).toBeLessThanOrEqual(1.03);
      expect(variation.gain).toBeGreaterThanOrEqual(10 ** (-1 / 20));
      expect(variation.gain).toBeLessThanOrEqual(10 ** (1 / 20));
    }
  });
});

describe('continuous voice lifecycle', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loops, fades on pause, restarts on resume, and stops when removed', async () => {
    class Param {
      value = 0;
      targets: number[] = [];
      setValueAtTime(value: number): void { this.value = value; }
      setTargetAtTime(value: number): void { this.value = value; this.targets.push(value); }
      cancelScheduledValues(): void {}
    }
    class Node {
      connect(): void {}
      disconnect(): void {}
    }
    class Source extends Node {
      buffer: unknown;
      loop = false;
      playbackRate = { value: 1 };
      onended: (() => void) | null = null;
      starts = 0;
      stops = 0;
      start(): void { this.starts++; }
      stop(): void { this.stops++; }
    }
    class FakeContext {
      static latest: FakeContext;
      state = 'running';
      currentTime = 1;
      destination = new Node();
      gains: { gain: Param }[] = [];
      sources: Source[] = [];
      listener = {
        positionX: new Param(), positionY: new Param(), positionZ: new Param(),
        forwardX: new Param(), forwardY: new Param(), forwardZ: new Param(),
      };
      constructor() { FakeContext.latest = this; }
      createGain() {
        const node = Object.assign(new Node(), { gain: new Param() });
        this.gains.push(node);
        return node;
      }
      createPanner() {
        return Object.assign(new Node(), {
          positionX: new Param(), positionY: new Param(), positionZ: new Param(),
          panningModel: '', distanceModel: '', refDistance: 0, maxDistance: 0, rolloffFactor: 0,
        });
      }
      createBufferSource() { const source = new Source(); this.sources.push(source); return source; }
      decodeAudioData(): Promise<object> { return Promise.resolve({}); }
      resume(): Promise<void> { return Promise.resolve(); }
      close(): Promise<void> { this.state = 'closed'; return Promise.resolve(); }
    }
    vi.stubGlobal('AudioContext', FakeContext);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('manifest.json')
      ? new Response(JSON.stringify({
        version: 1, events: {
          'weather.rain': { loop: true, spatial: false, variants: [{ src: '/assets/audio/sfx/rain.ogg' }] },
          'mining.hit': { gain: 5, variants: [{ src: '/assets/audio/sfx/rain.ogg' }] },
        },
      })) : new Response(new Uint8Array([1]))));

    const audio = new AudioDirector();
    await audio.unlock();
    expect(audio.loadedCount).toBe(1);
    expect(audio.availableSounds).toBe(2);
    audio.setContinuousSources([{ id: 'rain', kind: 'weather.rain', x: 0, z: 0 }]);
    const context = FakeContext.latest;
    expect(context.sources).toHaveLength(1);
    expect(context.sources[0]!.loop).toBe(true);
    expect(context.sources[0]!.starts).toBe(1);
    audio.update({ presentedTick: 1, paused: true, hidden: false });
    expect(context.gains[0]!.gain.targets.at(-1)).toBe(0);
    expect(context.sources[0]!.stops).toBe(1);
    audio.update({ presentedTick: 1, paused: false, hidden: false });
    expect(context.sources).toHaveLength(2);
    expect(context.gains[0]!.gain.targets.at(-1)).toBe(0.75);
    audio.setContinuousSources([]);
    expect(context.sources[1]!.stops).toBe(1);
    audio.ingestCues([{ id: 'mining:5', tick: 5, kind: 'mining.hit', x: 0, z: 0 }]);
    audio.update({ presentedTick: 4.9, paused: false, hidden: false });
    expect(context.sources).toHaveLength(2);
    audio.update({ presentedTick: 5, paused: false, hidden: false });
    expect(context.sources).toHaveLength(3);
    expect(context.sources[2]!.loop).toBe(false);
    expect(context.sources[2]!.starts).toBe(1);
    expect(context.gains[3]!.gain.value).toBeCloseTo(5 * cueVariation('mining:5').gain);
    audio.dispose();
  });

  it('loads and decodes no more than three assets concurrently at unlock', async () => {
    class Param {
      value = 0;
      setValueAtTime(value: number): void { this.value = value; }
      setTargetAtTime(value: number): void { this.value = value; }
      cancelScheduledValues(): void {}
    }
    class Node { connect(): void {} disconnect(): void {} }
    let activeFetches = 0; let peakFetches = 0;
    let activeDecodes = 0; let peakDecodes = 0;
    class FakeContext {
      state = 'running';
      currentTime = 0;
      destination = new Node();
      listener = {
        positionX: new Param(), positionY: new Param(), positionZ: new Param(),
        forwardX: new Param(), forwardY: new Param(), forwardZ: new Param(),
      };
      createGain() { return Object.assign(new Node(), { gain: new Param() }); }
      resume(): Promise<void> { return Promise.resolve(); }
      close(): Promise<void> { this.state = 'closed'; return Promise.resolve(); }
      async decodeAudioData(): Promise<object> {
        activeDecodes++;
        peakDecodes = Math.max(peakDecodes, activeDecodes);
        await new Promise(resolve => setTimeout(resolve, 2));
        activeDecodes--;
        return {};
      }
    }
    vi.stubGlobal('AudioContext', FakeContext);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('manifest.json')) {
        const events = Object.fromEntries(Array.from({ length: 13 }, (_, i) => [
          `event:${i}`, { variants: [{ src: `/assets/audio/sfx/${i}.mp3` }] },
        ]));
        return new Response(JSON.stringify({ version: 1, events }));
      }
      activeFetches++;
      peakFetches = Math.max(peakFetches, activeFetches);
      await new Promise(resolve => setTimeout(resolve, 2));
      activeFetches--;
      return new Response(new Uint8Array([1]));
    }));
    const audio = new AudioDirector();
    await audio.unlock();
    expect(audio.loadedCount).toBe(13);
    expect(peakFetches).toBeLessThanOrEqual(3);
    expect(peakDecodes).toBeLessThanOrEqual(3);
    audio.dispose();
  });
});
