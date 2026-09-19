import { expect,test } from 'vitest';
import { applyCommand,stepWorld,validateWorld,serializeWorld,deserializeWorld } from '../src/sim/index';
import { animalCombatCamp } from './scenarios/animal-combat';
import { animalMeleeTools,animalMeleeTarget } from '../src/sim/wildlife-melee';
import { resolveUnarmoredMelee } from '../src/sim/melee-impact';
import { createMedicalRecord,addResolvedInjury,assessMedical } from '../src/sim/injury-state';
import { delayAnimalImpact } from '../src/sim/wildlife-health';
import { animalNavigation,moveAnimal } from '../src/sim/wildlife-navigation';
import { travelPieces } from '../src/sim/travel-timing';

const camp=()=>{const w=animalCombatCamp(),p=w.pawns[0]!;p.x=9;p.z=10;p.path=[];delete p.motion;p.moveCooldown=0;return w;};
test('species melee anatomy, missing tools, scaled torso stun and armor-independent damage resolution',()=>{
  const w=camp(),a=w.wildlife!.animals[0]!,r={...createMedicalRecord(w.tick),body:'hare' as const};
  expect(animalMeleeTools(a).filter(t=>t.weight>0)).toMatchObject([{id:'teeth',damage:3.4,kind:'bite'}]);
  a.health=r;addResolvedInjury(r,'jaw','bite',4000,()=>.99);
  expect(animalMeleeTools(a).filter(t=>t.weight>0)).toMatchObject([{id:'head',damage:1.5}]);
  const fresh={...createMedicalRecord(w.tick),body:'hare' as const};
  expect(()=>resolveUnarmoredMelee(fresh,{damage:1,kind:'blunt',part:'left-hand'},()=>.9)).toThrow();
  const impact=resolveUnarmoredMelee(fresh,{damage:2,kind:'blunt',part:'head'},()=>.3);
  expect(impact.stun).toBe(true);expect(impact.record.body).toBe('hare');expect(fresh.injuries).toEqual([]);
  const human=resolveUnarmoredMelee(createMedicalRecord(w.tick),{damage:2,kind:'blunt',part:'head'},()=>.3);
  expect(human.stun).toBe(false);
});

test('manual contact attacks provoke a real bite even on misses, survive exact saves, then stop on downing',()=>{
  let retaliations=0,bites=0,misses=0,stops=0;
  for(let seed=1;seed<=24;seed++){
    const w=camp(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;w.rng=seed*97123;
    expect(applyCommand(w,{type:'melee',pawnIds:[p.id],targetId:a.id}).ok).toBe(true);
    let copy=deserializeWorld(serializeWorld(w));
    for(let i=0;i<90;i++){
      stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w),`seed ${seed}, tick ${w.tick}`).toEqual([]);
      if(a.strike)retaliations++;if(p.health?.injuries.some(i=>i.kind==='bite'))bites++;
      if(p.melee?.strike?.outcome==='miss'&&a.threat)misses++;
      if(i%17===0)copy=deserializeWorld(serializeWorld(w));
      if(a.state==='dead'||a.state==='downed'){stops++;expect(p.melee?.order).toBeFalsy();expect(a.threat).toBeUndefined();expect(a.strike).toBeUndefined();break;}
    }
  }
  expect(retaliations).toBeGreaterThan(0);expect(bites).toBeGreaterThan(0);expect(misses).toBeGreaterThan(0);expect(stops).toBeGreaterThan(0);
});

