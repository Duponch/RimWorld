import { PRODUCTION_RECIPES, admittedIngredient, stationRecipe, stationWork, type ProductionIngredient } from './production-recipes.ts';
import { reservedServiceCells } from './service-reservations.ts';
import { billWanted, cookingPlaceFree, cookingSpot, ingredientPlaceFree } from './cooking-bills.ts';
import { groundCapacity } from './ground-placement.ts';
import { reservedSource } from './materials.ts';
import { fuelCapacity, fuelStationReserved } from './fuel.ts';
import { routeToCell, routeToJob, type Reachability } from './pathfinding.ts';
import type { CookingTask, CookingIngredient } from './cooking-types.ts';
import type { Cell, HaulTask, Pawn, Structure, World } from './types.ts';

export interface CookingPlan {station:Structure;priority:number;target:Cell;path:Cell[];task?:CookingTask;refuel?:HaulTask}
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
const distance=(a:Cell,b:Cell)=>(a.x-b.x)**2+(a.z-b.z)**2;
export function hasCookingWork(world:World,pawn:Pawn):boolean {
  return productionPriority(world,pawn)<5;
}
export function availableCookingStations(world:World,pawn:Pawn):Structure[] {
  return world.structures.filter(s=>stationRecipe(s)&&pawn.priorities[stationWork(s)]>0&&s.bills?.some(b=>billWanted(world,b))
    &&!fuelStationReserved(world,s.id,pawn.id));
}
/** Select without mutation. The ordinary planner compares this proposal with
 * construction/growing/hauling before committing its reservations. */
export function planCooking(world:World,pawn:Pawn,reachable:Reachability,budget:{pairs:number},options?:{stationId:number;forced:boolean}):CookingPlan|null {
  const stations=availableCookingStations(world,pawn).filter(s=>!options||s.id===options.stationId)
    .sort((a,b)=>pawn.priorities[stationWork(a)]-pawn.priorities[stationWork(b)]||distance(pawn,a)-distance(pawn,b)||a.id-b.id);
  for(const station of stations) {
    if(fuelStationReserved(world,station.id,pawn.id))continue;
    const spot=cookingSpot(station);
    if(!cookingPlaceFree(world,spot)||reservedServiceCells(world,pawn.id).has(spot.z*world.width+spot.x))continue;
    const toSpot=routeToCell(world,spot,reachable);
    if(!toSpot)continue;
    for(const bill of station.bills!) {
      if(!billWanted(world,bill))continue;
      // The reference bill worker refuels an empty usable station before cooking.
      if(station.kind==='campfire'&&!station.fuel?.ticks) {
        const capacity=fuelCapacity(world,station.id,undefined,options?.forced);if(!capacity)break;
        const wood=world.piles.filter(p=>p.item==='wood'&&p.owner.type==='ground'&&p.quantity>reservedSource(world,p.id))
          .sort((a,b)=>distance(a.owner as Cell,station)-distance(b.owner as Cell,station)||a.id-b.id);
        for(const pile of wood) {
          if(budget.pairs--<=0){budget.pairs=0;return null;}
          const path=routeToJob(world,pile.owner as Cell,reachable,true);
          if(!path)continue;
          return {station,priority:pawn.priorities[stationWork(station)],target:pile.owner as Cell,path,refuel:{sourcePileId:pile.id,quantity:Math.min(10,capacity,pile.quantity-reservedSource(world,pile.id)),phase:'pickup',carryPileId:null,destination:{type:'fuel',structureId:station.id,forCooking:true,...(options?.forced?{forced:true}:{})}}};
        }
        break;
      }
      const ingredients:CookingIngredient[]=[],planned=new Map<string,{item:ProductionIngredient;quantity:number}>();
      let missing:number=PRODUCTION_RECIPES[bill.recipe].units;
      const sources=world.piles.filter(p=>admittedIngredient(bill,p.item)&&p.owner.type==='ground'&&distance(p.owner,station)<=bill.radius**2)
        .sort((a,b)=>distance(a.owner as Cell,station)-distance(b.owner as Cell,station)||a.id-b.id);
      // No source means no pair was visited and no staging decision was made.
      // Avoid six full resource/footprint scans per empty bill, especially after
      // simultaneous spoilage. Keep earlier route/blocker diagnostics unchanged.
      if(!sources.length)continue;
      const cells=[station,spot,{x:spot.x-1,z:spot.z},{x:spot.x+1,z:spot.z},{x:spot.x,z:spot.z-1},{x:spot.x,z:spot.z+1}]
        .filter((c,i,a)=>a.findIndex(t=>same(t,c))===i&&ingredientPlaceFree(world,c,spot,bill.recipe));
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
        ingredients.push({pileId:pile.id,item:pile.item as ProductionIngredient,quantity,stage:already?'placed':'source',cell:{x:cell.x,z:cell.z}});
        if(!already){const key=`${cell.x}:${cell.z}`;planned.set(key,{item:pile.item as ProductionIngredient,quantity:(planned.get(key)?.quantity??0)+quantity});}
        missing-=quantity;if(!missing)break;
      }
      if(missing)continue; // Try the next bill if its filters admit other ingredients.
      const source=ingredients.find(i=>i.stage==='source'),target=source?world.piles.find(p=>p.id===source.pileId)!.owner as Cell:spot;
      return {station,priority:pawn.priorities[stationWork(station)],target,path:source?routeToJob(world,target,reachable,true)!:toSpot,task:{...(bill.recipe==='stone-blocks'?{recipe:'stone-blocks' as const}:{}),stationId:station.id,billId:bill.id,spot,actionCell:{x:target.x,z:target.z},phase:'gather',ingredients,progress:0,productId:null,storageId:null}};
    }
  }
  return null;
}

export function productionPriority(world:World,pawn:Pawn):number {
  let priority=5;
  for(const s of world.structures)if(stationRecipe(s)&&s.bills?.some(b=>billWanted(world,b))){const p=pawn.priorities[stationWork(s)];if(p>0)priority=Math.min(priority,p);}
  return priority;
}
