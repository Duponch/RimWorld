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
  if(world.schemaVersion>=28&&world.piles.some(p=>p.kind==='chunk'&&p.owner.type==='ground'&&p.owner.x===cell.x&&p.owner.z===cell.z))return false;
  return !world.jobs.some(j=>(world.schemaVersion<16&&(j.kind==='wall'||j.kind==='table')||world.schemaVersion>=22&&j.construction==='frame')&&footprintContains(j,cell));
}
export function furnitureDelay(world:World,from:Cell,to:Cell):number {
  if(world.schemaVersion<22)return frameAt(world,to)?FRAME_TRAVEL_DELAY:0;
  let target:StructureKind|undefined,previousRepeats=false;
  for(const s of world.structures) {
    if(footprintContains(s,to))target=s.kind;
    if(FURNITURE_TRAVEL[s.kind].repeat&&footprintContains(s,from))previousRepeats=true;
  }
  let objectDelay=target?FURNITURE_TRAVEL[target].delay:frameAt(world,to)?FRAME_TRAVEL_DELAY:0;
  let repeats=target?FURNITURE_TRAVEL[target].repeat:false;
  if(world.schemaVersion>=28)for(const p of world.piles)if(p.kind==='chunk'&&p.owner.type==='ground') {
    if(p.owner.x===to.x&&p.owner.z===to.z){objectDelay=Math.max(objectDelay,4.2);repeats=true;}
    if(p.owner.x===from.x&&p.owner.z===from.z)previousRepeats=true;
  }
  const steelDelay=world.schemaVersion>=29&&world.piles.some(p=>p.kind==='steel'&&p.owner.type==='ground'&&p.owner.x===to.x&&p.owner.z===to.z)?1.4:0;
  return Math.max(repeats&&previousRepeats?0:objectDelay,steelDelay,world.tiles[to.z*world.width+to.x]?.terrain==='rough-stone'?.2:0);
}
/** Captured once per synchronous search. No shared mutation or cross-tick cache. */
export function navigationCosts(world:World):{costs:ReadonlyMap<number,number>|undefined;repeaters:ReadonlySet<number>;stops:ReadonlySet<number>;floors:ReadonlyMap<number,number>} {
  const costs=new Map(frameCosts(world)),repeaters=new Set<number>(),stops=new Set<number>();
  if(world.schemaVersion>=22) {
    for(const s of world.structures)for(const c of footprintCells(s)) {
      const i=c.z*world.width+c.x,p=FURNITURE_TRAVEL[s.kind];
      if(p.delay)costs.set(i,Math.round(p.delay/3*1000));
      if(p.repeat)repeaters.add(i);if(!p.stand)stops.add(i);
    }
    for(const j of world.jobs)if(j.construction==='frame')for(const c of footprintCells(j))stops.add(c.z*world.width+c.x);
  }
  const floors=new Map<number,number>();
  if(world.schemaVersion>=28) {
    for(const p of world.piles)if(p.kind==='chunk'&&p.owner.type==='ground'){const i=p.owner.z*world.width+p.owner.x;costs.set(i,Math.max(costs.get(i)??0,1400));repeaters.add(i);stops.add(i);}
    for(let i=0;i<world.tiles.length;i++)if(world.tiles[i]!.terrain==='rough-stone'){floors.set(i,67);costs.set(i,Math.max(costs.get(i)??0,67));}
  }
  if(world.schemaVersion>=29)for(const p of world.piles)if(p.kind==='steel'&&p.owner.type==='ground'){const i=p.owner.z*world.width+p.owner.x;floors.set(i,Math.max(floors.get(i)??0,467));costs.set(i,Math.max(costs.get(i)??0,467));}
  return {costs:costs.size?costs:undefined,repeaters,stops,floors};
}
