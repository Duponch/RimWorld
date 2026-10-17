/** Generation-only actual-map reachability. This is distinct from road A*:
 * closed uses real passable regions; dry/destroy use the Core cell predicate.
 * Re-capture after physical edits. No retained index or substitute World. */
import {captureActualLocalDistricts256,type ActualStartMap256,type ActualRegionType256} from './actual-local-districts-256.ts';
import {footprintCells} from './definitions.ts';
import {START_STRUCTURE_PHYSICS_256} from './player-start-physics-256.ts';
import {terrainIsWater256} from './natural-terrain-runtime-256.ts';
import type {LocalRoadMode256} from './local-road-path-256.ts';
const CARDINAL=[[0,1],[1,0],[0,-1],[-1,0]] as const;
const AROUND=[...CARDINAL,[1,-1],[1,1],[-1,1],[-1,-1]] as const;
export interface ActualGenerationRegion256 {readonly id:number;readonly type:ActualRegionType256;readonly cellCount:number;readonly cells:readonly number[];readonly bounds:Readonly<{minX:number;maxX:number;minZ:number;maxZ:number}>;readonly links:readonly number[]}
interface Region256 {type:ActualRegionType256;district:number|null;districtEdge:boolean;links:Set<number>}
export function captureGeographicGenerationReachability256(map:ActualStartMap256,actualDoorPassage?:ReadonlyMap<number,boolean>){
 const physical=captureActualLocalDistricts256(map),{width:w,height:h}=map,n=w*h;
 const valid=(i:number)=>Number.isInteger(i)&&i>=0&&i<n;
 const neighbours=(i:number,diagonal=false)=>{
  const x=i%w,z=Math.floor(i/w),out:number[]=[];
  for(const [dx,dz] of diagonal?AROUND:CARDINAL){const nx=x+dx,nz=z+dz;if(nx>=0&&nz>=0&&nx<w&&nz<h)out.push(nz*w+nx);}return out;
 };
 const destroyable=new Uint8Array(n),water=new Uint8Array(n);
 for(let i=0;i<n;i++){const tile=map.tiles[i]!;water[i]=!tile.bridge&&!tile.floor&&terrainIsWater256(tile.terrain)?1:0;if(tile.terrain==='rock')destroyable[i]=1;}
 for(const s of map.structures){
  const fact=START_STRUCTURE_PHYSICS_256[s.kind];if(!fact)throw Error('Missing generation edifice definition');
  // The fresh generation boundary has no dynamic approach/blocked-open state.
  // Do not pretend its simplified capture answers arbitrary live door queries.
  if(fact.door){if(actualDoorPassage){if(typeof actualDoorPassage.get(s.z*w+s.x)!=='boolean')throw Error('Live reachability lacks its actual door passage');}else if(!s.door||s.door.open||s.door.holdOpen)throw Error('Generation reachability requires a genuine fresh closed door');}
  for(const c of footprintCells(s)){const i=c.z*w+c.x;if(fact.edifice)destroyable[i]=1;}
 }
 const types=Array.from({length:n},(_,i)=>physical.regionType(i)),ids=new Int32Array(n);ids.fill(-1);
 const regions:Region256[]=[],regionCells:number[][]=[],queue=new Int32Array(n);
 for(let root=0;root<n;root++){
  const type=types[root]!;if(ids[root]!==-1||type==='none')continue;
  const district=physical.district(root),id=regions.length,r:Region256={type,district:district?.id??null,districtEdge:district?.touchesMapEdge??false,links:new Set()};regions.push(r);
  const bx=Math.floor(root%w/12),bz=Math.floor(Math.floor(root/w)/12);let head=0,tail=1;queue[0]=root;ids[root]=id;
  while(head<tail){const at=queue[head++]!;
   if(type==='portal')continue;
   for(const next of neighbours(at))if(ids[next]===-1&&types[next]===type&&Math.floor(next%w/12)===bx&&Math.floor(Math.floor(next/w)/12)===bz){ids[next]=id;queue[tail++]=next;}
  }
  regionCells.push(Array.from(queue.subarray(0,tail)).sort((a,b)=>a-b));
 }
 for(let i=0;i<n;i++)if(ids[i]!==-1)for(const next of neighbours(i))if(ids[next]!==-1&&ids[i]!==ids[next])regions[ids[i]!]!.links.add(ids[next]!);
 const passable=(r:Region256)=>r.type==='normal'||r.type==='fence'||r.type==='portal';
 const allows=(r:Region256,mode:LocalRoadMode256)=>mode==='destroy'||mode==='destroy-dry'||passable(r)&&r.type!=='portal';
 const regionSearch=(starts:readonly number[],goal:(r:Region256)=>boolean,mode:LocalRoadMode256,limit=Number.MAX_SAFE_INTEGER)=>{
  const seen=new Uint8Array(regions.length),open:number[]=[];for(const r of starts)if(!seen[r]){seen[r]=1;open.push(r);}
  let count=0;for(let head=0;head<open.length&&count<limit;head++,count++){
   const r=regions[open[head]!]!;if(goal(r))return true;
   for(const next of r.links){const other=regions[next]!;if(!seen[next]&&passable(other)&&allows(other,mode)){seen[next]=1;open.push(next);}}
  }return false;
 };
 const cellReach=(start:number,end:number,mode:LocalRoadMode256)=>{
  const dry=mode==='closed-dry'||mode==='destroy-dry',destroy=mode==='destroy'||mode==='destroy-dry';
  const permitted=(i:number)=>{
   if(dry&&water[i])return false;
   if(!physical.normalWalkable(i)&&!(destroy&&destroyable[i]))return false;
   const region=ids[i]!;return region<0||allows(regions[region]!,mode);
  };
  if(!permitted(start))return false;
  const seen=new Uint8Array(n);let head=0,tail=1;queue[0]=start;seen[start]=1;
  while(head<tail){const at=queue[head++]!;if(at===end)return true;for(const next of neighbours(at))if(!seen[next]&&permitted(next)){seen[next]=1;queue[tail++]=next;}}return false;
 };
 const canReach=(start:number,end:number,mode:LocalRoadMode256):boolean=>{
  if(!valid(start)||!valid(end))return false;if(start===end)return true;
  const a=physical.district(start),b=physical.district(end),dry=mode==='closed-dry'||mode==='destroy-dry';
  if(!dry&&a&&b&&a.id===b.id)return true;
  if(mode==='destroy'){
   // The real PassDoors precheck succeeds through all passable portals before
   // the destroyable-cell flood is considered.
   const from=physical.normalWalkable(start)?[start]:neighbours(start,true).filter(i=>physical.normalWalkable(i));
   const starts=from.map(i=>ids[i]!).filter(i=>i>=0),target=ids[end]!;
   if(target>=0&&passable(regions[target]!)&&regionSearch(starts,r=>r===regions[target],mode))return true;
  }
  if(mode!=='closed')return cellReach(start,end,mode);
  const target=ids[end]!;if(target<0||!allows(regions[target]!,mode))return false;
  const from=physical.normalWalkable(start)?[start]:neighbours(start,true).filter(i=>physical.normalWalkable(i));
  const starts=from.map(i=>ids[i]!).filter(i=>i>=0);
  return regionSearch(starts,r=>r===regions[target],mode);
 };
 const topology:readonly ActualGenerationRegion256[]=Object.freeze(regions.map((r,id)=>{const cells=Object.freeze(regionCells[id]!),xs=cells.map(c=>c%w),zs=cells.map(c=>Math.floor(c/w));return Object.freeze({id,type:r.type,cellCount:cells.length,cells,bounds:Object.freeze({minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)}),links:Object.freeze([...r.links])});}));
 return Object.freeze({physical,canReach,regions:topology,regionAt:(cell:number)=>valid(cell)&&ids[cell]!>=0?topology[ids[cell]!]!:undefined,
  canReachMapEdgeNoPassClosedDoorsOrWater:(cell:number)=>{
   if(!valid(cell))return false;const id=ids[cell]!;if(id<0||!passable(regions[id]!))return false;
   // Core CanReachMapEdge uses Region.Allows, which does not inspect water.
   // It is deliberately NOT a dry cell flood despite this TraverseMode name.
   if(physical.district(cell)?.touchesMapEdge)return true;
   return regionSearch([id],r=>r.districtEdge,'closed-dry',9999);
  }
 });
}
