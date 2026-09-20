import { doorWait } from './door-rules.ts';
import { footprintCells, footprintContains } from './definitions.ts';
import { frameAt, frameCosts, FRAME_TRAVEL_DELAY } from './construction-costs.ts';
import { overlayNavigationCosts,type NavigationCostLookup } from './navigation-costs.ts';
import type { Cell, StructureKind, World } from './types.ts';

/** Core natural floors cost two Core ticks. Historical grass/soil stay neutral. */
export function terrainTravelDelay(world:World,index:number):number {
  const terrain=world.tiles[index]?.terrain;
  return terrain==='rough-stone'||terrain==='rich-soil'||terrain==='gravel'||world.site&&terrain==='grass'?.2:0;
}

/** Current Core wiki path costs, converted by the local day/tick ratio (10).
 * Repeat suppression is shared by all qualifying furniture, not by instance. */
export const FURNITURE_TRAVEL:Readonly<Record<StructureKind,Readonly<{delay:number;stand:boolean;repeat:boolean}>>>=Object.freeze({
  'power-conduit':{delay:0,stand:true,repeat:false},
  'power-switch':{delay:0,stand:true,repeat:false},
  battery:{delay:5,stand:false,repeat:true},
  'solar-generator':{delay:5,stand:false,repeat:true},
  'fueled-stove':{delay:5,stand:false,repeat:true},
  'electric-stove':{delay:5,stand:false,repeat:true},
  'butcher-table':{delay:5,stand:false,repeat:true},
  cooler:{delay:0,stand:false,repeat:false},
  'research-bench':{delay:5,stand:false,repeat:true},
  'tailor-bench':{delay:5,stand:false,repeat:true},
  'butcher-spot':{delay:0,stand:true,repeat:false},
  'crafting-spot':{delay:0,stand:true,repeat:false},
  'wood-generator':{delay:5,stand:false,repeat:true},
  'standing-lamp':{delay:1.4,stand:false,repeat:false},
  'passive-cooler':{delay:3,stand:false,repeat:true},
  door:{delay:0,stand:true,repeat:false},
  stonecutter:{delay:5,stand:false,repeat:true},
  wall:{delay:0,stand:false,repeat:false},table:{delay:4.2,stand:false,repeat:true},
  bed:{delay:4.2,stand:false,repeat:true},campfire:{delay:4.2,stand:false,repeat:true},
  stool:{delay:3,stand:true,repeat:true},horseshoes:{delay:1.4,stand:true,repeat:false},
});
export function canStandAt(world:World,cell:Cell):boolean {
  if(!Number.isInteger(cell.x)||!Number.isInteger(cell.z)||cell.x<0||cell.z<0||cell.x>=world.width||cell.z>=world.height||['rock','water'].includes(world.tiles[cell.z*world.width+cell.x]!.terrain))return false;
  for(const s of world.structures)if(footprintContains(s,cell)&&(world.schemaVersion<22?s.kind==='wall'||s.kind==='table':!FURNITURE_TRAVEL[s.kind].stand))return false;
  if(world.schemaVersion>=28&&world.piles.some(p=>p.kind==='chunk'&&p.owner.type==='ground'&&p.owner.x===cell.x&&p.owner.z===cell.z))return false;
  return !world.jobs.some(j=>(world.schemaVersion<16&&(j.kind==='wall'||j.kind==='table')||world.schemaVersion>=22&&j.construction==='frame'&&j.kind!=='power-conduit')&&footprintContains(j,cell));
}
/** For a batch of point queries in one read-only decision. Discard before any
 * world mutation; this is not a shared navigation or cross-actor cache. */
