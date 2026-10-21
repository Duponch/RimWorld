import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health.ts';
import {advanceMedical} from '../src/sim/injury-evolution.ts';
import {createMedicalRecord,addResolvedInjury,reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {validateMedicalRecord} from '../src/sim/injury-validation.ts';
import {administerAnesthetic,anestheticCivilBornAt271,validAnesthetic} from '../src/sim/anesthetic.ts';
import {medicalCivilTick271,medicalElapsedTicks271,prepareSuspendedHumanResume271,validMedicalCivilHeader271} from '../src/sim/suspended-human-clock-271.ts';
import {memoryAge271,memoryExpiry271,validSuspendedMemory271} from '../src/sim/suspended-memory-271.ts';
import {expireBereavement} from '../src/sim/bereavement.ts';
import {validFamilyBereavementShape} from '../src/sim/family-bereavement-save.ts';
import {validDeathThoughtsShape} from '../src/sim/death-thoughts-save.ts';
import {validRomanceMemoryShape,romanceMemoryDuration} from '../src/sim/romance-memories.ts';
import type {MedicalRecord} from '../src/sim/injury-types.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {ingestAlcoholDose265} from '../src/sim/alcohol-clinical-265.ts';
import {validAlcoholHeader265} from '../src/sim/alcohol-state-265.ts';

const noDraw=()=>{throw Error('Unexpected random draw');};
function actor(tick=100){const p=medicalCamp().pawns[0]!;p.id=1;p.health=createMedicalRecord(tick);p.memories=[];return p;}
function active(h:MedicalRecord,end:number,phase=1){advanceMedical(h,medicalElapsedTicks271(h,end),{civilTick:end,phase,posture:'standing',starving:false},noDraw);}

test('civil hash pulses resume at the actual phase, with exact anesthetic checkpoints across two suspensions',()=>{
 const p=actor(),h=p.health!;administerAnesthetic(h,()=>0);active(h,101);
 expect(h.anesthetic?.remainder).toBe(2);expect(h.anesthetic?.severity).toBe(997333334);
 p.cryptosleepHeldAt271=101;const before=JSON.stringify(p),plan=prepareSuspendedHumanResume271(p,101,148);
 expect(JSON.stringify(p)).toBe(before);expect(plan.current()).toBe(true);expect(plan.commit()).toBe(true);expect(plan.commit()).toBe(false);delete p.cryptosleepHeldAt271;
 expect(h.tick).toBe(101);expect(h.anesthetic?.bornAt).toBe(100);expect(anestheticCivilBornAt271(h)).toBe(100);
 active(h,160);expect(h.anesthetic?.severity).toBe(997333334);active(h,161);
 expect(h.tick).toBe(114);expect(h.anesthetic?.severity).toBe(994666667);expect(h.anesthetic?.remainder).toBe(1);
 expect(validAnesthetic(h.anesthetic,h.tick,true,1,medicalCivilTick271(h),271)).toBe(true);
 p.cryptosleepHeldAt271=161;expect(prepareSuspendedHumanResume271(p,161,178).commit()).toBe(true);delete p.cryptosleepHeldAt271;
 const restored=JSON.parse(JSON.stringify(h)) as MedicalRecord;active(h,181);active(restored,181);
 expect(restored).toEqual(h);expect(h.anesthetic?.severity).toBe(992000000);expect(h.anesthetic?.remainder).toBe(0);
 expect(anestheticCivilBornAt271(h)).toBe(100);expect(validAnesthetic(h.anesthetic,h.tick,true,1,181,271)).toBe(true);
 const forged=structuredClone(h.anesthetic)!;forged.cadence271!.steps++;expect(validAnesthetic(forged,h.tick,true,1,181,271)).toBe(false);
});

test('a wound acquired after one resume owns its clinical birth across a later hold, without rewriting old births or deadlines',()=>{
 const p=actor(),h=p.health!;p.cryptosleepHeldAt271=100;expect(prepareSuspendedHumanResume271(p,100,140).commit()).toBe(true);delete p.cryptosleepHeldAt271;
 active(h,150);addResolvedInjury(h,'left-arm','cut',1000,()=>.999999);
 const wound=h.injuries[0]!;expect(wound.bornAt).toBe(110);
 p.cryptosleepHeldAt271=150;expect(prepareSuspendedHumanResume271(p,150,180).commit()).toBe(true);delete p.cryptosleepHeldAt271;
 // Three ticks avoid a healing pulse; the wound's age advances only by3.
 active(h,183,59);expect(h.tick-wound.bornAt).toBe(3);expect(wound.bornAt).toBe(110);expect(medicalCivilTick271(h)).toBe(183);
 expect(validMedicalCivilHeader271(h,271)).toBe(true);expect(validMedicalCivilHeader271(h,270)).toBe(false);expect(validMedicalCivilHeader271(h,272)).toBe(false);
});

test('a terminal medical record retains clinical age while its death date is civil',()=>{
 const p=actor(),h=p.health!;p.cryptosleepHeldAt271=100;expect(prepareSuspendedHumanResume271(p,100,200).commit()).toBe(true);
 h.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(h);
 expect(h.tick).toBe(100);expect(h.death?.tick).toBe(200);
 expect(validateMedicalRecord(h,true,true,true,true,false,false,true,true,true,true,true,271,true)).toBeNull();
});

test('existing and external event memories receive only their own suspended span, keeping factual dates',()=>{
 const p=actor();p.cryptosleepHeldAt271=100;p.memories=[{kind:'ate-raw-food',expiresAt:6100}];
 p.bereavement=[{otherId:2,kind:'friend-died',at:50,opinion:30},{otherId:3,kind:'friend-died',at:150,opinion:30}];
 p.familyBereavement=[{otherId:4,kind:'parent-died',at:150}];p.deathThoughts=[{otherId:4,kind:'colonist-died',at:150}];
 expireBereavement(p,1000000);expect(p.bereavement).toHaveLength(2);
 expect(validFamilyBereavementShape(p.familyBereavement,271,100,190)).toBe(true);expect(validDeathThoughtsShape(p.deathThoughts,271,100,false,190)).toBe(true);
 expect(prepareSuspendedHumanResume271(p,100,200).commit()).toBe(true);delete p.cryptosleepHeldAt271;
 expect(p.bereavement.map(m=>[m.at,m.suspendedTicks])).toEqual([[50,100],[150,50]]);
 expect(memoryAge271(p.bereavement[0]!,50,200)).toBe(50);expect(memoryAge271(p.bereavement[1]!,150,200)).toBe(0);
 expect(p.memories[0]!.expiresAt).toBe(6100);expect(memoryExpiry271(p.memories[0]!,6100)).toBe(6200);
 expect(validSuspendedMemory271(p.bereavement[1],271,200,150)).toBe(true);expect(validSuspendedMemory271(p.bereavement[1],270,200,150)).toBe(false);expect(validSuspendedMemory271(p.bereavement[1],272,200,150)).toBe(false);
 p.cryptosleepHeldAt271=200;p.bereavement.push({otherId:5,kind:'rival-died',at:230,opinion:-40});expect(prepareSuspendedHumanResume271(p,200,300).commit()).toBe(true);
 expect(p.bereavement.map(m=>[m.at,m.suspendedTicks])).toEqual([[50,200],[150,150],[230,70]]);
});

test('a stale original clinical clock, memory date or contained array invalidates the pure resume before any write',()=>{
 for(const mutate of [
  (p:ReturnType<typeof actor>)=>{p.health!.tick++;},
  (p:ReturnType<typeof actor>)=>{p.bereavement![0]!.at++;},
  (p:ReturnType<typeof actor>)=>{p.bereavement=[...p.bereavement!];},
 ]){
  const p=actor();p.cryptosleepHeldAt271=100;p.bereavement=[{otherId:2,kind:'friend-died',at:50,opinion:30}];
  const plan=prepareSuspendedHumanResume271(p,100,200);mutate(p);const before=JSON.stringify(p);
  expect(plan.current()).toBe(false);expect(plan.commit()).toBe(false);expect(JSON.stringify(p)).toBe(before);
 }
});

test('civil extension rejects nondata/inherited headers without touching old records',()=>{
 const old=createMedicalRecord(100);expect(validMedicalCivilHeader271(old,270)).toBe(true);
 for(const h of [Object.assign(Object.create({civilTick271:200}),old),Object.defineProperty({...old},'civilTick271',{get:()=>200,enumerable:true}),{...old,civilTick271:undefined}])expect(validMedicalCivilHeader271(h,271)).toBe(false);
});

test('a romance memory can outlive its original civil deadline after a real suspension without rewriting the event',()=>{
 const p=actor(),duration=romanceMemoryDuration('rebuffed-mood');p.romanceMemories=[{otherId:2,kind:'rebuffed-mood',at:90}];
 p.cryptosleepHeldAt271=100;const releasedAt=duration+200;
 expect(prepareSuspendedHumanResume271(p,100,releasedAt).commit()).toBe(true);delete p.cryptosleepHeldAt271;
 const m=p.romanceMemories[0]!;expect(m.at).toBe(90);expect(m.at+duration).toBeLessThan(releasedAt);
 expect(memoryAge271(m,m.at,releasedAt)).toBe(10);expect(validRomanceMemoryShape(p.romanceMemories,271,releasedAt)).toBe(true);
 expect(validRomanceMemoryShape(p.romanceMemories,270,releasedAt)).toBe(false);
 expect(validRomanceMemoryShape(p.romanceMemories,271,m.at+duration+m.suspendedTicks!)).toBe(false);
});

test('post-resume beer uses the real civil dose date and the same global Core pulses as an unsuspended owner',()=>{
 const p=actor(),h=p.health!;ingestAlcoholDose265(h,1,100,()=>.999999);p.cryptosleepHeldAt271=100;
 expect(prepareSuspendedHumanResume271(p,100,140).commit()).toBe(true);delete p.cryptosleepHeldAt271;
 ingestAlcoholDose265(h,1,140,()=>.999999);expect(h.alcohol?.lastDoseTick).toBe(140);expect(h.alcohol?.bornAt).toBe(100);expect(validAlcoholHeader265(h,271)).toBe(true);
 const identity=structuredClone(h);delete identity.civilTick271;identity.tick=140;
 const counts=[0,0];for(const [index,record] of [h,identity].entries())advanceMedical(record,20,{civilTick:160,phase:1,posture:'standing',starving:false,alcoholOwner:{id:1,spawned:false,awake:true}},()=>{counts[index]!++;return .999999;});
 expect(h.alcohol).toEqual(identity.alcohol);expect(counts[0]).toBe(counts[1]);expect(h.tick).toBe(120);expect(medicalCivilTick271(h)).toBe(160);
});
