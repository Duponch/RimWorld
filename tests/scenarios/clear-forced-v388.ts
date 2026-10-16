import {equipmentCamp} from './equipment';
import {addMaterial} from '../../src/sim/materials';
import {serializeWorld} from '../../src/sim/serialization';
import type {Pawn} from '../../src/sim/types';

/** Prepared clothing/finite property and policy, no wear/remove/clear action played. */
export function clearForcedWorkshopV388(){
  const world=equipmentCamp(2),pawn=world.pawns[0]!,other=world.pawns[1]!;world.piles=[];
  for(const p of world.pawns){p.hunger=p.rest=p.recreation.level=100;p.apparelAutomation=false;p.apparelPolicyId=1;p.nextApparelCheckAt=world.tick;p.schedule.fill('work');
    for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;}
  world.apparelPolicies![0]={...world.apparelPolicies![0]!,allowedItems:['cloth-shirt']};
  addMaterial(world,'apparel',1,{type:'apparel',pawnId:pawn.id},'cloth-shirt');const shirt=world.piles.at(-1)!;
  addMaterial(world,'apparel',1,{type:'ground',x:pawn.x+2,z:pawn.z},'muffalo-wool-tuque');const tuque=world.piles.at(-1)!;
  addMaterial(world,'apparel',1,{type:'apparel',pawnId:other.id},'flak-helmet');const helmet=world.piles.at(-1)!;helmet.apparel!.forced=true;
  return {world,initial:serializeWorld(world),pawnId:pawn.id,otherId:other.id,shirtId:shirt.id,tuqueId:tuque.id,helmetId:helmet.id,
    notice:'PRÉPARÉ32² : deux adultes sains, chemise normale déjà portée, tuque laine normale finie au sol, casque pare-balles forcé déjà porté par l’autre colon ; politique1 limitée à la chemise et Auto désactivé. Aucun port de tuque, levée du port forcé ou retrait n’est préjoué. Aucune acquisition naturelle revendiquée.'};
}
