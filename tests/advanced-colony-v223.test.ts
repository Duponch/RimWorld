import {expect,test} from 'vitest';
import {prepareAdvancedColonyScenario} from '../src/sim/advanced-colony-scenario-v223.ts';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {isColonist} from '../src/sim/affiliation.ts';
import {animalPenAt,penRegion} from '../src/sim/animal-pens.ts';
import {backgroundWorkRefusal} from '../src/sim/colonist-backgrounds.ts';
import {cookingSpot} from '../src/sim/cooking-bills.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {canStandAt} from '../src/sim/furniture-travel.ts';
import {biologicalYears} from '../src/sim/human-age.ts';
import {blockedCells,reachableCells,routeToCell,routeToJob} from '../src/sim/pathfinding.ts';
import {isPowerActive} from '../src/sim/power-rules.ts';
import {prisonBedValid,prisonRoom} from '../src/sim/prison-space.ts';
import {advancedFabricationUnlocked} from '../src/sim/research.ts';
import {researchFacilityLinked} from '../src/sim/research-facilities.ts';
import {RoomTopologyCache} from '../src/sim/room-topology.ts';
import {isRoofed,RoofContext} from '../src/sim/roof-rules.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {storageAccepts} from '../src/sim/storage-filters.ts';
import {isTelevisionCell,televisionSameRoom} from '../src/sim/television-recreation.ts';
import {SCHEMA_VERSION,type StructureKind,type WorkType,type World} from '../src/sim/types.ts';
import {decodeStoredSave,encodeStoredSave} from '../src/ui/save-storage-codec.ts';

const residents=(world:World)=>world.pawns.filter(p=>isColonist(p)&&!p.prisoner&&!p.visitor);
function adopt(decoder:SnapshotDecoder,message:SnapshotMessage):World {
  const result=decoder.adopt(structuredClone(message));
  if(result.status!=='applied')throw Error(JSON.stringify(result));
  return result.world;
}

test('the advanced standard-map preparation is deterministic, independent and strictly serializable',()=>{
  const world=prepareAdvancedColonyScenario(),twin=prepareAdvancedColonyScenario();
  expect([world.width,world.height]).toEqual([250,250]);
  expect(world.schemaVersion).toBe(SCHEMA_VERSION);
  expect(world.tiles).toHaveLength(250*250);
  expect(validateWorld(world)).toEqual([]);
  expect(twin).toEqual(world);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  const frozen=structuredClone(world);
  twin.pawns[0]!.name='Independent advanced preparation';
  twin.pawns[0]!.priorities.haul=0;
  twin.foodPolicies.length=0;
  twin.tiles[0]!.terrain='water';
  expect(world).toEqual(frozen);
});

test('fourteen adults own accessible roofed homes, while their backgrounds and equipment remain real',()=>{
  const world=prepareAdvancedColonyScenario(),people=residents(world);
  expect(people).toHaveLength(14);
  const rooms=new RoomTopologyCache().read(world),blocked=blockedCells(world);
  const beds=new Map(world.structures.filter(s=>s.kind==='bed'&&!s.medical&&!s.prisoner).map(s=>[s.id,s]));
  expect(new Set(people.map(p=>p.bedId)).size).toBe(people.length);
  let disabledWork=0;
  for(const pawn of people){
    expect(biologicalYears(pawn.age!)).toBeGreaterThanOrEqual(20);
    expect(pawn.background?.childhood).toBeDefined();
    expect(pawn.background?.adulthood).toBeDefined();
    expect(pawn.state).not.toBe('dead');
    const bed=beds.get(pawn.bedId!);
    expect(bed,`${pawn.name} needs an owned civilian bed`).toBeDefined();
    const room=rooms.at(bed!.x,bed!.z);
    expect(room).toMatchObject({kind:'space',touchesMapEdge:false});
    for(const cell of footprintCells(bed!)){
      expect(rooms.at(cell.x,cell.z)).toBe(room);
      expect(isRoofed(world,cell.z*world.width+cell.x)).toBe(true);
    }
    // Single-target searches avoid fourteen complete floods of the 250² map.
    const reach=reachableCells(world,pawn,blocked,new Set(),new Set([bed!.z*world.width+bed!.x]));
    expect(routeToCell(world,bed!,reach),`${pawn.name} must reach the actual sleeping cell`).not.toBeNull();
    expect(world.piles.some(p=>p.owner.type==='apparel'&&p.owner.pawnId===pawn.id),`${pawn.name} needs physical clothing`).toBe(true);
    for(const work of Object.keys(pawn.priorities) as WorkType[]){
      if(!backgroundWorkRefusal(pawn,work))continue;
      disabledWork++;
      expect(pawn.priorities[work],`${pawn.name}: ${work} is forbidden by the background`).toBe(0);
    }
  }
  expect(disabledWork).toBeGreaterThan(0);
  expect(world.piles.filter(p=>p.owner.type==='equipment'&&people.some(a=>p.owner.type==='equipment'&&a.id===p.owner.pawnId)).length).toBeGreaterThan(0);
  const couples=world.relationships?.links.filter(link=>link.kind==='lover'||link.kind==='spouse')??[];
  expect(couples).toHaveLength(2);
  for(const link of couples){
    const [a,b]=[link.aId,link.bId].map(id=>people.find(p=>p.id===id)!);
    expect(a).toBeDefined();expect(b).toBeDefined();expect(a!.bedId).not.toBe(b!.bedId);
    const [first,second]=[a!,b!].map(p=>beds.get(p.bedId!)!);
    expect(rooms.at(first!.x,first!.z)).toBe(rooms.at(second!.x,second!.z));
  }
});

