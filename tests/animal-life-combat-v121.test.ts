import { expect,test } from 'vitest';
import { adultAgeTicks,juvenileAgeTicks } from '../src/sim/animal-life.ts';
import { corpseYield } from '../src/sim/corpses.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { captureProjectileBatch } from '../src/sim/projectile-batch.ts';
import { captureWorldProjectileTargets } from '../src/sim/projectile-world.ts';
import type { ProjectileTarget } from '../src/sim/projectile-rules.ts';
import type { MaterialPile } from '../src/sim/types.ts';
import { huntingCamp } from './scenarios/hunting.ts';

test('animal projectile collision uses the same age-dependent body size in both batch paths',()=>{
  const w=huntingCamp(),a=w.wildlife!.animals[0]!;
  const size=(target:ProjectileTarget|undefined)=>{if(target?.kind!=='pawn')throw Error('Expected animal target');return target.bodySize;};
  const target=()=>size(captureWorldProjectileTargets(w).scene(new Set(),1).target(`animal:${a.id}`));
  const batched=()=>size(captureProjectileBatch(w).refresh(w)(new Set(),1).target(`animal:${a.id}`));
  a.ageTicks=0;
  expect(target()).toBeCloseTo(.04);
  expect(batched()).toBeCloseTo(.04);
  a.ageTicks=juvenileAgeTicks('hare');
  expect(target()).toBeCloseTo(.1);
  expect(batched()).toBeCloseTo(.1);
  a.ageTicks=adultAgeTicks('hare');
  expect(target()).toBeCloseTo(.2);
  expect(batched()).toBeCloseTo(.2);
});

test('a young body retains its age and yields less meat and leather than an adult',()=>{
  const w=huntingCamp(),a=w.wildlife!.animals[0]!;
  const health={...createMedicalRecord(w.tick),body:'hare' as const,death:{tick:w.tick,cause:'blood-loss' as const}};
  const pile:MaterialPile={id:a.id,item:'hare-corpse',kind:'corpse',quantity:1,owner:{type:'ground',x:a.x,z:a.z},
    rot:{progress:0,atTick:w.tick},corpse:{animalId:a.id,species:'hare',sex:a.sex,ageTicks:0,health}};
  const baby=corpseYield(pile);
  pile.corpse!.ageTicks=juvenileAgeTicks('hare');
  const juvenile=corpseYield(pile);
  pile.corpse!.ageTicks=adultAgeTicks('hare');
  const adult=corpseYield(pile);
  expect(baby.meat).toBeLessThan(juvenile.meat);
  expect(juvenile.meat).toBeLessThan(adult.meat);
  expect(baby.leather).toBeLessThan(juvenile.leather);
  expect(juvenile.leather).toBeLessThan(adult.leather);
});
