import {planArtWork} from './art-work-plan.ts';
import {isArtRecipe} from './art-rules.ts';
import { productionResearchUnlocked,productionWorkerQualified } from './machining.ts';
import { planGunWork } from './gun-work-plan.ts';
import { isGunRecipe,GUN_REQUIREMENTS } from './production-recipes.ts';
import { isAnimalCorpseItem } from './biome-items.ts';
import { foodStationUsable, usesCookingFuel } from './food-workstations.ts';
import { corpseFresh } from './corpses.ts';
import { planUnfinished } from './tailoring-plan.ts';
import { CARRY_CAPACITY, footprintCells } from './definitions.ts';
import { PRODUCTION_RECIPES, admittedIngredient, isTailoring, productionStationUsable, stationRecipe, stationWork, type ProductionIngredient } from './production-recipes.ts';
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
  return world.structures.filter(s=>stationRecipe(s)&&(s.kind!=='electric-stove'||foodStationUsable(s))&&productionStationUsable(s)&&pawn.priorities[stationWork(s)]>0&&s.bills?.some(b=>billWanted(world,b))
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
      if(!billWanted(world,bill)||!productionResearchUnlocked(world,bill.recipe)||!productionWorkerQualified(pawn,bill.recipe))continue;
      // The reference bill worker refuels an empty usable station before cooking.
      if(usesCookingFuel(station.kind)&&!station.fuel?.ticks) {
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
      const artResumed=planArtWork(world,pawn,station,bill,reachable,budget);if(artResumed.plan)return artResumed.plan;if(artResumed.handled)continue;
      const gunResumed=planGunWork(world,pawn,station,bill,reachable,budget);if(gunResumed.plan)return gunResumed.plan;if(gunResumed.handled)continue;
      const resumed=planUnfinished(world,pawn,station,bill,reachable,budget);if(resumed.plan)return resumed.plan;if(resumed.handled)continue;
      const sources=world.piles.filter(p=>admittedIngredient(bill,p.item)&&(!isAnimalCorpseItem(p.item)||corpseFresh(p,world.tick))&&p.owner.type==='ground'&&distance(p.owner,station)<=bill.radius**2)
        .sort((a,b)=>distance(a.owner as Cell,station)-distance(b.owner as Cell,station)||a.id-b.id);
      // No source means no pair was visited and no staging decision was made.
      // Avoid six full resource/footprint scans per empty bill, especially after
      // simultaneous spoilage. Keep earlier route/blocker diagnostics unchanged.
      if(!sources.length)continue;
      const groups=isArtRecipe(bill.recipe)?[...new Set(sources.map(p=>p.item))].map(material=>sources.filter(p=>p.item===material)):[sources];
      for(const group of groups) {
      const ingredients:CookingIngredient[]=[],planned=new Map<string,{item:ProductionIngredient;quantity:number}>();
      let missing:number=PRODUCTION_RECIPES[bill.recipe].units;
      if(isArtRecipe(bill.recipe)&&group.reduce((n,p)=>n+Math.max(0,p.quantity-reservedSource(world,p.id)),0)<missing)continue;
      const cells=[station,spot,{x:spot.x-1,z:spot.z},{x:spot.x+1,z:spot.z},{x:spot.x,z:spot.z-1},{x:spot.x,z:spot.z+1},...footprintCells(station)]
        .filter((c,i,a)=>a.findIndex(t=>same(t,c))===i&&ingredientPlaceFree(world,c,spot,bill.recipe,station));
      let tailoringMaterial:ProductionIngredient|undefined;
      for(const pile of group) {
        if(isTailoring(bill.recipe)&&tailoringMaterial!==undefined&&pile.item!==tailoringMaterial)continue;
        if(budget.pairs--<=0){budget.pairs=0;return null;}
        const typeMissing=isGunRecipe(bill.recipe)?(pile.item==='steel'||pile.item==='component'?GUN_REQUIREMENTS[bill.recipe][pile.item]-ingredients.reduce((n,i)=>n+(i.item===pile.item?i.quantity:0),0):0):missing;
        const quantity=Math.min(typeMissing,pile.quantity-reservedSource(world,pile.id));
        if(quantity<=0)continue;if(isTailoring(bill.recipe))tailoringMaterial??=pile.item as ProductionIngredient;
        if(!routeToJob(world,pile.owner as Cell,reachable,true))continue;
        const already=cells.find(c=>same(c,pile.owner as Cell));
        const cell=already??cells.find(c=>{
          const reserved=planned.get(`${c.x}:${c.z}`);
          return (!reserved||reserved.item===pile.item)&&groundCapacity(world,c,pile.item)-(reserved?.quantity??0)>=quantity;
        });
        if(!cell)continue;
        for(let left=quantity;left>0;){const part=already?left:Math.min(left,CARRY_CAPACITY);ingredients.push({pileId:pile.id,item:pile.item as ProductionIngredient,quantity:part,stage:already?'placed':'source',cell:{x:cell.x,z:cell.z}});left-=part;}
        if(!already){const key=`${cell.x}:${cell.z}`;planned.set(key,{item:pile.item as ProductionIngredient,quantity:(planned.get(key)?.quantity??0)+quantity});}
        missing-=quantity;if(!missing)break;
      }
      if(missing)continue; // Try the next bill if its filters admit other ingredients.
      const source=ingredients.find(i=>i.stage==='source'),target=source?world.piles.find(p=>p.id===source.pileId)!.owner as Cell:spot;
      return {station,priority:pawn.priorities[stationWork(station)],target,path:source?routeToJob(world,target,reachable,true)!:toSpot,task:{...(bill.recipe!=='simple-meal'?{recipe:bill.recipe}:{}),stationId:station.id,billId:bill.id,spot,actionCell:{x:target.x,z:target.z},phase:'gather',ingredients,progress:0,productId:null,storageId:null}};
      }
    }
  }
  return null;
}

export function productionPriority(world:World,pawn:Pawn):number {
  let priority=5;
  for(const s of world.structures)if(stationRecipe(s)&&s.bills?.some(b=>billWanted(world,b))){const p=pawn.priorities[stationWork(s)];if(p>0)priority=Math.min(priority,p);}
  return priority;
}
