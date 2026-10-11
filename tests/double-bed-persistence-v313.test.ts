import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { validDoubleBedTransport,validBedSlotPawnShape } from '../src/sim/double-bed-save.ts';
import { bedSlotCell } from '../src/sim/bed-slots.ts';
import { captureHumanOwners } from '../src/sim/human-owners.ts';
import { COMPLEX_FURNITURE_RESEARCH_COST } from '../src/sim/research.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { startTravel } from '../src/sim/movement.ts';
import { syncPatient } from '../src/sim/rescue-state.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { applyCommand } from '../src/sim/engine.ts';
import { SCHEMA_VERSION,type Pawn,type World } from '../src/sim/types.ts';

const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
function exact(w:World){
  const before=structuredClone(w);
  expect(validDoubleBedTransport(w)).toBe(true);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const result=checkpoint(w);expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world).toEqual(w);
  expect(w).toEqual(before);
}
function refused(w:World,file=true){
  const before=structuredClone(w);
  expect(validDoubleBedTransport(w)).toBe(false);expect(checkpoint(w).status).toBe('resync');
  if(file)expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
  expect(w).toEqual(before);
}
function prepared(orientation:0|1|2|3=0){
  const w=medicalCamp(2);w.research={project:null,points:0,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:0}};
  const bed=fixtureBuilding(w,'double-bed',16,16,orientation);Object.assign(bed,{material:'wood' as const,quality:'good' as const,damage:7});
  const [first,second]=w.pawns as [Pawn,Pawn];
  first.bedId=bed.id;first.bedSlot=0;second.bedId=bed.id;second.bedSlot=1;
  return {w,bed,first,second};
}
function sleeping(f:ReturnType<typeof prepared>){
  for(const p of f.w.pawns){const target=bedSlotCell(f.bed,p.bedSlot!)!;p.x=target.x;p.z=target.z;p.need={kind:'sleep',phase:'sleep',bedId:f.bed.id,target};p.state='sleeping';p.path=[];p.moveCooldown=0;delete p.motion;}
  return f;
}
function rescue(carry=false){
  const f=prepared(),{w,bed,first:actor,second:patient}=f;
  actor.bedId=null;delete actor.bedSlot;actor.priorities.doctor=1;actor.orders.active='rescue';actor.state='moving';
  patient.health=createMedicalRecord(w.tick);patient.health.bloodLoss=Math.round(BLOOD_UNIT*.7);reconcilePawnHealth(w,patient);
  expect(patient.state).toBe('downed');actor.rescue={patientId:patient.id,bedId:bed.id,bedSlot:1,phase:carry?'carry':'approach'};
  if(carry){actor.path=[{x:actor.x+2,z:actor.z},{x:actor.x+3,z:actor.z},bedSlotCell(bed,1)!];expect(startTravel(w,actor,{x:actor.x+1,z:actor.z})).toBe(true);syncPatient(w,actor);}
  return f;
}

