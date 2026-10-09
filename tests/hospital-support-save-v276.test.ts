import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {validHospitalSupportTransport,validateResearch} from '../src/sim/research-save.ts';
import {validateConstructionMaterials} from '../src/sim/construction-material-save.ts';
import {SCHEMA_VERSION,type Job,type Structure,type World} from '../src/sim/types.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

function hospitalSupport(pawns=0){
  const w=deconstructionCamp(pawns,32);w.stockpiles=[];w.growingZones=[];
  w.research={project:null,points:600_000_000,completedAt:0,complexFurniture:{points:300_000_000,completedAt:0},smithing:{points:700_000_000,completedAt:0},machining:{points:1_000_000_000,completedAt:0},microelectronics:{points:3_000_000_000,completedAt:0},multiAnalyzer:{points:4_000_000_000,completedAt:0},hospitalBed:{points:1_200_000_000,completedAt:0},sterileMaterials:{points:600_000_000,completedAt:0},vitalsMonitor:{points:2_500_000_000,completedAt:0}};
  return w;
}
function monitor(w:World):Structure {
  const s:Structure={id:w.nextId++,kind:'vitals-monitor',x:8,z:8,orientation:2,footprint:'standard',material:'steel',power:newPowerState('vitals-monitor')};w.structures.push(s);return s;
}
function sterilePlan(w:World):Job {
  const j:Job={id:w.nextId++,kind:'lay-floor',floor:'sterile-tile',x:10,z:10,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0},construction:'frame'};w.jobs.push(j);return j;
}
const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));

test('migration210 is neutral and does not grant hospital support or alter RNG',()=>{
  const old=deconstructionCamp(0,24);old.schemaVersion=210 as World['schemaVersion'];const before=structuredClone(old);
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(old).toEqual(before);
});

test('unpowered monitors retain identity and switch intent on map and as packed furniture',()=>{
  const w=hospitalSupport(),s=monitor(w);s.power!.switchOn=false;
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(checkpoint(w).status).toBe('applied');
  w.structures=[];w.packed.push({building:s,owner:{type:'ground',x:12,z:12}});
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(checkpoint(w).status).toBe('applied');
});

test('future, locked, qualitative, EMP, broken and malformed powered monitors are refused by common boundaries',()=>{
  const w=hospitalSupport();monitor(w);
  for(const mutate of [(v:World)=>{v.schemaVersion=210 as World['schemaVersion'];},(v:World)=>{delete v.research!.vitalsMonitor;},
    (v:World)=>{v.structures[0]!.material='wood';},(v:World)=>{v.structures[0]!.quality='normal';},
    (v:World)=>{v.structures[0]!.emp={sinceCore:0,untilCore:100};},(v:World)=>{v.structures[0]!.breakdown={brokenAt:0};},
    (v:World)=>{v.structures[0]!.power!.on=true;},(v:World)=>{v.structures[0]!.power!.parentId=99999;}]){
    const bad=structuredClone(w);mutate(bad);expect(validHospitalSupportTransport(bad,bad.schemaVersion)).toBe(false);expect(checkpoint(bad).status).toBe('resync');expect(()=>serializeWorld(bad)).toThrow();
  }
});

test('sterile terrain requires acquired research and schema211 in files and transported terrain',()=>{
  const w=hospitalSupport();w.tiles[10*w.width+10]={terrain:'grass',floor:'sterile-tile'};
  expect(validateWorld(w)).toEqual([]);expect(checkpoint(w).status).toBe('applied');
  for(const future of [false,true]){const bad=structuredClone(w);if(future)bad.schemaVersion=210 as World['schemaVersion'];else delete bad.research!.sterileMaterials;
    expect(validateWorld(bad).length).toBeGreaterThan(0);expect(checkpoint(bad).status).toBe('resync');}
});

test('silver is an exact sterile-floor ingredient and never a furniture material',()=>{
  const w=hospitalSupport(),j=sterilePlan(w);w.piles.push({id:w.nextId++,item:'silver',kind:'silver',quantity:12,owner:{type:'job',jobId:j.id}},
    {id:w.nextId++,item:'steel',kind:'steel',quantity:3,owner:{type:'job',jobId:j.id}});
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(checkpoint(w).status).toBe('applied');
  const excess=structuredClone(w);excess.piles[0]!.quantity=13;expect(validHospitalSupportTransport(excess,211)).toBe(false);expect(checkpoint(excess).status).toBe('resync');
  const wrong=structuredClone(w);wrong.jobs[0]!.floor='steel-tile';expect(validHospitalSupportTransport(wrong,211)).toBe(false);
  const s=monitor(w);s.material='silver' as never;expect(validateConstructionMaterials(w,211).length).toBeGreaterThan(0);
});

test('new progress, prerequisites and loss ledgers are strict without making sterile research a historical bed prerequisite',()=>{
  const w=hospitalSupport();delete w.research!.sterileMaterials;expect(validateResearch(w,211)).toEqual([]);
  const bad=structuredClone(w);delete bad.research!.hospitalBed;expect(validHospitalSupportTransport(bad,211)).toBe(false);
  const malformed=structuredClone(w);malformed.research!.vitalsMonitor!.points--;expect(validHospitalSupportTransport(malformed,211)).toBe(false);
  w.deconstructed.lostSilver=6;expect(validHospitalSupportTransport(w,211)).toBe(true);expect(validHospitalSupportTransport(w,210)).toBe(false);
  w.deconstructed.lostSilver=-1;expect(validHospitalSupportTransport(w,211)).toBe(false);
});

test('in-place monitor and terrain edits refuse atomically and preserve the preceding snapshot',()=>{
  const w=hospitalSupport(),s=monitor(w),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('checkpoint');
  const before=structuredClone(first.world);s.power!.on=true;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('resync');expect(first.world).toEqual(before);
  s.power!.on=false;expect(decoder.adopt(structuredClone(encoder.encode(w,0,1,true))).status).toBe('applied');
  w.tiles[10*w.width+10]={terrain:'grass',floor:'sterile-tile'};delete w.research!.sterileMaterials;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,1))).status).toBe('resync');expect(first.world).toEqual(before);
});
