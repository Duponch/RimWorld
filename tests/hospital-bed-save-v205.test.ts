import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { COMPLEX_FURNITURE_RESEARCH_COST,HOSPITAL_BED_RESEARCH_COST,MICROELECTRONICS_RESEARCH_COST } from '../src/sim/research.ts';
import type { Structure,World } from '../src/sim/types.ts';
import { SCHEMA_VERSION } from '../src/sim/types.ts';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction.ts';

function camp(hospital=false):World {
  const w=deconstructionCamp();w.tick=3000;
  w.research={project:null,points:0,microelectronics:{points:MICROELECTRONICS_RESEARCH_COST,completedAt:0},complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:0},...(hospital?{hospitalBed:{points:HOSPITAL_BED_RESEARCH_COST,completedAt:0}}:{})};
  // Prepared identity fixture; physical construction is covered by world tests.
  const bed=fixtureBuilding(w,hospital?'hospital-bed':'bed',17,16);
  Object.assign(bed,{material:'steel',quality:'good',medical:true,damage:7});
  expect(validateWorld(w)).toEqual([]);return w;
}
function until(w:World,done:()=>boolean,limit=1500):void {
  for(let i=0;i<limit&&!done();i++){stepWorld(w);if(i%100===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({state:p.state,job:p.jobId,path:p.path})),packed:w.packed})).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}
const packet=(encoder:SnapshotEncoder,w:World,checkpoint=false)=>structuredClone(encoder.encode(w,0,6,checkpoint));

test('strict 186 migration changes only schema and preserves ordinary medical beds, research, possessions and RNG',()=>{
  const w=camp(),raw=JSON.parse(serializeWorld(w));raw.schemaVersion=186;
  const before=JSON.stringify(raw),loaded=deserializeWorld(before);
  expect(SCHEMA_VERSION).toBe(187);expect(loaded).toEqual({...raw,schemaVersion:187});
  expect(loaded.research!.hospitalBed).toBeUndefined();expect(loaded.structures[0]!.kind).toBe('bed');expect(loaded.rng).toBe(raw.rng);
  expect(JSON.stringify(raw)).toBe(before);
  const fresh=deconstructionCamp(),old=JSON.parse(serializeWorld(fresh));old.schemaVersion=186;
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...old,schemaVersion:187});
});

test('186 rejects hospital structures, blueprints, packed objects, transfer/removal payloads and future research before migration',()=>{
  const old=(w:World)=>{const raw=JSON.parse(serializeWorld(w));raw.schemaVersion=186;return raw;};
  const cases:Array<{label:string;raw:any}>=[];
  const base=old(camp());const structure=structuredClone(base);structure.structures[0].kind='hospital-bed';cases.push({label:'structure',raw:structure});
  const blueprint=camp();expect(applyCommand(blueprint,{type:'designate',kind:'bed',material:'steel',x:22,z:20}).ok).toBe(true);
  const job=old(blueprint);job.jobs[0].kind='hospital-bed';cases.push({label:'blueprint',raw:job});
  const packed=structuredClone(base);packed.packed=[{building:{...packed.structures[0],kind:'hospital-bed'},owner:{type:'ground',x:17,z:16}}];packed.structures=[];cases.push({label:'package',raw:packed});
  const transfer=camp();expect(applyCommand(transfer,{type:'install',structureId:transfer.structures[0]!.id,x:23,z:20,orientation:1}).ok).toBe(true);
  const moving=old(transfer);moving.jobs[0].furniture.kind='hospital-bed';cases.push({label:'transfer payload',raw:moving});
  const removal=camp();expect(applyCommand(removal,{type:'designate',kind:'deconstruct',x:17,z:16}).ok).toBe(true);
  const removing=old(removal);removing.jobs[0].deconstruction.kind='hospital-bed';cases.push({label:'removal payload',raw:removing});
  for(const project of [false,true]){const research=structuredClone(base);research.research.hospitalBed={points:0};if(project)research.research.project='hospital-bed';cases.push({label:project?'active project':'future progress',raw:research});}
  for(const {label,raw} of cases){const retained=JSON.stringify(raw);expect(()=>deserializeWorld(retained),label).toThrow(/version 186/);expect(JSON.stringify(raw),label).toBe(retained);}
});

test('hospital save rejects incompatible material, invalid quality/PV, missing parents and inconsistent progress without repairing data',()=>{
  const w=camp(true),raw=serializeWorld(w);
  const changes:Array<(v:any)=>void>=[
    v=>v.structures[0].material='wood',v=>delete v.structures[0].material,
    v=>v.structures[0].quality='unknown',v=>v.structures[0].damage=150,
    v=>delete v.research.microelectronics,v=>delete v.research.complexFurniture,
    v=>delete v.research.hospitalBed,v=>v.research.hospitalBed.points--,
    v=>v.research.hospitalBed.completedAt=v.tick+1,
    v=>{v.research.project='hospital-bed';},
  ];
  for(const [i,change] of changes.entries()){const bad=JSON.parse(raw);change(bad);const frozen=JSON.stringify(bad);expect(()=>deserializeWorld(frozen),`corruption ${i}`).toThrow();expect(JSON.stringify(bad)).toBe(frozen);}
  expect(serializeWorld(w)).toBe(raw);expect(deserializeWorld(raw)).toEqual(w);
});

