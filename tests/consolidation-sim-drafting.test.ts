import { expect, test } from 'vitest';
import { applyCommand } from '../src/sim/engine.ts';
import { processDraft } from '../src/sim/drafting.ts';
import { AUTO_UNDRAFT_TICKS } from '../src/sim/drafting-rules.ts';
import { startAnimalManhunter, recoverAnimalManhunter } from '../src/sim/animal-manhunter.ts';
import { adultAgeTicks } from '../src/sim/animal-life.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { LightEnvironmentCache } from '../src/sim/light-environment.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { equipmentCamp } from './scenarios/equipment.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';

test.each([1,6,28])('an idle drafted colon remains mobilized under a sole manhunter %i cells away, then times out after peace', separation => {
  const w=equipmentCamp(1,64),p=w.pawns[0]!;w.piles=[];
  const a:WildAnimal={id:w.nextId++,species:'hare',sex:'male',ageTicks:adultAgeTicks('hare'),x:p.x+separation,z:p.z,
    food:.2,rest:1,state:'idle',path:[],nextDecision:w.tick};
  w.wildlife={profile:'temperate-hares-v1',rng:811,animals:[a],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);
  expect(applyCommand(w,{type:'fire-at-will',pawnIds:[p.id],enabled:false}).ok).toBe(true);
  expect(startAnimalManhunter(w,a)).toBe(true);a.manhunter!.targetId=p.id;
  p.draft!.lastActiveTick=w.tick-AUTO_UNDRAFT_TICKS;
  const copy=deserializeWorld(serializeWorld(w));
  const decide=(world:typeof w)=>processDraft(world,world.pawns[0]!,()=>blockedCells(world),{remaining:0,pairs:0},()=>new LightEnvironmentCache().read(world));
  decide(w);decide(copy);expect(p.draft?.lastActiveTick).toBe(w.tick);
  expect(validateWorld(w)).toEqual([]);expect(serializeWorld(w)).toBe(serializeWorld(copy));
  recoverAnimalManhunter(w,a);recoverAnimalManhunter(copy,copy.wildlife!.animals[0]!);
  w.tick+=AUTO_UNDRAFT_TICKS;copy.tick=w.tick;decide(w);decide(copy);
  expect(p.draft).toBeUndefined();expect(validateWorld(w)).toEqual([]);expect(serializeWorld(w)).toBe(serializeWorld(copy));
});
