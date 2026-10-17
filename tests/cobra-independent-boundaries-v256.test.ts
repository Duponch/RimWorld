import {processAggressiveCrisis} from '../src/sim/aggressive-crisis';
import {mentalMeleeOwnership} from '../src/sim/aggressive-crisis-order';
import {updatePawnHealth,healthRandom} from '../src/sim/health';
import {advanceAnimalHealth} from '../src/sim/wildlife-health';
import {constructInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256';
import {WorldGenerationRandom} from '../src/sim/world-generation-random';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256';
import {tryApplyAnimalAgeCondition256} from '../src/sim/animal-birthday-application-256';
import {animalClinicalRandom256} from '../src/sim/animal-condition-medical-frontier-256';
import {enableWildlife} from '../src/sim/wildlife';
import {expect,test} from 'vitest';
import {generateWorld} from '../src/sim/generation';
import {startingPawn} from '../src/sim/starting-pawns';
import {createMedicalRecord} from '../src/sim/injury-state';
import {processPawnVomiting} from '../src/sim/food-hygiene';
import {reconcilePawnHealth} from '../src/sim/health';
import {groupPawnInterval256} from '../src/sim/group-core-cadence-256';
import {applyDraftCommand} from '../src/sim/drafting';
import {applyMeleeCommand} from '../src/sim/melee';
import {addMaterial} from '../src/sim/materials';
import {validToxicBuildupTransport256} from '../src/sim/toxic-buildup-save-256';
import {startHumanConfusion256} from '../src/sim/human-condition-mind-256';

/** Prepared native constructor actors on the real existing terrain constructor.
 * This is a short transition oracle, not the Core initial-world factory. */
function scene(){
 const w=generateWorld(82011,32,32,'temperate-crashlanded-v1');w.tick=100;
 w.resources=[];w.piles=[];w.structures=[];w.jobs=[];for(const t of w.tiles)t.terrain='soil';
 const p=startingPawn(w.nextId++,'Original préparé',12,12,0,55,w.seed,w.tick,256);p.health=createMedicalRecord(w.tick);w.pawns.push(p);return {w,p};
}
const hash600=(id:number)=>{for(let core=1000;core<1600;core++)if(groupPawnInterval256(id,core,600,1))return core;throw Error('Actual600 hash absent');};

test('a true accepted toxic Vomit ends attack mandates but keeps draft, actual recoveries and every owned Thing',()=>{
 for(const kind of ['melee','cooldown','aim'] as const){
  const {w,p}=scene(),core=hash600(p.id);w.tick=Math.ceil(core/10);p.health!.tick=w.tick;
  expect(applyDraftCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);const draft=p.draft;
  const q=startingPawn(w.nextId++,'Cible préparée',13,12,1,55,w.seed,w.tick,256);q.faction='outlaws';w.pawns.push(q);
  addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'revolver');const weapon=w.piles[w.piles.length-1]!;
  addMaterial(w,'apparel',1,{type:'apparel',pawnId:p.id},'cloth-shirt');const shirt=w.piles[w.piles.length-1]!;
  addMaterial(w,'medicine',3,{type:'inventory',pawnId:p.id},'medicine');const inventory=w.piles[w.piles.length-1]!;
  addMaterial(w,'component',5,{type:'pawn',pawnId:p.id},'component');const cargo=w.piles[w.piles.length-1]!;p.interruptedCargo=true;
  if(kind==='melee')p.melee={order:{targetId:q.id,startedDowned:false},strike:{targetId:q.id,atCore:w.tick*10-10,untilCore:w.tick*10+110,tool:'left-fist',outcome:'hit'}};
  else p.shooting={order:{targetId:q.id,weaponId:weapon.id,startedDowned:false},stance:kind==='aim'?{phase:'aim',startedAtCore:w.tick*10-10,endsAtCore:w.tick*10+110,targetStartedDowned:false}:{phase:'cooldown',startedAtCore:w.tick*10-10,endsAtCore:w.tick*10+110}};
  const strike=p.melee?.strike,stance=p.shooting?.stance,recovery=JSON.stringify(strike??stance),goods=[weapon,shirt,inventory,cargo],counts=goods.map(i=>i.quantity);
  p.health!.toxicBuildup={severity:Math.fround(.4),bornAt:w.tick,vomitRequestedAt:core};
  expect(processPawnVomiting(w,p)).toBe(true);expect(p.health!.toxicBuildup!.vomit).toBeDefined();expect(p.health!.toxicBuildup!.vomitRequestedAt).toBeUndefined();expect(p.draft).toBe(draft);
  if(kind==='melee'){expect(p.melee!.order).toBeNull();expect(p.melee!.strike).toBe(strike);expect(JSON.stringify(p.melee!.strike)).toBe(recovery);}
  else if(kind==='cooldown'){expect(p.shooting!.order).toBeNull();expect(p.shooting!.stance).toBe(stance);expect(JSON.stringify(p.shooting!.stance)).toBe(recovery);}
  else expect(p.shooting).toBeUndefined();
  for(let i=0;i<goods.length;i++){expect(w.piles).toContain(goods[i]);expect(goods[i]!.quantity).toBe(counts[i]);}
  expect(weapon.owner).toEqual({type:'equipment',pawnId:p.id});expect(shirt.owner).toEqual({type:'apparel',pawnId:p.id});expect(inventory.owner).toEqual({type:'inventory',pawnId:p.id});
  expect(validToxicBuildupTransport256(p,256,w.tick,w)).toBe(true);expect(applyMeleeCommand(w,{type:'melee',pawnIds:[p.id],targetId:q.id}).ok).toBe(false);
  const forged=structuredClone(p);forged.melee={order:{targetId:q.id,startedDowned:false},strike:null};expect(validToxicBuildupTransport256(forged,256,w.tick,w)).toBe(false);
 }
});

