import { reservedServiceCells } from './service-reservations.ts';
import { billWanted, cookingPlaceFree, cookingSpot, INGREDIENT_UNITS } from './cooking-bills.ts';
import { groundCapacity } from './ground-placement.ts';
import { reservedSource } from './materials.ts';
import { fuelCapacity } from './fuel.ts';
import { routeToCell, routeToJob, type Reachability } from './pathfinding.ts';
import type { CookingTask, CookingIngredient, RawIngredient } from './cooking-types.ts';
import type { Cell, HaulTask, Pawn, Structure, World } from './types.ts';

export interface CookingPlan {station:Structure;target:Cell;path:Cell[];task?:CookingTask;refuel?:HaulTask}
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
const distance=(a:Cell,b:Cell)=>(a.x-b.x)**2+(a.z-b.z)**2;
export function hasCookingWork(world:World,pawn:Pawn):boolean {
  return pawn.priorities.cook>0&&world.structures.some(s=>s.kind==='campfire'&&s.bills?.some(b=>billWanted(world,b)));
}
export function availableCookingStations(world:World,pawn:Pawn):Structure[] {
  if(pawn.priorities.cook===0)return [];
  return world.structures.filter(s=>s.kind==='campfire'&&s.bills?.some(b=>billWanted(world,b))
    &&!world.pawns.some(p=>p.id!==pawn.id&&(p.cooking?.stationId===s.id||p.haul?.destination.type==='fuel'&&p.haul.destination.structureId===s.id)));
}
/** Select without mutation. The ordinary planner compares this proposal with
 * construction/growing/hauling before committing its reservations. */
export function planCooking(world:World,pawn:Pawn,reachable:Reachability,budget:{pairs:number}):CookingPlan|null {
  const stations=availableCookingStations(world,pawn)
    .sort((a,b)=>distance(pawn,a)-distance(pawn,b)||a.id-b.id);
  for(const station of stations) {
    if(world.pawns.some(p=>p.id!==pawn.id&&(p.cooking?.stationId===station.id||p.haul?.destination.type==='fuel'&&p.haul.destination.structureId===station.id)))continue;
    const spot=cookingSpot(station);
    if(!cookingPlaceFree(world,spot)||reservedServiceCells(world,pawn.id).has(spot.z*world.width+spot.x))continue;
    const toSpot=routeToCell(world,spot,reachable);
    if(!toSpot)continue;
    for(const bill of station.bills!) {
      if(!billWanted(world,bill))continue;
      // The reference bill worker refuels an empty usable station before cooking.
      if(!station.fuel?.ticks) {
        const capacity=fuelCapacity(world,station.id);if(!capacity)break;
        const wood=world.piles.filter(p=>p.item==='wood'&&p.owner.type==='ground'&&p.quantity>reservedSource(world,p.id))
          .sort((a,b)=>distance(a.owner as Cell,station)-distance(b.owner as Cell,station)||a.id-b.id);
        for(const pile of wood) {
          if(budget.pairs--<=0){budget.pairs=0;return null;}
          const path=routeToJob(world,pile.owner as Cell,reachable,true);
          if(!path)continue;
          return {station,target:pile.owner as Cell,path,refuel:{sourcePileId:pile.id,quantity:Math.min(10,capacity,pile.quantity-reservedSource(world,pile.id)),phase:'pickup',carryPileId:null,destination:{type:'fuel',structureId:station.id,forCooking:true}}};
        }
        break;
      }
      const ingredients:CookingIngredient[]=[],planned=new Map<string,{item:RawIngredient;quantity:number}>();
      let missing=INGREDIENT_UNITS;
      const sources=world.piles.filter(p=>(p.item==='rice'||p.item==='berries')&&bill.filters[p.item]&&p.owner.type==='ground'&&distance(p.owner,station)<=bill.radius**2)
        .sort((a,b)=>distance(a.owner as Cell,station)-distance(b.owner as Cell,station)||a.id-b.id);
      // No source means no pair was visited and no staging decision was made.
      // Avoid six full resource/footprint scans per empty bill, especially after
      // simultaneous spoilage. Keep earlier route/blocker diagnostics unchanged.
      if(!sources.length)continue;
      const cells=[station,spot,{x:spot.x-1,z:spot.z},{x:spot.x+1,z:spot.z},{x:spot.x,z:spot.z-1},{x:spot.x,z:spot.z+1}]
        .filter((c,i,a)=>a.findIndex(t=>same(t,c))===i&&cookingPlaceFree(world,c));
      for(const pile of sources) {
        if(budget.pairs--<=0){budget.pairs=0;return null;}
        const quantity=Math.min(missing,pile.quantity-reservedSource(world,pile.id));
        if(quantity<=0)continue;
        if(!routeToJob(world,pile.owner as Cell,reachable,true))continue;
        const already=cells.find(c=>same(c,pile.owner as Cell));
        const cell=already??cells.find(c=>{
          const reserved=planned.get(`${c.x}:${c.z}`);
          return (!reserved||reserved.item===pile.item)&&groundCapacity(world,c,pile.item)-(reserved?.quantity??0)>=quantity;
        });
        if(!cell)continue;
        ingredients.push({pileId:pile.id,item:pile.item as RawIngredient,quantity,stage:already?'placed':'source',cell:{x:cell.x,z:cell.z}});
        if(!already){const key=`${cell.x}:${cell.z}`;planned.set(key,{item:pile.item as RawIngredient,quantity:(planned.get(key)?.quantity??0)+quantity});}
        missing-=quantity;if(!missing)break;
      }
      if(missing)continue; // Try the next bill if its filters admit other ingredients.
      const source=ingredients.find(i=>i.stage==='source'),target=source?world.piles.find(p=>p.id===source.pileId)!.owner as Cell:spot;
      return {station,target,path:source?routeToJob(world,target,reachable,true)!:toSpot,task:{stationId:station.id,billId:bill.id,spot,actionCell:{x:target.x,z:target.z},phase:'gather',ingredients,progress:0,productId:null,storageId:null}};
    }
  }
  return null;
}
