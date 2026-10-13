import { expect,test } from 'vitest';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { validHumanSleepingSpotProvenance,validHumanSleepingSpotTransport } from '../src/sim/human-sleeping-spot-save.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { reconcilePrisoners } from '../src/sim/prisoners.ts';
import { prisonBedValid } from '../src/sim/prison-space.ts';
import { damageStructure,structureMaxHp } from '../src/sim/thing-damage.ts';
import { sleepingSpotFrame,medicalSpotFrame,surgerySpotFrame,rescueSpotFrame } from './helpers/human-sleeping-spot-persistence.ts';

function exact(w:World){
  const before=structuredClone(w);expect(validHumanSleepingSpotTransport(w)).toBe(true);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(w).toEqual(before);
}
test.each([0,1,2,3] as const)('232 oriented spot %s preserves its single original owner and exact head',orientation=>exact(sleepingSpotFrame(orientation).w));
test.each([false,true])('232 real medical resting admission preserves clinical record and prison role=%s',prison=>exact(medicalSpotFrame(prison).w));
test.each([false,true])('actual prison breach preserves the installed downed patient through save and checkpoint=%s adoption',checkpoint=>{
  const {w,p,spot}=medicalSpotFrame(true),health=p.health!,need=p.need;
  health.bloodLoss=Math.round(BLOOD_UNIT*.7);reconcilePawnHealth(w,p);
  expect(p.state).toBe('downed');expect(p.need).toBe(need);expect(prisonBedValid(w,spot)).toBe(true);exact(w);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('initial installed patient');
  const previous=structuredClone(first.world),wall=w.structures.find(s=>s.kind==='wall'&&s.x===8&&s.z===9)!;
  expect(damageStructure(w,wall,structureMaxHp(wall),'melee')).toBe(true);reconcilePrisoners(w);
  expect(w.structures).not.toContain(wall);expect(prisonBedValid(w,spot)).toBe(false);
  expect(w.pawns.find(q=>q.id===p.id)).toBe(p);expect(p.health).toBe(health);expect(p.need).toBe(need);expect(p.bedId).toBeNull();exact(w);
  const saved=deserializeWorld(serializeWorld(w));expect(saved.pawns.find(q=>q.id===p.id)).toEqual(p);
  const correct=structuredClone(encoder.encode(w,0,1,checkpoint)),forged=structuredClone(correct);
  const candidate=(forged.world as World).pawns.find(q=>q.id===p.id)!;
  candidate.state='moving';candidate.x=9;candidate.path=[{x:spot.x,z:spot.z}];
  if(candidate.need?.kind==='sleep')candidate.need.phase='travel';
  expect(decoder.adopt(forged).status).toBe('resync');expect(first.world).toEqual(previous);
  const accepted=decoder.adopt(correct);expect(accepted.status).toBe('applied');if(accepted.status==='applied')expect(accepted.world).toEqual(w);
  for(const forge of [
    (bad:World)=>{delete bad.structures.find(s=>s.id===spot.id)!.medical;},
    (bad:World)=>{bad.pawns.find(q=>q.id===p.id)!.z++;},
    (bad:World)=>{bad.pawns.find(q=>q.id===p.id)!.moveCooldown=1;},
  ]){const bad=structuredClone(w);forge(bad);expect(validHumanSleepingSpotTransport(bad)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
});
test('232 surgery uses the same physical patient/head and original medicine reservation',()=>exact(surgerySpotFrame()));
test.each([false,true])('232 rescue phase carry=%s preserves original patient and carrier edge',carry=>exact(rescueSpotFrame(carry).w));
test('spot rescue rejects a slot, another carried edge and a route to the body cell',()=>{
  for(const forge of [
    (f:ReturnType<typeof rescueSpotFrame>)=>{f.p.rescue!.bedSlot=0;},
    (f:ReturnType<typeof rescueSpotFrame>)=>{f.other.motion!.to.z++;},
    (f:ReturnType<typeof rescueSpotFrame>)=>{f.p.path[f.p.path.length-1]={x:f.spot.x,z:f.spot.z+1};},
  ]){const f=rescueSpotFrame(true);forge(f);expect(validHumanSleepingSpotTransport(f.w)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(f.w))).toThrow();}
});
test('actual assigned travel, sleep deadline and room observation survive file and Decoder admission',()=>{
  const w=medicalCamp(2),p=w.pawns[0]!;p.x=15;p.z=16;p.rest=10;p.schedule.fill('sleep');
  for(let z=13;z<=19;z++)for(let x=13;x<=19;x++)if(x===13||x===19||z===13||z===19)fixtureBuilding(w,'wall',x,z);
  w.roofing={constructed:[],build:[],remove:[],cursor:0};for(let z=14;z<=18;z++)for(let x=14;x<=18;x++)w.roofing.constructed.push(z*w.width+x);
  expect(applyCommand(w,{type:'designate',kind:'sleeping-spot',x:16,z:16,orientation:0}).ok).toBe(true);
  const spot=w.structures.find(s=>s.kind==='sleeping-spot')!;
  expect(applyCommand(w,{type:'assign-bed',bedId:spot.id,pawnId:p.id}).ok).toBe(true);
  expect(p.need).toBeNull();const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  for(let i=0;i<100&&!(p.need?.kind==='sleep'&&p.need.phase==='sleep'&&p.need.roomRest);i++)stepWorld(w);
  expect(p.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:spot.id,roomRest:{applied:false}});exact(w);
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(first.status).toBe('applied');
  if(p.need?.kind!=='sleep'||!p.need.roomRest)throw Error('actual sleep did not create observation');
  const deadline=p.need.roomRest.nextAt;stepWorld(w,deadline-w.tick);
  expect(p.need).toMatchObject({kind:'sleep',phase:'sleep',roomRest:{applied:true}});expect(p.roomMemories?.some(m=>m.kind==='bedroom')).toBe(true);exact(w);
  const adopted=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);
  const bad=structuredClone(w);if(bad.pawns[0]!.need?.kind==='sleep')bad.pawns[0]!.need.roomRest!.nextAt=bad.tick;
  expect(validHumanSleepingSpotTransport(bad)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
});
test('231 strict neutral migration changes only schema and preserves a historical real bed',()=>{
  const w=medicalCamp(),bed=fixtureBuilding(w,'bed',16,16);w.pawns[0]!.bedId=bed.id;w.schemaVersion=231 as World['schemaVersion'];
  const before=structuredClone(w);expect(deserializeWorld(JSON.stringify(w))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(w).toEqual(before);
  w.pawns[0]!.bedId=w.nextId+1;expect(()=>deserializeWorld(JSON.stringify(w))).toThrow('Invalid version 231 save');
});
const shapeForges:Array<[string,(f:ReturnType<typeof sleepingSpotFrame>)=>void]>=[
  ['material',f=>Object.assign(f.spot,{material:'wood'})],['quality',f=>Object.assign(f.spot,{quality:'normal'})],
  ['zero damage',f=>Object.assign(f.spot,{damage:0})],['unknown HP',f=>Object.assign(f.spot,{hitPoints:100})],
  ['legacy footprint',f=>{f.spot.footprint='legacy-single';}],['invalid orientation',f=>Object.assign(f.spot,{orientation:4})],
  ['out of bounds body',f=>{f.spot.z=f.w.height-1;}],['false medical',f=>Object.assign(f.spot,{medical:false})],
  ['false prison',f=>Object.assign(f.spot,{prisoner:false})],['animal assignment',f=>Object.assign(f.spot,{animalId:f.p.id})],
  ['duplicate owner',f=>{f.other.bedId=f.spot.id;}],['prospective bed slot',f=>{f.p.bedSlot=0;}],
  ['body instead of head',f=>{if(f.p.need?.kind==='sleep')f.p.need.target.z++;}],
  ['displaced body',f=>{f.p.z++;}],['role mismatch',f=>{f.spot.prisoner=true;}],
  ['duplicate structure identity',f=>{f.w.structures.push({...f.spot,x:23,z:23});}],
  ['overlapping second spot',f=>{f.w.structures.push({...f.spot,id:f.w.nextId++});}],
  ['water under body',f=>{f.w.tiles[(f.spot.z+1)*f.w.width+f.spot.x]!.terrain='water';}],
  ['extra sleep field',f=>Object.assign(f.p.need!,{bedSlot:0})],
];
test.each(shapeForges)('232 file refuses %s without repairing caller state',(name,forge)=>{
  const f=sleepingSpotFrame();forge(f);const before=structuredClone(f.w);
  expect(validHumanSleepingSpotTransport(f.w),name).toBe(false);expect(()=>deserializeWorld(JSON.stringify(f.w))).toThrow();expect(f.w).toEqual(before);
});
test.each([1,230,231])('schema %s refuses future spot even before its historical migration',version=>{
  const f=sleepingSpotFrame();f.w.schemaVersion=version as World['schemaVersion'];expect(()=>deserializeWorld(JSON.stringify(f.w))).toThrow('Future human sleeping spot');
});
test.each(['kind','furniture','deconstruction','flick','repair','fixBreakdown','packed','pile','visitor-archive','pod-archive','group-item'] as const)
('provenance refuses spot hidden in %s before any migration',route=>{
  const w=medicalCamp(),id=w.nextId++,record=w as unknown as Record<string,unknown>;
  const fake={id,kind:'sleeping-spot',x:16,z:16,orientation:0,footprint:'standard'};
  if(route==='packed')record.packed=[{building:fake,owner:{type:'ground',x:24,z:24}}];
  else if(route==='pile')record.piles=[{id,kind:'wood',item:'sleeping-spot',quantity:1,owner:{type:'ground',x:24,z:24}}];
  else if(route==='visitor-archive'||route==='pod-archive')record[route==='visitor-archive'?'visitors':'podRescues']={departed:[{packed:[{building:fake}]}]};
  else if(route==='group-item')record.group={items:[fake]};
  else record.jobs=[route==='kind'?fake:{kind:'deconstruct',[route]:fake}];
  for(const version of [1,231,232]){expect(validHumanSleepingSpotProvenance(w,version)).toBe(false);w.schemaVersion=version as World['schemaVersion'];expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();}
});
test('every actual full Pawn owner refuses a retained local spot reference',()=>{
  for(const route of ['scout','commercial','group','loss','visitor','pod','starting'] as const){
    const f=sleepingSpotFrame(),p=structuredClone(f.other);p.need=null;p.bedId=null;
    const record=f.w as unknown as Record<string,unknown>;
    if(route==='scout')record.scout={pawn:p,items:[]};else if(route==='commercial')record.commercialTrip={pawn:p,items:[]};
    else if(route==='group')record.group={members:[p],items:[]};else if(route==='loss')record.groupLosses=[{pawn:p,items:[]}];
    else if(route==='visitor'||route==='pod')record[route==='visitor'?'visitors':'podRescues']={departed:[{pawn:p,items:[]}]};
    else record.startingArrival={phase:'incoming',pods:[{pawn:p,items:[]}]};
    expect(validHumanSleepingSpotTransport(f.w),route).toBe(true);p.bedId=f.spot.id;expect(validHumanSleepingSpotTransport(f.w),route).toBe(false);
  }
});
test('descriptor, prototype, holes and symbols are rejected without evaluating accessors',()=>{
  const f=sleepingSpotFrame();let reads=0;Object.defineProperty(f.spot,'kind',{enumerable:true,get(){reads++;throw Error('getter');}});
  expect(validHumanSleepingSpotProvenance(f.w,232)).toBe(false);expect(reads).toBe(0);
  const prototype=sleepingSpotFrame();Object.setPrototypeOf(prototype.spot,{kind:'sleeping-spot'});expect(validHumanSleepingSpotTransport(prototype.w)).toBe(false);
  const sparse=sleepingSpotFrame();delete sparse.w.structures[0];expect(validHumanSleepingSpotProvenance(sparse.w,232)).toBe(false);
  const symbol=sleepingSpotFrame();Object.defineProperty(symbol.spot,Symbol('unknown'),{value:1,enumerable:true});expect(validHumanSleepingSpotTransport(symbol.w)).toBe(false);
});
