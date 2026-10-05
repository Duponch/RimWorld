import {expect,test} from 'vitest';
import {ESTABLISHED_COLONY_SCENARIO_ID,prepareEstablishedColonyScenario} from '../src/sim/established-colony-scenario.ts';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {isColonist} from '../src/sim/affiliation.ts';
import {animalPenAt,penRegion} from '../src/sim/animal-pens.ts';
import {biologicalYears} from '../src/sim/human-age.ts';
import {blockedCells,reachableCells,routeToCell,routeToJob} from '../src/sim/pathfinding.ts';
import {isPowerActive} from '../src/sim/power-rules.ts';
import {prisonBedValid} from '../src/sim/prison-space.ts';
import {isRoofed} from '../src/sim/roof-rules.ts';
import {RoomTopologyCache} from '../src/sim/room-topology.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {storageAccepts} from '../src/sim/storage-filters.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {decodeStoredSave,encodeStoredSave} from '../src/ui/save-storage-codec.ts';

function adopt(decoder:SnapshotDecoder,message:SnapshotMessage):World {
  const result=decoder.adopt(structuredClone(message));
  if(result.status!=='applied')throw Error(JSON.stringify(result));
  return result.world;
}

test('the established preparation is deterministic, separately owned and strictly serializable',()=>{
  const world=prepareEstablishedColonyScenario(),twin=prepareEstablishedColonyScenario();
  expect(ESTABLISHED_COLONY_SCENARIO_ID.length).toBeGreaterThan(0);
  expect(world.schemaVersion).toBe(SCHEMA_VERSION);
  expect(validateWorld(world)).toEqual([]);
  expect(twin).toEqual(world);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  // Preparing another public scene must not borrow mutable people or policies.
  const frozen=structuredClone(world);
  twin.pawns[0]!.name='Independent preparation';
  twin.pawns[0]!.priorities.haul=0;
  twin.foodPolicies.length=0;
  expect(world).toEqual(frozen);
});

test('seven adult residents have reachable roofed homes, with a real shared room for a couple',()=>{
  const world=prepareEstablishedColonyScenario(),people=world.pawns.filter(isColonist);
  expect(people).toHaveLength(7);
  const rooms=new RoomTopologyCache().read(world),blocked=blockedCells(world);
  const beds=new Map(world.structures.filter(s=>s.kind==='bed'&&!s.medical&&!s.prisoner).map(s=>[s.id,s]));
  expect(new Set(people.map(p=>p.bedId)).size).toBe(people.length);
  for(const pawn of people){
    expect(biologicalYears(pawn.age!)).toBeGreaterThanOrEqual(20);
    expect(pawn.background?.childhood).toBeDefined();
    expect(pawn.background?.adulthood).toBeDefined();
    expect(pawn.state).not.toBe('dead');
    const bed=beds.get(pawn.bedId!);
    expect(bed,`${pawn.name} needs a free civilian bed`).toBeDefined();
    const room=rooms.at(bed!.x,bed!.z);
    expect(room).toMatchObject({kind:'space',touchesMapEdge:false});
    expect(isRoofed(world,bed!.z*world.width+bed!.x)).toBe(true);
    const reach=reachableCells(world,pawn,blocked,new Set());
    expect(routeToCell(world,bed!,reach),`${pawn.name} must physically reach the owned bed`).not.toBeNull();
  }
  const couple=world.relationships?.links.find(link=>link.kind==='lover'||link.kind==='spouse');
  expect(couple).toBeDefined();
  const [a,b]=[couple!.aId,couple!.bId].map(id=>people.find(p=>p.id===id)!);
  expect(a).toBeDefined();expect(b).toBeDefined();
  expect(a!.bedId).not.toBe(b!.bedId);
  const [first,second]=[a!,b!].map(p=>beds.get(p.bedId!)!);
  expect(rooms.at(first!.x,first!.z)).toBe(rooms.at(second!.x,second!.z));
});

