import {expect,test} from 'vitest';
import {shipCasketServiceCamp277,shipCasketAnimal277} from './scenarios/ship-casket-service-v453.ts';
import {controlledInjury} from './scenarios/health.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {carrierOf} from '../src/sim/rescue-state.ts';
import {animalCarrier} from '../src/sim/animal-rest-state.ts';
import {patientClaimed} from '../src/sim/care-access.ts';
import {sameRescueEdge} from '../src/sim/rescue-save.ts';
import {createPrisonerState} from '../src/sim/prisoner-state.ts';
import {shipCasketInteraction277} from '../src/sim/ship-casket-geometry-277.ts';
import {shipCasketIntent277} from '../src/sim/ship-casket-intent-277.ts';
import {planShipCasketRelease277} from '../src/sim/ship-casket-transfer-277.ts';
import {validShipCasketTaskField277} from '../src/sim/ship-casket-task-save-277.ts';
import {cryptosleepLastColonist271} from '../src/sim/cryptosleep-intent-271.ts';
import {createMechaMedicalRecord} from '../src/sim/mechanoid-health.ts';
import {addResolvedInjury,medicalStatus} from '../src/sim/injury-state.ts';
import {actualMechanicalBirthFaction259} from '../src/sim/mechanoid-world-faction-259.ts';
import {freshRot} from '../src/sim/food-preservation.ts';
import type {Mechanoid} from '../src/sim/mechanoid-state.ts';
import type {Command,World} from '../src/sim/types.ts';

const command=(w:World,c:Command)=>{const r=applyCommand(w,c);expect(r.ok,r.reason).toBe(true);};
const exact=(w:World)=>{const s=serializeWorld(w),copy=deserializeWorld(s);expect(serializeWorld(copy)).toBe(s);return copy;};
function until(w:World,done:()=>boolean,limit=500){for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,people:w.pawns.map(p=>({id:p.id,state:p.state,x:p.x,z:p.z,task:p.shipCasketTask277}))})).toBe(true);expect(validateWorld(w)).toEqual([]);}
function checkpoint(w:World){const decoder=new SnapshotDecoder(),s=decoder.adopt(structuredClone(new SnapshotEncoder().encode(w,0,0)));expect(s.status).toBe('applied');if(s.status!=='applied')throw Error(s.status);return s.world;}

test('the last free colonist travels and closes for500Core, remains frozen with real possessions and ejects without another worker',()=>{
 const {w,actor,casket}=shipCasketServiceCamp277(1),id=actor.id;
 const medicine={id:w.nextId++,kind:'medicine' as const,item:'herbal-medicine' as const,quantity:1,owner:{type:'inventory' as const,pawnId:id},...freshRot('herbal-medicine',w.tick)};w.piles.push(medicine);
 expect(validateWorld(w)).toEqual([]);command(w,{type:'order-enter-ship-casket',pawnId:id,casketId:casket.id});
 until(w,()=>actor.shipCasketTask277?.phase==='closing');const began=w.tick;
 stepWorld(w,49);expect(actor.shipCasketTask277?.progressCore).toBe(490);expect(casket.shipCryptosleep277.occupant).toBeNull();
 const twin=exact(w);stepWorld(w);stepWorld(twin);expect(serializeWorld(w)).toBe(serializeWorld(twin));expect(w.tick).toBe(began+50);
 const h=casket.shipCryptosleep277;expect(h.occupant).toEqual({kind:'human',pawn:actor});expect(h.items[0]).toBe(medicine);expect(w.pawns).toHaveLength(0);expect(w.piles).not.toContain(medicine);
 checkpoint(w);const frozen=structuredClone(h);stepWorld(w,25);expect(h).toEqual(frozen);exact(w);
 command(w,{type:'eject-ship-casket',casketId:casket.id});expect(w.pawns.find(p=>p.id===id)).toBe(actor);expect(w.piles.find(p=>p.id===medicine.id)).toBe(medicine);expect(casket.shipCryptosleep277.occupant).toBeNull();
 expect(actor.health?.cryptosleepSickness).toBeDefined();expect(actor.filthFeet?.carried).toContainEqual({kind:'slime',thickness:1});expect(actor.shipCryptosleepHeldAt277).toBeUndefined();expect(validateWorld(w)).toEqual([]);checkpoint(w);exact(w);
});

