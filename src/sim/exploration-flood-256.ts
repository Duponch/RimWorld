import {markTerrainCellChanged} from './terrain-mutation-journal.ts';
/** Original confirmed-cell exploration. No camera, time, RNG or AI traversal. */
import {explorationEnabled256,validExplorationCell256,foggedCell256,type ExplorationMap256} from './exploration-state-256.ts';
import type {FogPhysicalReaders256} from './exploration-physical-256.ts';
export interface ExplorationEffects256 {
 /** Newly cleared physical cell: retire blind mine designation if empty,
  * notify actual Things/quest owners. Called once per true-to-absent transition. */
 cellUnfogged?(cell:number):void;
 /** Flood interior only: existing mind/lord owner may wake actual occupants.
  * No dormant state, fake actor or new history is invented by this module. */
 interiorRevealed?(cell:number):void;
}
export interface FogReveal256 {changedCells:number[];interiorCells:number[];lastFloodInteriorCells?:readonly number[]}
const AROUND=[[0,1],[1,0],[0,-1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]] as const;
const FLOOD=[[0,-1],[-1,0],[0,1],[1,0]] as const;
const CARDINAL=[[0,1],[1,0],[0,-1],[-1,0]] as const;
export function fogNeighbourCells256(map:Pick<ExplorationMap256,'width'|'height'>,cell:number,diagonal=false):number[]{
 const x=cell%map.width,z=Math.floor(cell/map.width),out:number[]=[];
 for(const [dx,dz] of diagonal?AROUND:CARDINAL){const nx=x+dx,nz=z+dz;if(nx>=0&&nz>=0&&nx<map.width&&nz<map.height)out.push(nz*map.width+nx);}return out;
}
function reveal(map:ExplorationMap256,cell:number,physical:FogPhysicalReaders256,result:FogReveal256,effects:ExplorationEffects256):void {
 const worker=(at:number)=>{if(foggedCell256(map,at)){delete map.tiles[at]!.fogged;markTerrainCellChanged(map.tiles,at);result.changedCells.push(at);effects.cellUnfogged?.(at);}};
 if(!validExplorationCell256(map,cell))return;worker(cell);for(const at of physical.fullFootprint(cell))worker(at);
}
/** Caller owns the actual map and the matching geometry captured AFTER any
 * committed physical removal. Already-visible cells do not propagate flood. */