test('daily production, care and storage are accessible, while crops and owned animals occupy real separate spaces',()=>{
  const world=prepareEstablishedColonyScenario(),pawn=world.pawns.find(isColonist)!;
  const reach=reachableCells(world,pawn,blockedCells(world),new Set());
  const services=['electric-stove','hi-tech-research-bench','machining-table','hospital-bed','pen-marker'] as const;
  for(const kind of services){
    const buildings=world.structures.filter(s=>s.kind===kind);
    expect(buildings.length,`${kind} must exist`).toBeGreaterThan(0);
    expect(buildings.some(s=>routeToJob(world,s,reach,true)!==null),`${kind} needs an accessible service cell`).toBe(true);
  }
  const prisonBeds=world.structures.filter(s=>s.prisoner);
  expect(prisonBeds.length).toBeGreaterThan(0);
  for(const bed of prisonBeds){
    expect(prisonBedValid(world,bed)).toBe(true);
    expect(routeToJob(world,bed,reach,true)).not.toBeNull();
  }
  expect(world.pawns.some(p=>!!p.prisoner)).toBe(false);
  for(const item of ['simple-meal','rice','medicine','wood','steel','component'] as const)
    expect(world.stockpiles.some(zone=>storageAccepts(zone,item)),`${item} needs a compatible stock policy`).toBe(true);
  expect([...new Set(world.growingZones.map(zone=>zone.plant))]).toEqual(expect.arrayContaining(['rice','corn','cotton','healroot']));
  const cells=world.growingZones.flatMap(zone=>zone.cells);
  expect(new Set(cells).size).toBe(cells.length);
  const markers=world.structures.filter(s=>s.kind==='pen-marker');
  expect(markers.length).toBeGreaterThan(0);
  for(const marker of markers)expect(penRegion(world,marker.id)).toMatchObject({closed:true,accessible:true});
  const domestic=world.wildlife?.animals.filter(a=>a.species==='muffalo'&&!!a.domestic)??[];
  expect(domestic).toHaveLength(2);
  for(const animal of domestic)expect(animalPenAt(world,animal.x,animal.z)).toMatchObject({closed:true,accessible:true});
});

test('ordinary startup powers defensive guns, preserves transport authority and resumes the active colony exactly',async()=>{
  const world=prepareEstablishedColonyScenario(),initialTick=world.tick;
  const initialPeople=world.pawns.filter(isColonist).map(p=>p.id);
  const raw=serializeWorld(world),stored=await encodeStoredSave(raw);
  expect(await decodeStoredSave(stored)).toBe(raw);
  expect(deserializeWorld(await decodeStoredSave(stored))).toEqual(world);
  const turrets=world.structures.filter(s=>s.kind==='mini-turret');
  expect(turrets).toHaveLength(2);
  for(const turret of turrets){
    expect(turret.turret?.holdFire).toBe(false);
    expect(turret.turret!.ammoQ).toBeGreaterThan(0);
  }
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const confirmed=adopt(decoder,encoder.encode(world,0,0)),frozen=structuredClone(confirmed);
  let witnessedWork=false;
  for(let i=0;i<120;i++){
    stepWorld(world);
    witnessedWork ||= world.pawns.some(p=>p.jobId!==null||!!p.haul||!!p.cooking||!!p.research||!!p.animalHandling);
    if((i+1)%20===0){
      expect(validateWorld(world)).toEqual([]);
      expect(adopt(decoder,encoder.encode(world,0,1))).toEqual(world);
    }
  }
  expect(world.tick).toBe(initialTick+120);
  expect(witnessedWork,'A colony continuation must exercise actual work').toBe(true);
  expect(confirmed).toEqual(frozen);
  expect(world.pawns.filter(isColonist).map(p=>p.id)).toEqual(initialPeople);
  expect(world.pawns.filter(isColonist).every(p=>p.state!=='dead'&&p.state!=='downed')).toBe(true);
  for(const id of turrets.map(s=>s.id)){
    const turret=world.structures.find(s=>s.id===id)!;
    expect(isPowerActive(turret)).toBe(true);
    expect(turret.turret!.holdFire).toBe(false);
  }
  const resumed=deserializeWorld(serializeWorld(world));
  for(let i=0;i<60;i++){stepWorld(world);stepWorld(resumed);}
  expect(validateWorld(world)).toEqual([]);
  expect(resumed).toEqual(world);
  const lastConfirmed=adopt(decoder,encoder.encode(world,0,1,true)),lastFrozen=structuredClone(lastConfirmed);
  const next=structuredClone(encoder.encode(world,0,1,true));
  if(next.kind!=='checkpoint')throw Error('A forced checkpoint must contain a complete World.');
  const wrongBed=structuredClone(next.world);
  // Full save validation owns the ordinary bed binding. The transport's
  // historical sparse guard does not claim to repeat every save invariant.
  wrongBed.pawns.find(isColonist)!.bedId=turrets[0]!.id;
  expect(validateWorld(wrongBed).length).toBeGreaterThan(0);
  expect(()=>deserializeWorld(JSON.stringify(wrongBed))).toThrow();
  const forged=structuredClone(next);
  // Human relationship authority is explicitly shared by save and transport.
  // A cannon's ID cannot become a spouse merely by being in the namespace.
  forged.world.relationships!.links[0]!.bId=turrets[0]!.id;
  expect(validateWorld(forged.world).length).toBeGreaterThan(0);
  expect(()=>deserializeWorld(JSON.stringify(forged.world))).toThrow();
  expect(decoder.adopt(forged).status).toBe('resync');
  expect(lastConfirmed).toEqual(lastFrozen);
  expect(adopt(decoder,next)).toEqual(world);
});