test.each([0,1,2,3] as const)('224 two durable owners sleep at distinct exact heads in orientation %s',orientation=>{
  const f=sleeping(prepared(orientation));expect(f.first.need?.kind).toBe('sleep');expect(f.second.need?.kind).toBe('sleep');
  if(f.first.need?.kind==='sleep'&&f.second.need?.kind==='sleep')expect(f.first.need.target).not.toEqual(f.second.need.target);exact(f.w);
});
test('224 travel preserves the engaged edge and target of slot1 without inventing another slot or RNG draw',()=>{
  const f=prepared(),target=bedSlotCell(f.bed,1)!;f.second.need={kind:'sleep',phase:'travel',bedId:f.bed.id,target};f.second.state='moving';
  const route:World['pawns'][number]['path']=[];let x=f.second.x,z=f.second.z;
  while(x!==target.x){x+=Math.sign(target.x-x);route.push({x,z});}
  while(z!==target.z){z+=Math.sign(target.z-z);route.push({x,z});}
  const first=route.shift()!;f.second.path=route;
  expect(startTravel(f.w,f.second,first)).toBe(true);
  const edge=structuredClone(f.second.motion),rng=f.w.rng;exact(f.w);expect(f.second.motion).toEqual(edge);expect(f.w.rng).toBe(rng);
});
test('224 packed double retains both assignments while active sleep requires a placed bed',()=>{
  const f=prepared();f.w.structures=[];f.w.packed=[{building:{...f.bed},owner:{type:'ground',x:24,z:24}}];exact(f.w);
  f.first.need={kind:'sleep',phase:'travel',bedId:f.bed.id,target:bedSlotCell(f.bed,0)!};f.first.state='moving';refused(f.w);
});
test('death frees only the double slot, allowing replacement while the other owner retains its exact need and edge',()=>{
  const f=sleeping(prepared()),{w,bed,first,second}=f;
  const replacement={...structuredClone(first),id:w.nextId++,name:'Remplaçant',x:10,z:16,bedId:null,need:null,state:'idle' as const};delete replacement.bedSlot;w.pawns.push(replacement);
  const target=bedSlotCell(bed,1)!;second.x=target.x-3;second.z=target.z;second.need={kind:'sleep',phase:'travel',bedId:bed.id,target};second.state='moving';second.path=[{x:target.x-1,z:target.z},target];
  const otherState=()=>({bedId:second.bedId,bedSlot:second.bedSlot,need:second.need,motion:second.motion,path:second.path,x:second.x,z:second.z,moveCooldown:second.moveCooldown});
  expect(startTravel(w,second,{x:target.x-2,z:target.z})).toBe(true);const other=structuredClone(otherState());
  first.health=createMedicalRecord(w.tick);first.health.bloodLoss=BLOOD_UNIT;first.health.death={tick:w.tick,cause:'blood-loss'};
  reconcilePawnHealth(w,first);expect(first.state).toBe('dead');expect(first.bedId).toBeNull();expect(Object.hasOwn(first,'bedSlot')).toBe(false);
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:replacement.id,slot:0}).ok).toBe(true);expect(otherState()).toEqual(other);exact(w);
  first.bedId=bed.id;first.bedSlot=0;refused(w);
});
test.each([false,true])('224 rescue slot and same-tick patient edge survive exact reload (carry=%s)',carry=>{
  const f=rescue(carry),edge=structuredClone(f.first.motion),blood=f.second.health!.bloodLoss,rng=f.w.rng;exact(f.w);
  expect(f.first.motion).toEqual(edge);expect(f.second.health!.bloodLoss).toBe(blood);expect(f.w.rng).toBe(rng);
});
test('double reservation rejects missing or different patient slots, wrong destination and duplicate ownership',()=>{
  const changes:((f:ReturnType<typeof prepared>)=>void)[]=[
    f=>{delete f.first.bedSlot;},f=>{f.second.bedSlot=0;},f=>{Object.assign(f.second,{bedSlot:2});},
    f=>{f.first.bedId=null;},f=>{if(f.first.need?.kind==='sleep')f.first.need.target=bedSlotCell(f.bed,1)!;},
  ];
  for(const change of changes){const f=sleeping(prepared());change(f);refused(f.w);}
  for(const change of [
    (f:ReturnType<typeof prepared>)=>{delete f.first.rescue!.bedSlot;},
    (f:ReturnType<typeof prepared>)=>{f.first.rescue!.bedSlot=0;},
    (f:ReturnType<typeof prepared>)=>{f.first.path=[bedSlotCell(f.bed,0)!];},
    (f:ReturnType<typeof prepared>)=>{f.first.rescue!.capture=true;},
    (f:ReturnType<typeof prepared>)=>{if(f.second.motion)f.second.motion.to.x++;},
  ]){const f=rescue(true);change(f);refused(f.w);}
});

test('a mobile patient cannot acquire a double rescue claim in file or Decoder admission',()=>{
  const f=rescue();exact(f.w);
  f.second.health!.bloodLoss=0;reconcilePawnHealth(f.w,f.second);f.second.state='idle';
  refused(f.w);
});

