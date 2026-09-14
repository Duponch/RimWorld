import { planGroundPlacement } from './ground-placement.ts';
import { addGroundMaterial } from './materials.ts';
import { AFTER_HARVEST_GROWTH, harvestable, harvestRoll } from './plants.ts';
import type { Resource, World } from './types.ts';

/** Harvest and construction clearing share one conservative producer. null
 * leaves resource, RNG and material unchanged when output cannot be placed. */
export function gatherResource(world: World, resource: Resource, kind:'chop'|'harvest'|'cut'): number|null {
  if(kind==='harvest'&&!harvestable(world,resource))return null;
  const roll=kind==='chop'?{quantity:resource.amount,rng:world.rng}:harvestRoll(world,resource);
  if(roll.quantity>0) {
    const item=kind==='chop'?'wood':resource.kind==='rice'?'rice':world.foodRules==='legacy'?'legacy-portion':'berries';
    const placements=planGroundPlacement(world,roll.quantity,resource,item);
    if(!placements||world.piles.length+placements.length>32768||!Number.isSafeInteger(world.nextId+placements.length))return null;
    addGroundMaterial(world,kind==='chop'?'wood':'food',roll.quantity,resource,item);
  }
  world.rng=roll.rng;
  if(kind==='harvest'&&resource.kind==='berries'){resource.growth=AFTER_HARVEST_GROWTH;resource.growthTick=world.tick;}
  else world.resources=world.resources.filter(r=>r.id!==resource.id);
  return roll.quantity;
}
export const clearingDuration=(resource:Resource):number=>resource.kind==='tree'?100:resource.kind==='rice'?20:60;
