import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {captureActualLocalDistricts256} from './actual-local-districts-256.ts';
import {stagedCampArrivalRandom256} from './camp-center-entry-256.ts';
import {foggedCell256} from './exploration-state-256.ts';
import {isColonist} from './affiliation.ts';
import type {World,Cell} from './types.ts';
import type {AncientRect256} from './local-ancient-placement-256.ts';
/** A one-decision capture over the actual LIVE map. Generation-only readers
 * deliberately reject open doors; this rare physical admission does not.
 * No physical owner, terrain, navigation cache or campaign RNG is modified. */
export function prepareSiteThreatPlacements263(w:World,count:number,rng:number,where:{kind:'edge'}|{kind:'around';rect:AncientRect256}):{cells:Cell[];rng:number}|undefined {
 if(!isSchema263OrLater(Number(w.schemaVersion))||!Number.isSafeInteger(count)||count<1||count>w.width*w.height)return;
 const physical=captureActualLocalDistricts256(w),random=stagedCampArrivalRandom256(rng),n=w.width*w.height,reached=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
 const add=(c:number)=>{if(c>=0&&c<n&&!reached[c]&&physical.normalWalkable(c)){reached[c]=1;queue[tail++]=c;}};
 for(const p of w.pawns)if(isColonist(p)&&p.state!=='dead'&&!p.health?.death)add(p.z*w.width+p.x);
 // CanReachColony also tries real player buildings, then the largest actual
 // edge district. Original district cell count is the local bounded tie rule.
 if(!tail){for(const b of w.structures)if(b.factionId===w.worldFactions?.playerFactionId){const c=b.z*w.width+b.x,x=b.x;for(const q of [c-w.width,c+w.width,...x?[c-1]:[],...x+1<w.width?[c+1]:[]])add(q);}}
 if(!tail){let best:{id:number;cellCount:number}|undefined,root=-1;for(let c=0;c<n;c++){const d=physical.district(c);if(d?.type==='normal'&&d.touchesMapEdge&&(!best||d.cellCount>best.cellCount)){best=d;root=c;}}if(root>=0)add(root);}
 while(head<tail){const c=queue[head++]!,x=c%w.width;if(c>=w.width)add(c-w.width);if(c+w.width<n)add(c+w.width);if(x)add(c-1);if(x+1<w.width)add(c+1);}
 const occupied=new Set([...w.pawns,...w.wildlife?.animals??[],...w.mechanoids??[]].filter(p=>p.state!=='dead').flatMap(p=>[p.z*w.width+p.x,...p.motion&&p.motion.end>w.tick?[p.motion.from.z*w.width+p.motion.from.x]:[]])),cells:number[]=[];
 for(let c=0;c<n;c++){if(!physical.standable(c)||occupied.has(c))continue;const x=c%w.width,z=Math.floor(c/w.width);
  if(where.kind==='edge'){if(!reached[c]||foggedCell256(w,c)||x!==0&&z!==0&&x!==w.width-1&&z!==w.height-1)continue;}
  else{const r=where.rect;if(x<r.minX-8||x>r.maxX+8||z<r.minZ-8||z>r.maxZ+8||x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ||foggedCell256(w,c))continue;}
  cells.push(c);
 }
 if(cells.length<count)return;
 const result:Cell[]=[];for(let i=0;i<count;i++){const pick=random.integer(0,cells.length),c=cells[pick]!;cells[pick]=cells[cells.length-1]!;cells.pop();result.push({x:c%w.width,z:Math.floor(c/w.width)});}
 return {cells:result,rng:random.rng};
}
