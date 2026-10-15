import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {deserializeWorld,serializeWorld} from '../src/sim/serialization';
import {SCHEMA_VERSION,type Pawn,type World} from '../src/sim/types';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {hasVisitorMedicalGuestMarker,validVisitorShape} from '../src/sim/visitor-save';
import {validVisitorMedicalTransport} from '../src/sim/visitor-medical-save';
import {validDraftedRescueTransport} from '../src/sim/rescue-save';
import {validateAffiliations} from '../src/sim/affiliation-save';
import {applyMeleeStun} from '../src/sim/stun';
import {travelPieces} from '../src/sim/travel-timing';
import {visitorCareScene,untilVisitorCare,validVisitorCare,personalVisitorPiles} from './scenarios/visitor-care-v360';

// Prepared clinical boundaries, never a claim about the V359 natural campaign.
const raw=(value:unknown)=>value as Record<string,unknown>;
const rescue=(w:World,doctor:Pawn,patient:Pawn)=>applyCommand(w,{type:'order-rescue',pawnId:doctor.id,patientId:patient.id,queue:false});
function pickup(drafted=false){
  const s=visitorCareScene();s.doctor.priorities.doctor=0;
  if(drafted)expect(applyCommand(s.w,{type:'draft',pawnIds:[s.doctor.id],enabled:true}).ok).toBe(true);
  expect(rescue(s.w,s.doctor,s.patient).ok).toBe(true);
  untilVisitorCare(s.w,()=>s.doctor.rescue?.phase==='carry'&&(s.doctor.motion?.end??0)>s.w.tick,120);
  return s;
}
function exact(w:World){validVisitorCare(w);expect(deserializeWorld(serializeWorld(w))).toEqual(w);}
function adopted(decoder:SnapshotDecoder,packet:SnapshotMessage){
  const result=decoder.adopt(structuredClone(packet));expect(result.status,result.status==='resync'?result.reason:'').toBe('applied');
  if(result.status!=='applied')throw Error('Legal prepared packet rejected');return result.world;
}
const visitor=(packet:SnapshotMessage,id:number)=>packet.world.pawns.find(p=>p.id===id)!;

test('V360 schema236 is validated before neutral237 migration, with no medical guest or other state invented',()=>{
  const {w,patient}=visitorCareScene();exact(w);
  const legacy={...structuredClone(w),schemaVersion:236},before=structuredClone(legacy);
  expect(deserializeWorld(JSON.stringify(legacy))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(legacy).toEqual(before);
  const pending=structuredClone(w);expect(rescue(pending,pending.pawns.find(p=>p.id===w.pawns[0]!.id)!,pending.pawns.find(p=>p.id===patient.id)!).ok).toBe(true);
  pending.schemaVersion=236 as World['schemaVersion'];expect(()=>deserializeWorld(JSON.stringify(pending))).toThrow(/version236/);
  for(const stamp of [null,false,'admitted',w.tick]){
    const bad=structuredClone(legacy),p=bad.pawns.find(p=>p.id===patient.id)!;raw(p.visitor).medicalGuestAt=stamp;
    expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/version236/);
  }
});

test.each([false,true])('V360 approach then actual pickup/deposit survives RAW, full and delta transport drafted=%s',drafted=>{
  const s=visitorCareScene(),{w,doctor,patient,bed}=s,personal=personalVisitorPiles(w,patient.id);
  doctor.priorities.doctor=0;
  if(drafted)expect(applyCommand(w,{type:'draft',pawnIds:[doctor.id],enabled:true}).ok).toBe(true);
  expect(rescue(w,doctor,patient).ok).toBe(true);expect(patient.visitor!.medicalGuestAt).toBeUndefined();expect(patient.bedId).toBeNull();exact(w);
  const decoder=new SnapshotDecoder(),encoder=new SnapshotEncoder();const first=adopted(decoder,encoder.encode(w,0,1,true));expect(first).toEqual(w);
  untilVisitorCare(w,()=>doctor.rescue?.phase==='carry'&&(doctor.motion?.end??0)>w.tick,120);const at=patient.visitor!.medicalGuestAt;
  expect(at).toBe(w.tick);expect(patient.motion).toEqual(doctor.motion);exact(w);expect(adopted(decoder,encoder.encode(w,0,1))).toEqual(w);
  untilVisitorCare(w,()=>!doctor.rescue&&patient.need?.kind==='sleep'&&patient.need.bedId===bed.id,120);
  expect(patient.visitor!.medicalGuestAt).toBe(at);expect(personalVisitorPiles(w,patient.id)).toEqual(personal);exact(w);
  expect(adopted(decoder,encoder.encode(w,0,1,true))).toEqual(w);expect(!!doctor.draft).toBe(drafted);
});

