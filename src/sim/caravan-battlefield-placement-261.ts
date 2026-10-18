import {captureRandomClosewalk256} from './random-closewalk-256.ts';
import {captureGeographicGenerationReachability256} from './geographic-generation-reachability-256.ts';
import {drawCampSpawnCell256,stagedCampArrivalRandom256} from './camp-center-entry-256.ts';
import {foggedCell256} from './exploration-state-256.ts';
import type {World,Cell} from './types.ts';
const f=Math.fround;
/** Actual fresh-map regions, two connected opposing origins, bounded native
 * search stages. The original deterministic edge sampling is an adaptation of
 * Core's weighted road edge preference; it never edits terrain or retries a map. */
export function prepareBattlefieldPlacements261(map:World,playerCount:number,foreignCount:number,initialRng:number):{rng:number;players:Cell[];foreign:Cell[]}|null {
 if(!Number.isSafeInteger(playerCount)||playerCount<1||!Number.isSafeInteger(foreignCount)||foreignCount<1)return null;
 const reach=captureGeographicGenerationReachability256(map),capture=captureRandomClosewalk256(map,reach),random=stagedCampArrivalRandom256(initialRng);
 const {width:w,height:h}=map,valid=(i:number)=>capture.physical.standable(i)&&!foggedCell256(map,i),connected=(a:number,b:number)=>reach.canReach(a,b,'closed');
 const pick=(xs:readonly number[])=>xs.length?xs[random.integer(0,xs.length)]!:null;
 const ring=(minX:number,minZ:number,maxX:number,maxZ:number)=>{const out:number[]=[];for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++)if(x===minX||x===maxX||z===minZ||z===maxZ)out.push(z*w+x);return out;};
 const insetX=Math.round(f(w*f(.2))),insetZ=Math.round(f(h*f(.2))),inner=ring(insetX,insetZ,w-1-insetX,h-1-insetZ);
 let origins:readonly [number,number]|null=null;
 for(const factor of [.05,.15]){
  for(let attempt=0;attempt<10&&!origins;attempt++){
   const a=pick(inner);if(a===null)break;
   const ax=a%w,az=Math.floor(a/w),bx=w-ax,bz=h-az,radius=Math.max(Math.round(f(Math.min(w,h)*f(factor))),1);
   const nearby=(x:number,z:number)=>{const minX=Math.max(0,x-radius),maxX=Math.min(w-1,x+radius),minZ=Math.max(0,z-radius),maxZ=Math.min(h-1,z+radius);return random.integer(minZ,maxZ+1)*w+random.integer(minX,maxX+1);};
   for(let pair=0;pair<20&&!origins;pair++){
    const first=pair?nearby(ax,az):a,second=pair?nearby(bx,bz):bz*w+bx;
    if(first>=0&&first<w*h&&second>=0&&second<w*h&&valid(first)&&valid(second)&&connected(first,second))origins=[first,second];
   }
  }
  if(origins)break;
 }
 if(!origins){
  const edge=ring(0,0,w-1,h-1).filter(valid),first=pick(edge);
  if(first===null)return null;
  const minimum=f(Math.max(w,h)*f(.6)),distant=edge.filter(i=>{const dx=i%w-first%w,dz=Math.floor(i/w)-Math.floor(first/w);return dx*dx+dz*dz>=minimum*minimum&&connected(first,i);});
  const second=pick(distant)??pick(edge.filter(i=>connected(first,i)));
  if(second===null)return null;origins=[first,second];
 }
 const used=new Set<number>([...map.pawns,...map.wildlife?.animals??[]].filter(p=>p.state!=='dead').map(p=>p.z*w+p.x));
 const spawn=(root:number,count:number)=>{const cells:Cell[]=[];for(let i=0;i<count;i++){const cell=drawCampSpawnCell256(capture,root,used,c=>foggedCell256(map,c),random);if(!valid(cell)||used.has(cell))return null;used.add(cell);cells.push({x:cell%w,z:Math.floor(cell/w)});}return cells;};
 const players=spawn(origins[0],playerCount),foreign=spawn(origins[1],foreignCount);
 return players&&foreign?{players,foreign,rng:random.rng}:null;
}