test('physical packing and reinstallation preserve hospital identity, quality, HP and explicitly disabled medical role across saves',()=>{
  const w=camp(true),bed=w.structures[0]!,pawn=w.pawns[0]!;pawn.skills.construction.level=8;
  expect(applyCommand(w,{type:'medical-bed',bedId:bed.id,enabled:false}).ok).toBe(true);pawn.bedId=bed.id;
  const quality=bed.quality,rng=w.rng;
  expect(applyCommand(w,{type:'designate',kind:'uninstall',x:bed.x,z:bed.z}).ok).toBe(true);
  until(w,()=>w.packed.length===1);
  expect(w.packed[0]!.building).toBe(bed);expect(w.packed[0]!.building).toMatchObject({kind:'hospital-bed',material:'steel',quality,damage:7});
  expect(w.packed[0]!.building.medical).toBeUndefined();expect(pawn.bedId).toBe(bed.id);expect(w.rng).toBe(rng);
  const grounded=deserializeWorld(serializeWorld(w));expect(grounded).toEqual(w);
  expect(applyCommand(w,{type:'install',structureId:bed.id,x:23,z:20,orientation:1}).ok).toBe(true);
  until(w,()=>w.packed[0]?.owner.type==='pawn');const carried=deserializeWorld(serializeWorld(w));
  until(w,()=>!w.jobs.length);stepWorld(carried,w.tick-carried.tick);expect(carried).toEqual(w);
  expect(w.structures[0]).toBe(bed);expect(bed).toMatchObject({id:bed.id,kind:'hospital-bed',material:'steel',quality,damage:7,x:23,z:20,orientation:1});
  expect(bed.medical).toBeUndefined();expect(pawn.bedId).toBe(bed.id);expect(w.rng).toBe(rng);expect(w.piles).toEqual([]);
});

test('bridge checkpoints and deltas roundtrip research, new kind, role and quality while retaining old frames',()=>{
  const w=camp(true),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(packet(encoder,w));
  expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('hospital checkpoint refused');
  const frozen=structuredClone(first.world),bed=w.structures[0]!;
  expect(applyCommand(w,{type:'medical-bed',bedId:bed.id,enabled:false}).ok).toBe(true);
  const delta=packet(encoder,w);expect(delta.kind).toBe('delta');const second=decoder.adopt(delta);
  expect(second.status).toBe('applied');if(second.status!=='applied')throw Error('role delta refused');
  expect(second.world).toEqual(w);expect(first.world).toEqual(frozen);expect(first.world.structures[0]!.medical).toBe(true);
  const beforePacking=structuredClone(second.world);expect(applyCommand(w,{type:'designate',kind:'uninstall',x:bed.x,z:bed.z}).ok).toBe(true);until(w,()=>w.packed.length===1);
  const packed=decoder.adopt(packet(encoder,w));expect(packed.status).toBe('applied');if(packed.status==='applied')expect(packed.world).toEqual(w);
  expect(second.world).toEqual(beforePacking);expect(w.packed[0]!.building.quality).toBe('good');
  expect(new SnapshotDecoder().adopt(packet(encoder,w,true)).status).toBe('applied');
});

test('bridge rejects raw hospital corruption and future 186 checkpoint/delta atomically before accepting valid continuation',()=>{
  for(const packed of [false,true]){
    const w=camp(true);if(packed){w.packed.push({building:w.structures.pop()!,owner:{type:'ground',x:17,z:16}});}
    const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),checkpoint=packet(encoder,w),first=decoder.adopt(checkpoint);
    if(first.status!=='applied')throw Error('valid hospital frame');const frozen=structuredClone(first.world),delta=packet(encoder,w);
    const bed=(message:SnapshotMessage):Structure=>packed?message.world.packed[0]!.building:message.world.structures[0]!;
    const changes:Array<(message:SnapshotMessage)=>void>=[
      m=>m.world.schemaVersion=186 as typeof m.world.schemaVersion,m=>bed(m).material='wood',m=>bed(m).quality='unknown' as never,
      m=>bed(m).damage=150,m=>delete m.world.research!.hospitalBed,m=>m.world.research!.hospitalBed!.points--,
    ];
    for(const original of [checkpoint,delta])for(const [i,change] of changes.entries()){
      const bad=structuredClone(original);bad.revision=delta.revision;change(bad);
      expect(decoder.adopt(bad).status,`${packed?'package':'structure'} ${original.kind} corruption ${i}`).toBe('resync');expect(first.world).toEqual(frozen);
      if(bad.kind==='checkpoint')expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
    }
    const next=decoder.adopt(delta);expect(next.status).toBe('applied');if(next.status==='applied')expect(next.world).toEqual(w);expect(first.world).toEqual(frozen);
  }
});
