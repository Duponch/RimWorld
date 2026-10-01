import { planGroundPlacement } from './ground-placement.ts';
import { addGroundMaterial } from './materials.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { cropProduct } from './crops.ts';
import { FLORA_DEFINITIONS } from './biome-flora.ts';
import { isCrop, AFTER_HARVEST_GROWTH, choppable, harvestable, harvestRoll } from './plants.ts';
import { interruptWork } from './interrupted-cargo.ts';
import { releaseWork } from './work-release.ts';
import type { Pawn, Resource, World } from './types.ts';

/** Harvest and construction clearing share one conservative producer. null
 * leaves resource, RNG and material unchanged when output cannot be placed. */
export function gatherResource(world: World, resource: Resource, kind:'chop'|'harvest'|'cut', producerJobId?:number, worker?:Pawn): number|null {
  if(kind==='harvest'&&!harvestable(world,resource)||kind==='chop'&&!choppable(world,resource))return null;
  // Historical bushes keep their established cut yield. Only V91 species use
  // product-free cutting as vegetation/construction clearing.
  const roll=kind==='chop'&&!resource.species&&!worker?{quantity:resource.amount,rng:world.rng}:kind==='cut'&&resource.species?{quantity:0,rng:world.rng}:harvestRoll(world,resource,kind==='cut'?undefined:worker);
  if(roll.quantity>0) {
    const item=resource.species?FLORA_DEFINITIONS[resource.species].product:
      kind==='chop'?'wood':isCrop(resource)?cropProduct(resource.kind):world.foodRules==='legacy'?'legacy-portion':'berries';
    if(!item)return null;
    const placements=planGroundPlacement(world,roll.quantity,resource,item);
    if(!placements||world.piles.length+placements.length>32768||!Number.isSafeInteger(world.nextId+placements.length))return null;
    addGroundMaterial(world,ITEM_DEFINITIONS[item].kind,roll.quantity,resource,item);
  }
  world.rng=roll.rng;
  const removed=!(kind==='harvest'&&(resource.species?FLORA_DEFINITIONS[resource.species].persistent:resource.kind==='berries'));
  if(!removed){resource.growth=AFTER_HARVEST_GROWTH;resource.growthTick=world.tick;}
  else world.resources=world.resources.filter(r=>r.id!==resource.id);
  // A roof or construction worker can finish clearing after a separate chop
  // was designated. Only the successful producer keeps the yield; its rivals
  // and their actor/queue claims must disappear with the consumed resource.
  if(removed){
    const obsolete=new Set(world.jobs.filter(j=>j.id!==producerJobId&&j.x===resource.x&&j.z===resource.z&&['chop','harvest','cut'].includes(j.kind)).map(j=>j.id));
    if(obsolete.size){
      for(const pawn of world.pawns)if(pawn.jobId!==null&&obsolete.has(pawn.jobId)&&!releaseWork(world,pawn))interruptWork(world,pawn);
      for(const pawn of world.pawns)if(pawn.orders.queue.length)pawn.orders.queue=pawn.orders.queue.filter(order=>typeof order!=='number'||!obsolete.has(order));
      world.jobs=world.jobs.filter(j=>!obsolete.has(j.id));
    }
    for(const job of world.jobs)if(job.id!==producerJobId&&job.clearance?.resourceId===resource.id){
      for(const pawn of world.pawns){
        if(pawn.jobId===job.id&&!releaseWork(world,pawn))interruptWork(world,pawn);
        pawn.orders.queue=pawn.orders.queue.filter(order=>order!==job.id);
      }
      delete job.clearance;delete job.installationWork;job.reservedBy=null;job.status='pending';
    }
  }
  return roll.quantity;
}
export const clearingDuration=(resource:Resource):number=>resource.kind==='tree'?100:isCrop(resource)?20:60;
