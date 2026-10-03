import { addMaterial,refreshStock } from '../../src/sim/materials.ts';
import { medicalCamp } from '../scenarios/health.ts';
import type { MaterialPile,World } from '../../src/sim/types.ts';

/** Prepared healthy camp; no destination, trip or transaction already exists.
 * Sources remain real map piles and all phases are subsequently stepped. */
export function commercialCamp(size=16):{world:World;pawnId:number;foodId:number;silverIds:[number,number]} {
  const world=medicalCamp(3,size),p=world.pawns[0]!,z=Math.floor(size/2);
  p.x=2;p.z=z;p.hunger=95;p.rest=95;
  for(let i=1;i<world.pawns.length;i++){world.pawns[i]!.x=2+i;world.pawns[i]!.z=z+2;}
  addMaterial(world,'food',4,{type:'ground',x:5,z},'survival-meal');
  addMaterial(world,'silver',500,{type:'ground',x:8,z},'silver');
  addMaterial(world,'silver',200,{type:'ground',x:9,z},'silver');
  const food=world.piles.find(i=>i.item==='survival-meal')!;food.damage=7;
  const silver=world.piles.filter(i=>i.item==='silver');refreshStock(world);
  return {world,pawnId:p.id,foodId:food.id,silverIds:[silver[0]!.id,silver[1]!.id]};
}
export function commercialContents(world:World):MaterialPile[] {
  const s=world.commercialTrip;return s&&'items' in s?[...world.piles,...s.items]:world.piles;
}
export function commercialItemTotal(world:World,item:MaterialPile['item']):number {
  return commercialContents(world).filter(i=>i.item===item).reduce((n,i)=>n+i.quantity,0);
}
