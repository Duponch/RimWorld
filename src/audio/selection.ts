import type { AudioCue } from './scheduler';
import { audibleRange, listenerPose, sourceDistance, type AudioCamera } from './spatial';

export interface OneShotEventInfo { maxDistance: number; loop: boolean; gain: number; spatial?: boolean }

export function cueHash(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/** Presentation-only variation; never consumes the simulation PRNG. */
export function cueVariation(id: string): { playbackRate: number; gain: number } {
  const hash = cueHash(id);
  const playbackRate = 0.97 + (hash & 0xffff) / 0xffff * 0.06;
  const gainDb = -1 + (hash >>> 16) / 0xffff * 2;
  return { playbackRate, gain: 10 ** (gainDb / 20) };
}

function priority(kind: string): number {
  if (kind === 'weapon.gunshot') return 0;
  if (kind === 'weapon.melee') return 1;
  return 2;
}

/** A snapshot burst can contain many work contacts; only audible top cues get nodes. */
export function selectOneShots(
  cues: readonly AudioCue[],
  events: Readonly<Record<string, OneShotEventInfo>>,
  camera: AudioCamera,
  limit = 12,
): AudioCue[] {
  const pose = listenerPose(camera);
  const candidates: { cue: AudioCue; distance: number; priority: number }[] = [];
  for (const cue of cues) {
    const event = events[cue.kind];
    if (!event || event.loop || event.gain <= 0) continue;
    const distance = event.spatial === false ? 0 : sourceDistance(cue.x, cue.z, pose);
    if (event.spatial !== false && distance >= audibleRange(event.maxDistance, camera)) continue;
    candidates.push({ cue, distance, priority: priority(cue.kind) });
  }
  candidates.sort((a, b) => a.priority - b.priority || a.distance - b.distance ||
    a.cue.tick - b.cue.tick || a.cue.id.localeCompare(b.cue.id));
  return candidates.slice(0, Math.max(0, limit)).map(candidate => candidate.cue);
}
