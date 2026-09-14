import { cookingFixture } from './cooking.ts';
import { initialRecreation } from '../../src/sim/recreation-rules.ts';

/** Synthetic stress, not player progression: shared pins and simultaneous low
 * recreation, with normal food/rest and the existing camp work still available. */
export function recreationFixture(count: number) {
  const world=cookingFixture(count);world.tick=2000;
  world.pawns.forEach(p=>{p.recreation=initialRecreation(10);p.schedule.fill('recreation');});
  for(const fire of [...world.structures])if(fire.kind==='campfire')world.structures.push({id:world.nextId++,kind:'horseshoes',x:fire.x,z:fire.z-1,orientation:0,footprint:'standard'});
  return world;
}
