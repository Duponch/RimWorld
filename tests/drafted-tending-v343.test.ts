import {expect,test} from 'vitest';
import {medicalCamp,controlledInjury} from './scenarios/health';
import {careCamp} from './scenarios/care';
import {rescueCamp} from './scenarios/rescue';
import {fixtureBuilding} from './scenarios/deconstruction';
import {initialRecreation} from '../src/sim/recreation-rules';
import {urgentTreatment} from '../src/sim/care-rules';
import {canStandAt} from '../src/sim/furniture-travel';
import {serviceCell} from '../src/sim/service-reservations';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {reconcilePawnHealth} from '../src/sim/health';
import {BLOOD_UNIT} from '../src/sim/injury-rules';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {SCHEMA_VERSION,type World,type Command} from '../src/sim/types';

// Prepared feature cases; neither these worlds nor their outcomes certify V342 recovery.
function field(count=3):World{
  const w=medicalCamp(count),[d,p]=w.pawns;Object.assign(d!,{x:3,z:5,background:{childhood:'quiet-child',adulthood:'medic'}});
  d!.skills.medicine={level:8,xp:0,dailyXp:0,passion:0};Object.assign(p!,{x:12,z:5});
  controlledInjury(w,p!,'left-arm',5000,'cut');controlledInjury(w,p!,'right-arm',5000,'bruise');
  p!.health!.bloodLoss=BLOOD_UNIT*.61;reconcilePawnHealth(w,p!);
  expect(p!.state).toBe('downed');expect(applyCommand(w,{type:'draft',pawnIds:[d!.id],enabled:true}).ok).toBe(true);valid(w);return w;
}
const command=(w:World):Command=>({type:'order-drafted-tend',pawnId:w.pawns[0]!.id,patientId:w.pawns[1]!.id,queue:false});
const accept=(w:World)=>{expect(applyCommand(w,command(w)).ok).toBe(true);valid(w);};
function valid(w:World){expect(validateWorld(w)).toEqual([]);}
function until(w:World,predicate:()=>boolean,max=500){for(let i=0;i<max&&!predicate();i++)stepWorld(w);expect(predicate()).toBe(true);valid(w);}
function replay(w:World,n=8){const loaded=deserializeWorld(serializeWorld(w));stepWorld(w,n);stepWorld(loaded,n);expect(loaded).toEqual(w);valid(w);}
const raw=(value:object)=>value as unknown as Record<string,unknown>;

test('V343 pacifist at Doctor0 receives a dry field intent, walks cardinally and earns nothing before completion',()=>{
  const w=field(),d=w.pawns[0]!,p=w.pawns[1]!,origin={x:d.x,z:d.z},initial=structuredClone(p.health);
  accept(w);expect(d.tend).toMatchObject({drafted:true,phase:'approach',patientId:p.id,progress:0});expect(d.orders.active).toBe('tend');
  expect(d.draft).toMatchObject({target:null,queue:[]});expect(d.tend?.medicine).toBeUndefined();expect(d.tend?.useMedicine).toBeUndefined();
  stepWorld(w);expect(d.motion).toBeTruthy();expect(p.health?.injuries.map(i=>i.tended)).toEqual(initial!.injuries.map(i=>i.tended));expect(d.skills.medicine.xp).toBe(0);
  until(w,()=>d.tend?.phase==='tend');expect({x:d.x,z:d.z}).not.toEqual(origin);expect(Math.abs(d.x-p.x)+Math.abs(d.z-p.z)).toBe(1);
  expect(d.moveCooldown).toBe(0);expect(d.draft).toBeTruthy();const rng=w.rng;expect(d.skills.medicine.xp).toBe(0);replay(w,1);
  until(w,()=>p.health!.injuries.some(i=>i.tended!==undefined));expect(d.skills.medicine.xp).toBe(87500);expect(w.rng).not.toBe(rng);
  expect(p.health!.injuries.filter(i=>i.tended!==undefined)).toHaveLength(1);expect(p.state).toBe('downed');expect(d.draft).toBeTruthy();replay(w);
});

