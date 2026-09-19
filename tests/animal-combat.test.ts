import { expect,test } from 'vitest';
import { applyCommand,stepWorld,validateWorld,serializeWorld,deserializeWorld } from '../src/sim/index';
import { HARE_MODEL,HUMAN_MODEL } from '../src/sim/body-model';
import { assessBody } from '../src/sim/body-capacities';
import { createMedicalRecord,addResolvedInjury,medicalPain,medicalBleedUnits,medicalStatus } from '../src/sim/injury-state';
import { validateMedicalRecord } from '../src/sim/injury-validation';
import { advanceMedical } from '../src/sim/injury-evolution';
import { selectBulletPart,resolveUnarmoredBullet } from '../src/sim/bullet-impact';
import { damageAnimalWithBullet,advanceAnimalHealth,scareAnimal } from '../src/sim/wildlife-health';
import { captureWorldProjectileTargets } from '../src/sim/projectile-world';
import { captureProjectileBatch } from '../src/sim/projectile-batch';
import { animalNavigation,moveAnimal } from '../src/sim/wildlife-navigation';
import { animalEscape } from '../src/sim/wildlife-flight';
import { MotionRecorder } from '../src/bridge/motion-tracks';
import { travelPieces } from '../src/sim/travel-timing';
import { animalCombatCamp } from './scenarios/animal-combat';

const record=()=>({...createMedicalRecord(),body:'hare' as const});
const noScar=()=>.999999;
test('quadruped anatomy, coverage and physiological scaling, without human limb substitutions',()=>{
  expect(HARE_MODEL.parts).toHaveLength(28);expect(HARE_MODEL.coverage.reduce((a,b)=>a+b,0)).toBeCloseTo(1,12);
  expect(HARE_MODEL.byId.torso.hp).toBe(16);expect(HARE_MODEL.byId['left-ear'].hp).toBe(5);
  expect(Object.hasOwn(HARE_MODEL.byId,'left-hand')).toBe(false);
  const counts=new Map<string,number>(),r=record();
  for(let i=0;i<10000;i++){const id=selectBulletPart(r,()=>(i+.5)/10000)!;counts.set(id,(counts.get(id)??0)+1);}
  for(const [i,p] of HARE_MODEL.parts.entries())expect(Math.abs((counts.get(p.id)??0)-HARE_MODEL.coverage[i]!*10000),p.id).toBeLessThan(1.01);
  const limbs=['left-front-leg','right-front-leg','left-rear-leg','right-rear-leg'] as const;
  for(let mask=0;mask<16;mask++){
    const missing=limbs.filter((_,i)=>mask&(1<<i)),b=assessBody({missing,damage:[],pain:0},HARE_MODEL);
    expect(b.capacities.moving).toBe(missing.length<=2?1-missing.length/4:0);expect(b.vitalFailure).toBe(false);
  }
  for(const part of HARE_MODEL.parts){
    const b=assessBody({missing:[part.id],damage:[],pain:0},HARE_MODEL);
    for(const capacity of Object.values(b.capacities))expect(Number.isFinite(capacity)&&capacity>=0&&capacity<=1,part.id).toBe(true);
  }
  const human=createMedicalRecord();addResolvedInjury(human,'torso','gunshot',2000,noScar);addResolvedInjury(r,'torso','gunshot',2000,noScar);
  expect(medicalPain(r)).toBeCloseTo(medicalPain(human)/.4);expect(medicalBleedUnits(r)).toBe(medicalBleedUnits(human)/.4);
  expect(validateMedicalRecord(r,true,true,false,false,true)).toBeNull();expect(validateMedicalRecord(r)).not.toBeNull();
  advanceMedical(r,60,{phase:0,posture:'standing',starving:false},noScar);expect(r.injuries[0]!.severity).toBe(1968);
  expect(HUMAN_MODEL.byId.torso.hp).toBe(40);
  expect(()=>resolveUnarmoredBullet(record(),{part:'left-hand',damage:1},noScar)).toThrow();
});

test('violent downing and later blood loss are distinct, death is irreversible and medical clocks continue',()=>{
  const outcomes=new Set<string>();
  for(let seed=1;seed<70;seed++){
    const w=animalCombatCamp(),a=w.wildlife!.animals[0]!;w.rng=seed*70019;
    damageAnimalWithBullet(w,a,{part:'spine',damage:10},w.tick*10,w.pawns[0]);
    expect(['downed','dead']).toContain(a.state);outcomes.add(a.state);expect(validateWorld(w)).toEqual([]);
    const copy=deserializeWorld(serializeWorld(w));stepWorld(w,200);stepWorld(copy,200);expect(copy).toEqual(w);
    expect(validateWorld(w)).toEqual([]);
  }
  expect([...outcomes].sort()).toEqual(['dead','downed']);
  const w=animalCombatCamp(),a=w.wildlife!.animals[0]!;a.health={...record(),tick:w.tick,bloodLoss:180_000_000};
  advanceAnimalHealth(w,a);expect(a.state).toBe('downed');expect(a.health.death).toBeUndefined();
  damageAnimalWithBullet(w,a,{part:'heart',damage:7});expect(a.state).toBe('dead');
  const dead=structuredClone(a),piles=structuredClone(w.piles),rng=w.rng;stepWorld(w,50);expect(a.food).toBe(dead.food);expect(a.health).toEqual(dead.health);
  expect(a.meal).toBeUndefined();expect(a.path).toEqual([]);expect(w.piles).toEqual(piles);
  const before=structuredClone(w);expect(()=>damageAnimalWithBullet(w,a,{part:'left-hand',damage:1})).toThrow();expect(w).toEqual(before);expect(rng).toBeGreaterThan(0);
});

