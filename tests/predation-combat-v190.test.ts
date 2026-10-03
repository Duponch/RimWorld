import { expect,test } from 'vitest';
import { animalCombatCamp } from './scenarios/animal-combat';
import { animalBodyModel,animalPartBaseHp } from '../src/sim/body-model';
import { animalSpecies } from '../src/sim/animal-species';
import { adultAgeTicks } from '../src/sim/animal-life';
import { createMedicalRecord,reconcileMedicalDeath } from '../src/sim/injury-state';
import { BLOOD_UNIT,HP_UNIT } from '../src/sim/injury-rules';
import { animalSummaryHealth,acceptableAnimalPrey,animalPreyCandidates,animalPreyScore,animalPredationTarget,cancelAnimalPredation,reconcileAnimalPredation } from '../src/sim/wildlife-predation';
import { animalMeleeTarget,animalMeleeTools,advanceAnimalMelee,moveAnimalMelee } from '../src/sim/wildlife-melee';
import { damageAnimalWithBullet,reconcileAnimalHealth } from '../src/sim/wildlife-health';
import { strikeLivingTarget } from '../src/sim/living-melee';
import { resolveUnarmoredMelee } from '../src/sim/melee-impact';
import { animalNavigation,moveAnimal } from '../src/sim/wildlife-navigation';
import { captureWorldShotGrid } from '../src/sim/combat-world';
import { blockedCells } from '../src/sim/pathfinding';
import { disturbanceEvents } from '../src/sim/disturbance';
import { advanceWorldCombat } from '../src/sim/combat-system';
import { validStunShape } from '../src/sim/melee-save';
import type { WildAnimal } from '../src/sim/wildlife-state';

function camp(){
  const w=animalCombatCamp();w.tick=1;w.pawns.forEach((p,i)=>{p.x=3+i*4;p.z=3;});
  const prey=w.wildlife!.animals[0]!;Object.assign(prey,{x:11,z:10,rest:1,nextDecision:w.tick+100});
  const fox:WildAnimal={id:w.nextId++,species:'red-fox',sex:'male',ageTicks:adultAgeTicks('red-fox'),
    x:10,z:10,food:.1,rest:1,state:'idle',path:[],nextDecision:w.tick,
    predation:{targetId:prey.id,startedAtCore:w.tick*10,firstHit:true}};
  w.wildlife!.animals.push(fox);return {w,fox,prey};
}

test('adult summary uses multiplicative acute injuries, raw missing HP and no systemic or scar substitute',()=>{
  const {fox}=camp();fox.health={...createMedicalRecord(1),body:'red-fox'};
  const h=fox.health;
  h.injuries=[{id:1,part:'left-front-leg',kind:'cut',severity:2*HP_UNIT,bornAt:1},
    {id:2,part:'right-front-leg',kind:'cut',severity:3*HP_UNIT,bornAt:1}];
  h.nextInjuryId=3;
  const denominator=75*.7;
  expect(animalSummaryHealth(fox)).toBeCloseTo((1-2/denominator)*(1-3/denominator),12);
  h.bloodLoss=BLOOD_UNIT/2;h.malnutrition=400000000;h.heatstroke=200000000;
  expect(animalSummaryHealth(fox)).toBeCloseTo((1-2/denominator)*(1-3/denominator),12);
  h.injuries[1]!.scar={threshold:3*HP_UNIT,pain:1};
  expect(animalSummaryHealth(fox)).toBeCloseTo(1-2/denominator,12);
  h.injuries=[];h.missing=[{part:'left-front-leg',bornAt:1},{part:'left-front-paw',bornAt:1}];
  expect(animalPartBaseHp('red-fox','left-front-leg')).toBe(30);
  expect(animalBodyModel('red-fox').byId['left-front-leg'].hp).toBe(21);
  expect(animalSummaryHealth(fox)).toBeCloseTo(1-30/denominator,12);
  h.missing[0]!.tended=true;
  expect(animalSummaryHealth(fox)).toBe(1); // descendants of a missing root do not count twice
  h.missing=[{part:'left-front-paw',bornAt:1}];h.tick=9001;
  expect(animalSummaryHealth(fox)).toBe(1);
  h.missing=[];h.injuries=Array.from({length:12},(_,i)=>({id:i+1,part:'torso' as const,kind:'cut' as const,severity:50000,bornAt:1}));
  expect(animalSummaryHealth(fox)).toBe(.05);
  h.death={tick:1,cause:'trauma'};expect(animalSummaryHealth(fox)).toBe(0);
});