test('V343 the common dry batch has identical duration, quality, RNG and XP at an ordinary bedside',()=>{
  const a=careCamp(),b=structuredClone(a),da=a.pawns[0]!,db=b.pawns[0]!;
  da.priorities.doctor=0;db.priorities.doctor=0;until(a,()=>a.pawns[1]!.state==='resting');until(b,()=>b.pawns[1]!.state==='resting');expect(a).toEqual(b);
  da.priorities.doctor=1;expect(applyCommand(a,{type:'order-tend',pawnId:da.id,patientId:a.pawns[1]!.id,queue:false}).ok).toBe(true);
  expect(applyCommand(b,{type:'draft',pawnIds:[db.id],enabled:true}).ok).toBe(true);accept(b);
  until(a,()=>da.tend?.phase==='tend');until(b,()=>db.tend?.phase==='tend');expect(da.tend?.duration).toBe(db.tend?.duration);
  until(a,()=>da.skills.medicine.xp>0);until(b,()=>db.skills.medicine.xp>0);
  expect(a.pawns[1]!.health!.injuries.map(i=>i.tended)).toEqual(b.pawns[1]!.health!.injuries.map(i=>i.tended));
  expect(a.rng).toBe(b.rng);expect(da.skills.medicine).toEqual(db.skills.medicine);expect(db.draft).toBeTruthy();
});

const refusals:{name:string;change:(w:World)=>Command|void}[]=[
  {name:'self',change:w=>({...command(w),patientId:w.pawns[0]!.id} as Command)},
  {name:'unknown doctor',change:w=>({...command(w),pawnId:w.nextId+8} as Command)},
  {name:'unknown patient',change:w=>({...command(w),patientId:w.nextId+8} as Command)},
  {name:'queued order',change:w=>({...command(w),queue:true} as Command)},
  {name:'fractional doctor ID',change:w=>({...command(w),pawnId:w.pawns[0]!.id+.5} as Command)},
  {name:'civilian doctor',change:w=>{applyCommand(w,{type:'draft',pawnIds:[w.pawns[0]!.id],enabled:false});}},
  {name:'caring refusal',change:w=>{w.pawns[0]!.background={childhood:'settlement-child',adulthood:'mercenary'};}},
  {name:'None care policy',change:w=>{w.pawns[1]!.medicalCare='none';}},
  {name:'standing patient',change:w=>{w.pawns[1]!.health!.bloodLoss=0;reconcilePawnHealth(w,w.pawns[1]!);}},
  {name:'incapacitated doctor',change:w=>{controlledInjury(w,w.pawns[0]!,'left-leg',30000);controlledInjury(w,w.pawns[0]!,'right-leg',30000);}},
  {name:'doctor without manipulation',change:w=>{controlledInjury(w,w.pawns[0]!,'left-shoulder',30000);controlledInjury(w,w.pawns[0]!,'right-shoulder',30000);}},
  {name:'dead patient',change:w=>{controlledInjury(w,w.pawns[1]!,'heart',15000,'cut');}},
  {name:'no cardinal access',change:w=>{const p=w.pawns[1]!;for(const [dx,dz]of[[0,1],[0,-1],[1,0],[-1,0]])w.tiles[(p.z+dz!)*w.width+p.x+dx!]={terrain:'rock',stone:'granite'};}},
];
test.each(refusals)('V343 refuses $name atomically with an explicit reason',({change})=>{
  const w=field(),c=change(w)??command(w),before=serializeWorld(w),result=applyCommand(w,c);
  expect(result.ok).toBe(false);if(!result.ok)expect(result.reason?.length??0).toBeGreaterThan(0);expect(serializeWorld(w)).toBe(before);
});

// V360 opens these actual Downed targets in237. The earlier233-236
// domain stays strict; validate its literal before neutral migration, and
// compare raw records because serializeWorld only exports the current schema.
test.each(['outlanders','outlaws'] as const)('V343 historical236 still refuses unadmitted %s atomically',faction=>{
  const w=field();w.schemaVersion=236 as World['schemaVersion'];w.pawns[1]!.faction=faction;
  const before=JSON.stringify(w);expect(validateWorld(deserializeWorld(before))).toEqual([]);
  const result=applyCommand(w,command(w));expect(result.ok).toBe(false);
  if(!result.ok)expect(result.reason?.length??0).toBeGreaterThan(0);expect(JSON.stringify(w)).toBe(before);
});

