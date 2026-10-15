import {newDoorState} from '../src/sim/door-rules.ts';
import {expect,test} from 'vitest';
import {applyCommand,serializeWorld,deserializeWorld,validateWorld,stepWorld} from '../src/sim/index.ts';
import {advanceVents,newVentState,validVentTransport,ventPlacementAllowed} from '../src/sim/vent.ts';
import {thermalLayout,reconcileTemperature} from '../src/sim/temperature.ts';
import type {ThermalLayout} from '../src/sim/thermal-topology.ts';
import {validateFurniture} from '../src/sim/furniture-transfer-save.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {ventWorkshopV383,ventRoomWitnessV383} from './scenarios/vent-v383.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';

function until(w:World,done:()=>boolean,limit=2200){for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),`tick${w.tick}: ${JSON.stringify(w.pawns.map(p=>({state:p.state,job:p.jobId})))}`).toBe(true);}
const steel=(w:World)=>w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0);

test('ordinary paid construction, real service and interruption remain saveable without invented power or a package',()=>{
  const {w,pawnId,site}=ventWorkshopV383();expect(validateWorld(w)).toEqual([]);
  expect(applyCommand(w,{type:'designate',kind:'vent',material:'steel',...site}).ok).toBe(true);
  until(w,()=>w.structures.some(s=>s.kind==='vent'));
  const vent=w.structures.find(s=>s.kind==='vent')!;expect(steel(w)).toBe(0);expect(vent.vent).toEqual({open:true});expect(vent.power).toBeUndefined();expect(vent.door).toBeUndefined();
  expect(applyCommand(w,{type:'power-flick',structureId:vent.id,on:false}).ok).toBe(true);expect(vent.vent!.open).toBe(true);
  const job=w.jobs.find(j=>j.flick?.structureId===vent.id)!;until(w,()=>job.progress===10);
  const pawn=w.pawns.find(p=>p.id===pawnId)!;expect(Math.max(Math.abs(pawn.x-vent.x),Math.abs(pawn.z-vent.z))).toBe(1);
  expect(applyCommand(w,{type:'priority',pawnId,work:'basic',value:0}).ok).toBe(true);expect(job.progress).toBe(0);expect(job.reservedBy).toBeNull();expect(vent.vent!.open).toBe(true);
  expect(applyCommand(w,{type:'priority',pawnId,work:'basic',value:1}).ok).toBe(true);until(w,()=>job.progress===10);
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(resumed);expect(resumed).toEqual(w);expect(vent.vent!.open).toBe(false);
  expect(applyCommand(w,{type:'power-flick',structureId:vent.id,on:true}).ok).toBe(true);
  expect(applyCommand(w,{type:'power-flick',structureId:vent.id,on:false}).ok).toBe(true);expect(w.jobs.some(j=>j.flick?.structureId===vent.id)).toBe(false);
  const before=serializeWorld(w);expect(applyCommand(w,{type:'designate',kind:'uninstall',targetId:vent.id,x:vent.x,z:vent.z}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',targetId:vent.id,x:vent.x,z:vent.z}).ok).toBe(true);until(w,()=>!w.structures.includes(vent));
  expect(w.jobs.some(j=>j.flick?.structureId===vent.id)).toBe(false);expect(steel(w)).toBeGreaterThan(0);expect(steel(w)).toBeLessThanOrEqual(30);expect(validateWorld(w)).toEqual([]);
});

test('one rare impulse clamps both volumes together, stops when closed and never changes outdoor air',()=>{
  const {w}=ventWorkshopV383(),id=w.nextId++;w.structures=[{id,kind:'vent',x:5,z:4,orientation:1,footprint:'standard',material:'steel',vent:newVentState()}];
  w.thermal={regions:[{cells:[1,2,3,4],temperature:0},{cells:Array.from({length:10},(_,i)=>i+20),temperature:100}]};
  const layout:ThermalLayout={rooms:[],doors:[],indices:new Int32Array(1024),vents:[{id,structureIndex:0,sides:[0,1]}]};
  w.tick=id%25;advanceVents(w,layout,-20);expect(w.thermal.regions.map(r=>r.temperature)).toEqual([50,80]);
  expect(w.thermal.regions.reduce((n,r)=>n+r.temperature*r.cells.length,0)).toBe(1000);
  w.tick++;advanceVents(w,layout,-20);expect(w.thermal.regions.map(r=>r.temperature)).toEqual([50,80]);
  w.structures[0]!.vent!.open=false;w.tick+=24;advanceVents(w,layout,-20);expect(w.thermal.regions.map(r=>r.temperature)).toEqual([50,80]);
  w.structures[0]!.vent!.open=true;layout.vents![0]!.sides=[0,-1];w.thermal.regions[0]!.temperature=0;advanceVents(w,layout,100);expect(w.thermal.regions[0]!.temperature).toBe(50);
  const prior=structuredClone(w.thermal);layout.vents![0]!.sides=[0,0];advanceVents(w,layout,100);expect(w.thermal).toEqual(prior);
});

test('topology keeps rooms distinct and invalidates a cached vent face when a different impassable appliance occupies it',()=>{
  const w=ventRoomWitnessV383(),first=thermalLayout(w);expect(w.thermal!.regions.map(r=>r.cells.length)).toEqual([8,16]);expect(first.vents).toHaveLength(1);
  expect(ventPlacementAllowed(w,{x:5,z:4,orientation:1})).toBe(true);
  // This solid is intentionally NOT a room boundary. It still must block the
  // face, including after a previously cached read and after its later removal.
  w.structures.push({id:w.nextId++,kind:'nutrient-paste-dispenser',x:6,z:3,orientation:0,footprint:'standard',material:'steel'});
  expect(ventPlacementAllowed(w,{x:5,z:4,orientation:1})).toBe(false);const blocked=thermalLayout(w);expect(blocked).not.toBe(first);expect(blocked.vents).toEqual([]);
  w.structures.pop();expect(thermalLayout(w).vents).toHaveLength(1);expect(reconcileTemperature(w).rooms).toHaveLength(2);
});

test('occupied wall/door/blueprint placements refuse atomically and require ordinary demolition first',()=>{
  const {w,site}=ventWorkshopV383();
  for(const kind of ['wall','door'] as const){
    const occupied=structuredClone(w);occupied.structures.push({id:occupied.nextId++,kind,...site,footprint:'standard',material:'steel',...(kind==='door'?{door:newDoorState(occupied.tick)}:{})});
    const before=serializeWorld(occupied);expect(applyCommand(occupied,{type:'designate',kind:'vent',material:'steel',...site}).ok).toBe(false);expect(serializeWorld(occupied)).toBe(before);
  }
  expect(applyCommand(w,{type:'designate',kind:'wall',material:'steel',...site}).ok).toBe(true);const before=serializeWorld(w);
  expect(applyCommand(w,{type:'designate',kind:'vent',material:'steel',...site}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
});

test('strict243 migration is neutral on both maps and rejects future state, kind and packed/archive domains',()=>{
  const {w}=preparedCassandraExpedition(),old=structuredClone(w);(old as {schemaVersion:number}).schemaVersion=243;
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
  for(const where of ['home','secondary'] as const)for(const field of ['kind','state'] as const){
    const bad=structuredClone(old),map=where==='home'?bad:bad.secondarySite!.map;
    map.structures.push({id:bad.nextId++,kind:field==='kind'?'vent':'wall',x:1,z:1,orientation:0,footprint:'standard',material:'steel',vent:{open:true}});
    expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/version243/);
  }
  const {w:packWorld}=ventWorkshopV383();const pack={building:{id:packWorld.nextId++,kind:'bed' as const,x:1,z:1,orientation:0 as const,footprint:'standard' as const,material:'steel' as const,vent:{open:true}},owner:{type:'ground' as const,x:1,z:1}};
  packWorld.packed=[pack];
  // validateFurniture is the SAME entry used by visitors.departed[].packed,
  // closing hidden fields on archived sculptures without a recursive World scan.
  expect(validateFurniture(packWorld,243,new Set())).toContain('Invalid vent state on packed furniture.');
  expect(validVentTransport(packWorld,243)).toBe(false);
});

test('confirmed same-tick checkpoint/delta carries real aperture and rejects future243 state atomically',()=>{
  const w=ventRoomWitnessV383(),vent=w.structures.find(s=>s.kind==='vent')!,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('applied');vent.vent!.open=false;
  const delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');const adopted=decoder.adopt(delta);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Expected aperture delta');expect(adopted.world.structures.find(s=>s.id===vent.id)!.vent).toEqual({open:false});
  const bad=structuredClone(new SnapshotEncoder().encode(w,0,0));(bad.world as {schemaVersion:number}).schemaVersion=243;expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
  const resumed=deserializeWorld(serializeWorld(w));expect(resumed).toEqual(w);
});
