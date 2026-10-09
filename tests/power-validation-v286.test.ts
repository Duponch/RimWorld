import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { validatePower } from '../src/sim/power-save.ts';
import { PowerTopologyCache } from '../src/sim/power-topology.ts';
import { validBiofuelTransport } from '../src/sim/biofuel-save.ts';
import { validNutrientPasteTransport } from '../src/sim/nutrient-paste-save.ts';
import { validOrbitalTransport } from '../src/sim/orbital-save.ts';
import { validateHydroponics } from '../src/sim/farming-save.ts';
import { validHospitalSupportTransport } from '../src/sim/research-save.ts';
import type { Structure,StructureKind,World } from '../src/sim/types.ts';
import { biofuelCamp } from './helpers/biofuel-v283.ts';

const kinds:StructureKind[]=['biofuel-refinery','chemfuel-generator','nutrient-paste-dispenser','orbital-beacon','comms-console','hydroponics-basin','vitals-monitor'];
function guardResults(w:World,cache?:PowerTopologyCache){return [
  validBiofuelTransport(w,w.schemaVersion,cache),validNutrientPasteTransport(w,w.schemaVersion,cache),
  validOrbitalTransport(w,w.schemaVersion,cache),validateHydroponics(w,w.schemaVersion,cache),
  validHospitalSupportTransport(w,w.schemaVersion,cache),
];}

test('one validation group retains all guards while sharing only unchanged electrical topology',()=>{
  const {world:w}=biofuelCamp(),before=structuredClone(w),cache=new PowerTopologyCache();
  for(const kind of kinds)expect(validatePower(w,w.schemaVersion,kind,cache)).toEqual(validatePower(w,w.schemaVersion,kind));
  expect(cache.rebuilds).toBe(1);
  expect(guardResults(w,cache)).toEqual(guardResults(w));
  expect(guardResults(w,cache)).toEqual([true,true,true,[],true]);
  expect(cache.rebuilds).toBe(1);expect(w).toEqual(before);
});

test('each read detects parent removal or movement instead of preserving formerly valid connections',()=>{
  for(const change of ['remove','move'] as const){
    const {world:w,refineryId,startGeneratorId}=biofuelCamp(),cache=new PowerTopologyCache();
    const refinery=w.structures.find(s=>s.id===refineryId)!,parent=w.structures.find(s=>s.id===startGeneratorId)!;
    expect(validatePower(w,w.schemaVersion,'biofuel-refinery',cache)).toEqual([]);
    if(change==='remove')w.structures=w.structures.filter(s=>s!==parent);else {parent.x=27;parent.z=27;}
    expect(validatePower(w,w.schemaVersion,'biofuel-refinery',cache)).toContain('Invalid electrical parent.');
    expect(guardResults(w,cache)).toEqual(guardResults(w));
    expect(cache.rebuilds).toBe(2);
    refinery.power!.parentId=null;refinery.power!.on=false;
    expect(validatePower(w,w.schemaVersion,'biofuel-refinery',cache)).toEqual([]);
    expect(cache.rebuilds).toBe(2); // Consumer state is still read by the guard.
  }
});

test('switch changes rebuild components and neither an open nor closed switch is a remote parent',()=>{
  const {world:w,refineryId}=biofuelCamp(),cache=new PowerTopologyCache();
  const switcher:Structure={id:w.nextId++,kind:'power-switch',x:13,z:11,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null,switchOn:true}};
  w.structures.push(switcher);
  const initial=cache.read(w);expect(initial.sources.has(switcher.id)).toBe(true);
  w.structures.find(s=>s.id===refineryId)!.power!.parentId=switcher.id;
  for(const on of [true,false,true]){
    switcher.power!.switchOn=on;
    expect(validatePower(w,w.schemaVersion,'biofuel-refinery',cache)).toEqual(validatePower(w,w.schemaVersion,'biofuel-refinery'));
    expect(validatePower(w,w.schemaVersion,'biofuel-refinery',cache)).toContain('Invalid electrical parent.');
    expect(cache.read(w).sources.has(switcher.id)).toBe(on);
  }
  expect(cache.rebuilds).toBe(3);expect(initial.sources.has(switcher.id)).toBe(true);
});

test('consumer errors and blueprint power remain rejected even when the topology key is unchanged',()=>{
  const {world:w,refineryId}=biofuelCamp(),cache=new PowerTopologyCache(),refinery=w.structures.find(s=>s.id===refineryId)!;
  expect(validatePower(w,w.schemaVersion,'biofuel-refinery',cache)).toEqual([]);
  refinery.power!.parentId=-1;
  expect(validatePower(w,w.schemaVersion,'biofuel-refinery',cache)).toEqual(validatePower(w,w.schemaVersion,'biofuel-refinery'));
  expect(validatePower(w,w.schemaVersion,'biofuel-refinery',cache)).toContain('Invalid electrical state.');
  w.jobs.push({power:{on:false,parentId:null}} as never);
  expect(validatePower(w,w.schemaVersion,'orbital-beacon',cache)).toEqual(['Blueprint cannot supply power.']);
  expect(cache.rebuilds).toBe(1);
});

