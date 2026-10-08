import { expect,test } from 'vitest';
import { footprintCells } from '../src/sim/definitions.ts';
import { validateHydroponics } from '../src/sim/farming-save.ts';
import { HYDROPONICS_RESEARCH_COST } from '../src/sim/research.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';
import type { GrowingZone,Job,Orientation,Structure,World } from '../src/sim/types.ts';
import { SCHEMA_VERSION } from '../src/sim/types.ts';

function fixture(orientation:Orientation=0){
  const w=deconstructionCamp(0,24);w.stockpiles=[];w.growingZones=[];
  w.research={project:null,points:0,hydroponics:{points:HYDROPONICS_RESEARCH_COST,completedAt:w.tick}};
  const basin:Structure={id:w.nextId++,kind:'hydroponics-basin',x:8,z:8,orientation,footprint:'standard',material:'steel',power:newPowerState('hydroponics-basin')};
  w.structures.push(basin);
  const zone:GrowingZone={id:w.nextId++,basinId:basin.id,plant:'rice',allowSow:true,allowCut:true,cells:footprintCells(basin).map(c=>c.z*w.width+c.x).sort((a,b)=>a-b)};
  w.growingZones.push(zone);
  for(const index of zone.cells)w.tiles[index]={terrain:'rough-stone',floor:'wood-planks'};
  return {w,basin,zone};
}
const valid=(w:World)=>expect(validateWorld(w)).toEqual([]);

test('a basin and its own four-cell zone validate on infertile floored terrain in every orientation',()=>{
  for(const orientation of [0,1,2,3] as Orientation[]){
    const {w}=fixture(orientation);expect(validateHydroponics(w,203)).toEqual([]);valid(w);
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
    const result=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,6)));
    expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);
  }
});

test('all four supported crops may live under their linked basin, including an unpowered basin',()=>{
  for(const kind of ['rice','potato','cotton','healroot'] as const){
    const {w,basin,zone}=fixture();zone.plant=kind;
    w.resources.push({id:w.nextId++,kind,x:basin.x,z:basin.z,amount:kind==='healroot'?1:6,growth:.5,growthTick:w.tick});
    valid(w);expect(basin.power!.on).toBe(false);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  }
});

test('schema 202 refuses future basin, linked-zone and research records before neutral migration',()=>{
  const {w}=fixture();const old=structuredClone(w);old.schemaVersion=202 as World['schemaVersion'];
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();
  expect(validateHydroponics(old,202)).toContain('Future hydroponics content.');
  const plain=deconstructionCamp(0,24);plain.schemaVersion=202 as World['schemaVersion'];
  const before=structuredClone(plain),upgraded=deserializeWorld(JSON.stringify(plain));
  expect(upgraded).toEqual({...before,schemaVersion:SCHEMA_VERSION});
  expect(upgraded.research?.hydroponics).toBeUndefined();
});

test('a construction blueprint has no basin zone or power until the building is completed',()=>{
  const {w,basin}=fixture();w.structures=[];w.growingZones=[];
  const {power,...base}=basin;void power;
  const job:Job={...base,kind:'hydroponics-basin',status:'pending',reservedBy:null,escrow:{wood:0,food:0},progress:0,construction:'blueprint'};
  w.jobs.push(job);valid(w);expect(validateHydroponics(w,203)).toEqual([]);
  expect(validateHydroponics(w,202)).toContain('Future hydroponics content.');
  Object.assign(job,{power:newPowerState('hydroponics-basin')});
  expect(validateHydroponics(w,203)).toContain('Blueprint cannot supply hydroponics power.');
});

test('save and snapshot share strict hydroponics references, policy, material, research and power guards',()=>{
  const {w}=fixture();valid(w);
  const mutations:((bad:World)=>void)[]=[
    v=>{delete v.growingZones[0]!.basinId;},v=>{v.growingZones[0]!.basinId=v.nextId;},
    v=>{v.growingZones[0]!.id=v.structures[0]!.id;},
    v=>{v.growingZones[0]!.cells.pop();},v=>{v.growingZones[0]!.cells.reverse();},
    v=>{const cells=v.growingZones[0]!.cells;cells[0]=cells[0]!-1;},v=>{v.growingZones[0]!.plant='corn';},
    v=>{v.growingZones.push({...structuredClone(v.growingZones[0]!),id:v.nextId++});},
    v=>{v.structures[0]!.material='wood';},v=>{v.structures[0]!.footprint='legacy-single';},
    v=>{delete v.structures[0]!.power;},v=>{v.structures[0]!.power!.on=true;},
    v=>{v.structures[0]!.power!.parentId=v.structures[0]!.id;},
    v=>{delete v.research!.hydroponics!.completedAt;},v=>{v.research!.hydroponics!.completedAt=v.tick+1;},
    v=>{v.research!.hydroponics!.points--;},
    v=>{const b=v.structures[0]!;v.piles.push({id:v.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',x:b.x,z:b.z}});},
    v=>{v.packed.push({building:v.structures.pop()!,owner:{type:'ground',x:18,z:18}});},
    v=>{const z=v.growingZones[0]!;v.growingZones.push({id:v.nextId++,cells:[z.cells[0]!],plant:'rice',allowSow:true,allowCut:true});},
  ];
  for(const mutate of mutations){
    const bad=structuredClone(w);mutate(bad);
    expect(validateHydroponics(bad,203).length,mutate.toString()).toBeGreaterThan(0);
    expect(()=>deserializeWorld(JSON.stringify(bad)),mutate.toString()).toThrow();
    const packet=structuredClone(new SnapshotEncoder().encode(bad,0,6));
    expect(new SnapshotDecoder().adopt(packet).status,mutate.toString()).toBe('resync');
  }
});

test('a rejected hydroponics delta preserves the accepted world and revision',()=>{
  const {w}=fixture(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('checkpoint rejected');
  const retained=structuredClone(first.world);w.tick++;w.growingZones[0]!.allowSow=false;
  const good=structuredClone(encoder.encode(w,0,6)),bad=structuredClone(good);bad.world.growingZones[0]!.plant='corn';
  expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(retained);
  const accepted=decoder.adopt(good);expect(accepted.status).toBe('applied');if(accepted.status==='applied')expect(accepted.world).toEqual(w);
});

test('ordinary soil zones gain no exception from an unlinked basin identifier',()=>{
  const {w}=fixture();w.structures=[];delete w.growingZones[0]!.basinId;
  expect(validateWorld(w)).toContain('Growing zone on incompatible terrain.');
  const {w:other,basin}=fixture();other.resources.push({id:other.nextId++,kind:'tree',x:basin.x,z:basin.z,amount:10});
  expect(validateHydroponics(other,203)).toContain('Unsupported plant overlaps hydroponics.');
});

test('raw hydroponics validation refuses malformed collections without following them',()=>{
  const {w}=fixture();
  for(const [key,value] of [['pawns',null],['piles',[null]],['tiles',[]],['resources',{}],['width',0],['growingZones',[null]],['packed',{}]] as const){
    const bad=structuredClone(w) as unknown as Record<string,unknown>;bad[key]=value;
    expect(()=>validateHydroponics(bad as unknown as World,203)).not.toThrow();
    expect(validateHydroponics(bad as unknown as World,203).length).toBeGreaterThan(0);
  }
});
