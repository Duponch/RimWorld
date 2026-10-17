import {expect,test} from 'vitest';
import {generateWorld} from '../src/sim/generation.ts';
import {startingPawn} from '../src/sim/starting-pawns.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import {constructInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {createMedicalRecord,assessMedical,reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {applyToxicBite256,advanceToxicBuildupCore256,commitToxicDeath256,validToxicBuildupHeader256} from '../src/sim/toxic-buildup-256.ts';
import {animalClinicalRandom256} from '../src/sim/animal-condition-medical-frontier-256.ts';
import {humanConditionMedicalFrontier256} from '../src/sim/human-condition-frontier-256.ts';
import {hasHumanConditionMind256} from '../src/sim/human-condition-mind-256.ts';
import {tryApplyAnimalAgeCondition256} from '../src/sim/animal-birthday-application-256.ts';
import {clinicalConditionPartFacts256} from '../src/sim/clinical-condition-parts-256.ts';
import {medicalModel,ANIMAL_BODY_MODELS} from '../src/sim/body-model.ts';
import {LEGACY_ANIMAL_SPECIES_IDS} from '../src/sim/animal-species.ts';
import {advanceMedical} from '../src/sim/injury-evolution.ts';
import {validateMedicalRecord} from '../src/sim/injury-validation.ts';
import {processToxicVomit256,toxicVomitEngagement256} from '../src/sim/toxic-vomit-256.ts';
import {validToxicBuildupTransport256} from '../src/sim/toxic-buildup-save-256.ts';
import {groupPawnInterval256} from '../src/sim/group-core-cadence-256.ts';
import {animalMeleeTools} from '../src/sim/wildlife-melee.ts';
import {strikeLivingTarget} from '../src/sim/living-melee.ts';
import {advanceHumanCorpses} from '../src/sim/human-corpses.ts';
import {reconcilePawnHealth} from '../src/sim/health.ts';
import {CORPSE_ROT_TICKS} from '../src/sim/corpses.ts';
import {validCorpseRot} from '../src/sim/corpse-save.ts';
import {cobraAdmissionReason256} from '../src/sim/cobra-admission-256.ts';
import {validHumanClinicalConditionOwner256} from '../src/sim/human-condition-mind-256.ts';
import {xpRequired} from '../src/sim/skills.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {applyTending} from '../src/sim/tending.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {commitAnimalImpact} from '../src/sim/wildlife-health.ts';
import type {FoodPoisonVomitContext} from '../src/sim/food-poisoning-runtime.ts';

// Prepared landscape and original factory actors, never a fabricated World or
// a claim that the final starter/PawnGenerator pipeline has been exercised.
function scene(){
 const w=generateWorld(82011,32,32,'temperate-crashlanded-v1');w.schemaVersion=256;w.tick=100;
 w.deterioration!.lastTick=w.tick;
 w.resources=[];w.piles=[];w.structures=[];w.jobs=[];for(const tile of w.tiles)tile.terrain='soil';
 const p=startingPawn(w.nextId++,'Cible préparée',12,12,0,55,w.seed,w.tick,256);delete p.health;w.pawns.push(p);enableWildlife(w,0);
 return {w,p};
}
const atHash=(id:number,interval:number,start=1000)=>{for(let core=start;core<start+interval;core++)if(groupPawnInterval256(id,core,interval,1))return core;throw Error('Missing actual hash');};

test('literal legacy species retain every original part and coverage when chronic clinical facts are read',()=>{
 for(const species of LEGACY_ANIMAL_SPECIES_IDS){
  const model=ANIMAL_BODY_MODELS[species],original=model.parts,before=JSON.stringify(original),facts=clinicalConditionPartFacts256(model);
  expect(facts.map(p=>p.part)).toEqual(original.map(p=>p.id));expect(facts.map(p=>p.coverage)).toEqual(original.map(p=>p.coverage));
  expect(model.parts).toBe(original);expect(JSON.stringify(original)).toBe(before);
  if(model.byId.tail)expect(facts.find(p=>p.part==='tail')).toMatchObject({defId:'Tail',alive:true});
 }
});

test('new mind is constructed only on the prospective original; historical absence is not healed by load/admission',()=>{
 const {w,p}=scene();expect(hasHumanConditionMind256(p)).toBe(true);expect(p.mental!.wander!.nextMoveOrderIsWait).toBe(false);
 const old=startingPawn(w.nextId++,'Historique',13,12,1,55,w.seed,w.tick);expect(old.mental?.wander).toBeUndefined();
 w.pawns.push(old);const before=JSON.stringify(w);expect(cobraAdmissionReason256(w)).toContain('Historical human');expect(JSON.stringify(w)).toBe(before);
 const clone=JSON.parse(JSON.stringify(p));expect(clone.mental.wander.nextMoveOrderIsWait).toBe(false);
});

