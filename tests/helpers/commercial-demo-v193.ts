import { medicalCamp } from '../scenarios/health.ts';
import { createMedicalRecord } from '../../src/sim/injury-state.ts';
import { addMaterial,refreshStock } from '../../src/sim/materials.ts';
import type { World } from '../../src/sim/types.ts';

/** Public/UI prepared camp, separate from the domain's sixteen-cell fixture.
 * No loaded manifest, post generation, trade, consumption or return is granted. */
export function commercialDemoCamp():{world:World;pawnId:number;foodPileId:number;silverPileIds:number[]} {
  const world=medicalCamp(3,32),[traveller,first,second]=world.pawns;
  Object.assign(traveller!,{name:'Ada',x:4,z:12,hunger:35});
  Object.assign(first!,{name:'Basile',x:10,z:16});
  Object.assign(second!,{name:'Céleste',x:12,z:16});
  for(const pawn of world.pawns){
    pawn.health=createMedicalRecord(world.tick);pawn.rest=100;pawn.recreation.level=100;
    pawn.apparelAutomation=false;pawn.needCooldown=0;pawn.planCooldown=0;
  }
  delete world.wildlife;delete world.miscIncidents;delete world.heatwaves;
  delete world.visitors;delete world.weather;delete world.scout;
  delete world.commercialTrip;delete world.civilianPost;
  addMaterial(world,'food',4,{type:'ground',x:5,z:12},'survival-meal');
  addMaterial(world,'silver',500,{type:'ground',x:8,z:12},'silver');
  addMaterial(world,'silver',100,{type:'ground',x:9,z:12},'silver');
  refreshStock(world);
  return {world,pawnId:traveller!.id,
    foodPileId:world.piles.find(p=>p.item==='survival-meal')!.id,
    silverPileIds:world.piles.filter(p=>p.item==='silver').map(p=>p.id)};
}