test('external downing during a clinical confusion gives no mood catharsis or free cooldown',()=>{
 const {w,p}=scene();expect(startHumanConfusion256(p,w.tick)).toBe(true);
 const mind=p.mental!,before={cooldown:mind.cooldown,catharsis:[...mind.catharsis]};p.health!.toxicBuildup={severity:Math.fround(.8),bornAt:w.tick};
 reconcilePawnHealth(w,p,undefined,true);expect(p.state).toBe('downed');expect(p.mental).toBe(mind);expect(mind.crisis).toBeUndefined();expect(mind.cooldown).toBe(before.cooldown);expect(mind.catharsis).toEqual(before.catharsis);
 const legacy=scene();legacy.p.mental!.crisis={kind:'sad-wander',age:0,target:null,waitUntil:legacy.w.tick};legacy.p.health!.toxicBuildup={severity:Math.fround(.8),bornAt:legacy.w.tick};
 reconcilePawnHealth(legacy.w,legacy.p,undefined,true);expect(legacy.p.mental!.cooldown).toBe(1500);expect(legacy.p.mental!.catharsis).toEqual([legacy.w.tick+18000]);
});

function inverseHealthState(value:number):number {
 let n=value;for(let i=0;i<7;i++)n=value^(n<<5);value=n>>>0;
 n=value;for(let i=0;i<2;i++)n=value^(n>>>17);value=n>>>0;
 n=value;for(let i=0;i<3;i++)n=value^(n<<13);return n>>>0;
}
const hash60=(id:number)=>{for(let core=1000;core<1060;core++)if(groupPawnInterval256(id,core,60,1))return core;throw Error('Actual60 hash absent');};