test.each([false,true])('a real downed prisoner keeps captivity and faction through carry/hold/ejection, drafted=%s',drafted=>{
 const {w,actor,patient:raw,casket}=shipCasketServiceCamp277(),patient=raw!;patient.faction='outlaws';patient.prisoner=createPrisonerState(w,patient);
 controlledInjury(w,patient,'left-leg',30000);controlledInjury(w,patient,'right-leg',30000);const initialCustody=structuredClone(patient.prisoner);
 if(drafted)command(w,{type:'draft',pawnIds:[actor.id],enabled:true});
 expect(shipCasketIntent277(w,{type:'order-carry-ship-casket',pawnId:actor.id,patient:{kind:'human',id:patient.id},casketId:casket.id}).ok).toBe(true);
 command(w,{type:'order-carry-ship-casket',pawnId:actor.id,patient:{kind:'human',id:patient.id},casketId:casket.id});
 until(w,()=>actor.shipCasketTask277?.phase==='carry');expect(carrierOf(w,patient.id)).toBe(actor);expect(patientClaimed(w,patient.id,w.pawns[2]!)).toBe(true);expect(sameRescueEdge(patient.motion,actor.motion)).toBe(true);
 const replay=exact(w),at=w.tick;until(w,()=>actor.shipCasketTask277?.phase==='closing'&&actor.shipCasketTask277.progressCore===490);
 // The ordinary breakout scheduler may have established its own RNG while the
 // prisoner was still local. Admission preserves that real dossier as-is.
 const custody=structuredClone(patient.prisoner);expect(custody).toMatchObject(initialCustody);
 stepWorld(w);expect(casket.shipCryptosleep277.occupant).not.toBeNull();stepWorld(replay,w.tick-at);expect(serializeWorld(replay)).toBe(serializeWorld(w));expect(!!actor.draft).toBe(drafted);
 expect(casket.shipCryptosleep277.occupant).toEqual({kind:'human',pawn:patient});expect(patient.faction).toBe('outlaws');expect(patient.prisoner).toEqual(custody);exact(w);
 command(w,{type:'eject-ship-casket',casketId:casket.id});expect(w.pawns.find(p=>p.id===patient.id)).toBe(patient);expect(patient.prisoner).toEqual(custody);expect(patient.faction).toBe('outlaws');expect(validateWorld(w)).toEqual([]);exact(w);
});

test('a downed animal is the real carried original, freezes its biology and resumes its own sickness clock',()=>{
 const {w,actor,casket}=shipCasketServiceCamp277(1),a=shipCasketAnimal277(w);expect(a.state).toBe('downed');expect(validateWorld(w)).toEqual([]);
 command(w,{type:'order-carry-ship-casket',pawnId:actor.id,patient:{kind:'animal',id:a.id},casketId:casket.id});
 until(w,()=>actor.shipCasketTask277?.phase==='carry');expect(animalCarrier(w,a.id)).toBe(actor);expect(sameRescueEdge(a.motion,actor.motion)).toBe(true);
 const cancelled=exact(w),cancelledAnimal=cancelled.wildlife!.animals.find(q=>q.id===a.id)!,cancelledActor=cancelled.pawns.find(q=>q.id===actor.id)!,edge=structuredClone(cancelledAnimal.motion);
 command(cancelled,{type:'clear-orders',pawnId:cancelledActor.id});expect(cancelledActor.shipCasketTask277).toBeUndefined();expect(animalCarrier(cancelled,a.id)).toBeUndefined();expect(cancelledAnimal.motion).toEqual(edge);exact(cancelled);
 stepWorld(cancelled,Math.max(1,Math.ceil((edge?.end??cancelled.tick)-cancelled.tick)+1));expect(validateWorld(cancelled)).toEqual([]);exact(cancelled);
 until(w,()=>casket.shipCryptosleep277.occupant?.kind==='animal');expect(w.wildlife!.animals).not.toContain(a);expect(casket.shipCryptosleep277.occupant).toEqual({kind:'animal',animal:a});
 const frozen=structuredClone(a),copy=exact(w);stepWorld(w,21);stepWorld(copy,21);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(a).toEqual(frozen);
 command(w,{type:'eject-ship-casket',casketId:casket.id});expect(w.wildlife!.animals.find(p=>p.id===a.id)).toBe(a);expect(a.ageTicks).toBe(frozen.ageTicks);expect(a.health?.cryptosleepSickness).toBeDefined();expect(a.health?.body).toBe('hare');expect(validateWorld(w)).toEqual([]);exact(w);
});