test('prey score and admissibility use body size, stage and health without mutating World or RNG',()=>{
  const {w,fox,prey}=camp(),before=structuredClone(w);
  expect(acceptableAnimalPrey(fox,prey)).toBe(true);
  expect(animalPreyScore(fox,prey)).toBeCloseTo(-1-56*33/45,12);
  expect(animalPreyCandidates(w,fox)).toEqual([prey]);expect(w).toEqual(before);
  fox.health={...createMedicalRecord(1),body:'red-fox',injuries:[{id:1,part:'torso',kind:'cut',severity:40000,bornAt:1}],nextInjuryId:2};
  expect(animalSummaryHealth(fox)).toBeLessThan(.25);
  expect(acceptableAnimalPrey(fox,prey)).toBe(false);
  prey.health={...createMedicalRecord(1),body:'hare',bloodLoss:BLOOD_UNIT};reconcileMedicalDeath(prey.health);reconcileAnimalHealth(w,prey);
  // Terminal physiology is not a downed candidate; a real incapacity remains required.
  expect(acceptableAnimalPrey(fox,prey)).toBe(false);
});

test('first surprise guarantees hit and adds 420 Core stun without changing historic stun validation',()=>{
  const {w,fox,prey}=camp();
  const teeth={...animalMeleeTools(fox).find(t=>t.id==='teeth')!,damage:1};
  strikeLivingTarget(w,fox,prey,teeth,10,{rng:w.rng},undefined,{surprise:true,surpriseStun:14});
  expect(fox.strike?.outcome).toBe('hit');expect(prey.state).not.toBe('dead');expect(prey.state).not.toBe('downed');
  expect(prey.stun).toEqual({sinceCore:10,untilCore:430});
  expect(validStunShape(prey.stun,178,w.tick)).toBe(false);
  expect(validStunShape(prey.stun,178,w.tick,420)).toBe(true);
  expect(prey.health?.injuries.some(i=>i.kind==='bite')).toBe(true);
});

test('predation waits both physical edges and captures a real first strike in the world substeps',()=>{
  const {w,fox,prey}=camp();prey.path=[{x:11,z:11}];moveAnimal(w,prey,animalNavigation(w).step);
  const blocked=()=>blockedCells(w,true),grid=()=>captureWorldShotGrid(w),rng=w.rng;
  expect(advanceAnimalMelee(w,fox,10,blocked,grid,disturbanceEvents(w))).toBe(false);
  expect(fox.strike).toBeUndefined();expect(w.rng).toBe(rng);expect(fox.predation?.firstHit).toBe(true);
  w.tick=Math.ceil(prey.motion!.end)+1;
  advanceWorldCombat(w);
  expect(fox.strike?.targetId).toBe(prey.id);expect(fox.strike?.outcome).toBe('hit');expect(fox.predation?.firstHit).toBe(false);
  expect(fox.strike!.atCore/10).toBeGreaterThanOrEqual(prey.motion!.end);
});

