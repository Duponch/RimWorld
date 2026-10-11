import { huntingCamp } from '../scenarios/hunting.ts';
import { fixtureBuilding } from '../scenarios/deconstruction.ts';
import { refreshStock } from '../../src/sim/materials.ts';
import { validateWorld } from '../../src/sim/serialization.ts';

/** Private prepared scene: the live owned animal, healthy handler, butcher
 * spot and fueled campfire exist initially. No designation, task, corpse,
 * ingredient, product or transfer is precommitted. */
export function slaughterCamp(){
  const world=huntingCamp(),handler=world.pawns[0]!,cook=world.pawns[1]!,animal=world.wildlife!.animals[0]!;
  world.resources=[];world.piles=[];world.jobs=[];world.structures=[];world.stockpiles=[];world.events=[];
  for(const pawn of world.pawns){
    delete pawn.background;delete pawn.traits;
    for(const work of Object.keys(pawn.priorities) as (keyof typeof pawn.priorities)[])pawn.priorities[work]=0;
    pawn.hunger=100;pawn.rest=100;pawn.mood=90;pawn.recreation.level=100;pawn.planCooldown=0;
    pawn.foodPolicyId=2;
  }
  handler.priorities.handle=1;handler.skills.animals={level:0,xp:0,dailyXp:0,passion:0};
  Object.assign(handler,{x:4,z:10});Object.assign(cook,{x:8,z:6,hunger:22});
  // The decision deadline stays inside the supported tick+100 envelope. The
  // ordinary engine owns all later movement, clinical state and retention.
  Object.assign(animal,{x:23,z:10,food:.2,rest:1,state:'idle',nextDecision:world.tick+100,path:[]});
  delete animal.health;delete animal.motion;
  animal.domestic={since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+45000,lastTraining:world.tick};
  const spot=fixtureBuilding(world,'butcher-spot',8,10),fire=fixtureBuilding(world,'campfire',12,10);
  Object.assign(spot,{bills:[]});
  refreshStock(world);
  const errors=validateWorld(world);if(errors.length)throw new Error(`Invalid V309 native fixture: ${errors.join('; ')}`);
  return {world,handlerId:handler.id,cookId:cook.id,animalId:animal.id,spotId:spot.id,fireId:fire.id};
}
