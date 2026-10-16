import {medicalCamp} from './health';
import {addMaterial,refreshStock} from '../../src/sim/materials';
import {serializeWorld} from '../../src/sim/serialization';
import type {Pawn} from '../../src/sim/types';

/** Finite prepared local camp: no food transition or policy correction played. */
export function foodReadabilityWorkshopV393(){
  const world=medicalCamp(1),pawn=world.pawns[0]!;world.piles=[];pawn.x=3;pawn.z=5;pawn.hunger=18;pawn.state='hungry';pawn.rest=pawn.recreation.level=100;pawn.apparelAutomation=false;
  for(const work of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[work]=0;
  world.foodPolicies[0]={...world.foodPolicies[0]!,allowed:['rice']};pawn.foodPolicyId=world.foodPolicies[0]!.id;
  const foodCell={x:12,z:5};addMaterial(world,'food',10,{type:'ground',...foodCell},'survival-meal');const pileId=world.piles.at(-1)!.id;
  addMaterial(world,'food',10,{type:'ground',x:13,z:5},'survival-meal');refreshStock(world);
  return {world,initial:serializeWorld(world),pawnId:pawn.id,pileId,foodCell,policyId:pawn.foodPolicyId,
    notice:'PRÉPARÉ32² : adulte sain faim18 et état affamé explicitement préparés, sol accessible et20 repas de survie finis au sol en deux piles légales de10 ; régime existant limité au riz. Aucun repas, stock acquis naturellement, correction de régime ou trajet joué.'};
}
