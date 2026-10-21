import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {validateMedicalRecord} from '../src/sim/injury-validation.ts';
import {advanceMedical} from '../src/sim/injury-evolution.ts';
import {medicalCivilTick271,prepareSuspendedHumanResume271} from '../src/sim/suspended-human-clock-271.ts';
import {ingestFoodRisk} from '../src/sim/food-hygiene.ts';
import {advanceGroupIngestion} from '../src/sim/group-ingestion.ts';
import {ingestGroupFood256,type GroupFoodOwner256} from '../src/sim/group-foraged-ingestion-256.ts';
import {emptyGroupLedger} from '../src/sim/group-loading.ts';
import {newGroupForageRevision256} from '../src/sim/group-forage-state-256.ts';
import {freshRot} from '../src/sim/food-preservation.ts';
import {FOOD_POISON_UNIT,exposeFoodPoisoningAtRecord} from '../src/sim/food-poisoning.ts';
import type {AwayGroup} from '../src/sim/group-capture.ts';
import type {MedicalRecord} from '../src/sim/injury-types.ts';

/** Prepared exposure at real producer boundaries, not a claim of a naturally
 * acquired voyage/meal. The same original resumes through the shared clock
 * transaction; service entry/open is exercised in the service scenarios. */
function resumed(){
 const w=medicalCamp(),p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);const h=p.health;
 p.cryptosleepHeldAt271=w.tick;expect(prepareSuspendedHumanResume271(p,w.tick,13003).commit()).toBe(true);delete p.cryptosleepHeldAt271;w.tick=13003;
 expect(h.tick).toBe(3000);expect(medicalCivilTick271(h)).toBe(w.tick);return {w,p,h};
}
const clinical=(h:MedicalRecord)=>expect(validateMedicalRecord(h,true,true,true,true,false,false,true,true,true,true,true,271,true)).toBeNull();
function away(){
 const f=resumed(),{w,p}=f;w.pawns=w.pawns.filter(q=>q!==p);p.hunger=23;
 const g:AwayGroup={id:1,phase:'at-site',members:[p],items:[],startedAt:w.tick,departedAt:w.tick,lastPersonalTick:w.tick,
  destination:1,tile:1,route:[1],segment:null,paused:false,stop:{kind:'at-site'},entry:{x:0,z:0},ledger:emptyGroupLedger(),
  baseline:{food:0,silver:0,cargo:{cloth:0,'muffalo-wool':0},medicine:0,component:0}};
 w.group=g;return {...f,g};
}

test('local ingestion after resume owns an active clinical birth, civil notice and unchanged recovery cadence through record reload',()=>{
 const {w,p,h}=resumed(),rng=w.rng;
 ingestFoodRisk(w,p,{item:'simple-meal',foodPoison:{fraction:1,cause:'filthy-kitchen'}});
 expect(p.health).toBe(h);expect(h.foodPoisoning).toMatchObject({bornAt:3000,severity:FOOD_POISON_UNIT,item:'simple-meal',cause:'filthy-kitchen'});
 expect(w.events.at(-1)?.tick).toBe(13003);expect(w.rng).toBe(rng);clinical(h);
 const copy=JSON.parse(JSON.stringify(h)) as MedicalRecord,woundBirth=h.foodPoisoning!.bornAt;
 for(const record of [h,copy])advanceMedical(record,20,{civilTick:13023,phase:p.id%60,posture:'standing',starving:false},()=>{throw Error('Food recovery does not draw');});
 expect(copy).toEqual(h);expect(h.foodPoisoning?.severity).toBe(FOOD_POISON_UNIT-1000);expect(h.foodPoisoning?.bornAt).toBe(woundBirth);expect(h.tick).toBe(3020);expect(medicalCivilTick271(h)).toBe(13023);clinical(h);
 // A real civil event before the owner's next medical pass must not be
 // backdated to its previous active tick by the adapter.
 const pending=createMedicalRecord(40);pending.civilTick271=100;
 pending.foodPoisoning=exposeFoodPoisoningAtRecord(pending,'unknown','survival-meal',101);expect(pending.foodPoisoning.bornAt).toBe(41);
 advanceMedical(pending,1,{civilTick:101,phase:41,posture:'standing',starving:false},()=>{throw Error('Unexpected exposure draw');});expect(pending.foodPoisoning.severity).toBe(FOOD_POISON_UNIT);clinical(pending);
});

test('off-map ration ingestion after resume consumes its real item/mass once without a future clinical birth',()=>{
 const {w,p,h,g}=away(),meal={id:w.nextId++,kind:'food' as const,item:'survival-meal' as const,quantity:1,owner:{type:'inventory' as const,pawnId:p.id},foodPoison:{fraction:.5,cause:'incompetent-cook' as const}};
 g.items.push(meal);g.baseline.food=1;const notices:string[]=[];let draws=0;
 const result=advanceGroupIngestion(g,{tick:w.tick,schemaVersion:w.schemaVersion,foodPolicies:w.foodPolicies,foodPoisonFactor:1,random:()=>{draws++;return .1;},notice:(_p,message)=>notices.push(message)});
 expect(g.members[0]).toBe(p);expect(g.items).toEqual([]);expect(g.ledger.foodConsumed).toBe(1);expect(result).toEqual({massRemovedGrams:300,removed:[{pawnId:p.id,grams:300}]});expect(draws).toBe(1);
 expect(h.foodPoisoning).toMatchObject({bornAt:3000,item:'survival-meal',cause:'incompetent-cook'});expect(p.hunger).toBe(100);expect(notices.filter(s=>s.includes('intoxication'))).toHaveLength(1);clinical(h);
 const restored=JSON.parse(JSON.stringify(h)) as MedicalRecord;expect(restored).toEqual(h);clinical(restored);
});

test('prospective foraged fruit ingestion after resume debits actual inventory and keeps its meal memory on civil time',()=>{
 const {w,p,h,g}=away(),fruit={id:w.nextId++,kind:'food' as const,item:'agave-fruit' as const,quantity:30,owner:{type:'inventory' as const,pawnId:p.id},...freshRot('agave-fruit',w.tick)};
 g.items.push(fruit);const owner:GroupFoodOwner256=Object.assign(g,{travel:{revision:1 as const,tickDelta:0,forage:newGroupForageRevision256(g.items)}});let draws=0;
 const result=ingestGroupFood256(w,owner,p,{random:()=>{draws++;return 0;},notice:()=>{}}),consumed=owner.travel!.forage.consumed['agave-fruit'];
 expect(consumed).toBeGreaterThan(0);expect(fruit.quantity).toBe(30-consumed);expect(result).toEqual({massRemovedGrams:consumed*30,removed:[{pawnId:p.id,grams:consumed*30}]});expect(owner.travel!.forage.gathered['agave-fruit']).toBe(0);expect(draws).toBe(1);
 expect(h.foodPoisoning).toMatchObject({bornAt:3000,cause:'dangerous-food',item:'agave-fruit'});expect(p.memories.find(m=>m.kind==='ate-raw-food')?.expiresAt).toBe(w.tick+6000);expect(medicalCivilTick271(h)).toBe(w.tick);clinical(h);
});
