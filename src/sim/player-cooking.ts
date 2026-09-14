import { candidateAccess } from './candidate-access.ts';
import { billWanted, cookingPlaceFree, cookingSpot } from './cooking-bills.ts';
import { planCooking } from './cooking-planner.ts';
import { fuelStationReserved } from './fuel.ts';
import { groundCapacity } from './ground-placement.ts';
import { withoutQueuedOrder } from './haul-reservations.ts';
import { reservedSource } from './materials.ts';
import { blockedCells, cellIndex, interactionGoals, routeToCell, routeToJob } from './pathfinding.ts';
import { reservedServiceCells } from './service-reservations.ts';
import { canReach, search, type NavigationGrid, type SearchBudget } from './work-planner.ts';
import type { CookingOrder } from './order-types.ts';
import type { Cell, HaulTask, Pawn, World } from './types.ts';

export interface CookingProposal { label:string;reason?:string;order?:CookingOrder|HaulTask;path?:Cell[] }
export function planCookingOrder(world:World,pawn:Pawn,stationId:number,access?:import('./pathfinding.ts').Reachability,budget={pairs:32768},forced=true):CookingProposal {
  const label='Cuisiner au feu',no=(reason:string):CookingProposal=>({label,reason});
  if(!pawn.priorities.cook)return no('Cuisine désactivée dans le tableau Travail.');
  const station=world.structures.find(s=>s.id===stationId&&s.kind==='campfire');
  if(!station)return no('Poste de cuisine introuvable.');
  if(!station.bills?.some(b=>billWanted(world,b)))return no('Aucune facture active à produire : vérifiez suspension et quantité demandée.');
  if(fuelStationReserved(world,station.id))return no('Poste réservé pour une cuisine ou un ravitaillement.');
  const spot=cookingSpot(station);
  if(!cookingPlaceFree(world,spot)||reservedServiceCells(world).has(cellIndex(world,spot.x,spot.z)))return no('Place de cuisine obstruée ou réservée.');
  const reach=access??candidateAccess(world,pawn,blockedCells(world),new Set());
  if(!routeToCell(world,spot,reach))return no('Aucun accès à la place de cuisine.');
  const plan=planCooking(world,pawn,reach,budget,{stationId,forced});
  if(!plan)return no(station.fuel?.ticks?'Aucune recette réalisable : ingrédients autorisés dans le rayon, accès ou dépôt insuffisants.':'Aucun bois disponible et accessible pour rallumer le feu.');
  return {label:plan.refuel?'Ravitailler avant de cuisiner':'Cuisiner un repas simple',order:plan.refuel??{cooking:plan.task!},path:plan.path};
}

/** Waiting recipes reserve real ingredients, the work spot and typed staging. */
export function queuedCookingReason(world:World,order:CookingOrder):string|undefined {
  const view=withoutQueuedOrder(world,order),c=order.cooking,station=view.structures.find(s=>s.id===c.stationId&&s.kind==='campfire'),bill=station?.bills?.find(b=>b.id===c.billId);
  if(!station||!bill||!billWanted(view,bill))return 'Facture supprimée, suspendue ou quantité atteinte.';
  if(!station.fuel?.ticks)return 'Le feu est éteint.';
  const spot=cookingSpot(station);
  if(spot.x!==c.spot.x||spot.z!==c.spot.z||!cookingPlaceFree(view,spot)||fuelStationReserved(view,station.id)||reservedServiceCells(view).has(cellIndex(view,spot.x,spot.z)))return 'Poste ou place de cuisine indisponible.';
  const incoming=new Map<number,{item:'rice'|'berries';quantity:number}>();
  for(const i of c.ingredients) {
    const pile=view.piles.find(p=>p.id===i.pileId);
    if(!bill.filters[i.item]||!pile||pile.item!==i.item||pile.owner.type!=='ground'||pile.quantity-reservedSource(view,pile.id)<i.quantity)return 'Ingrédient réservé disparu ou devenu insuffisant.';
    if((pile.owner.x-station.x)**2+(pile.owner.z-station.z)**2>bill.radius**2)return 'Ingrédient sorti du rayon de la facture.';
    if(Math.abs(i.cell.x-spot.x)+Math.abs(i.cell.z-spot.z)>1||!cookingPlaceFree(view,i.cell))return 'Dépôt des ingrédients inaccessible.';
    if(i.stage==='placed') {if(pile.owner.x!==i.cell.x||pile.owner.z!==i.cell.z)return 'Ingrédient déjà posé déplacé.';}
    else {
      const key=cellIndex(view,i.cell.x,i.cell.z),prior=incoming.get(key),quantity=(prior?.quantity??0)+i.quantity;
      if(prior&&prior.item!==i.item||groundCapacity(view,i.cell,i.item)<quantity)return 'Dépôt réservé devenu incompatible ou plein.';
      incoming.set(key,{item:i.item,quantity});
    }
  }
}
export function startCookingOrder(pawn:Pawn,order:CookingOrder,path:Cell[]):void {
  pawn.cooking=order.cooking;pawn.orders.active='cook';pawn.path=path;pawn.planCooldown=0;pawn.state=path.length||pawn.moveCooldown>0?'moving':'working';
}
export function advanceCookingOrder(world:World,pawn:Pawn,order:CookingOrder,getBlocked:NavigationGrid,budget:SearchBudget):boolean {
  let reason=queuedCookingReason(world,order),path:Cell[]|null=null;
  if(!reason) {
    const c=order.cooking,sources=c.ingredients.filter(i=>i.stage==='source').map(i=>world.piles.find(p=>p.id===i.pileId)!.owner as Cell);
    const groups=[new Set([cellIndex(world,c.spot.x,c.spot.z)]),...sources.map(s=>interactionGoals(world,[s]))];
    const reach=search(world,pawn,getBlocked(),new Set(),budget,undefined,groups);if(!reach)return true;
    const workPath=routeToCell(world,c.spot,reach);
    if(!workPath||sources.some(s=>!canReach(world,s,reach,true)))reason='Accès perdu à la cuisine ou aux ingrédients.';
    else path=sources[0]?routeToJob(world,sources[0],reach,true):workPath;
  }
  pawn.orders.queue.shift();
  if(!reason&&path){startCookingOrder(pawn,order,path);return false;}
  world.events.push({tick:world.tick,type:'command',message:`${pawn.name} : cuisine abandonnée. ${reason??'Accès perdu.'}`});if(world.events.length>80)world.events.shift();return true;
}