test('a refused delta preserves its predecessor and the same valid packet remains admissible',()=>{
  const {world:w,startGeneratorId}=biofuelCamp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('checkpoint');const retained=structuredClone(first.world);
  w.tick++;const packet=structuredClone(encoder.encode(w,0,6));expect(packet.kind).toBe('delta');
  const invalid=structuredClone(packet);invalid.world.structures=invalid.world.structures.filter(s=>s.id!==startGeneratorId);
  expect(decoder.adopt(invalid).status).toBe('resync');
  const good=decoder.adopt(packet);expect(good.status).toBe('applied');
  if(good.status==='applied')expect(good.world).toEqual(w);
  expect(first.world).toEqual(retained);
});

test('checkpoint replacement cannot inherit a previously accepted electrical parent',()=>{
  const {world:w,startGeneratorId}=biofuelCamp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,6))).status).toBe('applied');
  const replacement=structuredClone(w);
  const packet=structuredClone(encoder.encode(replacement,0,6));expect(packet.kind).toBe('checkpoint');
  const invalid=structuredClone(packet),parent=invalid.world.structures.find(s=>s.id===startGeneratorId)!;
  parent.x=27;parent.z=27;
  expect(decoder.adopt(invalid).status).toBe('resync');
  const accepted=decoder.adopt(packet);expect(accepted.status).toBe('applied');
  if(accepted.status==='applied')expect(accepted.world).toEqual(replacement);
});

import { footprintCells } from '../src/sim/definitions.ts';
import { HYDROPONICS_RESEARCH_COST } from '../src/sim/research.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';
import type { Job,Orientation } from '../src/sim/types.ts';

function hydroValidationWorld(orientation:Orientation=0,edge=false){
  const w=deconstructionCamp(0,24);w.stockpiles=[];w.growingZones=[];
  w.research={project:null,points:0,hydroponics:{points:HYDROPONICS_RESEARCH_COST,completedAt:w.tick}};
  for(const [x,z] of edge?[[0,1],[0,6]]:[[8,8],[16,16]]){
    const basin:Structure={id:w.nextId++,kind:'hydroponics-basin',x:x!,z:z!,orientation,footprint:'standard',material:'steel',power:newPowerState('hydroponics-basin')};
    w.structures.push(basin);w.growingZones.push({id:w.nextId++,basinId:basin.id,plant:'rice',allowSow:true,allowCut:true,cells:footprintCells(basin).map(c=>c.z*w.width+c.x).sort((a,b)=>a-b)});
  }
  return w;
}

test('hydroponics footprint reuse preserves collision multiplicity, rotations and blueprint error order',()=>{
  for(const orientation of [0,1,2,3] as Orientation[]){
    const w=hydroValidationWorld(orientation),basin=w.structures[0]!;
    expect(validateHydroponics(w,w.schemaVersion,new PowerTopologyCache())).toEqual([]);
    const endpoint=footprintCells(basin).at(-1)!;
    for(let i=0;i<2;i++)w.structures.push({id:w.nextId++,kind:'wall',x:endpoint.x,z:endpoint.z,orientation:0,footprint:'standard',material:'wood'});
    const {power,...base}=basin;void power;
    w.jobs.push({...base,id:w.nextId++,kind:'hydroponics-basin',status:'pending',reservedBy:null,escrow:{wood:0,food:0},progress:0,construction:'blueprint'} as Job);
    const historical=validateHydroponics(w,w.schemaVersion),before=structuredClone(w);
    expect(historical.filter(s=>s==='Hydroponics overlaps another structure.')).toHaveLength(2);
    expect(historical).toContain('Growing zone overlaps hydroponics construction.');
    expect(validateHydroponics(w,w.schemaVersion,new PowerTopologyCache())).toEqual(historical);
    expect(w).toEqual(before);
  }
});

test('hydroponics reuse preserves raw skips and historical linearized edge aliases',()=>{
  const w=hydroValidationWorld(0,true);
  const edge:Structure={id:w.nextId++,kind:'solar-generator',x:23,z:0,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null}};
  w.structures.push(edge);
  const historical=validateHydroponics(w,w.schemaVersion);
  // Solar cells beyond x=23 alias the next row in this guard; retain its error
  // rather than introducing a different clipping or malformed-record rule.
  expect(historical).toContain('Hydroponics overlaps another structure.');
  expect(validateHydroponics(w,w.schemaVersion,new PowerTopologyCache())).toEqual(historical);
  for(const patch of [{orientation:4},{x:-1},{x:24}]){
    const bad=structuredClone(w);Object.assign(bad.structures.at(-1)!,patch);
    expect(validateHydroponics(bad,bad.schemaVersion,new PowerTopologyCache())).toEqual(validateHydroponics(bad,bad.schemaVersion));
  }
  const malformed=structuredClone(w);malformed.structures.push(null as never);
  expect(validateHydroponics(malformed,malformed.schemaVersion,new PowerTopologyCache())).toEqual(validateHydroponics(malformed,malformed.schemaVersion));
});