test('double rescue shares patient exclusivity with simple beds and requires a free authorized actor',()=>{
  for(const change of [
    (f:ReturnType<typeof prepared>)=>{f.first.faction='outlanders';},
    (f:ReturnType<typeof prepared>)=>{f.first.priorities.doctor=0;f.first.orders.active=null;},
    (f:ReturnType<typeof prepared>)=>{const target=bedSlotCell(f.bed,1)!;Object.assign(f.second,target);f.second.need={kind:'sleep',phase:'sleep',bedId:f.bed.id,target};},
    (f:ReturnType<typeof prepared>)=>{const other=structuredClone(f.first);other.id=f.w.nextId++;other.rescue!.bedId=fixtureBuilding(f.w,'bed',24,24).id;delete other.rescue!.bedSlot;f.w.pawns.push(other);},
  ]){const f=rescue();change(f);refused(f.w);}
});
test('civil roles, standard footprint, material, quality, damage and research are strict in file and Decoder',()=>{
  const changes:((f:ReturnType<typeof prepared>)=>void)[]=[
    f=>{f.bed.footprint='legacy-single' as typeof f.bed.footprint;},f=>Object.assign(f.bed,{medical:false}),f=>Object.assign(f.bed,{prisoner:true}),
    f=>Object.assign(f.bed,{material:'cloth'}),f=>Object.assign(f.bed,{quality:'future'}),f=>Object.assign(f.bed,{damage:1e9}),
    f=>{f.w.research!.complexFurniture={points:0};},f=>{f.bed.x=f.w.width-1;},
  ];
  for(const change of changes){const f=prepared();change(f);refused(f.w);}
  for(const flag of ['medical','prisoner']){const f=prepared();Object.assign(f.bed,{[flag]:undefined});refused(f.w,false);}
});
test('simple, null and dangling historical bed references never admit a prospective slot',()=>{
  for(const bedId of [null,999]){const w=medicalCamp();w.pawns[0]!.bedId=bedId;Object.assign(w.pawns[0]!,{bedSlot:undefined});refused(w,false);}
  const w=medicalCamp(),bed=fixtureBuilding(w,'bed',17,16);w.pawns[0]!.bedId=bed.id;w.pawns[0]!.bedSlot=0;refused(w);
});
test('223 migration validates historical data then changes only the schema number',()=>{
  const w=medicalCamp(2),bed=fixtureBuilding(w,'bed',17,16);w.pawns[0]!.bedId=bed.id;w.schemaVersion=223 as World['schemaVersion'];
  const before=structuredClone(w);expect(deserializeWorld(JSON.stringify(w))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(w).toEqual(before);
});
test('223 refuses double structures, packed buildings and slots before neutral migration',()=>{
  const f=prepared();f.w.schemaVersion=223 as World['schemaVersion'];refused(f.w);
  f.w.structures=[];f.w.packed=[{building:{...f.bed},owner:{type:'ground',x:24,z:24}}];refused(f.w);
  for(const value of [0,undefined]){const w=medicalCamp();w.schemaVersion=223 as World['schemaVersion'];Object.assign(w.pawns[0]!,{bedSlot:value});refused(w,value!==undefined);}
  const r=rescue();r.w.schemaVersion=223 as World['schemaVersion'];r.bed.kind='bed' as typeof r.bed.kind;delete r.second.bedSlot;refused(r.w);
});
test('223 also rejects future double kinds hidden inside transfer and deconstruction descriptors',()=>{
  for(const kind of ['transfer','deconstruction'] as const){
    const w=medicalCamp(),bed=fixtureBuilding(w,'bed',16,16);Object.assign(bed,{material:'wood'});
    if(kind==='transfer'){
      expect(applyCommand(w,{type:'install',structureId:bed.id,x:24,z:24,orientation:0}).ok).toBe(true);w.jobs[0]!.furniture!.kind='double-bed';
    }else{
      expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:16,z:16}).ok).toBe(true);w.jobs[0]!.deconstruction!.kind='double-bed';
    }
    w.schemaVersion=223 as World['schemaVersion'];refused(w);
  }
});
test('the original away scout is checked before projection and may not retain a local slot',()=>{
  const w=medicalCamp(2),p=w.pawns[0]!;p.x=0;p.z=3;addMaterial(w,'food',2,{type:'inventory',pawnId:p.id},'survival-meal');
  const food=w.piles.pop()!;w.pawns=w.pawns.filter(q=>q!==p);refreshStock(w);
  w.scout={phase:'travelling',pawn:p,items:[food],foodPileId:food.id,quantity:2,startedAt:w.tick,departedAt:w.tick,returnAt:w.tick+1500,consumed:0,entry:{x:0,z:3}};
  exact(w);Object.assign(p,{bedSlot:undefined});refused(w,false);
});
test('every genuine Pawn owner rejects future slot presence; identity-only departures are not Pawn owners',()=>{
  const w=medicalCamp(7),[local,scout,commercial,member,loss,visitor,pod]=w.pawns as [Pawn,Pawn,Pawn,Pawn,Pawn,Pawn,Pawn];w.pawns=[local];
  w.scout={phase:'travelling',pawn:scout,items:[],foodPileId:w.nextId++,quantity:2,startedAt:w.tick,departedAt:w.tick,returnAt:w.tick+1500,consumed:0,entry:{x:0,z:3}};
  w.commercialTrip={phase:'outbound',pawn:commercial,items:[],foodPileId:w.nextId++,foodQuantity:2,silverQuantity:0,startedAt:w.tick,departedAt:w.tick,arrivesAt:w.tick+750,entry:{x:0,z:4},consumed:0,silverPaid:0,bought:{medicine:0,component:0}};
  w.group={id:1,phase:'travelling',members:[member],items:[],startedAt:w.tick,departedAt:w.tick,lastPersonalTick:w.tick,entry:{x:0,z:5},tile:0,destination:1,route:[],segment:null,paused:false,stop:null,
    baseline:{food:0,silver:0,medicine:0,component:0,cargo:{cloth:0,'muffalo-wool':0}},ledger:{foodLoaded:0,foodConsumed:0,medicineUsed:0,silverLoaded:0,silverPaid:0,silverEarned:0,cargoLoaded:{cloth:0,'muffalo-wool':0},sold:{cloth:0,'muffalo-wool':0},bought:{medicine:0,component:0}}};
  loss.state='dead';loss.health=createMedicalRecord(w.tick);loss.health.death={tick:w.tick,cause:'blood-loss'};w.groupLosses=[{groupId:1,tile:0,tick:w.tick,pawn:loss,items:[]}];
  const agenda={rng:1,cycle:0,last:w.tick,pending:[]};w.visitors={profile:'cassandra-visitors-v1',adoptedAt:w.tick,rng:1,serial:1,introAt:null,traveler:{...agenda},visitor:{...agenda},groups:[],departed:[{group:1,tick:w.tick,pawn:visitor,items:[]}]};
  w.podRescues={profile:'civilian-pod-rescue-v1',serial:1,incidents:[],departed:[{incidentId:1,tick:w.tick,pawn:pod,items:[]}]};
  const owners=captureHumanOwners(w).pawnOwners;expect(owners).toHaveLength(7);
  for(const version of [223,224])for(const owner of owners){
    Object.assign(owner.pawn!,{bedSlot:undefined});expect(validDoubleBedTransport(w,version)).toBe(false);delete owner.pawn!.bedSlot;
    Object.assign(owner.pawn!,{rescue:{patientId:local.id,bedId:1,phase:'approach',bedSlot:undefined}});
    expect(validDoubleBedTransport(w,version)).toBe(false);delete owner.pawn!.rescue;
  }
  expect(validBedSlotPawnShape(local as unknown as Record<string,unknown>,w,223)).toBe(true);
});
