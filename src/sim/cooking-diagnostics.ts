import {artWorkTotal,isArtRecipe} from './art-rules.ts';
import { isAnimalCorpseItem } from './biome-items.ts';
import { productionResearchUnlocked,productionWorkerQualified } from './machining.ts';
import { isFlakRecipe,isGunRecipe,FLAK_REQUIREMENTS,GUN_REQUIREMENTS } from './production-recipes.ts';
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
  if(!productionResearchUnlocked(world,bill.recipe))return {code:'research-required',reason:isFlakRecipe(bill.recipe)?'Recherchez Gilet pare-balles après Usinage et Armure de plaques.':'Recherchez Armurerie pour fabriquer cette arme.'};
  if(!billWanted(world,bill))return {code:'target-met',reason:bill.mode==='times'?'Quantité demandée terminée.':bill.recipe==='butcher-creature'?'Seuil de viande stockée atteint.':'Seuil de produits stockés ou portés atteint.'};
  const serving=world.pawns.find(p=>p.cooking?.stationId===station.id||p.haul?.destination.type==='fuel'&&p.haul.destination.structureId===station.id);
  if(serving)return {code:'station-busy',reason:`Poste occupé par ${serving.name}.`};
  if(!world.pawns.some(p=>p.priorities[stationWork(station)]>0))return {code:'waiting-worker',reason:'Métier désactivé pour tous les colons dans Travail.'};
  if(!world.pawns.some(p=>p.priorities[stationWork(station)]>0&&productionWorkerQualified(p,bill.recipe)))return {code:'skill-required',reason:`Un artisan de niveau ${isGunRecipe(bill.recipe)?GUN_REQUIREMENTS[bill.recipe].skill:isFlakRecipe(bill.recipe)?FLAK_REQUIREMENTS.skill:0} est nécessaire.`};
  const spot=cookingSpot(station);
  if(!cookingPlaceFree(world,spot))return {code:'blocked-workplace',reason:'La place de travail devant le poste est obstruée.'};
  if(station.kind==='electric-stove'&&!foodStationUsable(station))return {code:'no-power',reason:'Cuisinière sans alimentation électrique :350 W nécessaires.'};
  if(station.kind==='machining-table'&&!station.power?.on)return {code:'no-power',reason:'Atelier sans alimentation électrique : 350 W nécessaires.'};
  if(usesCookingFuel(station.kind)&&!station.fuel?.ticks) {
    if(!station.fuel?.autoRefuel)return {code:'refuel-disabled',reason:'Poste sans combustible ; ravitaillement automatique désactivé.'};
    const wood=world.piles.some(p=>p.item==='wood'&&p.owner.type==='ground'&&p.quantity>reservedSource(world,p.id));
    return {code:wood?'waiting-fuel':'missing-fuel',reason:wood?'Poste sans combustible ; attend un ravitaillement et un accès au bois.':'Poste sans combustible ; aucun bois au sol non réservé.'};
  }
  const u=world.piles.find(p=>p.artWork?.billId===bill.id||p.unfinished?.billId===bill.id||p.gunWork?.billId===bill.id||p.flakWork?.billId===bill.id),work=u?.artWork??u?.gunWork??u?.flakWork??u?.unfinished;if(work)return {code:'unfinished',reason:`Ouvrage commencé : attend ${world.pawns.find(p=>p.id===work.authorId)?.name??'son auteur'} ; ${Math.floor(work.progress/(u?.artWork?artWorkTotal(u.artWork.recipe,u.artWork.material):productionWorkTotal(work.recipe))*100)} % conservés.`};
  let available=0;const byMaterial=new Map<string,number>();const metals={cloth:0,steel:0,component:0};
  for(const pile of world.piles)if(admittedIngredient(bill,pile.item)&&(!isAnimalCorpseItem(pile.item)||corpseFresh(pile,world.tick))&&pile.owner.type==='ground'
    &&(pile.owner.x-station.x)**2+(pile.owner.z-station.z)**2<=bill.radius**2){const units=Math.max(0,pile.quantity-reservedSource(world,pile.id));available+=units;byMaterial.set(pile.item,(byMaterial.get(pile.item)??0)+units);if(pile.item==='cloth'||pile.item==='steel'||pile.item==='component')metals[pile.item]+=units;}
  if(isGunRecipe(bill.recipe)){const r=GUN_REQUIREMENTS[bill.recipe];if(metals.steel<r.steel||metals.component<r.component)return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${metals.steel}/${r.steel} acier · ${metals.component}/${r.component} composants.`};}
  if(isFlakRecipe(bill.recipe)){const r=FLAK_REQUIREMENTS;if(metals.cloth<r.cloth||metals.steel<r.steel||metals.component<r.component)return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${metals.cloth}/${r.cloth} tissu · ${metals.steel}/${r.steel} acier · ${metals.component}/${r.component} composant.`};}
  if(isArtRecipe(bill.recipe))available=Math.max(0,...byMaterial.values());
  if(available<PRODUCTION_RECIPES[bill.recipe].units)return {code:'missing-ingredients',reason:`Ingrédients insuffisants : ${available}/${PRODUCTION_RECIPES[bill.recipe].units} non réservés dans le rayon et les filtres.`};
  if(reservedServiceCells(world).has(spot.z*world.width+spot.x))return {code:'workplace-occupied',reason:'La place devant le poste est réservée par une autre activité.'};
  return {code:'waiting',reason:'Attend un artisan disponible ; accès, priorités et place de dépôt à vérifier.'};
}