test('V360 affiliation accepts a real medical guest ordinary bed without opening colony work or old-schema permission',()=>{
  const {w,doctor,patient,bed}=visitorCareScene();doctor.priorities.doctor=0;
  expect(applyCommand(w,{type:'medical-bed',bedId:bed.id,enabled:false}).ok).toBe(true);
  expect(rescue(w,doctor,patient).ok).toBe(true);expect(patient.bedId).toBeNull();expect(patient.visitor!.medicalGuestAt).toBeUndefined();
  untilVisitorCare(w,()=>doctor.rescue?.phase==='carry',120);expect(patient.bedId).toBe(bed.id);expect(validateAffiliations(w)).toEqual([]);exact(w);
  const unadmitted=structuredClone(w);delete unadmitted.pawns.find(p=>p.id===patient.id)!.visitor!.medicalGuestAt;
  expect(validateAffiliations(unadmitted)).toContain('Non-colonist owns a colony activity.');
  const old=structuredClone(w);old.schemaVersion=236 as World['schemaVersion'];expect(validateAffiliations(old)).toContain('Non-colonist owns a colony activity.');
  const worker=structuredClone(w);worker.pawns.find(p=>p.id===patient.id)!.jobId=1;
  expect(validateAffiliations(worker)).toContain('Non-colonist owns a colony activity.');
});

const malformed:{name:string;change:(p:Pawn,w:World)=>void}[]=[
  {name:'null',change:p=>{raw(p.visitor).medicalGuestAt=null;}},
  {name:'false',change:p=>{raw(p.visitor).medicalGuestAt=false;}},
  {name:'own undefined',change:p=>{raw(p.visitor).medicalGuestAt=undefined;}},
  {name:'string',change:p=>{raw(p.visitor).medicalGuestAt='15000';}},
  {name:'non finite',change:p=>{raw(p.visitor).medicalGuestAt=Infinity;}},
  {name:'fractional',change:p=>{p.visitor!.medicalGuestAt!+=.5;}},
  {name:'future',change:(p,w)=>{p.visitor!.medicalGuestAt=w.tick+1;}},
  {name:'before actual group',change:(p,w)=>{p.visitor!.medicalGuestAt=w.visitors!.groups.find(g=>g.id===p.visitor!.group)!.startedAt-1;}},
  {name:'lost membership',change:(p,w)=>{const g=w.visitors!.groups.find(g=>g.id===p.visitor!.group)!;g.members=g.members.filter(id=>id!==p.id);}},
  {name:'colon conversion',change:p=>{p.faction='colony';}},
  {name:'hostile faction conversion',change:p=>{p.faction='outlaws';}},
  {name:'pod collision',change:p=>{p.podRescue={incidentId:1};}},
  {name:'prisoner collision',change:p=>{raw(p).prisoner={};}},
  {name:'personal food confiscation',change:(p,w)=>{const pile=w.piles.find(q=>p.visitor!.personalFoodIds.includes(q.id))!;pile.owner={type:'ground',x:p.x,z:p.z};}},
];
test.each(malformed)('V360 malformed $name guest is rejected atomically by RAW/full/delta',({change})=>{
  const s=pickup(),{w,patient}=s;
  for(const checkpoint of [true,false]){
    const decoder=new SnapshotDecoder(),encoder=new SnapshotEncoder(),first=adopted(decoder,encoder.encode(w,0,1,true)),before=structuredClone(first);
    const good=structuredClone(encoder.encode(w,0,1,checkpoint)),bad=structuredClone(good),badWorld={...structuredClone(w),...bad.world} as World;
    change(visitor(bad,patient.id),badWorld);
    // Delta.dynamic excludes piles: publish the actual mutated custody, too.
    if(bad.kind==='delta')bad.piles={removed:[],upserted:structuredClone(badWorld.piles)};
    expect(validVisitorMedicalTransport(badWorld)).toBe(false);
    expect(decoder.adopt(bad).status).toBe('resync');expect(first).toEqual(before);expect(adopted(decoder,good)).toEqual(w);
    expect(()=>deserializeWorld(JSON.stringify(badWorld))).toThrow();
  }
});

