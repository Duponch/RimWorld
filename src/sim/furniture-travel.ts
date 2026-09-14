import { footprintCells, footprintContains } from './definitions.ts';
import { frameAt, frameCosts, FRAME_TRAVEL_DELAY } from './construction-costs.ts';
import type { Cell, StructureKind, World } from './types.ts';

/** Current Core wiki path costs, converted by the local day/tick ratio (10).
 * Repeat suppression is shared by all qualifying furniture, not by instance. */
export const FURNITURE_TRAVEL:Readonly<Record<StructureKind,Readonly<{delay:number;stand:boolean;repeat:boolean}>>>=Object.freeze({
  wall:{delay:0,stand:false,repeat:false},table:{delay:4.2,stand:false,repeat:true},
  bed:{delay:4.2,stand:false,repeat:true},campfire:{delay:4.2,stand:false,repeat:true},
  stool:{delay:3,stand:true,repeat:true},horseshoes:{delay:1.4,stand:true,repeat:false},
});
export function canStandAt(world:World,cell:Cell):boolean {
  if(!Number.isInteger(cell.x)||!Number.isInteger(cell.z)||cell.x<0||cell.z<0||cell.x>=world.width||cell.z>=world.height||['rock','water'].includes(world.tiles[cell.z*world.width+cell.x]!.terrain))return false;
  for(const s of world.structures)if((world.schemaVersion<22?s.kind==='wall'||s.kind==='table':!FURNITURE_TRAVEL[s.kind].stand)&&footprintContains(s,cell))return false;
  return !world.jobs.some(j=>(world.schemaVersion<16&&(j.kind==='wall'||j.kind==='table')||world.schemaVersion>=22&&j.construction==='frame')&&footprintContains(j,cell));
}
export function furnitureDelay(world:World,from:Cell,to:Cell):number {
  if(world.schemaVersion<22)return frameAt(world,to)?FRAME_TRAVEL_DELAY:0;
  let target:StructureKind|undefined,previousRepeats=false;
  for(const s of world.structures) {
    if(footprintContains(s,to))target=s.kind;
    if(FURNITURE_TRAVEL[s.kind].repeat&&footprintContains(s,from))previousRepeats=true;
  }
  if(target){const p=FURNITURE_TRAVEL[target];return p.repeat&&previousRepeats?0:p.delay;}
  return frameAt(world,to)?FRAME_TRAVEL_DELAY:0;
}
/** Captured once per synchronous search. No shared mutation or cross-tick cache. */
export function navigationCosts(world:World):{costs:ReadonlyMap<number,number>|undefined;repeaters:ReadonlySet<number>;stops:ReadonlySet<number>} {
  const costs=new Map(frameCosts(world)),repeaters=new Set<number>(),stops=new Set<number>();
  if(world.schemaVersion>=22) {
    for(const s of world.structures)for(const c of footprintCells(s)) {
      const i=c.z*world.width+c.x,p=FURNITURE_TRAVEL[s.kind];
      if(p.delay)costs.set(i,Math.round(p.delay/3*1000));
      if(p.repeat)repeaters.add(i);if(!p.stand)stops.add(i);
    }
    for(const j of world.jobs)if(j.construction==='frame')for(const c of footprintCells(j))stops.add(c.z*world.width+c.x);
  }
  return {costs:costs.size?costs:undefined,repeaters,stops};
}
