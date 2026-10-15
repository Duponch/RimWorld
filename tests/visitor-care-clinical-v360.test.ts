import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {serializeWorld,deserializeWorld} from '../src/sim/serialization';
import {wantsRescue} from '../src/sim/rescue';
import {visitorGroupDanger} from '../src/sim/visitors';
import {isAdmittedGuest,isAdmittedVisitorGuest,isCarePatient,isColonist} from '../src/sim/affiliation';
import {medicalRestNeeded,treatmentTarget} from '../src/sim/care-rules';
import {medicalStatus} from '../src/sim/injury-state';
import {reconcilePawnHealth} from '../src/sim/health';
import {BLOOD_UNIT} from '../src/sim/injury-rules';
import {resolveSelectedPodRescue} from '../src/sim/pod-rescue';
import {fixtureBuilding} from './scenarios/deconstruction';
import {medicalCamp,controlledInjury} from './scenarios/health';
import {visitorCareScene,untilVisitorCare,validVisitorCare,personalVisitorPiles} from './scenarios/visitor-care-v360';
import type {World,Pawn,Command} from '../src/sim/types';

// Prepared regression boundaries. No outcome here certifies the V359 visitors.
const rescue=(w:World,d:Pawn,p:Pawn)=>applyCommand(w,{type:'order-rescue',pawnId:d.id,patientId:p.id,queue:false});
const field=(w:World,d:Pawn,p:Pawn)=>applyCommand(w,{type:'order-drafted-tend',pawnId:d.id,patientId:p.id,queue:false});
function replay(w:World,n=4){validVisitorCare(w);const copy=deserializeWorld(serializeWorld(w));stepWorld(w,n);stepWorld(copy,n);expect(copy).toEqual(w);validVisitorCare(w);}
function atPickup(scene:ReturnType<typeof visitorCareScene>){const {w,doctor,patient}=scene;expect(rescue(w,doctor,patient).ok).toBe(true);untilVisitorCare(w,()=>doctor.rescue?.phase==='carry'&&(doctor.motion?.end??0)>w.tick,120);}

 test('V360 neutral visitors remain outside automatic rescue and colonial care before an explicit pickup',()=>{
 const {w,doctor,otherDoctor,patient}=visitorCareScene();validVisitorCare(w);const personal=personalVisitorPiles(w,patient.id);
 expect(wantsRescue(patient)).toBe(false);expect(wantsRescue(patient,true)).toBe(true);expect(isCarePatient(patient)).toBe(false);
 stepWorld(w,25);expect(doctor.rescue).toBeUndefined();expect(otherDoctor.rescue).toBeUndefined();expect(patient.visitor?.medicalGuestAt).toBeUndefined();expect(isCarePatient(patient)).toBe(false);expect(personalVisitorPiles(w,patient.id)).toEqual(personal);validVisitorCare(w);
 });

 test('V360 an accepted order creates only approach, not guest status, faction changes, confiscation or treatment',()=>{
 const {w,doctor,patient}=visitorCareScene(),before=structuredClone(patient),personal=personalVisitorPiles(w,patient.id),rng=w.rng,nextId=w.nextId;
 doctor.priorities.doctor=0;expect(rescue(w,doctor,patient).ok).toBe(true);expect(doctor.rescue).toMatchObject({phase:'approach',patientId:patient.id});expect(patient).toEqual(before);
 expect(patient.visitor?.medicalGuestAt).toBeUndefined();expect(isAdmittedGuest(patient)).toBe(false);expect(personalVisitorPiles(w,patient.id)).toEqual(personal);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(doctor.skills.medicine.xp).toBe(0);validVisitorCare(w);
 });

 test('V360 ordinary-bed ownership is acquired at actual pickup, never at order-only admission',()=>{
 const s=visitorCareScene(),{w,doctor,patient,bed}=s;expect(applyCommand(w,{type:'medical-bed',bedId:bed.id,enabled:false}).ok).toBe(true);expect(patient.bedId).toBeNull();expect(rescue(w,doctor,patient).ok).toBe(true);expect(patient.bedId).toBeNull();expect(patient.visitor!.medicalGuestAt).toBeUndefined();untilVisitorCare(w,()=>doctor.rescue?.phase==='carry',120);expect(patient.bedId).toBe(bed.id);expect(patient.visitor!.medicalGuestAt).toBe(w.tick);validVisitorCare(w);
 });
 test('V360 a real pickup admits the same neutral visitor; its owned items and physical carried edge survive exact replay',()=>{
 const scene=visitorCareScene(),{w,doctor,patient}=scene,personal=personalVisitorPiles(w,patient.id),role=patient.visitor!.role;
 atPickup(scene);const admission=patient.visitor!.medicalGuestAt;expect(admission).toBe(w.tick);expect(patient.visitor!.goal).toBeNull();expect(patient.visitor!.role).toBe(role);expect(patient.visitor!.phase).toBe(w.visitors!.groups.find(g=>g.id===patient.visitor!.group)!.phase);
 expect(w.pawns.find(p=>p.id===patient.id)).toBe(patient);expect(patient.faction).toBe('outlanders');expect(patient.prisoner).toBeUndefined();expect(patient.podRescue).toBeUndefined();expect(isAdmittedVisitorGuest(patient)).toBe(true);expect(isColonist(patient)).toBe(false);
 expect(personalVisitorPiles(w,patient.id)).toEqual(personal);expect(patient.motion).toEqual(doctor.motion);expect(patient.moveCooldown).toBe(doctor.moveCooldown);expect({x:patient.x,z:patient.z}).toEqual({x:doctor.x,z:doctor.z});replay(w);expect(patient.visitor!.medicalGuestAt).toBe(admission);expect(personalVisitorPiles(w,patient.id)).toEqual(personal);
 });

 const rejected=[
 {name:'queued request',change:(_s:ReturnType<typeof visitorCareScene>)=>true},
  {name:'no bed',change:(s:ReturnType<typeof visitorCareScene>)=>{s.w.structures=[];}},
 {name:'dead patient',change:(s:ReturnType<typeof visitorCareScene>)=>{controlledInjury(s.w,s.patient,'heart',15000,'cut');}},
 {name:'moving healthy patient',change:(s:ReturnType<typeof visitorCareScene>)=>{s.patient.health!.bloodLoss=0;reconcilePawnHealth(s.w,s.patient);}},
 {name:'occupied medical bed',change:(s:ReturnType<typeof visitorCareScene>)=>{controlledInjury(s.w,s.otherDoctor,'left-arm',1000,'bruise');s.otherDoctor.health!.bloodLoss=BLOOD_UNIT*.61;reconcilePawnHealth(s.w,s.otherDoctor);s.otherDoctor.x=s.bed.x;s.otherDoctor.z=s.bed.z;s.otherDoctor.need={kind:'sleep',phase:'sleep',bedId:s.bed.id,target:{x:s.bed.x,z:s.bed.z}};expect(s.otherDoctor.state).toBe('downed');}},
 {name:'sealed patient cell',change:(s:ReturnType<typeof visitorCareScene>)=>{for(const [dx,dz]of[[0,1],[1,0],[0,-1],[-1,0]])s.w.tiles[(s.patient.z+dz!)*s.w.width+s.patient.x+dx!]={terrain:'rock',stone:'granite'};}},
 ] as const;
 test.each(rejected)('V360 rejected $name has no invitation, drops, RNG, IDs or other command side effects',({change})=>{
 const s=visitorCareScene(),queue=change(s)===true,before=serializeWorld(s.w);const result=applyCommand(s.w,{type:'order-rescue',pawnId:s.doctor.id,patientId:s.patient.id,queue});expect(result.ok).toBe(false);expect(serializeWorld(s.w)).toBe(before);expect(s.patient.visitor!.medicalGuestAt).toBeUndefined();
 });

 test('V360 cancelling approach retains an unadmitted visitor and its inventory',()=>{
 const {w,doctor,patient}=visitorCareScene(),personal=personalVisitorPiles(w,patient.id);expect(rescue(w,doctor,patient).ok).toBe(true);expect(applyCommand(w,{type:'clear-orders',pawnId:doctor.id}).ok).toBe(true);expect(doctor.rescue).toBeUndefined();expect(patient.visitor!.medicalGuestAt).toBeUndefined();stepWorld(w,20);expect(doctor.rescue).toBeUndefined();expect(personalVisitorPiles(w,patient.id)).toEqual(personal);validVisitorCare(w);
 });

 test('V360 an interrupted admitted visitor keeps admission and custody but still is not automatically rescued',()=>{
 const s=visitorCareScene(),{w,doctor,patient}=s;atPickup(s);const at=patient.visitor!.medicalGuestAt,position={x:patient.x,z:patient.z},motion=structuredClone(patient.motion),personal=personalVisitorPiles(w,patient.id);
 expect(applyCommand(w,{type:'clear-orders',pawnId:doctor.id}).ok).toBe(true);expect(doctor.rescue).toBeUndefined();expect({x:patient.x,z:patient.z}).toEqual(position);expect(patient.motion).toEqual(motion);expect(patient.visitor!.medicalGuestAt).toBe(at);expect(wantsRescue(patient)).toBe(false);expect(isCarePatient(patient)).toBe(true);
 stepWorld(w,25);expect(doctor.rescue).toBeUndefined();expect(patient.state).toBe('downed');expect(personalVisitorPiles(w,patient.id)).toEqual(personal);validVisitorCare(w);replay(w);
 });

 test('V360 actual deposit enables normal tending from colony medicine, clinical rest, then unchanged visitor departure',()=>{
 const s=visitorCareScene(),{w,doctor,patient,bed,personalMedicineId,colonyMedicineId}=s;
 // Declared before any order: a second nonbleeding bruise survives the paid
 // approach/carry/tend; the source is several cells from every bedside spot.
 // No health, time, medicine or needs are rewritten after actions begin.
 controlledInjury(w,patient,'right-arm',3000,'bruise');
 const colonySource=w.piles.find(p=>p.id===colonyMedicineId)!;colonySource.owner={type:'ground',x:8,z:11};validVisitorCare(w);
 const personal=personalVisitorPiles(w,patient.id),medicine=structuredClone(w.piles.find(p=>p.id===personalMedicineId)),group=patient.visitor!.group,role=patient.visitor!.role;
 expect(rescue(w,doctor,patient).ok).toBe(true);untilVisitorCare(w,()=>patient.need?.kind==='sleep'&&patient.need.bedId===bed.id&&doctor.rescue===undefined,160);expect(isCarePatient(patient)).toBe(true);const admission=patient.visitor!.medicalGuestAt;expect(admission).toBeLessThan(w.tick);
 untilVisitorCare(w,()=>doctor.tend?.phase==='pickup'&&doctor.tend.medicine!==undefined,100);expect(doctor.tend!.medicine!.sourcePileId).toBe(colonyMedicineId);expect(colonySource).toMatchObject({quantity:3,owner:{type:'ground',x:8,z:11}});untilVisitorCare(w,()=>doctor.tend?.medicine?.carryPileId!==null&&doctor.tend?.medicine?.carryPileId!==undefined,40);const cargo=doctor.tend!.medicine!,carry=w.piles.find(p=>p.id===cargo.carryPileId)!;expect(carry).toMatchObject({item:'medicine',quantity:1,owner:{type:'pawn',pawnId:doctor.id}});expect(carry.id).not.toBe(colonyMedicineId);expect(colonySource.quantity).toBe(2);expect(w.piles.find(p=>p.id===personalMedicineId)).toEqual(medicine);replay(w);
 untilVisitorCare(w,()=>doctor.skills.medicine.xp>0,120);expect(w.piles.some(p=>p.id===carry.id)).toBe(false);expect(patient.health!.injuries.some(i=>i.tended!==undefined)).toBe(true);expect(w.piles.filter(p=>p.item==='medicine'&&p.id!==personalMedicineId).reduce((n,p)=>n+p.quantity,0)).toBe(2);expect(patient.faction).toBe('outlanders');expect(patient.prisoner).toBeUndefined();expect(patient.podRescue).toBeUndefined();
 untilVisitorCare(w,()=>patient.state==='resting'&&medicalRestNeeded(patient),350);expect(patient.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:bed.id,medical:'bedrest'});expect(w.visitors!.departed.some(d=>d.pawn.id===patient.id)).toBe(false);expect(personalVisitorPiles(w,patient.id)).toEqual(personal);replay(w,3);
 untilVisitorCare(w,()=>!w.pawns.includes(patient),1000);const archive=w.visitors!.departed.find(d=>d.pawn.id===patient.id)!;expect(archive).toBeDefined();expect(archive.group).toBe(group);expect(archive.pawn.faction).toBe('outlanders');expect(archive.pawn.prisoner).toBeUndefined();expect(archive.pawn.podRescue).toBeUndefined();expect(archive.pawn.visitor).toMatchObject({group,role,phase:'leaving',medicalGuestAt:admission});expect(personalVisitorPiles({...w,piles:archive.items},patient.id)).toEqual(personal);expect(treatmentTarget(archive.pawn)).toBeUndefined();expect(medicalRestNeeded(archive.pawn)).toBe(false);const frozen=structuredClone(archive);replay(w,6);expect(w.visitors!.departed.find(d=>d.pawn.id===patient.id)).toEqual(frozen);
 });

 test('V360 colonial work commands do not become available merely through visitor medical admission',()=>{
 const s=visitorCareScene(),{w,patient}=s;atPickup(s);for(const c of [{type:'priority',pawnId:patient.id,work:'doctor',value:1},{type:'draft',pawnIds:[patient.id],enabled:true}] as Command[]){const before=serializeWorld(w);expect(applyCommand(w,c).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}expect(isCarePatient(patient)).toBe(true);expect(isColonist(patient)).toBe(false);
 });

 test('V360 dry tactical care of an actual downed visitor neither admits it nor spends its personal or colonial medicine',()=>{
 const {w,doctor,patient,personalMedicineId,colonyMedicineId}=visitorCareScene(),personal=personalVisitorPiles(w,patient.id),colony=structuredClone(w.piles.find(p=>p.id===colonyMedicineId));expect(applyCommand(w,{type:'draft',pawnIds:[doctor.id],enabled:true}).ok).toBe(true);expect(field(w,doctor,patient).ok).toBe(true);expect(doctor.tend).toMatchObject({drafted:true,patientId:patient.id,phase:'approach'});expect(doctor.tend?.medicine).toBeUndefined();expect(patient.visitor!.medicalGuestAt).toBeUndefined();
 untilVisitorCare(w,()=>patient.health!.injuries.some(i=>i.tended!==undefined),130);expect(doctor.skills.medicine.xp).toBeGreaterThan(0);expect(doctor.draft).toBeTruthy();expect(patient.visitor!.medicalGuestAt).toBeUndefined();expect(isCarePatient(patient)).toBe(false);expect(patient.faction).toBe('outlanders');expect(personalVisitorPiles(w,patient.id)).toEqual(personal);expect(w.piles.find(p=>p.id===colonyMedicineId)).toEqual(colony);expect(w.piles.find(p=>p.id===personalMedicineId)?.owner).toEqual({type:'inventory',pawnId:patient.id});replay(w);
 });

 test.each(['outlanders','outlaws'] as const)('V360 downed local %s outsider receives dry drafted care without faction/guest conversion',faction=>{
 const w=medicalCamp(2),doctor=w.pawns[0]!,patient=w.pawns[1]!;Object.assign(doctor,{x:3,z:5,background:{childhood:'quiet-child',adulthood:'medic'}});doctor.skills.medicine={level:8,xp:0,dailyXp:0,passion:0};Object.assign(patient,{x:8,z:5,faction});controlledInjury(w,patient,'left-arm',1000,'bruise');patient.health!.bloodLoss=BLOOD_UNIT*.61;reconcilePawnHealth(w,patient);expect(medicalStatus(patient.health!)).toBe('downed');expect(applyCommand(w,{type:'draft',pawnIds:[doctor.id],enabled:true}).ok).toBe(true);expect(field(w,doctor,patient).ok).toBe(true);untilVisitorCare(w,()=>patient.health!.injuries.some(i=>i.tended!==undefined),130);expect(patient.faction).toBe(faction);expect(patient.prisoner).toBeUndefined();expect(patient.podRescue).toBeUndefined();expect(patient.visitor).toBeUndefined();expect(isAdmittedGuest(patient)).toBe(false);replay(w);
 });

 test.each(['standing','None care'] as const)('V360 $name does not open the new outsider drafted-care exception',name=>{
 const {w,doctor,patient}=visitorCareScene();if(name==='standing'){patient.health!.bloodLoss=0;reconcilePawnHealth(w,patient);}if(name==='None care')patient.medicalCare='none';expect(applyCommand(w,{type:'draft',pawnIds:[doctor.id],enabled:true}).ok).toBe(true);const before=serializeWorld(w);expect(field(w,doctor,patient).ok).toBe(false);expect(serializeWorld(w)).toBe(before);expect(patient.visitor!.medicalGuestAt).toBeUndefined();
 });

 test('V360 preexisting pod rescue keeps deposit-time admission, not the new visitor pickup marker',()=>{
 const w=medicalCamp(),doctor=w.pawns[0]!;doctor.background={childhood:'quiet-child',adulthood:'medic'};doctor.priorities.doctor=0;expect(resolveSelectedPodRescue(w,187)).toBe(true);delete w.podRescues!.pending!.origin;const landing=w.podRescues!.pending!.cell;Object.assign(doctor,{x:landing.x-4,z:landing.z});const bed=Object.assign(fixtureBuilding(w,'bed',landing.x+7,landing.z),{medical:true});stepWorld(w,10);const patient=w.pawns.find(p=>p.podRescue)!;validVisitorCare(w);expect(rescue(w,doctor,patient).ok).toBe(true);untilVisitorCare(w,()=>doctor.rescue?.phase==='carry',150);expect(patient.podRescue!.admittedAt).toBeUndefined();expect(patient.visitor).toBeUndefined();replay(w);untilVisitorCare(w,()=>patient.podRescue!.admittedAt!==undefined,150);expect(patient.podRescue!.admittedAt).toBe(w.tick);expect(patient.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:bed.id});expect(patient.visitor).toBeUndefined();expect(isAdmittedGuest(patient)).toBe(true);expect(patient.faction).toBe('outlanders');replay(w);
 });


 test('V360 admitted NoCare visitor refuses a further rescue atomically through the actual policy command',()=>{
 const s=visitorCareScene(),{w,doctor,patient}=s;atPickup(s);expect(applyCommand(w,{type:'clear-orders',pawnId:doctor.id}).ok).toBe(true);expect(applyCommand(w,{type:'medical-care',pawnId:patient.id,care:'none'}).ok).toBe(true);const before=serializeWorld(w),admission=patient.visitor!.medicalGuestAt;expect(rescue(w,doctor,patient).ok).toBe(false);expect(serializeWorld(w)).toBe(before);expect(patient.visitor!.medicalGuestAt).toBe(admission);validVisitorCare(w);
 });

 test('V360 drafted Doctor0 physically rescues a neutral visitor, clears only old tactical intents and preserves draft authority',()=>{
 const s=visitorCareScene(),{w,doctor,otherDoctor,patient,bed}=s;doctor.background={childhood:'settlement-child',adulthood:'artisan'};doctor.priorities.doctor=0;Object.assign(otherDoctor,{x:20,z:20});const otherHealth=structuredClone(otherDoctor.health),personal=personalVisitorPiles(w,patient.id);
 expect(applyCommand(w,{type:'draft',pawnIds:[doctor.id],enabled:true}).ok).toBe(true);expect(applyCommand(w,{type:'draft-move',pawnIds:[doctor.id],target:{x:15,z:6},queue:false}).ok).toBe(true);expect(applyCommand(w,{type:'draft-move',pawnIds:[doctor.id],target:{x:15,z:7},queue:true}).ok).toBe(true);expect(doctor.draft!.queue).not.toEqual([]);
 let before=serializeWorld(w);expect(applyCommand(w,{type:'order-rescue',pawnId:doctor.id,patientId:patient.id,queue:true}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 expect(applyCommand(w,{type:'melee',pawnIds:[doctor.id],targetId:otherDoctor.id}).ok).toBe(true);expect(doctor.melee?.order?.targetId).toBe(otherDoctor.id);expect(doctor.melee?.strike).toBeNull();before=serializeWorld(w);expect(applyCommand(w,{type:'order-rescue',pawnId:doctor.id,patientId:patient.id,queue:true}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 expect(rescue(w,doctor,patient).ok).toBe(true);expect(doctor.draft).toMatchObject({target:null,queue:[]});expect(doctor.melee).toBeUndefined();expect(doctor.shooting).toBeUndefined();expect(doctor.orders.active).toBe('rescue');expect(patient.visitor!.medicalGuestAt).toBeUndefined();
 before=serializeWorld(w);expect(rescue(w,otherDoctor,patient).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 untilVisitorCare(w,()=>doctor.rescue?.phase==='carry',120);expect(patient.visitor!.medicalGuestAt).toBe(w.tick);expect(doctor.draft).toBeTruthy();expect(patient.motion).toEqual(doctor.motion);replay(w,2);
 untilVisitorCare(w,()=>doctor.rescue===undefined&&patient.need?.kind==='sleep'&&patient.need.bedId===bed.id,120);expect(doctor.draft).toBeTruthy();expect(doctor.orders.active).toBeNull();expect(doctor.melee).toBeUndefined();expect(otherDoctor.health).toEqual(otherHealth);expect(patient.faction).toBe('outlanders');expect(personalVisitorPiles(w,patient.id)).toEqual(personal);replay(w,2);
 });

 test('V360 cancellation of a real drafted rescue edge retains the admitted neutral patient instead of continuing or teleporting it',()=>{
 const s=visitorCareScene(),{w,doctor,patient}=s;doctor.priorities.doctor=0;expect(applyCommand(w,{type:'draft',pawnIds:[doctor.id],enabled:true}).ok).toBe(true);atPickup(s);const admission=patient.visitor!.medicalGuestAt,position={x:patient.x,z:patient.z},motion=structuredClone(patient.motion),personal=personalVisitorPiles(w,patient.id);
 expect(applyCommand(w,{type:'clear-orders',pawnId:doctor.id}).ok).toBe(true);expect(doctor.draft).toBeTruthy();expect(doctor.rescue).toBeUndefined();expect(doctor.orders.active).toBeNull();expect(patient.visitor!.medicalGuestAt).toBe(admission);expect({x:patient.x,z:patient.z}).toEqual(position);expect(patient.motion).toEqual(motion);expect(personalVisitorPiles(w,patient.id)).toEqual(personal);replay(w,8);expect(doctor.rescue).toBeUndefined();expect(wantsRescue(patient)).toBe(false);
 });

 test('V360 actual hostile visit transition rejects rescue without overwriting the group or patient custody',()=>{
 const {w,doctor,patient}=visitorCareScene();visitorGroupDanger(w,patient,'hostile');const personal=personalVisitorPiles(w,patient.id),before=serializeWorld(w);
 expect(w.visitors!.groups.find(g=>g.id===patient.visitor!.group)?.hostile).toBe(true);expect(rescue(w,doctor,patient).ok).toBe(false);expect(serializeWorld(w)).toBe(before);expect(patient.visitor!.medicalGuestAt).toBeUndefined();expect(personalVisitorPiles(w,patient.id)).toEqual(personal);validVisitorCare(w);
 });
