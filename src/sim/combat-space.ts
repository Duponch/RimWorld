import type { Cell } from './types.ts';

/** Read-only query surface. The caller owns its lifetime; never cache across a
 * mutation of cover/doors. combat-world captures concrete content separately. */
export interface ShotCover { readonly key:string; readonly fill:number; readonly full?:boolean; readonly openDoor?:boolean }
export interface ShotGrid {
  readonly width:number;
  readonly height:number;
  blocksSight(x:number,z:number):boolean;
  coverAt(x:number,z:number):ShotCover|undefined;
}
export interface ShotTarget {
  readonly cell:Cell;
  /** Pawn leaning and a full building's exposed edges are different rules. */
  readonly leans?:boolean;
  readonly full?:boolean;
  readonly cells?:readonly Cell[];
}
export type ShotLine = {ok:true;from:Cell;to:Cell;distance:number}|{ok:false;reason:'bounds'|'range'|'blocked'};
const cardinal:readonly Cell[]=Object.freeze([{x:0,z:1},{x:1,z:0},{x:0,z:-1},{x:-1,z:0}].map(c=>Object.freeze(c)));
export function shotInBounds(grid:ShotGrid,c:Cell):boolean {
  return Number.isSafeInteger(c.x)&&Number.isSafeInteger(c.z)&&c.x>=0&&c.z>=0&&c.x<grid.width&&c.z<grid.height;
}
const opaque=(grid:ShotGrid,x:number,z:number)=>x<0||z<0||x>=grid.width||z>=grid.height||grid.blocksSight(x,z);

/** Integer boundary-crossing walk, with a canonical side at exact corners.
 * Endpoints belong to the shooter/target, so only intermediate cells block.
 * Optional half-cell destination offsets expose the near edges of full targets.
 * Deliberately distinct from movement: a sight line is not a traversable route. */
export function clearShotSegment(grid:ShotGrid,from:Cell,to:Cell,edgeX=0,edgeZ=0):boolean {
  if(!shotInBounds(grid,from)||!shotInBounds(grid,to))return false;
  if(!Number.isInteger(edgeX)||!Number.isInteger(edgeZ)||Math.abs(edgeX)+Math.abs(edgeZ)>1)throw new RangeError('Invalid shot edge');
  const dx=Math.abs(to.x-from.x),dz=Math.abs(to.z-from.z),sx=Math.sign(to.x-from.x),sz=Math.sign(to.z-from.z);
  const horizontal=2*dx+edgeX,vertical=2*dz+edgeZ;
  const xFirst=from.x===to.x?from.z<to.z:from.x<to.x;
  let x=from.x,z=from.z,crossedX=0,crossedZ=0;
  for(let remaining=dx+dz;remaining>0;remaining--) {
    if((x!==from.x||z!==from.z)&&grid.blocksSight(x,z))return false;
    const nextX=(2*crossedX+1)*vertical,nextZ=(2*crossedZ+1)*horizontal;
    if(crossedX<dx&&(crossedZ===dz||nextX<nextZ||nextX===nextZ&&xFirst)){x+=sx;crossedX++;}
    else {z+=sz;crossedZ++;}
  }
  return true;
}

/** Local corner openings plus low cover facing the target. Coordinates are
 * copies; reusing a query must never retain a mutable pawn position. */
export function leaningCells(grid:ShotGrid,root:Cell,towards:Cell):Cell[] {
  if(!shotInBounds(grid,root)||!shotInBounds(grid,towards))return [];
  const result:Cell[]=[];
  const add=(x:number,z:number)=>{if(!result.some(c=>c.x===x&&c.z===z))result.push({x,z});};
  const dx=towards.x-root.x,dz=towards.z-root.z;
  // A side step can expose a blocked forward face only through its open diagonal.
  for(const side of [cardinal[1],cardinal[3],cardinal[2],cardinal[0]]) {
    const x=root.x+side.x,z=root.z+side.z;
    if(opaque(grid,x,z))continue;
    const forwards=side.x!==0?[cardinal[0],cardinal[2]]:[cardinal[3],cardinal[1]];
    if(forwards.some(f=>dx*f.x+dz*f.z>0&&opaque(grid,root.x+f.x,root.z+f.z)&&!opaque(grid,x+f.x,z+f.z)))add(x,z);
  }
  if(!opaque(grid,root.x,root.z))add(root.x,root.z);
  for(const f of cardinal) {
    const x=root.x+f.x,z=root.z+f.z;
    if(dx*f.x+dz*f.z>0&&!opaque(grid,x,z)&&grid.coverAt(x,z))add(x,z);
  }
  return result;
}

function seesTarget(grid:ShotGrid,from:Cell,to:Cell,full:boolean):boolean {
  if(clearShotSegment(grid,from,to))return true;
  if(!full)return false;
  const dx=2*(to.x-from.x),dz=2*(to.z-from.z),distanceSquared=dx*dx+dz*dz;
  return cardinal.some(edge=>(dx+edge.x)**2+(dz+edge.z)**2<=distanceSquared&&clearShotSegment(grid,from,to,edge.x,edge.z));
}

/** Range is measured BEFORE leaning, to the closest occupied target cell.
 * A blocked line has no probability of shooting through a full wall. */
export function findShotLine(grid:ShotGrid,from:Cell,target:ShotTarget,range:number,minRange=0):ShotLine {
  if(!Number.isFinite(range)||!Number.isFinite(minRange)||minRange<0||range<minRange)throw new RangeError('Invalid shot range');
  const occupied=target.cells??[target.cell];
  if(!shotInBounds(grid,from)||!shotInBounds(grid,target.cell)||!occupied.length||occupied.some(c=>!shotInBounds(grid,c)))return {ok:false,reason:'bounds'};
  let closest=occupied[0],squared=Infinity;
  for(const c of occupied){const d=(c.x-from.x)**2+(c.z-from.z)**2;if(d<squared){closest=c;squared=d;}}
  if(squared>range*range||squared<minRange*minRange)return {ok:false,reason:'range'};
  const origins=[{x:from.x,z:from.z},...leaningCells(grid,from,closest)];
  for(const origin of origins) {
    const destinations=target.leans?leaningCells(grid,target.cell,origin):occupied;
    for(const destination of destinations)if(seesTarget(grid,origin,destination,!!target.full))return {ok:true,from:{...origin},to:{...destination},distance:Math.hypot(target.cell.x-from.x,target.cell.z-from.z)};
  }
  return {ok:false,reason:'blocked'};
}