test('V360 stun acquired during mobilized carry pauses and reloads the same mandate/edge, then resumes',()=>{
  const {w,doctor,patient,bed}=pickup(true),at=patient.visitor!.medicalGuestAt,personal=personalVisitorPiles(w,patient.id);
  const decoder=new SnapshotDecoder(),encoder=new SnapshotEncoder();expect(adopted(decoder,encoder.encode(w,0,1,true))).toEqual(w);
  const before=structuredClone(doctor.motion!),start=w.tick,core=start*10;
  applyMeleeStun(w,doctor,core);
  expect(doctor.stun).toEqual({sinceCore:core,untilCore:core+45});
  expect(Math.abs(doctor.motion!.end-(before.end+4.5))).toBeLessThanOrEqual(4*Number.EPSILON*Math.max(1,doctor.motion!.end));
  expect(doctor.motion!.from).toEqual(before.from);expect(doctor.motion!.to).toEqual(before.to);expect(patient.motion).toEqual(doctor.motion);
  const halted=travelPieces(doctor.motion!).find(piece=>piece.start===start&&piece.end===start+4.5)!;
  expect(halted).toBeDefined();expect(halted.fromFraction).toBe(halted.toFraction);
  exact(w);expect(adopted(decoder,encoder.encode(w,0,1))).toEqual(w);
  const refusalBefore=serializeWorld(w);expect(rescue(w,doctor,patient).ok).toBe(false);expect(serializeWorld(w)).toBe(refusalBefore);
  const restored=deserializeWorld(serializeWorld(w)),rDoctor=restored.pawns.find(p=>p.id===doctor.id)!,rPatient=restored.pawns.find(p=>p.id===patient.id)!;
  for(let n=0;n<4;n++){
    stepWorld(w);stepWorld(restored);expect(restored).toEqual(w);
    expect(doctor.stun!.untilCore).toBe(core+45);expect(doctor.rescue?.phase).toBe('carry');expect(doctor.draft).toBeDefined();
    expect(doctor.motion).toEqual(patient.motion);expect(doctor.motion!.from).toEqual(before.from);expect(doctor.motion!.to).toEqual(before.to);
    exact(w);expect(adopted(decoder,encoder.encode(w,0,1))).toEqual(w);
  }
  stepWorld(w);stepWorld(restored);expect(restored).toEqual(w);expect(doctor.stun).toBeUndefined();expect(doctor.draft).toBeDefined();exact(w);
  for(let n=0;n<120&&doctor.rescue;n++){stepWorld(w);stepWorld(restored);expect(restored).toEqual(w);}
  expect(doctor.rescue).toBeUndefined();expect(rDoctor.rescue).toBeUndefined();expect(patient.need?.kind).toBe('sleep');
  expect(patient.need?.kind==='sleep'&&patient.need.bedId).toBe(bed.id);expect(patient.visitor!.medicalGuestAt).toBe(at);expect(rPatient.visitor!.medicalGuestAt).toBe(at);
  expect(personalVisitorPiles(w,patient.id)).toEqual(personal);expect(doctor.draft).toBeDefined();exact(w);
  expect(adopted(decoder,encoder.encode(w,0,1,true))).toEqual(w);
});

test('V360 an inherited/accessor admission is prospective and is never read as an authorized marker',()=>{
  const {w,patient}=pickup();let reads=0;
  const inherited=Object.assign(Object.create({medicalGuestAt:w.tick}),patient.visitor);delete inherited.medicalGuestAt;
  const p={...patient,visitor:inherited};expect(hasVisitorMedicalGuestMarker(p)).toBe(true);
  expect(validVisitorShape(raw(p),w.schemaVersion,w)).toBe(false);
  const getter={...patient.visitor};Object.defineProperty(getter,'medicalGuestAt',{enumerable:true,get(){reads++;return w.tick;}});
  expect(validVisitorShape(raw({...patient,visitor:getter}),w.schemaVersion,w)).toBe(false);expect(reads).toBe(0);
});

