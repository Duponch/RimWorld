import { isFoodWorkstation } from './food-workstations.ts';
import { groundOccupancyAllows } from './occupancy.ts';
import { PRODUCTION_RECIPES, blockFor, type ProductionRecipe, type StoneIngredient } from './production-recipes.ts';
import { canStandAt } from './furniture-travel.ts';
import { footprintCells, footprintContains } from './definitions.ts';
import { isCookingOrder } from './order-types.ts';
import type { CookingBill, BillSettings } from './cooking-types.ts';
import type { Cell, Structure, World } from './types.ts';

export const COOK_TICKS=60; // 300 reference work / 10 local ticks × campfire factor 2.
export const INGREDIENT_UNITS=10; // 0.5 nutrition for the supported raw ingredients.
export function newCookingBill(id:number,recipe:ProductionRecipe='simple-meal'):CookingBill {
  return {id,recipe,mode:'times',target:1,suspended:false,filters:Object.fromEntries(PRODUCTION_RECIPES[recipe].inputs.map(i=>[i,true])),radius:999,destination:'stockpile'};
}
export function validBillSettings(value:unknown,recipe:ProductionRecipe='simple-meal'):value is BillSettings {
  if(!value||typeof value!=='object')return false;
  const v=value as BillSettings;
  return ['times','until','forever'].includes(v.mode)&&Number.isSafeInteger(v.target)&&v.target>=0&&v.target<=9999
    &&typeof v.suspended==='boolean'&&!!v.filters&&PRODUCTION_RECIPES[recipe].inputs.every(i=>typeof v.filters[i]==='boolean'||['hare-meat','potato','corn'].includes(i)&&v.filters[i]===undefined)
    &&Number.isFinite(v.radius)&&v.radius>=0&&v.radius<=999&&['stockpile','drop'].includes(v.destination);
}
/** Reference resource counter includes stored items and current task cargo.
 * Loose meals outside storage do not satisfy a target-count bill. */
export function countedMeals(world:World):number {return countedProducts(world);}
export function countedProducts(world:World,bill?:CookingBill):number {
  const products=new Set(bill?.recipe==='butcher-creature'?['hare-meat']:bill?.recipe==='shirt'?['cloth-shirt']:bill?.recipe==='tribalwear'?['cloth-tribalwear']:bill?.recipe==='stone-blocks'?PRODUCTION_RECIPES['stone-blocks'].inputs.map(i=>blockFor(i as StoneIngredient)):['simple-meal']);
  const stored=new Set(world.stockpiles.map(z=>z.z*world.width+z.x));
  return world.piles.reduce((n,p)=>n+(products.has(p.item)&&(p.owner.type==='pawn'&&bill?.recipe!=='butcher-creature'||p.owner.type==='ground'&&stored.has(p.owner.z*world.width+p.owner.x))?p.quantity:0),0);
}
export function billWanted(world:World,bill:CookingBill):boolean {
  return !bill.suspended&&(bill.mode==='forever'||bill.mode==='times'&&bill.target>0||bill.mode==='until'&&countedProducts(world,bill)<bill.target);
}
export function cookingSpot(station:Structure):Cell {
  const [dx,dz]=[[0,-1],[-1,0],[0,1],[1,0]][station.orientation]!;
  return {x:station.x+dx!,z:station.z+dz!};
}
export function cookingCellReserved(world:World,cell:Cell):boolean {
  if(world.pawns.some(p=>p.research&&p.research.spot.x===cell.x&&p.research.spot.z===cell.z))return true;
  for(const p of world.pawns)for(const order of p.orders?.queue??[])if(isCookingOrder(order)&&(order.cooking.spot.x===cell.x&&order.cooking.spot.z===cell.z||order.cooking.ingredients.some(i=>i.stage!=='placed'&&i.cell.x===cell.x&&i.cell.z===cell.z)))return true;
  return world.pawns.some(p=>p.cooking&&(p.cooking.spot.x===cell.x&&p.cooking.spot.z===cell.z
    ||p.cooking.ingredients.some(i=>i.stage!=='placed'&&i.cell.x===cell.x&&i.cell.z===cell.z)));
}
export function cookingPlaceFree(world:World,cell:Cell):boolean {
  return (world.schemaVersion<22||canStandAt(world,cell))&&cell.x>=0&&cell.z>=0&&cell.x<world.width&&cell.z<world.height
    &&!['water','rock'].includes(world.tiles[cell.z*world.width+cell.x]!.terrain)
    &&!world.resources.some(r=>r.x===cell.x&&r.z===cell.z)
    &&![...world.jobs,...world.structures].some(s=>(s.kind==='wall'||s.kind==='cooler'||s.kind==='table')&&footprintCells(s).some(c=>c.x===cell.x&&c.z===cell.z));
}

export const ingredientWithinReach=(cell:Cell,spot:Cell,station?:Structure):boolean=>station&&isFoodWorkstation(station.kind)?footprintContains(station,cell):Math.abs(cell.x-spot.x)+Math.abs(cell.z-spot.z)<=1;
/** New food benches stage on their three physical surface cells. Historical
 * stations keep their existing adjacent staging and continuation unchanged. */
export function ingredientPlaceFree(world:World,cell:Cell,spot:Cell,recipe:ProductionRecipe,station?:Structure):boolean {
  if(station&&isFoodWorkstation(station.kind))return ingredientWithinReach(cell,spot,station)
    &&cell.x>=0&&cell.z>=0&&cell.x<world.width&&cell.z<world.height
    &&!['water','rock'].includes(world.tiles[cell.z*world.width+cell.x]!.terrain)
    &&!world.resources.some(r=>r.x===cell.x&&r.z===cell.z)&&groundOccupancyAllows(world,cell);
  if(recipe==='simple-meal')return cookingPlaceFree(world,cell);
  return (cell.x!==spot.x||cell.z!==spot.z)&&Math.abs(cell.x-spot.x)+Math.abs(cell.z-spot.z)<=1
    &&cell.x>=0&&cell.z>=0&&cell.x<world.width&&cell.z<world.height
    &&!['water','rock'].includes(world.tiles[cell.z*world.width+cell.x]!.terrain)
    &&!world.resources.some(r=>r.x===cell.x&&r.z===cell.z)&&groundOccupancyAllows(world,cell);
}
