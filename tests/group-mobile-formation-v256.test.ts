import {expect,test} from 'vitest';
import {registryCamp} from './helpers/world-maps-v255.ts';
import {registeredMap,flushRegisteredMap,worldGroupContext} from '../src/sim/world-map-context.ts';
import {groupMemberReason,previewGroupFormation} from '../src/sim/group-authority.ts';
import {scoutPreparationReason} from '../src/sim/caravan-trip.ts';
import {createMedicalRecord,addResolvedInjury,medicalStatus} from '../src/sim/injury-state.ts';
import {addCryptosleepSickness256} from '../src/sim/cryptosleep-sickness-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {serializeCampaign,deserializeCampaign,stepWorld,validateWorld,applyCommand} from '../src/sim/index.ts';

import {GroupCampaignRuntime256} from '../src/sim/group-campaign-runtime-256.ts';
import {GroupCaravanPhysical256} from '../src/sim/group-caravan-physical-256.ts';
import {createGroupCampaignGeometry256} from '../src/sim/group-campaign-geometry-256.ts';
import type {Command} from '../src/sim/types.ts';
import {patientProposal,startPatientRest} from '../src/sim/patient-rest.ts';
import {blockedCells,reachableCells} from '../src/sim/pathfinding.ts';
import {currentMedicalBed} from '../src/sim/hospital-medical-stats.ts';

/** Reuse the admitted camp and its original owners; only runtime continuations
 * are constructed here. The prepared-away reorganization fixture would skip
 * the actual loading/departure that these tests must exercise. */
function local(){
 const w=registryCamp(),map=registeredMap(w,w.worldMaps!.rootMapId!)!,p=map.pawns[0]!;
 const runtime=new GroupCampaignRuntime256(createGroupCampaignGeometry256(w),new GroupCaravanPhysical256());runtime.bootstrap(w);
 const command=(c:Command)=>{const result=applyCommand(w,c,runtime);expect(result.ok,result.reason??JSON.stringify(c)).toBe(true);};
 const step=()=>stepWorld(w,1,undefined,runtime);
 const until=(predicate:()=>boolean,limit=9000)=>{for(let i=0;i<limit&&!predicate();i++)step();expect(predicate(),JSON.stringify({tick:w.tick,groups:w.worldGroups!.groups.map(g=>({id:g.state.id,phase:g.state.phase})),events:w.worldGroups!.events.slice(-3)})).toBe(true);};
 const startOne=(destination=52,quantity=8)=>{const food=map.piles.find(i=>i.item==='survival-meal'&&i.owner.type==='ground'&&i.quantity>=quantity);if(!food)throw Error('Declared actual rations missing');command({type:'group-start',originMapId:w.worldMaps!.rootMapId!,memberIds:[p.id],sources:[{pileId:food.id,quantity}],destination});return {id:w.worldGroups!.selectedGroupId!,person:p};};
 return {w,map,p,command,step,until,startOne};
}

/** Declared medical/need checkpoint, no played injury or treatment claimed. */
function sick(p:ReturnType<typeof local>['p'],tick:number){p.health=createMedicalRecord(tick);addResolvedInjury(p.health,'left-arm','bruise',1000,()=>.9);addCryptosleepSickness256(p.health,new WorldGenerationRandom(218),256);p.rest=25;p.hunger=15;expect(medicalStatus(p.health)).toBe('mobile');}

test('a real new collective formation admits mobile sickness/low needs without curing or changing scout rules',()=>{
 const f=local();sick(f.p,f.w.tick);flushRegisteredMap(f.map);expect(validateWorld(f.w)).toEqual([]);
 const source=f.map.piles.find(i=>i.owner.type==='ground'&&i.item==='survival-meal'&&i.quantity>=2)!,health=f.p.health,before=JSON.stringify({health,age:f.p.age,rest:f.p.rest,hunger:f.p.hunger}),rng=f.w.rng,next=f.w.nextId;
 expect(groupMemberReason(f.map,f.p)).toBeUndefined();expect(scoutPreparationReason(f.map,f.p)).not.toBeNull();
 expect(previewGroupFormation(f.map,[f.p.id],[{pileId:source.id,quantity:2}],52).ok).toBe(true);
 expect(JSON.stringify({health:f.p.health,age:f.p.age,rest:f.p.rest,hunger:f.p.hunger})).toBe(before);expect(f.w.rng).toBe(rng);expect(f.w.nextId).toBe(next);
 const result=f.startOne(52,2),record=f.w.worldGroups!.groups.find(g=>g.state.id===result.id)!,context=worldGroupContext(f.w,result.id);if(!context)throw Error('Actual preparing group context missing');
 expect('manifest'in record.state&&record.state.travelPreparation).toBe(true);expect(f.p.health).toBe(health);expect(groupMemberReason(context,f.p,true)).toBeUndefined();expect(JSON.stringify({health:f.p.health,age:f.p.age,rest:f.p.rest,hunger:f.p.hunger})).toBe(before);
 // Counterfactual absence fence: an engaged historical preparation cannot be
 // promoted merely because its World now has schema256. No migration is run.
 if(!('manifest'in record.state))throw Error('Actual new preparation missing');delete record.state.travelPreparation;
 expect(groupMemberReason(context,f.p,true)).toBeDefined();expect(f.p.health).toBe(health);expect(scoutPreparationReason(f.map,f.p)).not.toBeNull();
});

