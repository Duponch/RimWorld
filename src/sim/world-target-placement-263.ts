import {captureGeographicGenerationReachability256} from './geographic-generation-reachability-256.ts';
import {hiveDoorFreePassage256} from './cave-hive-closewalk-256.ts';
import {captureRandomClosewalk256} from './random-closewalk-256.ts';
import {drawCampSpawnCell256,stagedCampArrivalRandom256} from './camp-center-entry-256.ts';
import {foggedCell256} from './exploration-state-256.ts';
import type {World,Cell} from './types.ts';
/** Actual Edge/DoNotDrop arrival. The current deterministic uniform edge
 * preference is the existing declared travel adaptation; no terrain editing,
 * opposing fake roster, center arrival or favorable map regeneration. */
export function prepareWorldTargetPlacements263(map:World,count:number,rng:number):{rng:number;cells:Cell[]}|null {
 if(!Number.isSafeInteger(count)||count<1)return null;
 const doors=new Map(map.structures.filter(s=>s.door).map(s=>[s.z*map.width+s.x,hiveDoorFreePassage256(map,s)])),reach=captureGeographicGenerationReachability256(map,doors),capture=captureRandomClosewalk256(map,reach),random=stagedCampArrivalRandom256(rng),edges:number[]=[];
 for(let z=0;z<map.height;z++)for(let x=0;x<map.width;x++)if(x===0||z===0||x===map.width-1||z===map.height-1){const c=z*map.width+x;if(reach.physical.standable(c)&&!foggedCell256(map,c))edges.push(c);}
 if(!edges.length)return null;const origin=edges[random.integer(0,edges.length)]!,occupied=new Set([...map.pawns,...map.wildlife?.animals??[],...map.mechanoids??[]].filter(p=>p.state!=='dead').map(p=>p.z*map.width+p.x)),cells:Cell[]=[];
 for(let i=0;i<count;i++){const c=drawCampSpawnCell256(capture,origin,occupied,c=>foggedCell256(map,c),random);if(!capture.physical.standable(c)||occupied.has(c))return null;occupied.add(c);cells.push({x:c%map.width,z:Math.floor(c/map.width)});}
 return {cells,rng:random.rng};
}