test('true capped damage feeds f32 dose/body-size/resistance; anatomical death and a real hunt suppress creation draws',()=>{
 const h=createMedicalRecord(100);let draws=0;
 applyToxicBite256(h,10,.5,.5,()=>{draws++;return .5;});expect(draws).toBe(1);expect(h.toxicBuildup!.severity).toBe(Math.fround(Math.fround(10)*Math.fround(.015)));
 const noDose=createMedicalRecord(100);applyToxicBite256(noDose,10,1,1,()=>{draws++;return .5;});expect(draws).toBe(2);expect(noDose.toxicBuildup).toBeUndefined();
 noDose.death={tick:100,cause:'execution'};applyToxicBite256(noDose,10,1,0,()=>{throw Error('dead target must not create poison');});
 const hunted=createMedicalRecord(100);applyToxicBite256(hunted,10,1,0,()=>{throw Error('real PredatorHunt must not create poison');},true);expect(hunted.toxicBuildup).toBeUndefined();
});

test('actual constructed Cobra retains its toxic tool and anatomical contact poisons the same human original',()=>{
 const {w,p}=scene(),built=constructInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256.Cobra,id:w.nextId++,cell:{x:11,z:12},tick:w.tick,random:new WorldGenerationRandom(19),unspawnedAnimals:[]});
 expect(built.status).toBe('ready');if(built.status!=='ready')throw Error(JSON.stringify(built));const cobra=built.animal;w.wildlife!.animals.push(cobra);
 const tool=animalMeleeTools(cobra).find(t=>t.kind==='toxic-bite');expect(tool).toBeDefined();expect(cobraAdmissionReason256(w)).toBeUndefined();
 const actor=p,record=createMedicalRecord(w.tick);p.health=record;
 strikeLivingTarget(w,cobra,p,tool!,w.tick*10,{rng:w.rng},undefined,{surprise:true});
 expect(w.pawns[0]).toBe(actor);expect(cobra.species).toBe('cobra');expect(p.health!.injuries.length).toBeGreaterThan(0);expect(p.health!.toxicBuildup!.severity).toBeGreaterThan(0);
 expect(cobra.strike!.targetId).toBe(p.id);expect(cobra.strike!.outcome).toBe('hit');expect(validateMedicalRecord(p.health!,true,true,true,true,false,false,true,true,true,true,true,256,true)).toBeNull();
});

test('causal trial uses the real hash and stage before decay, once; unspawned/asleep trials create no future request',()=>{
 const {p}=scene(),core=atHash(p.id,600),h=createMedicalRecord(Math.ceil(core/10));h.toxicBuildup={severity:Math.fround(.4),bornAt:h.tick};
 let calls=0;const random=animalClinicalRandom256(()=>{calls++;return .999;});
 advanceToxicBuildupCore256(h,p.id,core,random,{spawned:true,awake:true});expect(h.toxicBuildup!.vomitRequestedAt).toBeUndefined();
 // Directly script by the exact closed cadence if the hash also hits60: its
 // two dyadic risk checks each consume only their first rejecting draw.
 h.toxicBuildup={severity:Math.fround(.4),bornAt:h.tick};let n=0;
 const trial=animalClinicalRandom256(()=>++n<=2?.999:0);
 advanceToxicBuildupCore256(h,p.id,core,trial,{spawned:true,awake:true});expect(h.toxicBuildup!.vomitRequestedAt).toBe(core);expect(n).toBe(3);
 const severity=h.toxicBuildup!.severity;expect(severity).toBeLessThan(Math.fround(.4));
 for(const physical of [{spawned:false,awake:true},{spawned:true,awake:false}]){h.toxicBuildup={severity:Math.fround(.4),bornAt:h.tick};n=0;advanceToxicBuildupCore256(h,p.id,core,trial,physical);expect(n).toBe(3);expect(h.toxicBuildup!.vomitRequestedAt).toBeUndefined();}
 expect(calls).toBe(3);
});