test('V343 exclusive patient claim blocks a second drafted doctor and a rescue; cancellation releases it',()=>{
  const w=field(),[d,p,b]=w.pawns;accept(w);expect(applyCommand(w,{type:'draft',pawnIds:[b!.id],enabled:true}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-drafted-tend',pawnId:b!.id,patientId:p!.id,queue:false}).ok).toBe(false);
  expect(applyCommand(w,{type:'order-rescue',pawnId:b!.id,patientId:p!.id,queue:false}).ok).toBe(false);
  expect(applyCommand(w,{type:'clear-orders',pawnId:d!.id}).ok).toBe(true);expect(d!.tend).toBeUndefined();
  expect(applyCommand(w,{type:'order-drafted-tend',pawnId:b!.id,patientId:p!.id,queue:false}).ok).toBe(true);valid(w);
});

test('V343 a real carried passenger is refused without stealing the rescue relationship',()=>{
  const w=rescueCamp(2),[d,p,b]=w.pawns;d!.priorities.doctor=0;
  expect(applyCommand(w,{type:'order-rescue',pawnId:b!.id,patientId:p!.id,queue:false}).ok).toBe(true);until(w,()=>b!.rescue?.phase==='carry');
  expect(applyCommand(w,{type:'draft',pawnIds:[d!.id],enabled:true}).ok).toBe(true);const before=serializeWorld(w);
  expect(applyCommand(w,{type:'order-drafted-tend',pawnId:d!.id,patientId:p!.id,queue:false}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);expect(b!.rescue?.phase).toBe('carry');
});

const interruptions=['stop','undraft','redraft','move','clear','None care'] as const;
test.each(interruptions)('V343 %s interrupts elapsed treatment without quality or XP',cause=>{
  const w=field(),d=w.pawns[0]!,p=w.pawns[1]!;accept(w);until(w,()=>d.tend?.phase==='tend');stepWorld(w,2);expect(d.tend!.progress).toBeGreaterThan(0);
  const rng=w.rng,missing=structuredClone(p.health!.missing);
  if(cause==='stop')applyCommand(w,{type:'draft-stop',pawnIds:[d.id]});
  if(cause==='undraft')applyCommand(w,{type:'draft',pawnIds:[d.id],enabled:false});
  if(cause==='redraft'){applyCommand(w,{type:'draft',pawnIds:[d.id],enabled:false});applyCommand(w,{type:'draft',pawnIds:[d.id],enabled:true});}
  if(cause==='move')applyCommand(w,{type:'draft-move',pawnIds:[d.id],target:{x:4,z:9},queue:false});
  if(cause==='clear')applyCommand(w,{type:'clear-orders',pawnId:d.id});
  if(cause==='None care')applyCommand(w,{type:'medical-policy',pawnId:p.id,enabled:false});
  stepWorld(w);expect(d.tend).toBeUndefined();expect(d.skills.medicine.xp).toBe(0);expect(w.rng).toBe(rng);expect(p.health!.injuries.every(i=>i.tended===undefined)).toBe(true);
  expect(p.health!.missing).toEqual(missing);valid(w);replay(w,2);
});

test('V343 treating amputations changes tending status without restoring the missing body parts',()=>{
  const w=field(),d=w.pawns[0]!,p=w.pawns[1]!;controlledInjury(w,p,'left-leg',30000);const missing=p.health!.missing.map(m=>m.part);expect(missing.length).toBeGreaterThan(0);
  accept(w);until(w,()=>p.health!.missing.every(m=>m.tended));expect(p.health!.missing.map(m=>m.part)).toEqual(missing);expect(d.draft).toBeTruthy();valid(w);
});

test('V343 an owned service refreshes draft upkeep before an old inactivity boundary',()=>{
  const w=field(),d=w.pawns[0]!;accept(w);d.draft!.lastActiveTick=w.tick-1001;stepWorld(w);expect(d.draft).toBeTruthy();expect(d.tend?.drafted).toBe(true);valid(w);
});

const malformed:{name:string;change:(w:World)=>void}[]=[
  {name:'false marker',change:w=>{raw(w.pawns[0]!.tend!).drafted=false;}},
  {name:'string marker',change:w=>{raw(w.pawns[0]!.tend!).drafted='true';}},
  {name:'missing marker on drafted field service',change:w=>{delete raw(w.pawns[0]!.tend!).drafted;}},
  {name:'pre233 marker',change:w=>{w.schemaVersion=232 as World['schemaVersion'];}},
  {name:'medicine mandate',change:w=>{raw(w.pawns[0]!.tend!).useMedicine=true;}},
  {name:'medicine payload',change:w=>{raw(w.pawns[0]!.tend!).medicine={item:'medicine',sourcePileId:1,carryPileId:1,quantity:1};}},
  {name:'urgent collision',change:w=>{raw(w.pawns[0]!.tend!).urgent=true;}},
  {name:'absent draft owner',change:w=>{delete w.pawns[0]!.draft;}},
  {name:'missing forced doctor mandate',change:w=>{w.pawns[0]!.orders.active=null;}},
  {name:'patient foreign key',change:w=>{w.pawns[0]!.tend!.patientId=w.nextId+1;}},
  {name:'self foreign key',change:w=>{w.pawns[0]!.tend!.patientId=w.pawns[0]!.id;}},
  {name:'future actor upkeep',change:w=>{w.pawns[0]!.draft!.lastActiveTick=w.tick+1;}},
  {name:'progress beyond duration',change:w=>{w.pawns[0]!.tend!.duration=1;w.pawns[0]!.tend!.progress=1;}},
  {name:'diagonal spot',change:w=>{const p=w.pawns[1]!;w.pawns[0]!.tend!.spot={x:p.x+1,z:p.z+1};}},
  {name:'active destination collision',change:w=>{w.pawns[0]!.draft!.target={x:8,z:8};}},
  {name:'two doctors claim one patient',change:w=>{const b=w.pawns[2]!,d=w.pawns[0]!;b.draft=structuredClone(d.draft);b.tend=structuredClone(d.tend);b.orders.active='tend';b.state='moving';}},
];
test.each(malformed)('V343 save rejects $name before accepting any repaired state',({change})=>{
  const w=field();accept(w);change(w);expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
});

test('V343 approach/work retain every service value at the current schema; schema232 migration is neutral',()=>{
  expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(233);const w=field();accept(w);replay(w,1);until(w,()=>w.pawns[0]!.tend?.phase==='tend');replay(w,2);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),result=decoder.adopt(structuredClone(encoder.encode(w,0,1,true)));
  expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);
  const old=careCamp();until(old,()=>old.pawns[0]!.tend?.phase==='tend');old.schemaVersion=232 as World['schemaVersion'];
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
});
test.each(['absent draft owner','duplicate claim','medicine mandate'] as const)('V343 Decoder refuses %s atomically and retries the same valid revision',cause=>{
  const w=field(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,0,true)));expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('Prepared initial snapshot was not adopted.');const frozen=structuredClone(first.world);
  accept(w);const good=structuredClone(encoder.encode(w,0,1)),bad=structuredClone(good),transport=bad.world as World;
  if(cause==='absent draft owner')delete transport.pawns[0]!.draft;
  if(cause==='medicine mandate')raw(transport.pawns[0]!.tend!).useMedicine=true;
  if(cause==='duplicate claim'){const b=transport.pawns[2]!,d=transport.pawns[0]!;b.draft=structuredClone(d.draft);b.tend=structuredClone(d.tend);b.orders.active='tend';b.state='moving';}
  expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(frozen);
  const retry=decoder.adopt(good);expect(retry.status).toBe('applied');if(retry.status==='applied')expect(retry.world).toEqual(w);
});
/** A valid save boundary after urgency appears, before the leisure processor
 * releases its still-owned bedside cell. Never erase the visit to grant care. */