test('real outgoing work, physical vomiting and incoming patient reservations still refuse without effects',()=>{
 const f=local();sick(f.p,f.w.tick);const h=f.p.health!,ill=h.cryptosleepSickness!;
 ill.vomit={remainingCore:100,cell:{x:f.p.x,z:f.p.z}};const vomiting=JSON.stringify(f.w);expect(groupMemberReason(f.map,f.p)).toContain('vomissement');expect(JSON.stringify(f.w)).toBe(vomiting);delete ill.vomit;
 // Enable the real patient provider first while doctors are still disabled,
 // so the direct order below creates the first actual treatment reservation.
 f.command({type:'priority',pawnId:f.p.id,work:'bedrest',value:1});
 f.command({type:'medical-care',pawnId:f.p.id,care:'industrial'});
 const proposal=patientProposal(f.map,f.p,reachableCells(f.map,f.p,blockedCells(f.map),new Set()));if(!proposal)throw Error('Actual patient bed inaccessible');
 startPatientRest(f.map,f.p,proposal);flushRegisteredMap(f.map);
 f.until(()=>!!currentMedicalBed(f.map,f.p),300);
 const doctor=f.map.pawns[1]!,medicine=f.map.piles.find(i=>i.item==='medicine'&&i.owner.type==='ground'&&i.quantity>0);if(!medicine)throw Error('Prepared finite medicine missing');
 f.command({type:'priority',pawnId:doctor.id,work:'doctor',value:1});
 expect(doctor.tend).toBeUndefined();
 f.command({type:'order-tend',pawnId:doctor.id,patientId:f.p.id,queue:false});expect(doctor.tend?.patientId).toBe(f.p.id);
 expect(doctor.tend?.medicine?.sourcePileId).toBe(medicine.id);expect(doctor.tend?.medicine?.quantity).toBeGreaterThan(0);
 // Ordinary tending requires a bed-use task; admission sees that outgoing
 // activity before the still-real incoming reservation. Do not falsify sleep.
 const reserved=JSON.stringify(f.w);expect(groupMemberReason(f.map,f.p)).toContain('activité');expect(groupMemberReason(f.map,doctor)).toBeDefined();expect(JSON.stringify(f.w)).toBe(reserved);expect(f.p.health).toBe(h);
});

test('a physically downed or terminal original remains ineligible; no human carrying or prisoner lane is offered',()=>{
 const f=local();f.p.health=createMedicalRecord(f.w.tick);
 for(const part of ['left-arm','right-arm','left-leg','right-leg'] as const)addResolvedInjury(f.p.health,part,'bruise',16000,()=>.9);addResolvedInjury(f.p.health,'torso','bruise',8000,()=>.9);
 expect(medicalStatus(f.p.health)).toBe('downed');f.p.state='downed';let before=JSON.stringify(f.w);expect(groupMemberReason(f.map,f.p)).toBeDefined();expect(JSON.stringify(f.w)).toBe(before);
 addResolvedInjury(f.p.health,'head','bruise',25000,()=>.9);expect(medicalStatus(f.p.health)).toBe('dead');f.p.state='dead';before=JSON.stringify(f.w);expect(groupMemberReason(f.map,f.p)).toBeDefined();expect(JSON.stringify(f.w)).toBe(before);
});

test('actual collective departure keeps the same clinical owner and continues disease, needs and exact RAW off-map',()=>{
 const f=local();sick(f.p,f.w.tick);const h=f.p.health!,initialRemaining=h.cryptosleepSickness!.remainingCore;
 const {id}=f.startOne(52,8);f.until(()=>f.w.worldGroups!.groups.some(r=>r.state.id===id&&'members'in r.state),1800);
 const g=f.w.worldGroups!.groups.find(r=>r.state.id===id)!.state;if(!('members'in g))throw Error('Actual formation did not depart');
 expect(g.travel?.revision).toBe(1);expect(g.members).toContain(f.p);expect(f.map.pawns).not.toContain(f.p);expect(f.p.health).toBe(h);expect(h.tick).toBe(g.lastPersonalTick);expect(h.cryptosleepSickness!.remainingCore).toBeLessThan(initialRemaining);
 const remaining=h.cryptosleepSickness!.remainingCore,tick=f.w.tick;f.step();expect(f.p.health).toBe(h);expect(h.tick).toBe(tick+1);expect(h.cryptosleepSickness!.remainingCore).toBe(remaining-10);
 expect(validateWorld(f.w)).toEqual([]);const raw=serializeCampaign(f.w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);
});