test('cancelling a physical carry preserves its captured edge and stale ejection plans consume no state or PRNG',()=>{
 const {w,actor,patient:raw,casket}=shipCasketServiceCamp277(),patient=raw!;controlledInjury(w,patient,'left-leg',30000);controlledInjury(w,patient,'right-leg',30000);
 command(w,{type:'order-carry-ship-casket',pawnId:actor.id,patient:{kind:'human',id:patient.id},casketId:casket.id});until(w,()=>actor.shipCasketTask277?.phase==='carry'&&(actor.motion?.end??0)>w.tick);
 const edge=structuredClone(patient.motion),position={x:patient.x,z:patient.z};command(w,{type:'clear-orders',pawnId:actor.id});expect(actor.shipCasketTask277).toBeUndefined();expect(patient).toMatchObject(position);expect(patient.motion).toEqual(edge);expect(carrierOf(w,patient.id)).toBeUndefined();expect(casket.shipCryptosleep277.occupant).toBeNull();exact(w);
 command(w,{type:'order-enter-ship-casket',pawnId:actor.id,casketId:casket.id});until(w,()=>casket.shipCryptosleep277.occupant!==null);
 const plan=planShipCasketRelease277(w,casket);expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);casket.orientation=1;const before=structuredClone(w);expect(plan.commit()).toBe(false);expect(w).toEqual(before);
});

test('a declared actual downed mechanical original can be carried and ejected without organic sickness',()=>{
 const {w,actor,casket}=shipCasketServiceCamp277(1),health=createMechaMedicalRecord(w.tick);
 // Native clinical fixture only: ordinary violent combat in the current clone
 // kills on first downing. This does not claim a played mechanical capture.
 // Two absent non-vital legs produce actual immobility; destroying the reactor
 // would instead be physiological death, before any death-on-downed rule.
 addResolvedInjury(health,'scyther-left-leg','crack',100000,()=>.999999);
 addResolvedInjury(health,'scyther-right-leg','crack',100000,()=>.999999);
 const status=medicalStatus(health),faction=actualMechanicalBirthFaction259(w.worldFactions);
 const mech:Mechanoid={id:w.nextId++,mechKind:'scyther',x:7,z:12,state:status==='mobile'?'idle':status,path:[],heading:0,moveCooldown:0,planCooldown:0,health,...faction?{worldFaction259:faction}:{}};
 w.mechanoids=[mech];expect(mech.state).toBe('downed');expect(validateWorld(w)).toEqual([]);
 command(w,{type:'order-carry-ship-casket',pawnId:actor.id,patient:{kind:'mechanical',id:mech.id},casketId:casket.id});until(w,()=>casket.shipCryptosleep277.occupant?.kind==='mechanical');
 expect(casket.shipCryptosleep277.occupant).toEqual({kind:'mechanical',mech});expect(w.mechanoids).not.toContain(mech);const frozen=structuredClone(health);stepWorld(w,15);expect(health).toEqual(frozen);exact(w);
 const before=w.rng;command(w,{type:'eject-ship-casket',casketId:casket.id});expect(w.rng).toBe(before);expect(w.mechanoids!.find(m=>m.id===mech.id)).toBe(mech);expect(mech.health?.cryptosleepSickness).toBeUndefined();expect(mech.filthFeet?.carried).toContainEqual({kind:'slime',thickness:1});expect(validateWorld(w)).toEqual([]);exact(w);
});

test('prospective tasks reject extra keys, missing patient, false/undefined and old/future families',()=>{
 const {w,actor,casket}=shipCasketServiceCamp277();command(w,{type:'order-enter-ship-casket',pawnId:actor.id,casketId:casket.id});
 expect(validShipCasketTaskField277(actor,277,w.tick,w.nextId)).toBe(true);
 for(const version of [276,278])expect(validShipCasketTaskField277(actor,version,w.tick,w.nextId)).toBe(false);
 for(const value of [undefined,false,{...actor.shipCasketTask277,patient:{kind:'human',id:actor.id}},{...actor.shipCasketTask277,action:'carry'}])expect(validShipCasketTaskField277({...actor,shipCasketTask277:value},277,w.tick,w.nextId)).toBe(false);
 expect(shipCasketInteraction277(casket,casket.orientation)).toEqual({x:15,z:10});
});

test('a free person in the actual player-ejectable holder counts for the ordinary casket warning in277',()=>{
 const {w,actor,patient,casket}=shipCasketServiceCamp277(2);command(w,{type:'order-enter-ship-casket',pawnId:actor.id,casketId:casket.id});until(w,()=>casket.shipCryptosleep277.occupant!==null);
 expect(w.pawns).toEqual([patient]);expect(cryptosleepLastColonist271(w,patient!.id)).toBe(false);
 command(w,{type:'eject-ship-casket',casketId:casket.id});expect(cryptosleepLastColonist271(w,patient!.id)).toBe(false);
});