function urgentVisit(blockOthers=false){
  const w=field(),[doctor,patient,visitor]=w.pawns,bed=fixtureBuilding(w,'bed',patient!.x,patient!.z);
  w.structures.find(s=>s.id===bed.id)!.medical=true;
  patient!.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:patient!.x,z:patient!.z}};
  controlledInjury(w,patient!,'neck',6000,'cut');expect(urgentTreatment(patient!)).toBe(true);
  const occupied={x:patient!.x-1,z:patient!.z};Object.assign(visitor!,{x:occupied.x,z:occupied.z,state:'recreating',path:[],motion:null,moveCooldown:0});
  visitor!.schedule.fill('recreation');visitor!.recreation=initialRecreation(10);
  visitor!.recreation.task={activity:'visit-sick',target:occupied,buildingId:null,patientId:patient!.id,phase:'active',elapsed:1};
  if(blockOthers)for(const [dx,dz]of[[1,0],[0,1],[0,-1]]){
    const cell={x:patient!.x+dx!,z:patient!.z+dz!};if(canStandAt(w,cell))w.tiles[cell.z*w.width+cell.x]={terrain:'rock',stone:'granite'};
    expect(canStandAt(w,cell)).toBe(false);
  }
  expect(serviceCell(visitor!)).toEqual(occupied);valid(w);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  return {w,doctor:doctor!,patient:patient!,visitor:visitor!,occupied};
}
function forgeVisitCollision(w:World,occupied:{x:number;z:number}){
  const d=w.pawns[0]!;d.tend!.spot={...occupied};d.tend!.phase='approach';d.tend!.progress=0;delete d.tend!.duration;
  Object.assign(d,{x:occupied.x,z:occupied.z,path:[],motion:null,moveCooldown:0,state:'moving'});
}