test('the advanced colony has usable production, care, prison, greenhouse and herd spaces',()=>{
  const world=prepareAdvancedColonyScenario(),pawn=residents(world)[0]!;
  const rooms=new RoomTopologyCache().read(world);
  const roofs=new RoofContext(world);
  expect(world.roofing?.constructed.filter(index=>!roofs.supported(index)),'Prepared roofs need actual supports').toEqual([]);
  const reach=reachableCells(world,pawn,blockedCells(world),new Set());
  const stations:readonly (readonly StructureKind[])[]=[
    ['electric-stove','fueled-stove'],['machining-table'],['fabrication-bench'],
    ['electric-tailor-bench','tailor-bench'],['art-bench'],['hi-tech-research-bench'],
  ];
  for(const kinds of stations){
    const buildings=world.structures.filter(s=>kinds.includes(s.kind));
    expect(buildings.length,`${kinds.join('/')} must exist`).toBeGreaterThan(0);
    expect(buildings.some(s=>canStandAt(world,cookingSpot(s))&&routeToCell(world,cookingSpot(s),reach)!==null),`${kinds.join('/')} needs its actual service cell`).toBe(true);
  }
  for(const kind of ['hospital-bed','pen-marker','tube-television','chess-table','horseshoes','multi-analyzer'] as const){
    const buildings=world.structures.filter(s=>s.kind===kind);
    expect(buildings.length,`${kind} must exist`).toBeGreaterThan(0);
    expect(buildings.some(s=>routeToJob(world,s,reach,true)!==null),`${kind} must be accessible`).toBe(true);
  }
  expect(world.structures.some(s=>s.kind==='hospital-bed'&&s.medical&&!s.prisoner)).toBe(true);
  expect(advancedFabricationUnlocked(world)).toBe(true);
  expect(world.research?.project).toBe('recon-armor');
  expect(world.research?.reconArmor?.completedAt).toBeUndefined();
  const analyzers=world.structures.filter(s=>s.kind==='multi-analyzer');
  for(const desk of world.structures.filter(s=>s.kind==='hi-tech-research-bench'))
    expect(analyzers.some(analyzer=>researchFacilityLinked(world,desk,analyzer)),'Each advanced desk needs a real analyzer link').toBe(true);
  const televisions=world.structures.filter(s=>s.kind==='tube-television');
  expect(televisions.some(tv=>world.structures.some(seat=>['stool','dining-chair','armchair'].includes(seat.kind)
    &&isTelevisionCell(tv,seat)&&televisionSameRoom(world,tv,seat,()=>rooms)&&routeToCell(world,seat,reach)!==null)),
  'A prepared TV needs an accessible physical seat in its viewing area and room').toBe(true);
  expect(world.structures.some(s=>s.kind==='fabrication-bench'&&s.bills?.some(b=>b.recipe==='make-advanced-component'&&!b.suspended))).toBe(true);
  expect(world.planet?.tiles.length).toBeGreaterThan(0);
  expect(world.group).toBeUndefined();
  for(const item of ['simple-meal','rice','medicine','wood','steel','component','advanced-component','plasteel','gold','cloth'] as const)
    expect(world.stockpiles.some(zone=>storageAccepts(zone,item)),`${item} needs a compatible stock policy`).toBe(true);
  const prisoner=world.pawns.filter(p=>!!p.prisoner);
  expect(prisoner).toHaveLength(1);
  expect(prisoner[0]!.prisoner!.mode).toBe('reduce');
  const prisonBeds=world.structures.filter(s=>s.prisoner);
  expect(prisonBeds.length).toBeGreaterThan(0);
  for(const bed of prisonBeds){expect(prisonBedValid(world,bed,rooms)).toBe(true);expect(routeToJob(world,bed,reach,true)).not.toBeNull();}
  expect(prisonRoom(world,prisoner[0]!,rooms)).toBeDefined();
  expect(residents(world).some(p=>p.priorities.warden>0&&!backgroundWorkRefusal(p,'warden'))).toBe(true);
  expect([...new Set(world.growingZones.map(zone=>zone.plant))]).toEqual(expect.arrayContaining(['rice','corn','cotton','healroot']));
  const cropCells=world.growingZones.flatMap(zone=>zone.cells);
  expect(new Set(cropCells).size).toBe(cropCells.length);
  const roofedCrops=cropCells.filter(index=>isRoofed(world,index));
  expect(roofedCrops.length).toBeGreaterThan(0);
  expect(cropCells.some(index=>!isRoofed(world,index))).toBe(true);
  expect(world.structures.some(s=>s.kind==='sun-lamp'&&roofedCrops.some(index=>rooms.at(index%world.width,Math.floor(index/world.width))===rooms.at(s.x,s.z)))).toBe(true);
  const domestic=world.wildlife?.animals.filter(a=>!!a.domestic)??[];
  expect(domestic).toHaveLength(6);
  for(const animal of domestic)expect(animalPenAt(world,animal.x,animal.z)).toMatchObject({closed:true,accessible:true});
  for(const marker of world.structures.filter(s=>s.kind==='pen-marker'))expect(penRegion(world,marker.id)).toMatchObject({closed:true,accessible:true});
});