test.each([true,false])('V360 same-epoch checkpoint=%s cannot rewrite an observed pickup stamp; a branch load can',checkpoint=>{
  const {w,patient}=pickup(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=adopted(decoder,encoder.encode(w,0,1,true)),before=structuredClone(first);
  const good=structuredClone(encoder.encode(w,0,1,checkpoint)),bad=structuredClone(good);visitor(bad,patient.id).visitor!.medicalGuestAt!--;
  const changed={...structuredClone(w),...bad.world} as World;exact(changed); // RAW cannot know a previously observed pickup.
  expect(decoder.adopt(bad).status).toBe('resync');expect(first).toEqual(before);expect(adopted(decoder,good)).toEqual(w);
  const loaded=structuredClone(new SnapshotEncoder().encode(changed,0,1,true));loaded.epoch=9;expect(adopted(decoder,loaded)).toEqual(changed);
});

test.each(['target','queue','order','capture','arrest','release','old schema'] as const)('V360 mobilized Rescue rejects conflicting %s authority before adoption',kind=>{
  const {w,doctor}=pickup(true),bad=structuredClone(w),d=bad.pawns.find(p=>p.id===doctor.id)!;
  if(kind==='target')d.draft!.target={x:20,z:20};
  if(kind==='queue')d.draft!.queue=[{x:20,z:20}];
  if(kind==='order')d.orders.active=null;
  if(kind==='capture')d.rescue!.capture=true;
  if(kind==='arrest')d.rescue!.arrest=true;
  if(kind==='release')d.rescue!.release={drop:{x:0,z:0},exit:{x:0,z:0}};
  if(kind==='old schema')bad.schemaVersion=236 as World['schemaVersion'];
  expect(validDraftedRescueTransport(bad)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  const decoder=new SnapshotDecoder(),encoder=new SnapshotEncoder(),first=adopted(decoder,encoder.encode(w,0,1,true)),before=structuredClone(first);
  const packet=structuredClone(encoder.encode(w,0,1));
  Object.assign(packet.world,{schemaVersion:bad.schemaVersion,pawns:bad.pawns});
  expect(decoder.adopt(packet).status).toBe('resync');expect(first).toEqual(before);
});

test('V360 admitted guest Capture/Arrest stay outside the narrower current product domain, atomically',()=>{
  const {w,doctor,patient}=pickup();expect(applyCommand(w,{type:'clear-orders',pawnId:doctor.id}).ok).toBe(true);
  for(const type of ['order-capture','order-arrest'] as const){const before=serializeWorld(w);expect(applyCommand(w,{type,pawnId:doctor.id,patientId:patient.id,queue:false}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
  expect(hasVisitorMedicalGuestMarker(patient)).toBe(true);exact(w);
});

test('V360 a real healed guest departure freezes its changed care ceiling and possessions at the departure clock',()=>{
  const s=pickup(),{w,doctor,patient,bed}=s,personal=personalVisitorPiles(w,patient.id),at=patient.visitor!.medicalGuestAt;
  expect(applyCommand(w,{type:'medical-care',pawnId:patient.id,care:'best'}).ok).toBe(true);exact(w);
  untilVisitorCare(w,()=>!doctor.rescue&&patient.need?.kind==='sleep'&&patient.need.bedId===bed.id,120);
  expect(applyCommand(w,{type:'priority',pawnId:doctor.id,work:'doctor',value:1}).ok).toBe(true);
  untilVisitorCare(w,()=>!w.pawns.some(p=>p.id===patient.id),1600);
  const archive=w.visitors!.departed.find(d=>d.pawn.id===patient.id)!;
  expect(archive.pawn.visitor!.medicalGuestAt).toBe(at);expect(archive.pawn.medicalCare).toBe('best');expect(archive.pawn.bedId).toBeNull();
  expect(personalVisitorPiles({...w,piles:archive.items},patient.id)).toEqual(personal);exact(w);
  const decoder=new SnapshotDecoder(),encoder=new SnapshotEncoder();expect(adopted(decoder,encoder.encode(w,0,1,true))).toEqual(w);
  const frozen=structuredClone(archive);stepWorld(w,3);expect(w.visitors!.departed.find(d=>d.pawn.id===patient.id)).toEqual(frozen);exact(w);
  const bad=structuredClone(w),d=bad.visitors!.departed.find(d=>d.pawn.id===patient.id)!;d.pawn.visitor!.medicalGuestAt=d.tick+1;
  const next=structuredClone(encoder.encode(w,0,1,true)),badPacket=structuredClone(next);badPacket.world=bad;
  expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();expect(decoder.adopt(badPacket).status).toBe('resync');expect(adopted(decoder,next)).toEqual(w);
  for(const care of ['none','dry','herbal','industrial','best'] as const){const copy=structuredClone(w),p=copy.visitors!.departed.find(d=>d.pawn.id===patient.id)!.pawn;p.medicalCare=care;exact(copy);}
  for(const disabled of [false,true]){const copy=structuredClone(w),p=copy.visitors!.departed.find(d=>d.pawn.id===patient.id)!.pawn;delete p.medicalCare;if(disabled)p.careDisabled=true;exact(copy);}
  const ordinary=structuredClone(w),p=ordinary.visitors!.departed.find(d=>d.pawn.id===patient.id)!.pawn;delete p.visitor!.medicalGuestAt;
  expect(()=>deserializeWorld(JSON.stringify(ordinary))).toThrow(); // Unadmitted and historical visitors retain their industrial ceiling.
});
