import { equipmentCamp } from './equipment.ts';
import { addMaterial } from '../../src/sim/materials.ts';
export function apparelCamp(count=2){const w=equipmentCamp(count);w.piles=[];addMaterial(w,'apparel',1,{type:'ground',x:12,z:5},'flak-vest');addMaterial(w,'apparel',1,{type:'ground',x:14,z:5},'cloth-shirt');return w;}

/** Explicit stress fixture, separate from player acquisition: all actors wear a
 * shirt, alternating actors a vest. No healing or wardrobe reset during load. */
export function dressLoad(world:import('../../src/sim/types.ts').World):void {
  for(const [i,pawn] of world.pawns.entries()){
    addMaterial(world,'apparel',1,{type:'apparel',pawnId:pawn.id},'cloth-shirt');
    if(i%2===0)addMaterial(world,'apparel',1,{type:'apparel',pawnId:pawn.id},'flak-vest');
  }
}