export function floodUnfog256(map:ExplorationMap256,root:number|null,physical:FogPhysicalReaders256,effects:ExplorationEffects256={}):FogReveal256 {
 const result:FogReveal256={changedCells:[],interiorCells:[]};if(!explorationEnabled256(map)||root===null||!validExplorationCell256(map,root)||!foggedCell256(map,root)||physical.makeFog(root))return result;
 const seen=new Uint8Array(map.tiles.length),queue=new Int32Array(map.tiles.length);let head=0,tail=1;queue[0]=root;seen[root]=1;
 while(head<tail){
  const cell=queue[head++]!;reveal(map,cell,physical,result,effects);result.interiorCells.push(cell);effects.interiorRevealed?.(cell);
  const x=cell%map.width,z=Math.floor(cell/map.width);
  for(const [dx,dz] of FLOOD){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=map.width||nz>=map.height)continue;const next=nz*map.width+nx;if(!seen[next]&&foggedCell256(map,next)&&!physical.makeFog(next)){seen[next]=1;queue[tail++]=next;}}
 }
 // Expand ONLY onto still-fogged blockers adjacent8 to true flood interior.
 // Roof and water do not appear in this predicate.
 for(const cell of result.interiorCells){const x=cell%map.width,z=Math.floor(cell/map.width);for(const [dx,dz] of AROUND){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=map.width||nz>=map.height)continue;const next=nz*map.width+nx;if(foggedCell256(map,next)&&physical.makeFog(next))reveal(map,next,physical,result,effects);}}
 result.lastFloodInteriorCells=result.interiorCells;return result;
}
/** Constant adjacent fog query before any optional rare geometry capture. */
export function explorationDoorNeedsReveal256(map:ExplorationMap256,cell:number):boolean {return foggedCell256(map,cell)||fogNeighbourCells256(map,cell,true).some(c=>foggedCell256(map,c));}
const append=(to:FogReveal256,from:FogReveal256)=>{for(const cell of from.changedCells)to.changedCells.push(cell);for(const cell of from.interiorCells)to.interiorCells.push(cell);to.lastFloodInteriorCells=from.interiorCells;};
/** Cell overload used by actual door/player entry notifications. */
export function floodUnfogAdjacent256(map:ExplorationMap256,cell:number,physical:FogPhysicalReaders256,effects:ExplorationEffects256={}):FogReveal256 {
 const result:FogReveal256={changedCells:[],interiorCells:[]};if(!explorationEnabled256(map)||!validExplorationCell256(map,cell))return result;
 reveal(map,cell,physical,result,effects);
 for(const next of fogNeighbourCells256(map,cell))if(foggedCell256(map,next)){if(physical.makeFog(next))reveal(map,next,physical,result,effects);else append(result,floodUnfog256(map,next,physical,effects));}
 for(const next of fogNeighbourCells256(map,cell,true))if(physical.makeFog(next))reveal(map,next,physical,result,effects);return result;
}
/** Actual rectangular occupied footprint, before removal, is required. */
function ownerBorder(map:ExplorationMap256,cells:readonly number[],diagonal:boolean):number[]{
 if(!cells.length||cells.some(c=>!validExplorationCell256(map,c)))throw Error('Invalid actual removed fog footprint');
 let x0=map.width,z0=map.height,x1=-1,z1=-1;for(const c of cells){x0=Math.min(x0,c%map.width);x1=Math.max(x1,c%map.width);z0=Math.min(z0,Math.floor(c/map.width));z1=Math.max(z1,Math.floor(c/map.width));}
 if(new Set(cells).size!==(x1-x0+1)*(z1-z0+1))throw Error('Nonrectangular fog owner needs actual adjacency metadata');
 const out:number[]=[],add=(x:number,z:number)=>{if(x>=0&&z>=0&&x<map.width&&z<map.height)out.push(z*map.width+x);};
 if(diagonal){for(let x=x0-1;x<=x1+1;x++)add(x,z0-1);for(let z=z0;z<=z1+1;z++)add(x1+1,z);for(let x=x1;x>=x0-1;x--)add(x,z1+1);for(let z=z1;z>=z0;z--)add(x0-1,z);}
 else {for(let x=x0;x<=x1;x++)add(x,z0-1);for(let z=z0;z<=z1;z++)add(x1+1,z);for(let x=x1;x>=x0;x--)add(x,z1+1);for(let z=z1;z>=z0;z--)add(x0-1,z);}return out;
}
export function notifyFogBlockerRemoved256(map:ExplorationMap256,removed:{origin:number;cells:readonly number[];makeFog:boolean;wasSpawned:boolean;willReplace:boolean},physical:FogPhysicalReaders256,effects:ExplorationEffects256={}):FogReveal256 {
 const result:FogReveal256={changedCells:[],interiorCells:[]};if(!explorationEnabled256(map)||!removed.makeFog||!removed.wasSpawned||removed.willReplace)return result;
 const around=ownerBorder(map,removed.cells,true);if(!around.some(c=>!foggedCell256(map,c)&&(physical.door(c)||!physical.makeFog(c))))return result;
 reveal(map,removed.origin,physical,result,effects);
 for(const next of ownerBorder(map,removed.cells,false))if(foggedCell256(map,next)){if(physical.makeFog(next))reveal(map,next,physical,result,effects);else append(result,floodUnfog256(map,next,physical,effects));}
 for(const next of around)if(physical.makeFog(next))reveal(map,next,physical,result,effects);return result;
}
export function notifyExplorationSpawn256(map:ExplorationMap256,cell:number,context:{playerOwned:boolean;playerControlled:boolean;respawningAfterLoad:boolean},physical:FogPhysicalReaders256,effects:ExplorationEffects256={}):FogReveal256 {
 return !context.respawningAfterLoad&&(context.playerOwned||context.playerControlled)?floodUnfog256(map,cell,physical,effects):{changedCells:[],interiorCells:[]};
}
/** Actual approaching owner and confirmed door openness, never RAF pose/time.
 * Host-player is deliberately separate from player-owned spawn permission. */
export function notifyExplorationDoor256(map:ExplorationMap256,cell:number,context:{playerOwned:boolean;hostPlayer:boolean;openness:number;approaching:boolean},physical:FogPhysicalReaders256,effects:ExplorationEffects256={}):FogReveal256 {
 if(!Number.isFinite(context.openness)||context.openness<0||context.openness>1)throw Error('Invalid confirmed door openness');
 return context.approaching&&(context.playerOwned||context.hostPlayer)&&context.openness>=Math.fround(.4)&&physical.door(cell)?floodUnfogAdjacent256(map,cell,physical,effects):{changedCells:[],interiorCells:[]};
}