test('real shots use small-animal collision and moving overlays, preserve aim/save/flight and physiological consequences',()=>{
  const w=animalCombatCamp(),a=w.wildlife!.animals[0]!,p=w.pawns[0]!;
  const full=captureWorldProjectileTargets(w).scene(new Set([a.id]),.4),batch=captureProjectileBatch(w);
  expect(full.target(`animal:${a.id}`)).toMatchObject({bodySize:.2,friendly:false,standing:true});
  expect(batch.refresh(w)(new Set([a.id]),.4).at(a)).toEqual(full.at(a));
  expect(applyCommand(w,{type:'shoot',pawnIds:[p.id],targetId:a.id}).ok).toBe(true);
  const copy=deserializeWorld(serializeWorld(w));let flight=false,hit=false;
  for(let i=0;i<500&&!hit;i++){
    stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);
    flight ||= !!w.projectiles?.length;hit=!!a.health;
    if(!p.shooting&&a.state!=='dead'&&a.state!=='downed')applyCommand(w,{type:'shoot',pawnIds:[p.id],targetId:a.id}),applyCommand(copy,{type:'shoot',pawnIds:[p.id],targetId:a.id});
  }
  expect(flight).toBe(true);expect(hit).toBe(true);expect(p.skills.shooting.xp).toBeGreaterThan(0);
  if(a.state!=='dead'){damageAnimalWithBullet(w,a,{part:'torso',damage:30});}
  expect(batch.refresh(w)(new Set(),1).target(`animal:${a.id}`)).toBeUndefined();
  expect(applyCommand(w,{type:'shoot',pawnIds:[p.id],targetId:a.id}).ok).toBe(false);
  stepWorld(w,20);expect(p.shooting?.order).toBeFalsy();expect(validateWorld(w)).toEqual([]);
});

test('flight negotiates an enclosure, captured diagonal remains continuous after stagger and injury',()=>{
  const w=animalCombatCamp(),a=w.wildlife!.animals[0]!;a.x=10;a.z=10;
  for(let z=8;z<=12;z++)w.tiles[z*w.width+11]={terrain:'rock'};
  scareAnimal(w,a,{x:8,z:10},w.tick*10);const nav=animalNavigation(w),path=animalEscape(w,a,nav)!;
  expect(path.length).toBeGreaterThan(5);let from={x:a.x,z:a.z};for(const next of path){expect(nav.step(from,next)).toBe(true);from=next;}
  a.path=[{x:9,z:11}];moveAnimal(w,a,nav.step);const before=structuredClone(a.motion!);w.tick++;
  damageAnimalWithBullet(w,a,{part:'tail',damage:1},w.tick*10,w.pawns[0]);
  expect(a.motion!.from).toEqual(before.from);expect(a.motion!.to).toEqual(before.to);expect(a.motion!.start).toBe(before.start);
  const pieces=travelPieces(a.motion!);expect(pieces[0]!.end).toBe(w.tick);expect(pieces[0]!.toFraction).toBeCloseTo(1/Math.SQRT2);
  expect(pieces.at(-1)!.toFraction).toBe(1);for(let i=1;i<pieces.length;i++)expect(pieces[i]!.fromFraction).toBe(pieces[i-1]!.toFraction);
  const recorder=new MotionRecorder();recorder.capture(w);expect(recorder.snapshot().find(t=>t.id===a.id)!.segments).toEqual(pieces);
  expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));stepWorld(w,120);stepWorld(copy,120);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
});

test('V76 migration is neutral and corruption cannot cross species, clocks, phases or projectile schemas',()=>{
  const w=animalCombatCamp(),a=w.wildlife!.animals[0]!,legacy=structuredClone(w) as any;legacy.schemaVersion=76;
  const migrated=deserializeWorld(JSON.stringify(legacy));expect(migrated).toEqual(w);expect(migrated.wildlife!.animals[0]!.health).toBeUndefined();
  legacy.wildlife.animals[0].health=record();expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow();
  damageAnimalWithBullet(w,a,{part:'tail',damage:1});expect(validateWorld(w)).toEqual([]);
  for(const mutate of [(s:any)=>s.wildlife.animals[0].health.body='human',(s:any)=>s.wildlife.animals[0].health.injuries[0].part='left-hand',(s:any)=>s.wildlife.animals[0].health.tick++,
    (s:any)=>s.wildlife.animals[0].state='dead',(s:any)=>s.pawns[0].health=structuredClone(s.wildlife.animals[0].health)]){
    const bad=structuredClone(w);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
});
