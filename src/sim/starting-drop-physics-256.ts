import {captureActualLocalDistricts256,type ActualStartMap256} from './actual-local-districts-256.ts';
import {roofKindAt,roofCells} from './roof-rules.ts';
import {terrainIsWater256} from './natural-terrain-runtime-256.ts';
import type {Cell} from './types.ts';
import type {StartingDropReaders256} from './starting-cell-finder-256.ts';

/** A creation-only capture of real physical owners. It handles the initial
 * one-cell active transporters explicitly; no generated actor is spawned in
 * order to ask whether a destination works. Pending cells are copied into
 * this local capture as each actual pod is allocated. */
export function captureStartingDropPhysics256(map:ActualStartMap256,center:Readonly<Cell>) {
 const physical=captureActualLocalDistricts256(map),{width:w,height:h}=map,n=w*h;
 const valid=(c:Readonly<Cell>)=>Number.isInteger(c.x)&&Number.isInteger(c.z)&&c.x>=0&&c.z>=0&&c.x<w&&c.z<h;
 if(!valid(center)||!physical.normalWalkable(center.z*w+center.x))throw Error('Actual starting drop center is not walkable');
 const neighbours=(i:number)=>{const x=i%w,z=Math.floor(i/w),out:number[]=[];if(z+1<h)out.push(i+w);if(x+1<w)out.push(i+1);if(z>0)out.push(i-w);if(x>0)out.push(i-1);return out;};
 const roofs=roofCells(map),rooms=new Int32Array(n);rooms.fill(-1);
 const types=Array.from({length:n},(_,i)=>physical.regionType(i)),queue=new Int32Array(n);
 const summaries:{id:number;psychologicallyOutdoors:boolean}[]=[];
 for(let root=0;root<n;root++){
  if(rooms[root]!==-1||types[root]==='none')continue;
  const id=summaries.length,portal=types[root]==='portal';let head=0,tail=1,openRoofs=0,edge=false;queue[0]=root;rooms[root]=id;
  while(head<tail){const at=queue[head++]!,x=at%w,z=Math.floor(at/w);if(!roofs.has(at))openRoofs++;if(x===0||z===0||x===w-1||z===h-1)edge=true;
   if(portal)continue;
   // Normal, Fence and ImpassableFreeAirExchange districts share a Room;
   // Portal is a separate one-cell Room regardless of its current openness.
   for(const next of neighbours(at))if(rooms[next]===-1&&types[next]!=='none'&&types[next]!=='portal'){rooms[next]=id;queue[tail++]=next;}
  }
  summaries.push(Object.freeze({id,psychologicallyOutdoors:openRoofs>=300||edge&&Math.fround(openRoofs/tail)>=Math.fround(.5)}));
 }
 const reached=new Uint8Array(n);let head=0,tail=1;queue[0]=center.z*w+center.x;reached[queue[0]!]=1;
 while(head<tail){const at=queue[head++]!;for(const next of neighbours(at))if(!reached[next]&&(types[next]==='normal'||types[next]==='fence'||types[next]==='portal')){reached[next]=1;queue[tail++]=next;}}
 const pods=new Set<number>();
 const readers:StartingDropReaders256={
  roomAt:c=>valid(c)&&rooms[c.z*w+c.x]!>=0?summaries[rooms[c.z*w+c.x]!]!:null,
  passDoorsReachable:(from,to)=>{if(from.x!==center.x||from.z!==center.z)throw Error('Drop reachability capture belongs to another center');return valid(to)&&!!reached[to.z*w+to.x];},
  goodDropSpot:c=>{
   if(!valid(c))return false;const cell=c.z*w+c.x,tile=map.tiles[cell]!;
   if(!physical.standable(cell)||physical.edifice(cell)||pods.has(cell)||roofKindAt(map,cell)==='natural-thick')return false;
   // All current generated edifices have real HP/scatterable definitions, so
   // none satisfies Building.IsClearableFreeBuilding's zero-work/no-HP rule.
   // Props added to the generator must enter its existing physical metadata.
   return !!tile.floor||!!tile.bridge||!terrainIsWater256(tile.terrain);
  },
 };
 return Object.freeze({readers,physical,
  // The ordinary search excludes existing capsules; Core's exhausted random
  // fallback deliberately does not. Preserve a possible duplicate anchor.
  reservePod(c:Readonly<Cell>){if(!valid(c))throw Error('Actual incoming capsule outside its map');pods.add(c.z*w+c.x);},
  fallbackAllowed(c:Readonly<Cell>){return valid(c)&&physical.normalWalkable(c.z*w+c.x)&&roofKindAt(map,c.z*w+c.x)!=='natural-thick';},
 });
}
