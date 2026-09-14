import { footprintCells } from './definitions.ts';
import { isCookingOrder } from './order-types.ts';
import type { CookingBill, BillSettings } from './cooking-types.ts';
import type { Cell, Structure, World } from './types.ts';

export const COOK_TICKS=60; // 300 reference work / 10 local ticks × campfire factor 2.
export const INGREDIENT_UNITS=10; // 0.5 nutrition, for the two currently supported raw foods.
export function newCookingBill(id:number):CookingBill {
  return {id,recipe:'simple-meal',mode:'times',target:1,suspended:false,filters:{rice:true,berries:true},radius:999,destination:'stockpile'};
}
export function validBillSettings(value:unknown):value is BillSettings {
  if(!value||typeof value!=='object')return false;
  const v=value as BillSettings;
  return ['times','until','forever'].includes(v.mode)&&Number.isSafeInteger(v.target)&&v.target>=0&&v.target<=9999
    &&typeof v.suspended==='boolean'&&!!v.filters&&typeof v.filters.rice==='boolean'&&typeof v.filters.berries==='boolean'
    &&Number.isFinite(v.radius)&&v.radius>=0&&v.radius<=999&&['stockpile','drop'].includes(v.destination);
}
/** Reference resource counter includes stored items and current task cargo.
 * Loose meals outside storage do not satisfy a target-count bill. */
export function countedMeals(world:World):number {
  const stored=new Set(world.stockpiles.map(z=>z.z*world.width+z.x));
  return world.piles.reduce((n,p)=>n+(p.item==='simple-meal'&&(p.owner.type==='pawn'||p.owner.type==='ground'&&stored.has(p.owner.z*world.width+p.owner.x))?p.quantity:0),0);
}
export function billWanted(world:World,bill:CookingBill):boolean {
  return !bill.suspended&&(bill.mode==='forever'||bill.mode==='times'&&bill.target>0||bill.mode==='until'&&countedMeals(world)<bill.target);
}
export function cookingSpot(station:Structure):Cell {
  const [dx,dz]=[[0,-1],[-1,0],[0,1],[1,0]][station.orientation]!;
  return {x:station.x+dx!,z:station.z+dz!};
}
export function cookingCellReserved(world:World,cell:Cell):boolean {
  for(const p of world.pawns)for(const order of p.orders?.queue??[])if(isCookingOrder(order)&&(order.cooking.spot.x===cell.x&&order.cooking.spot.z===cell.z||order.cooking.ingredients.some(i=>i.stage!=='placed'&&i.cell.x===cell.x&&i.cell.z===cell.z)))return true;
  return world.pawns.some(p=>p.cooking&&(p.cooking.spot.x===cell.x&&p.cooking.spot.z===cell.z
    ||p.cooking.ingredients.some(i=>i.stage!=='placed'&&i.cell.x===cell.x&&i.cell.z===cell.z)));
}
export function cookingPlaceFree(world:World,cell:Cell):boolean {
  return cell.x>=0&&cell.z>=0&&cell.x<world.width&&cell.z<world.height
    &&!['water','rock'].includes(world.tiles[cell.z*world.width+cell.x]!.terrain)
    &&!world.resources.some(r=>r.x===cell.x&&r.z===cell.z)
    &&![...world.jobs,...world.structures].some(s=>(s.kind==='wall'||s.kind==='table')&&footprintCells(s).some(c=>c.x===cell.x&&c.z===cell.z));
}
