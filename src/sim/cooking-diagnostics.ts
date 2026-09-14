import { reservedServiceCells } from './service-reservations.ts';
import { billWanted, cookingPlaceFree, cookingSpot, INGREDIENT_UNITS } from './cooking-bills.ts';
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
  if(bill.suspended)return {code:'suspended',reason:'Facture suspendue.'};
  if(!billWanted(world,bill))return {code:'target-met',reason:bill.mode==='times'?'Quantité demandée terminée.':'Seuil de repas stockés ou portés atteint.'};
  const serving=world.pawns.find(p=>p.cooking?.stationId===station.id||p.haul?.destination.type==='fuel'&&p.haul.destination.structureId===station.id);
  if(serving)return {code:'station-busy',reason:`Poste occupé par ${serving.name}.`};
  if(!world.pawns.some(p=>p.priorities.cook>0))return {code:'waiting-worker',reason:'Cuisine désactivée pour tous les colons dans Travail.'};
  const spot=cookingSpot(station);
  if(!cookingPlaceFree(world,spot))return {code:'blocked-workplace',reason:'La place de travail devant le feu est obstruée.'};
  if(!station.fuel?.ticks) {
    if(!station.fuel?.autoRefuel)return {code:'refuel-disabled',reason:'Feu éteint ; ravitaillement automatique désactivé.'};
    const wood=world.piles.some(p=>p.item==='wood'&&p.owner.type==='ground'&&p.quantity>reservedSource(world,p.id));
    return {code:wood?'waiting-fuel':'missing-fuel',reason:wood?'Feu éteint ; attend un ravitaillement et un accès au bois.':'Feu éteint ; aucun bois au sol non réservé.'};
  }
  let available=0;
  for(const pile of world.piles)if((pile.item==='rice'||pile.item==='berries')&&bill.filters[pile.item]&&pile.owner.type==='ground'
    &&(pile.owner.x-station.x)**2+(pile.owner.z-station.z)**2<=bill.radius**2)available+=Math.max(0,pile.quantity-reservedSource(world,pile.id));
  if(available<INGREDIENT_UNITS)return {code:'missing-ingredients',reason:`Ingrédients insuffisants : ${available}/${INGREDIENT_UNITS} non réservés dans le rayon et les filtres.`};
  if(reservedServiceCells(world).has(spot.z*world.width+spot.x))return {code:'workplace-occupied',reason:'La place devant le feu est réservée par une autre activité.'};
  return {code:'waiting',reason:'Attend un cuisinier disponible ; accès, priorités et place de dépôt à vérifier.'};
}
