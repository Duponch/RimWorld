import { audibleRange, listenerPose, sourceDistance, type AudioCamera } from './spatial';

export interface ContinuousSource {
  id: string;
  kind: string;
  x: number;
  z: number;
  gain?: number;
}

export interface ContinuousEventInfo { maxDistance: number; spatial: boolean; loop: boolean }

/** Snapshot-side preselection before the four-voice Web Audio selection. The
 * focus must be the listener pose, not merely the orbit target in perspective. */
export function createNearbyFireCollector(focus:{x:number;z:number},limit=12,radius=32) {
  const nearby:(ContinuousSource&{gain:number;distance:number})[]=[];
  return {
    add(id:string,x:number,z:number,gain:number):void {
      const distance=(x-focus.x)**2+(z-focus.z)**2;
      if(distance>radius*radius)return;
      const source={id,kind:'ambient.fire',x,z,gain,distance};
      if(nearby.length<limit){nearby.push(source);return;}
      let worst=0;for(let i=1;i<nearby.length;i++)if(nearby[i]!.distance>nearby[worst]!.distance)worst=i;
      if(distance<nearby[worst]!.distance)nearby[worst]=source;
    },
    sources():ContinuousSource[]{return nearby.map(({id,kind,x,z,gain})=>({id,kind,x,z,gain}));},
  };
}

/** Called on source/camera changes, never on each audio frame. */
export function selectContinuousSources(
  sources: readonly ContinuousSource[],
  eventInfo: Readonly<Record<string, ContinuousEventInfo>>,
  camera: AudioCamera,
  limit = 4,
): ContinuousSource[] {
  const pose = listenerPose(camera);
  const seen = new Set<string>();
  const candidates: { source: ContinuousSource; score: number }[] = [];
  for (const source of sources) {
    if (!source.id || seen.has(source.id) || !Number.isFinite(source.x) || !Number.isFinite(source.z)) continue;
    seen.add(source.id);
    const event = eventInfo[source.kind];
    if (!event?.loop) continue;
    const distance = event.spatial ? sourceDistance(source.x, source.z, pose) : 0;
    if (event.spatial && distance >= audibleRange(event.maxDistance, camera)) continue;
    candidates.push({ source, score: distance });
  }
  candidates.sort((a, b) => a.score - b.score || a.source.id.localeCompare(b.source.id));
  return candidates.slice(0, Math.max(0, limit)).map(candidate => candidate.source);
}