test('accepted trial waits for the same edge, consumes no trial draw and transfers exactly one physical episode',()=>{
 const {p}=scene(),core=atHash(p.id,600),tick=Math.ceil(core/10),h=createMedicalRecord(tick);p.health=h;
 h.toxicBuildup={severity:Math.fround(.4),bornAt:tick,vomitRequestedAt:core};h.flu={bornAt:tick,severity:100000000,immunity:0,luck:1000000,vomit:{remainingCore:600,cell:{x:p.x,z:p.z}}};
 p.motion={from:{x:11,z:12},to:{x:12,z:12},start:tick-1,end:tick+1.5,speedFactor:1,terrainDelay:0};p.state='moving';p.moveCooldown=2;
 const edge=p.motion;let starts=0,draws=0,filth=0;
 const context:FoodPoisonVomitContext={awake:true,position:p,foodLevel:90,foodMax:100,random:()=>{draws++;return .5;},canStand:()=>true,deposit:()=>{filth++;},start:()=>{if(p.moveCooldown)return false;starts++;p.state='idle';return true;}};
 expect(processToxicVomit256(h,tick,p.id,context,toxicVomitEngagement256(p,tick))!.active).toBe(false);expect(draws).toBe(0);expect(starts).toBe(0);expect(p.motion).toBe(edge);expect(h.flu.vomit).toBeDefined();
 h.tick=tick+2;p.moveCooldown=0;const result=processToxicVomit256(h,tick+2,p.id,context,toxicVomitEngagement256(p,tick+2));
 expect(result!.active).toBe(true);expect(starts).toBe(1);expect(draws).toBe(2);expect(h.toxicBuildup!.vomitRequestedAt).toBeUndefined();expect(h.toxicBuildup!.vomit!.remainingCore).toBe(590);expect(h.flu.vomit).toBeUndefined();expect(filth).toBeLessThanOrEqual(1);
 h.toxicBuildup!.vomitRequestedAt=core;processToxicVomit256(h,tick+3,p.id,{...context,awake:false});expect(h.toxicBuildup!.vomitRequestedAt).toBeUndefined();expect(h.toxicBuildup!.vomit).toBeUndefined();
});

test('human and literal historical animal chronic cases use their carried model and same unique core; only human Dementia has milli-XP remainder',()=>{
 const {w,p}=scene();p.health=createMedicalRecord(w.tick);const r=animalClinicalRandom256(()=>.5);
 expect(tryApplyAnimalAgeCondition256(p.health,'Dementia',r).status).toBe('applied');expect(tryApplyAnimalAgeCondition256(p.health,'Carcinoma',r).status).toBe('applied');
 const model=medicalModel(p.health),brain=clinicalConditionPartFacts256(model).find(row=>row.defId==='Brain')!;
 expect(p.health.animalAgeConditions!.cases[0]!.part).toBe(brain.part);expect(p.health.animalAgeConditions!.cases[0]!.skillDecayRemainders).toEqual({});
 p.health.animalAgeConditions!.cases[0]!.severity=Math.fround(.8);p.skills.melee.level=12;p.skills.melee.xp=xpRequired(12)/2;
 const startingXp=p.skills.melee.xp;w.tick++;const frontier=humanConditionMedicalFrontier256(p,p.health,w.tick,()=>.999,{kind:'map',world:w})!;
 advanceMedical(p.health,1,{phase:p.id%60,posture:'standing',starving:false},()=>.999,frontier);frontier.commit();
 expect(p.skills.melee.xp).toBeLessThan(startingXp);expect(p.health.animalAgeConditions!.cases[0]!.skillDecayRemainders!.melee).toBeGreaterThanOrEqual(0);expect(p.health.animalAgeConditions!.cases[0]!.skillDecayRemainders!.melee).toBeLessThan(1);
 const legacy={id:w.nextId++,species:'hare' as const,ageTicks:6000,sex:'male' as const,x:15,z:15,food:.2,rest:1,state:'idle' as const,path:[],nextDecision:w.tick};
 const h=createAnimalMedicalRecord256(w,legacy);expect(h.animalGrowth).toBeUndefined();expect(tryApplyAnimalAgeCondition256(h,'Dementia',r).status).toBe('applied');expect(h.animalAgeConditions!.cases[0]!.part).toBe('brain');expect(h.animalAgeConditions!.cases[0]!.skillDecayRemainders).toBeUndefined();expect(legacy).not.toHaveProperty('growthTracker');
});

test('strict255, accessor and nonspatial pending/episode guards preserve absence and do not run a getter',()=>{
 const {w,p}=scene();p.health=createMedicalRecord(w.tick);expect(validToxicBuildupHeader256(p.health,255)).toBe(true);
 p.health.toxicBuildup={severity:Math.fround(.2),bornAt:w.tick};expect(validToxicBuildupHeader256(p.health,255)).toBe(false);expect(validToxicBuildupTransport256(p,256,w.tick)).toBe(true);
 const record=createMedicalRecord(w.tick);let reads=0;Object.defineProperty(record,'toxicBuildup',{enumerable:true,get(){reads++;return p.health!.toxicBuildup;}});expect(validToxicBuildupHeader256(record,256)).toBe(false);expect(reads).toBe(0);
 p.health.toxicBuildup.vomitRequestedAt=atHash(p.id,600,1);expect(validToxicBuildupTransport256(p,256,w.tick)).toBe(false);
 delete p.health.toxicBuildup.vomitRequestedAt;p.health.toxicBuildup.vomit={remainingCore:300,cell:{x:p.x,z:p.z}};expect(validToxicBuildupTransport256(p,256,w.tick)).toBe(false);
 expect(validHumanClinicalConditionOwner256(p,255,w.tick,true)).toBe(false);
});

