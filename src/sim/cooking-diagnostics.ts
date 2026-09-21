import { isAnimalCorpseItem } from './biome-items.ts';
import { foodStationUsable, usesCookingFuel } from './food-workstations.ts';
import { corpseFresh } from './corpses.ts';
import { productionWorkTotal, PRODUCTION_RECIPES, admittedIngredient, stationWork } from './production-recipes.ts';
import { reservedServiceCells } from './service-reservations.ts';
import { isCookingOrder } from './order-types.ts';
import { billWanted, cookingPlaceFree, cookingSpot } from './cooking-bills.ts';
import { reservedSource } from './materials.ts';
import { queryPawnStatus } from './diagnostics.ts';
import type { CookingBill } from './cooking-types.ts';
import type { Structure, World } from './types.ts';

/** Cheap explanation of known state, never a main-thread reachability probe.
 * Available quantities are unreserved ground stock in radius, not a promise
 * that a route or enough staging room exists. */
export function queryCookingBillStatus(world:World,station:Structure,bill:CookingBill):{code:string;reason:string} {
  const worker=world.pawns.find(p=>p.cooking?.stationId===station.id&&p.cooking.billId===bill.id);
  if(worker)return queryPawnStatus(world,worker);
  const queued=world.pawns.find(p=>p.orders.queue.some(o=>isCookingOrder(o)&&o.cooking.stationId===station.id&&o.cooking.billId===bill.id));
  if(queued)return {code:'queued',reason:`Production en file pour ${queued.name} ; ingrédients et poste réservés.`};
  if(bill.suspended)return {code:'suspended',reason:'Facture suspendue.'};
  if(!billWanted(world,bill))return {code:'target-met',reason:bill.mode==='times'?'Quantité demandée terminée.':bill.recipe==='butcher-creature'?'Seuil de viande stockée atteint.':'Seuil de produits stockés ou portés atteint.'};
  const serving=world.pawns.find(p=>p.cooking?.stationId===station.id||p.haul?.destination.type==='fuel'&&p.haul.destination.structureId===station.id);
  if(serving)return {code:'station-busy',reason:`Poste occupé par ${serving.name}.`};
  if(!world.pawns.some(p=>p.priorities[stationWork(station)]>0))return {code:'waiting-worker',reason:'Métier désactivé pour tous les colons dans Travail.'};
  const spot=cookingSpot(station);
  if(!cookingPlaceFree(world,spot))return {code:'blocked-workplace',reason:'La place de travail devant le poste est obstruée.'};
  if(station.kind==='electric-stove'&&!foodStationUsable(station))return {code:'no-power',reason:'Cuisinière sans alimentation électrique :350 W nécessaires.'};
  if(usesCookingFuel(station.kind)&&!station.fuel?.ticks) {
    if(!station.fuel?.autoRefuel)return {code:'refuel-disabled',reason:'Poste sans combustible ; ravitaillement automatique désactivé.'};
    const wood=world.piles.some(p=>p.item==='wood'&&p.owner.type==='ground'&&p.quantity>reservedSource(world,p.id));
    return {code:wood?'waiting-fuel':'missing-fuel',reason:wood?'Poste sans combustible ; attend un ravitaillement et un accès au bois.':'Poste sans combustible ; aucun bois au sol non réservé.'};
  }
  const u=world.piles.find(p=>p.unfinished?.billId===bill.id);if(u)return {code:'unfinished',reason:`Ouvrage commencé : attend ${world.pawns.find(p=>p.id===u.unfinished!.authorId)?.name??'son auteur'} ; ${Math.floor(u.unfinished!.progress/productionWorkTotal(u.unfinished!.recipe)*100)} % conservés.`};
  let available=0;
  for(const pile of world.piles)if(admittedIngredient(bill,pile.item)&&(!isAnimalCorpseItem(pile.item)||corpseFresh(pile,world.tick))&&pile.owner.type==='ground'
    &&(pile.owner.x-station.x)**2+(pile.owner.z-station.z)**2<=bill.radius**2)available+=Math.max(0,pile.quantity-reservedSource(world,pile.id));
  if(available<PRODUCTION_RECIPES[bill.recipe].units)return {code:'missing-ingredients',reason:`Ingrédients insuffisants : ${available}/${PRODUCTION_RECIPES[bill.recipe].units} non réservés dans le rayon et les filtres.`};
  if(reservedServiceCells(world).has(spot.z*world.width+spot.x))return {code:'workplace-occupied',reason:'La place devant le poste est réservée par une autre activité.'};
  return {code:'waiting',reason:'Attend un artisan disponible ; accès, priorités et place de dépôt à vérifier.'};
}