test('exhausted toxic condition IDs refuse without actor/skills/clock/RNG effects; actual finite-capacity control can advance once',()=>{
 const {w,p}=scene(),core=hash60(p.id);w.tick=Math.ceil(core/10);p.health=createMedicalRecord(w.tick-1);
 expect(tryApplyAnimalAgeCondition256(p.health,'Dementia',animalClinicalRandom256(()=>.5)).status).toBe('applied');
 p.health.animalAgeConditions!.nextId=Number.MAX_SAFE_INTEGER;p.health.toxicBuildup={severity:Math.fround(.4),bornAt:p.health.tick};
 expect(startHumanConfusion256(p,w.tick)).toBe(true);p.skills.melee.level=12;p.skills.melee.xp=100000;
 // First real MTB rejects Dementia (its only Brain is already present).
 // The next two real draws accept Carcinoma, whose allocation must refuse.
 const seed=inverseHealthState(inverseHealthState(1)),probe={rng:seed};expect(healthRandom(probe)).toBeGreaterThan(1/64);expect(healthRandom(probe)).toBe(1/0x100000000);expect(healthRandom(probe)).toBe(270369/0x100000000);w.rng=seed;
 const actor=p,record=p.health,skills=p.skills,before=JSON.stringify(w);
 expect(()=>updatePawnHealth(w,p)).toThrow('identities exhausted');expect(JSON.stringify(w)).toBe(before);expect(w.pawns).toContain(actor);expect(p.health).toBe(record);expect(p.skills).toBe(skills);expect(w.rng).toBe(seed);
 expect(()=>updatePawnHealth(w,p)).toThrow('identities exhausted');expect(JSON.stringify(w)).toBe(before);
 // A distinct explicitly prepared capacity witness, not a played rewind of
 // the monotone exhausted counter. Same true interval function and stream.
 const control=scene();control.w.tick=w.tick;control.p.health=structuredClone(record);control.p.health.animalAgeConditions!.nextId=2;control.p.skills=structuredClone(skills);control.p.mental=structuredClone(p.mental);control.w.rng=seed;
 updatePawnHealth(control.w,control.p);expect(control.p.health!.tick).toBe(control.w.tick);expect(control.p.health!.animalAgeConditions!.cases.some(c=>c.kind==='Carcinoma')).toBe(true);expect(control.p.health!.animalAgeConditions!.nextId).toBe(3);expect(control.w.rng).not.toBe(seed);
});

test('toxic animal uses the existing private explosion outcome and retains expired-state originals on allocation refusal',()=>{
 const {w}=scene();enableWildlife(w,0);const id=w.nextId++,core=hash60(id);w.tick=Math.ceil(core/10);
 const built=constructInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256.Boomalope,id,cell:{x:15,z:15},tick:w.tick,random:new WorldGenerationRandom(19),unspawnedAnimals:[]});if(built.status!=='ready')throw Error(JSON.stringify(built));const a=built.animal;w.wildlife!.animals.push(a);
 a.health=createAnimalMedicalRecord256(w,a);a.health.tick=w.tick-1;a.health.animalAgeConditions={revision:1,nextId:Number.MAX_SAFE_INTEGER,cases:[]};a.health.toxicBuildup={severity:Math.fround(.4),bornAt:a.health.tick};
 a.stagger={sinceCore:w.tick*10-20,untilCore:w.tick*10};a.sleepUntilCore=w.tick*10-1;w.rng=inverseHealthState(1);
 const record=a.health,before=JSON.stringify(w),rng=w.rng,next=w.nextId;
 expect(()=>advanceAnimalHealth(w,a)).toThrow('identities exhausted');expect(JSON.stringify(w)).toBe(before);expect(a.health).toBe(record);expect(w.wildlife!.animals).toContain(a);expect(w.rng).toBe(rng);expect(w.nextId).toBe(next);
});

test('clinical confused wander never enters aggressive jobs or authorizes an involuntary attack',()=>{
 const {w,p}=scene();expect(startHumanConfusion256(p,w.tick)).toBe(true);const before=JSON.stringify(w);
 const forbidden=()=>{throw Error('Clinical confusion reached an aggressive service');};
 processAggressiveCrisis(w,p,forbidden,{remaining:1,pairs:1},forbidden,{} as never);
 expect(mentalMeleeOwnership(w,p,{targetId:p.id,startedDowned:false,auto:'mental'})).toBe(false);
 expect(JSON.stringify(w)).toBe(before);
});
