import { candidateAccess } from './candidate-access.ts';
import { captureStandability } from './furniture-travel.ts';
import { routeToCell, inBounds } from './pathfinding.ts';
import { reservedServiceCells } from './service-reservations.ts';
import { CIVIL_TRANSIT_BLOCKERS } from './travel.ts';
import type { Cell,Pawn,World } from './types.ts';

// Cover ranking awaits the combat contract. Deterministic proximity, not formation AI.
const OFFSETS:Cell[]=[];
for(let z=-30;z<=30;z++)for(let x=-30;x<=30;x++)if(x*x+z*z<=900)OFFSETS.push({x,z});
OFFSETS.sort((a,b)=>a.x*a.x+a.z*a.z-b.x*b.x-b.z*b.z||a.z-b.z||a.x-b.x);

/** Captured for one synchronous command only. Services/claims never block transit. */
export function draftDestinationContext(world:World,except:ReadonlySet<number>=new Set()) {
  const standable=captureStandability(world),claimed=new Set<number>();
  for(const pawn of world.pawns)if(pawn.draft?.target&&!except.has(pawn.id))claimed.add(pawn.draft.target.z*world.width+pawn.draft.target.x);
  return {standable,claimed};
}
export function draftDestination(world:World,pawn:Pawn,requested:Cell,blocked:Uint8Array,context:ReturnType<typeof draftDestinationContext>,origin:Cell=pawn,withRoute=true):{target:Cell;path:Cell[]}|null {
  if(!inBounds(world,requested.x,requested.z))return null;
  // Reference first searches for standable ground within 2.9 cells of the click.
  let root:Cell|undefined;
  for(const d of OFFSETS){if(d.x*d.x+d.z*d.z>2.9**2)break;const c={x:requested.x+d.x,z:requested.z+d.z};if(context.standable(c)){root=c;break;}}
  if(!root)return null;
  const services=reservedServiceCells(world,pawn.id),bodies=new Set(world.pawns.filter(p=>p!==pawn&&p.state!=='dead').map(p=>p.z*world.width+p.x));
  const reach=candidateAccess(world,origin,blocked,CIVIL_TRANSIT_BLOCKERS);
  for(const d of OFFSETS){
    const target={x:root.x+d.x,z:root.z+d.z},index=target.z*world.width+target.x;
    if(!context.standable(target)||blocked[index]||context.claimed.has(index)||services.has(index)||bodies.has(index)||!reach.has(index))continue;
    const path=withRoute?routeToCell(world,target,reach):[];if(path)return {target,path};
  }
  return null;
}