test('brief retaliation pursues physically, expires at exact range/time boundaries, cannot see through a wall',()=>{
  const w=camp(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;
  p.x=13;a.threat={targetId:p.id,harmedAtCore:w.tick*10};
  expect(animalMeleeTarget(w,a,w.tick*10+400)).toBe(p);expect(animalMeleeTarget(w,a,w.tick*10+401)).toBeUndefined();
  p.x=14;expect(animalMeleeTarget(w,a,w.tick*10)).toBeUndefined();p.x=13;
  w.tiles[10*w.width+11]={terrain:'rock'};expect(animalMeleeTarget(w,a,w.tick*10)).toBeUndefined();w.tiles[10*w.width+11]={terrain:'grass'};
  const start={x:a.x,z:a.z};stepWorld(w);expect(a.motion?.from).toEqual(start);expect(a.strike).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  for(let i=0;i<12&&!a.strike;i++)stepWorld(w);
  expect(a.strike).toBeDefined();expect(Math.abs(a.x-p.x)).toBeLessThanOrEqual(1);expect(a.strike!.atCore/10).toBeGreaterThanOrEqual(a.motion?.end??0);
  p.x=20;stepWorld(w);expect(a.threat).toBeUndefined();expect(a.retaliation).toBeUndefined();
  stepWorld(w,20);expect(a.strike).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  const mid=camp(),b=mid.wildlife!.animals[0]!,attacker=mid.pawns[0]!;
  b.threat={targetId:attacker.id,harmedAtCore:mid.tick*10};b.retaliation={targetId:attacker.id,untilCore:mid.tick*10+1};b.path=[{x:11,z:11}];
  moveAnimal(mid,b,animalNavigation(mid).step);const edge=structuredClone(b.motion);
  stepWorld(mid);expect(b.retaliation).toBeUndefined();expect(b.strike).toBeUndefined();expect(b.motion).toEqual(edge);expect(validateWorld(mid)).toEqual([]);
  const replay=deserializeWorld(serializeWorld(mid));stepWorld(mid,45);stepWorld(replay,45);expect(replay).toEqual(mid);expect(validateWorld(mid)).toEqual([]);
});

test('stun and stagger keep a captured diagonal continuous and block attacks while interrupted',()=>{
  const w=camp(),a=w.wildlife!.animals[0]!;a.path=[{x:11,z:11}];a.flee={danger:{x:9,z:10},until:w.tick+600};
  moveAnimal(w,a,animalNavigation(w).step);w.tick++;
  const old=structuredClone(a.motion!);delayAnimalImpact(a,w.tick*10,true);
  expect(a.motion!.start).toBe(old.start);expect(a.motion!.from).toEqual(old.from);
  const pieces=travelPieces(a.motion!);expect(pieces.some(p=>p.fromFraction===p.toFraction)).toBe(true);
  for(let i=1;i<pieces.length;i++){expect(pieces[i]!.fromFraction).toBe(pieces[i-1]!.toFraction);expect(pieces[i]!.start).toBe(pieces[i-1]!.end);}
  expect(pieces.at(-1)!.toFraction).toBe(1);expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,40);stepWorld(copy,40);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
});

test('V77 validation precedes neutral migration; corrupt ownership, timers and tools are refused',()=>{
  const w=camp(),a=w.wildlife!.animals[0]!,p=w.pawns[0]!,old=structuredClone(w) as any;old.schemaVersion=77;
  expect(deserializeWorld(JSON.stringify(old))).toEqual(w);
  old.wildlife.animals[0].threat={targetId:p.id,harmedAtCore:w.tick*10};expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();
  applyCommand(w,{type:'melee',pawnIds:[p.id],targetId:a.id});
  const legacyOrder=structuredClone(w) as any;legacyOrder.schemaVersion=77;expect(()=>deserializeWorld(JSON.stringify(legacyOrder))).toThrow();
  a.threat={targetId:p.id,harmedAtCore:w.tick*10};
  for(const mutate of [(x:any)=>x.wildlife.animals[0].threat.targetId=a.id,(x:any)=>x.wildlife.animals[0].threat.harmedAtCore++,
    (x:any)=>x.wildlife.animals[0].threat.harmedAtCore-=401,(x:any)=>x.wildlife.animals[0].retaliation={targetId:p.id,untilCore:w.tick*10+201},
    (x:any)=>x.wildlife.animals[0].strike={targetId:p.id,atCore:w.tick*10,untilCore:w.tick*10+120,tool:'barrel',outcome:'hit'}]){
    const broken=structuredClone(w);mutate(broken);expect(validateWorld(broken).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(broken))).toThrow();
  }
});


test('medical assessment reuse observes every input mutation immediately, including same-tick impacts and timed stump pain',()=>{
  for(const animal of [false,true]){
    const r={...createMedicalRecord(0),...(animal?{body:'hare' as const}:{})};
    addResolvedInjury(r,'torso','bite',1000,()=>.999);
    const original=assessMedical(r);expect(assessMedical(r)).toBe(original);expect(Object.isFrozen(original.capacities)).toBe(true);
    const compare=()=>expect(assessMedical(r)).toEqual(assessMedical(structuredClone(r)));
    for(const severity of [1001,2100,3700]){r.injuries[0]!.severity=severity;compare();}
    r.injuries[0]!.part='head';compare();r.injuries[0]!.kind='crush';compare();
    r.injuries[0]!.scar={threshold:4000,pain:6};compare();r.injuries[0]!.scar.pain=0;compare();
    r.missing.push({part:'left-ear',bornAt:0});compare();r.missing[0]!.part='right-ear';compare();
    r.tick=8999;compare();const fresh=assessMedical(r);r.tick=9000;compare();expect(assessMedical(r)).not.toBe(fresh);
    r.missing[0]!.tended=true;compare();r.missing=[];compare();
    for(const loss of [45000000,90000000,135000000,180000000]){r.bloodLoss=loss;compare();}
    for(const severity of [340000000,610000000,810000000]){r.heatstroke=severity;compare();r.hypothermia=severity;compare();}
    delete r.heatstroke;delete r.hypothermia;r.bloodLoss=0;r.injuries=[];compare();
    r.death={tick:r.tick,cause:'trauma'};compare();
  }
});