test('melee movement never starts a pursuit flood and cancellation preserves edge and recovery',()=>{
  const {w,fox,prey}=camp();prey.x=16;
  expect(moveAnimalMelee(w,fox,()=>{throw Error('global hunt may not use local retaliation navigation');},()=>blockedCells(w,true),()=>captureWorldShotGrid(w))).toBe(false);
  fox.path=[{x:11,z:10}];moveAnimal(w,fox,animalNavigation(w).step);
  const edge=structuredClone(fox.motion);
  cancelAnimalPredation(w,fox);
  expect(fox.predation).toBeUndefined();expect(fox.path).toEqual([]);expect(fox.motion).toEqual(edge);
  w.tick=Math.ceil(fox.motion!.end);fox.state='idle';
  fox.predation={targetId:prey.id,startedAtCore:w.tick*10,firstHit:false};
  fox.strike={targetId:prey.id,atCore:w.tick*10,untilCore:w.tick*10+120,tool:'teeth',outcome:'hit'};
  const strike=structuredClone(fox.strike);cancelAnimalPredation(w,fox);expect(fox.strike).toEqual(strike);
});

test('animal threat resolves its real attacker and downed prey remains finishable after its fall',()=>{
  const {w,fox,prey}=camp();prey.threat={targetId:fox.id,harmedAtCore:10};
  expect(animalMeleeTarget(w,prey,10)).toBe(fox);
  prey.health={...createMedicalRecord(1),body:'hare',bloodLoss:Math.round(BLOOD_UNIT*.7)};reconcileAnimalHealth(w,prey);
  expect(prey.state).toBe('downed');expect(animalPredationTarget(w,fox)).toBe(prey);
  expect(advanceAnimalMelee(w,fox,10,()=>blockedCells(w,true),()=>captureWorldShotGrid(w),disturbanceEvents(w))).toBe(true);
  expect(fox.strike?.targetId).toBe(prey.id);expect(fox.strike?.outcome).toBe('hit');
});

test('strict chase timeout keeps nearby and retained bodies, but cancels a vanished identity',()=>{
  const {w,fox,prey}=camp();fox.predation!.startedAtCore=0;prey.x=13;
  reconcileAnimalPredation(w,fox,5000);expect(fox.predation).toBeDefined();
  reconcileAnimalPredation(w,fox,5001);expect(fox.predation).toBeUndefined();
  fox.predation={targetId:prey.id,startedAtCore:0,firstHit:false};prey.x=11;
  prey.health={...createMedicalRecord(1),body:'hare',death:{tick:1,cause:'trauma'}};prey.state='dead';
  reconcileAnimalPredation(w,fox,5001);expect(fox.predation).toBeDefined();expect(animalPredationTarget(w,fox,5001)).toBeUndefined();
  w.wildlife!.animals=w.wildlife!.animals.filter(a=>a!==prey);
  reconcileAnimalPredation(w,fox,5001);expect(fox.predation).toBeUndefined();
});

test('identified third-party ranged impact interrupts hunt while preserving an engaged recovery',()=>{
  const {w,fox,prey}=camp();fox.strike={targetId:prey.id,atCore:10,untilCore:130,tool:'teeth',outcome:'hit'};
  damageAnimalWithBullet(w,fox,{damage:1,part:'left-rear-leg'},10,w.pawns[0],w.pawns[0]!.id);
  expect(fox.predation).toBeUndefined();expect(fox.flee).toBeDefined();expect(fox.strike?.targetId).toBe(prey.id);
  const own=camp();damageAnimalWithBullet(own.w,own.fox,{damage:1,part:'left-rear-leg'},10,own.prey,own.prey.id);
  expect(own.fox.predation).toBeDefined();expect(own.fox.flee).toBeUndefined();
});

test('Scratch splits into one outside neighbour and clinical cut without Cut spread',()=>{
  const fresh={...createMedicalRecord(1),body:'red-fox' as const};
  const result=resolveUnarmoredMelee(fresh,{damage:2,kind:'scratch',part:'left-front-leg'},()=>.5);
  expect(result.layers).toHaveLength(2);
  expect(result.layers[0]).toEqual({part:'left-front-leg',kind:'cut',severity:1340});
  expect(result.layers[1]).toEqual({part:'torso',kind:'cut',severity:1340});
  expect(fresh.injuries).toEqual([]);expect(result.stun).toBe(false);
  expect(animalSpecies('red-fox').melee.find(t=>t.id==='head')?.surpriseStun).toBeUndefined();
});