test('V343 urgent sick visit retains the cheapest bedside claim; field care takes another cell and RAW/delta reject forged sharing',()=>{
  const {w,doctor,visitor,occupied}=urgentVisit(),baseline=structuredClone(w),visit=structuredClone(visitor.recreation.task);
  const encoder=new SnapshotEncoder(),deltaDecoder=new SnapshotDecoder();
  const first=deltaDecoder.adopt(structuredClone(encoder.encode(w,0,0,true)));expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('The valid pre-command visit was not adopted.');const frozen=structuredClone(first.world);
  accept(w);expect(doctor.tend!.spot).not.toEqual(occupied);expect(visitor.recreation.task).toEqual(visit);expect(serviceCell(visitor)).toEqual(occupied);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const delta=structuredClone(encoder.encode(w,0,0)),rawEncoder=new SnapshotEncoder(),rawDecoder=new SnapshotDecoder();
  const previous=rawDecoder.adopt(structuredClone(rawEncoder.encode(baseline,0,0,true)));
  const rawPacket=structuredClone(rawEncoder.encode(w,0,0,true));expect(delta.kind).toBe('delta');expect(rawPacket.kind).toBe('checkpoint');
  expect(previous.status).toBe('applied');if(previous.status!=='applied')throw Error('The valid RAW baseline was not adopted.');
  for(const [decoder,good]of [[deltaDecoder,delta],[rawDecoder,rawPacket]] as const){
    const forged=structuredClone(good);forgeVisitCollision(forged.world as World,occupied);
    expect(decoder.adopt(forged).status).toBe('resync');expect(first.world).toEqual(frozen);expect(previous.world).toEqual(baseline);
    const retry=decoder.adopt(good);expect(retry.status).toBe('applied');if(retry.status==='applied')expect(retry.world).toEqual(w);
  }
  const bad=structuredClone(w);forgeVisitCollision(bad,occupied);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
});

test('V343 sole bedside visit blocks a field command atomically until one actual tick releases its durable claim',()=>{
  const {w,doctor,visitor,occupied}=urgentVisit(true),before=serializeWorld(w),visit=structuredClone(visitor.recreation.task);
  const refusal=applyCommand(w,command(w));expect(refusal.ok).toBe(false);if(!refusal.ok)expect(refusal.reason?.length??0).toBeGreaterThan(0);
  expect(serializeWorld(w)).toBe(before);expect(visitor.recreation.task).toEqual(visit);expect(doctor.tend).toBeUndefined();
  const loaded=deserializeWorld(before);stepWorld(w);stepWorld(loaded);expect(loaded).toEqual(w);valid(w);
  expect(visitor.recreation.task?.activity).not.toBe('visit-sick');expect(serviceCell(visitor)).not.toEqual(occupied);
  expect(doctor.skills.medicine.xp).toBe(0);expect(w.pawns[1]!.health!.injuries.every(i=>i.tended===undefined)).toBe(true);
  accept(w);expect(doctor.tend!.spot).toEqual(occupied);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const result=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,0,true)));
  expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);
});