test('an ordinary 240-tick continuation powers defenses and preserves exact codec, transport and resume authority',async()=>{
  const world=prepareAdvancedColonyScenario(),initialTick=world.tick,people=residents(world).map(p=>p.id);
  const raw=serializeWorld(world),stored=await encodeStoredSave(raw);
  expect(await decodeStoredSave(stored)).toBe(raw);
  expect(deserializeWorld(await decodeStoredSave(stored))).toEqual(world);
  const turrets=world.structures.filter(s=>s.kind==='mini-turret');
  expect(turrets).toHaveLength(4);
  for(const turret of turrets){expect(turret.turret?.holdFire).toBe(false);expect(turret.turret!.ammoQ).toBeGreaterThan(0);}
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const confirmed=adopt(decoder,encoder.encode(world,0,0)),frozen=structuredClone(confirmed);
  let witnessedWork=false;
  for(let i=0;i<240;i++){
    stepWorld(world);
    witnessedWork ||= residents(world).some(p=>p.jobId!==null||!!p.haul||!!p.cooking||!!p.research||!!p.animalHandling||!!p.ward);
    if((i+1)%40===0){expect(validateWorld(world)).toEqual([]);expect(adopt(decoder,encoder.encode(world,0,1))).toEqual(world);}
  }
  expect(world.tick).toBe(initialTick+240);
  expect(witnessedWork,'The preparation must continue through actual ordinary work').toBe(true);
  expect(confirmed).toEqual(frozen);
  expect(residents(world).map(p=>p.id)).toEqual(people);
  expect(residents(world).every(p=>p.state!=='dead')).toBe(true);
  for(const id of turrets.map(s=>s.id)){
    const turret=world.structures.find(s=>s.id===id)!;
    expect(isPowerActive(turret)).toBe(true);expect(turret.turret!.holdFire).toBe(false);
  }
  const resumed=deserializeWorld(serializeWorld(world));
  for(let i=0;i<60;i++){stepWorld(world);stepWorld(resumed);}
  expect(validateWorld(world)).toEqual([]);expect(resumed).toEqual(world);
  const last=adopt(decoder,encoder.encode(world,0,1,true)),lastFrozen=structuredClone(last);
  const next=structuredClone(encoder.encode(world,0,1,true));
  if(next.kind!=='checkpoint')throw Error('A forced checkpoint must contain a complete World.');
  const forged=structuredClone(next);
  // The shared relation guard must never admit a cannon as a human relative.
  forged.world.relationships!.links[0]!.bId=turrets[0]!.id;
  expect(validateWorld(forged.world).length).toBeGreaterThan(0);
  expect(()=>deserializeWorld(JSON.stringify(forged.world))).toThrow();
  expect(decoder.adopt(forged).status).toBe('resync');expect(last).toEqual(lastFrozen);
  expect(adopt(decoder,next)).toEqual(world);
});
