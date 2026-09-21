import { planGroundPlacement } from './ground-placement.ts';
import { addGroundMaterial } from './materials.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { cropProduct } from './crops.ts';
import { FLORA_DEFINITIONS } from './biome-flora.ts';
import { isCrop, AFTER_HARVEST_GROWTH, choppable, harvestable, harvestRoll } from './plants.ts';
import type { Resource, World } from './types.ts';

/** Harvest and construction clearing share one conservative producer. null
 * leaves resource, RNG and material unchanged when output cannot be placed. */
export function gatherResource(world: World, resource: Resource, kind:'chop'|'harvest'|'cut'): number|null {
  if(kind==='harvest'&&!harvestable(world,resource)||kind==='chop'&&!choppable(world,resource))return null;
  // Historical bushes keep their established cut yield. Only V91 species use
  // product-free cutting as vegetation/construction clearing.
  const roll=kind==='chop'&&!resource.species?{quantity:resource.amount,rng:world.rng}:kind==='cut'&&resource.species?{quantity:0,rng:world.rng}:harvestRoll(world,resource);
  if(roll.quantity>0) {
    const item=resource.species?FLORA_DEFINITIONS[resource.species].product:
      kind==='chop'?'wood':isCrop(resource)?cropProduct(resource.kind):world.foodRules==='legacy'?'legacy-portion':'berries';
    if(!item)return null;
    const placements=planGroundPlacement(world,roll.quantity,resource,item);
    if(!placements||world.piles.length+placements.length>32768||!Number.isSafeInteger(world.nextId+placements.length))return null;
    addGroundMaterial(world,ITEM_DEFINITIONS[item].kind,roll.quantity,resource,item);
  }
  world.rng=roll.rng;
  if(kind==='harvest'&&(resource.species?FLORA_DEFINITIONS[resource.species].persistent:resource.kind==='berries')){resource.growth=AFTER_HARVEST_GROWTH;resource.growthTick=world.tick;}
  else world.resources=world.resources.filter(r=>r.id!==resource.id);
  return roll.quantity;
}
export const clearingDuration=(resource:Resource):number=>resource.kind==='tree'?100:isCrop(resource)?20:60;
