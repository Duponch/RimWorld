import {medicalCamp} from './health.ts';
import {fixtureBuilding} from './deconstruction.ts';
import {addMaterial,refreshStock} from '../../src/sim/materials.ts';
import {serializeWorld} from '../../src/sim/serialization.ts';
import type {Pawn} from '../../src/sim/types.ts';
/** Finite declared camp; no collection, bill, work or destruction step played. */
export function burnApparelWorkshopV395(size=32){
  const world=medicalCamp(1,size),pawn=world.pawns[0]!;world.piles=[];
  // medicalCamp changes the clock: keep the existing empty fire state coherent.
  if(world.fires)world.fires.clockCore=world.tick*10;
  pawn.x=4;pawn.z=7;pawn.hunger=pawn.rest=pawn.recreation.level=100;
  pawn.apparelAutomation=false;pawn.schedule.fill('work');pawn.planCooldown=0;
  for(const key of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[key]=0;
  pawn.priorities.haul=1;
  const station=fixtureBuilding(world,'campfire',9,7);
  addMaterial(world,'apparel',1,{type:'ground',x:5,z:5},'cloth-shirt');const apparelId=world.piles.at(-1)!.id;
  world.piles.at(-1)!.apparel!.hitPoints=35;
  addMaterial(world,'apparel',1,{type:'ground',x:5,z:9},'flak-helmet');const helmetId=world.piles.at(-1)!.id;
  addMaterial(world,'apparel',1,{type:'ground',x:6,z:10},'cloth-shirt');const protectedId=world.piles.at(-1)!.id;
  world.piles.at(-1)!.apparel!.forbidden=true;
  refreshStock(world);
  return {world,initial:serializeWorld(world),pawnId:pawn.id,stationId:station.id,apparelId,helmetId,protectedId,
    notice:'PRÉPARÉ : camp fini avec réserve finie de feu 12000, Transport actif et Cuisine désactivée ; chemise normale à 35 PV autorisée, casque acier et seconde chemise interdite témoins. Aucun objet collecté ou brûlé, aucune facture ajoutée ; aucune acquisition naturelle prétendue.'};
}