export function captureStandability(world:World):(cell:Cell)=>boolean {
  const denied=new Set<number>(),add=(s:Parameters<typeof footprintCells>[0])=>{for(const c of footprintCells(s))denied.add(c.z*world.width+c.x);};
  for(const s of world.structures)if(world.schemaVersion<22?s.kind==='wall'||s.kind==='table':!FURNITURE_TRAVEL[s.kind].stand)add(s);
  for(const j of world.jobs)if(world.schemaVersion<16&&(j.kind==='wall'||j.kind==='table')||world.schemaVersion>=22&&j.construction==='frame'&&j.kind!=='power-conduit')add(j);
  if(world.schemaVersion>=28)for(const p of world.piles)if(p.kind==='chunk'&&p.owner.type==='ground')denied.add(p.owner.z*world.width+p.owner.x);
  return cell=>Number.isInteger(cell.x)&&Number.isInteger(cell.z)&&cell.x>=0&&cell.z>=0&&cell.x<world.width&&cell.z<world.height
    &&!['rock','water'].includes(world.tiles[cell.z*world.width+cell.x]!.terrain)&&!denied.has(cell.z*world.width+cell.x);
}
export function furnitureDelay(world:World,from:Cell,to:Cell):number {
  if(world.schemaVersion<22)return frameAt(world,to)?FRAME_TRAVEL_DELAY:0;
  let target:StructureKind|undefined,previousRepeats=false;
  for(const s of world.structures) {
    if(s.kind!=='power-conduit'&&footprintContains(s,to))target=s.kind;
    if(footprintContains(s,from)&&FURNITURE_TRAVEL[s.kind].repeat)previousRepeats=true;
  }
  let objectDelay=target?FURNITURE_TRAVEL[target].delay:frameAt(world,to)?FRAME_TRAVEL_DELAY:0;
  let repeats=target?FURNITURE_TRAVEL[target].repeat:false;
  if(world.schemaVersion>=28)for(const p of world.piles)if(p.kind==='chunk'&&p.owner.type==='ground') {
    if(p.owner.x===to.x&&p.owner.z===to.z){objectDelay=Math.max(objectDelay,4.2);repeats=true;}
    if(p.owner.x===from.x&&p.owner.z===from.z)previousRepeats=true;
  }
  const materialDelay=world.piles.some(p=>(world.schemaVersion>=29&&p.kind==='steel'||world.schemaVersion>=32&&p.kind==='blocks'||world.schemaVersion>=41&&p.kind==='component')&&p.owner.type==='ground'&&p.owner.x===to.x&&p.owner.z===to.z)?1.4:0;
  return Math.max(repeats&&previousRepeats?0:objectDelay,materialDelay,terrainTravelDelay(world,to.z*world.width+to.x));
}
/** Captured once per synchronous search. No shared mutation or cross-tick cache. */
export function navigationCosts(world:World):{costs:NavigationCostLookup|undefined;repeaters:ReadonlySet<number>;stops:ReadonlySet<number>;floors:NavigationCostLookup} {
  const costs=new Map(frameCosts(world)),repeaters=new Set<number>(),stops=new Set<number>();
  if(world.schemaVersion>=22) {
    for(const s of world.structures)for(const c of footprintCells(s)) {
      const i=c.z*world.width+c.x,p=FURNITURE_TRAVEL[s.kind];
      if(p.delay)costs.set(i,Math.round(p.delay/3*1000));
      if(p.repeat)repeaters.add(i);if(!p.stand)stops.add(i);
    }
    for(const j of world.jobs)if(j.construction==='frame'&&j.kind!=='power-conduit')for(const c of footprintCells(j))stops.add(c.z*world.width+c.x);
  }
  const floors=new Map<number,number>();
  // A single captured byte per cell replaces two mostly dense Maps on a site.
  // Objects remain sparse; both lookups retain the same terrain floor.
  const terrain=new Uint8Array(world.tiles.length);let terrainMaximum=0;
  if(world.schemaVersion>=28) {
    for(const p of world.piles)if(p.kind==='chunk'&&p.owner.type==='ground'){const i=p.owner.z*world.width+p.owner.x;costs.set(i,Math.max(costs.get(i)??0,1400));repeaters.add(i);stops.add(i);}
    for(let i=0;i<world.tiles.length;i++)if(terrainTravelDelay(world,i)){terrain[i]=67;terrainMaximum=67;}
  }
  if(world.schemaVersion>=29)for(const p of world.piles)if((p.kind==='steel'||world.schemaVersion>=32&&p.kind==='blocks'||world.schemaVersion>=41&&p.kind==='component')&&p.owner.type==='ground'){const i=p.owner.z*world.width+p.owner.x;floors.set(i,Math.max(floors.get(i)??0,467));costs.set(i,Math.max(costs.get(i)??0,467));}
  // Door wait is added after the terrain/object/material maximum, not compared
  // with it. Preserve present zero entries for fully open doors on bare floors.
  for(const s of world.structures)if(s.kind==='door') {const i=s.z*world.width+s.x;repeaters.delete(i);costs.set(i,Math.max(costs.get(i)??0,terrain[i]??0)+Math.round(doorWait(s,world.tick)/3*1000));}
  return {costs:costs.size||terrainMaximum?overlayNavigationCosts(terrain,terrainMaximum,costs):undefined,repeaters,stops,floors:overlayNavigationCosts(terrain,terrainMaximum,floors)};
}