test('the same Carcinoma target traverses actual self-tend pickup/contact and consumes one real medicine',()=>{
 const {w,p}=scene();p.health=createMedicalRecord(w.tick);p.selfTend=true;p.skills.medicine.level=12;
 expect(tryApplyAnimalAgeCondition256(p.health,'Carcinoma',animalClinicalRandom256(()=>.5)).status).toBe('applied');
 const c=p.health.animalAgeConditions!.cases[0]!,record=p.health;addGroundMaterial(w,'medicine',1,{x:15,z:12},'medicine');
 const dose=w.piles.find(i=>i.item==='medicine')!,doseId=dose.id;expect(applyTending(w,{pawnId:p.id,patientId:p.id,queue:false}).ok).toBe(true);
 let sawPickup=false,sawContact=false;
 for(let i=0;i<200&&c.tend!.ticksLeft<0;i++){
  stepWorld(w);
  if(w.piles.some(i=>i.id===doseId&&i.owner.type==='pawn'&&i.owner.pawnId===p.id))sawPickup=true;
  if(p.tend?.phase==='tend'&&p.x===p.tend.spot.x&&p.z===p.tend.spot.z)sawContact=true;
 }
 expect(sawPickup).toBe(true);expect(sawContact).toBe(true);expect(c.tend!.ticksLeft).toBeGreaterThan(0);expect(c.tend!.totalQuality).toBeGreaterThan(0);
 expect(p.health).toBe(record);expect(w.piles.some(i=>i.id===doseId)).toBe(false);expect(w.piles.filter(i=>i.item==='medicine').reduce((n,i)=>n+i.quantity,0)).toBe(0);
});

test('true terminal commit rolls rot once and the same real human body inherits it; RAW cannot invent rotten age without that decision',()=>{
 const {w,p}=scene();p.health=createMedicalRecord(w.tick);p.health.toxicBuildup={severity:1,bornAt:w.tick};reconcileMedicalDeath(p.health);expect(p.health.death!.cause).toBe('toxic-buildup');
 let calls=0;commitToxicDeath256(p.health,()=>{calls++;return .5;});const record=p.health;reconcilePawnHealth(w,p);advanceHumanCorpses(w);expect(calls).toBe(1);expect(p.health).toBe(record);expect(p.state).toBe('dead');
 const body=p.body!,corpse=w.piles.find(i=>i.id===body.pileId)!;expect(corpse.item).toBe('human-corpse');expect(corpse.humanCorpse!.pawnId).toBe(p.id);expect(corpse.owner).toEqual({type:'ground',x:p.x,z:p.z});expect(body.rot).toBeUndefined();
 expect(corpse.rot!.progress).toBeGreaterThanOrEqual(CORPSE_ROT_TICKS);expect(validCorpseRot(corpse.rot,w.tick,body.observedAt,p.health)).toBe(true);expect(validCorpseRot(corpse.rot,w.tick,body.observedAt)).toBe(false);
 const resumed=JSON.parse(JSON.stringify(p.health));commitToxicDeath256(resumed,()=>{throw Error('read/reconcile cannot reroll terminal rot');});expect(resumed).toEqual(p.health);expect(assessMedical(p.health).capacities.consciousness).toBeLessThanOrEqual(Math.fround(.1));
});

test('explosive toxic death refuses before terminal poison RNG/rot/adoption when the real wave cannot be reserved',()=>{
 const {w}=scene(),built=constructInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256.Boomalope,id:w.nextId++,cell:{x:15,z:15},tick:w.tick,random:new WorldGenerationRandom(19),unspawnedAnimals:[]});
 expect(built.status).toBe('ready');if(built.status!=='ready')throw Error(JSON.stringify(built));const a=built.animal;w.wildlife!.animals.push(a);
 const record=structuredClone(a.health??createAnimalMedicalRecord256(w,a));record.toxicBuildup={severity:1,bornAt:w.tick};reconcileMedicalDeath(record);
 w.nextId=Number.MAX_SAFE_INTEGER;const before=JSON.stringify(w),recordBefore=JSON.stringify(record),random={rng:w.rng};
 expect(()=>commitAnimalImpact(w,a,record,random)).toThrow();expect(JSON.stringify(w)).toBe(before);expect(JSON.stringify(record)).toBe(recordBefore);expect(random.rng).toBe(w.rng);expect(record.toxicBuildup!.rotOnDeath).toBeUndefined();
});
