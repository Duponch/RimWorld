import {artWorkTotal,isArtRecipe} from './art-rules.ts';
import { isAnimalCorpseItem } from './biome-items.ts';
import { productionResearchUnlocked,productionWorkerQualified } from './machining.ts';
import { ADVANCED_COMPONENT_REQUIREMENTS,isComponentRecipe,isFlakRecipe,isGunRecipe,flakRequirements,FLAK_HELMET_REQUIREMENTS,RECON_HELMET_REQUIREMENTS,FLAK_REQUIREMENTS,GUN_REQUIREMENTS } from './production-recipes.ts';
import { foodStationUsable, usesCookingFuel } from './food-workstations.ts';
import { corpseFresh } from './corpses.ts';
import { ticksUntilRot } from './food-preservation.ts';
import { productionWorkTotal, PRODUCTION_RECIPES, admittedIngredient, fineMealIngredientGroup, mixedMealGroupUnits, stationWork } from './production-recipes.ts';
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
  if(!productionResearchUnlocked(world,bill.recipe))return {code:'research-required',reason:bill.recipe==='cook-survival-meal'?'Recherchez Repas de survie pour préparer des rations.':bill.recipe==='make-component'?'Recherchez Fabrication pour produire des composants.':bill.recipe==='make-advanced-component'?'Recherchez Fabrication avancée pour produire des composants avancés.':bill.recipe==='make-recon-helmet'?'Recherchez Armure de reconnaissance après Fabrication et Vêtements complexes.':isFlakRecipe(bill.recipe)?'Recherchez Armure pare-balles après Usinage et Armure de plaques.':'Recherchez Armurerie pour fabriquer cette arme.'};
  if(!billWanted(world,bill))return {code:'target-met',reason:bill.mode==='times'?'Quantité demandée terminée.':bill.recipe==='butcher-creature'?'Seuil de viande stockée atteint.':'Seuil de produits stockés ou portés atteint.'};
  const serving=world.pawns.find(p=>p.cooking?.stationId===station.id||p.haul?.destination.type==='fuel'&&p.haul.destination.structureId===station.id);
  if(serving)return {code:'station-busy',reason:`Poste occupé par ${serving.name}.`};
  if(!world.pawns.some(p=>p.priorities[stationWork(station)]>0))return {code:'waiting-worker',reason:'Métier désactivé pour tous les colons dans Travail.'};
  if(!world.pawns.some(p=>p.priorities[stationWork(station)]>0&&productionWorkerQualified(p,bill.recipe)))return {code:'skill-required',reason:bill.recipe==='fine-meal'||bill.recipe==='cook-fine-meal-bulk'||bill.recipe==='vegetarian-fine-meal'||bill.recipe==='cook-vegetarian-fine-meal-bulk'||bill.recipe==='carnivore-fine-meal'||bill.recipe==='cook-carnivore-fine-meal-bulk'?'Un cuisinier de niveau Cuisine 6 est nécessaire.':bill.recipe==='cook-survival-meal'||bill.recipe==='lavish-meal'||bill.recipe==='cook-lavish-meal-bulk'||bill.recipe==='vegetarian-lavish-meal'||bill.recipe==='cook-vegetarian-lavish-meal-bulk'||bill.recipe==='cook-carnivore-lavish-meal'||bill.recipe==='cook-carnivore-lavish-meal-bulk'?'Un cuisinier de niveau Cuisine 8 est nécessaire.':`Un artisan de niveau ${isComponentRecipe(bill.recipe)?8:isGunRecipe(bill.recipe)?GUN_REQUIREMENTS[bill.recipe].skill:isFlakRecipe(bill.recipe)?flakRequirements(bill.recipe).skill:0} est nécessaire.`};
  const spot=cookingSpot(station);
  if(!cookingPlaceFree(world,spot))return {code:'blocked-workplace',reason:'La place de travail devant le poste est obstruée.'};
  if(station.kind==='electric-stove'&&!foodStationUsable(station))return {code:'no-power',reason:'Cuisinière sans alimentation électrique :350 W nécessaires.'};
  if(station.kind==='machining-table'&&!station.power?.on)return {code:'no-power',reason:'Atelier sans alimentation électrique : 350 W nécessaires.'};
  if(station.kind==='fabrication-bench'&&!station.power?.on)return {code:'no-power',reason:'Établi de fabrication sans alimentation électrique : 250 W nécessaires.'};
  if(usesCookingFuel(station.kind)&&!station.fuel?.ticks) {
    if(!station.fuel?.autoRefuel)return {code:'refuel-disabled',reason:'Poste sans combustible ; ravitaillement automatique désactivé.'};
    const wood=world.piles.some(p=>p.item==='wood'&&p.owner.type==='ground'&&p.quantity>reservedSource(world,p.id));
    return {code:wood?'waiting-fuel':'missing-fuel',reason:wood?'Poste sans combustible ; attend un ravitaillement et un accès au bois.':'Poste sans combustible ; aucun bois au sol non réservé.'};
  }
  const u=world.piles.find(p=>p.artWork?.billId===bill.id||p.unfinished?.billId===bill.id||p.gunWork?.billId===bill.id||p.flakWork?.billId===bill.id||p.componentWork?.billId===bill.id),work=u?.artWork??u?.gunWork??u?.flakWork??u?.componentWork??u?.unfinished;if(work)return {code:'unfinished',reason:`Ouvrage commencé : attend ${world.pawns.find(p=>p.id===work.authorId)?.name??'son auteur'} ; ${Math.floor(work.progress/(u?.artWork?artWorkTotal(u.artWork.recipe,u.artWork.material):productionWorkTotal(work.recipe))*100)} % conservés.`};
  let available=0;const byMaterial=new Map<string,number>();const metals={cloth:0,steel:0,component:0,plasteel:0,gold:0,'advanced-component':0};const fine={protein:0,vegetable:0};
  for(const pile of world.piles)if(admittedIngredient(bill,pile.item)&&(!isAnimalCorpseItem(pile.item)||corpseFresh(pile,world.tick))&&((bill.recipe!=='cook-survival-meal'&&bill.recipe!=='cook-simple-meal-bulk'&&bill.recipe!=='cook-fine-meal-bulk'&&bill.recipe!=='cook-lavish-meal-bulk'&&bill.recipe!=='vegetarian-fine-meal'&&bill.recipe!=='cook-vegetarian-fine-meal-bulk'&&bill.recipe!=='carnivore-fine-meal'&&bill.recipe!=='cook-carnivore-fine-meal-bulk'&&bill.recipe!=='vegetarian-lavish-meal'&&bill.recipe!=='cook-vegetarian-lavish-meal-bulk'&&bill.recipe!=='cook-carnivore-lavish-meal'&&bill.recipe!=='cook-carnivore-lavish-meal-bulk')||ticksUntilRot(pile,world.tick)>0)&&pile.owner.type==='ground'
    &&(pile.owner.x-station.x)**2+(pile.owner.z-station.z)**2<=bill.radius**2){const units=Math.max(0,pile.quantity-reservedSource(world,pile.id));available+=units;byMaterial.set(pile.item,(byMaterial.get(pile.item)??0)+units);if(pile.item==='cloth'||pile.item==='steel'||pile.item==='component'||pile.item==='plasteel'||pile.item==='gold'||pile.item==='advanced-component')metals[pile.item]+=units;if(mixedMealGroupUnits(bill.recipe)){const group=fineMealIngredientGroup(pile.item);if(group)fine[group]+=units;}}
  const mealQuota=mixedMealGroupUnits(bill.recipe);
  if(mealQuota&&(fine.protein<mealQuota||fine.vegetable<mealQuota))return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${fine.protein}/${mealQuota} protéines (viande ou lait) · ${fine.vegetable}/${mealQuota} végétaux.`};
  if(bill.recipe==='vegetarian-fine-meal'&&available<15)return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${available}/15 végétaux crus ou lait frais non réservés.`};
  if(bill.recipe==='cook-vegetarian-fine-meal-bulk'&&available<60)return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${available}/60 végétaux crus ou lait frais non réservés.`};
  if(bill.recipe==='cook-carnivore-fine-meal-bulk'&&available<60)return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${available}/60 viandes crues fraîches non réservées.`};
  if(bill.recipe==='carnivore-fine-meal'&&available<15)return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${available}/15 viandes crues fraîches non réservées.`};
  if(bill.recipe==='cook-vegetarian-lavish-meal-bulk'&&available<100)return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${available}/100 végétaux crus ou laits frais non réservés.`};
  if(bill.recipe==='vegetarian-lavish-meal'&&available<25)return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${available}/25 végétaux crus ou lait frais non réservés.`};
  if(bill.recipe==='cook-carnivore-lavish-meal-bulk'&&available<100)return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${available}/100 viandes crues fraîches non réservées.`};
  if(bill.recipe==='cook-carnivore-lavish-meal'&&available<25)return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${available}/25 viandes crues fraîches non réservées.`};
  if(bill.recipe==='make-advanced-component'){
    const r=ADVANCED_COMPONENT_REQUIREMENTS;
    if(metals.component<r.component||metals.steel<r.steel||metals.plasteel<r.plasteel||metals.gold<r.gold)return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${metals.component}/${r.component} composant · ${metals.steel}/${r.steel} acier · ${metals.plasteel}/${r.plasteel} plastacier · ${metals.gold}/${r.gold} or.`};
  }
  if(isGunRecipe(bill.recipe)){const r=GUN_REQUIREMENTS[bill.recipe];if(metals.steel<r.steel||metals.component<r.component)return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${metals.steel}/${r.steel} acier · ${metals.component}/${r.component} composants.`};}
  if(bill.recipe==='make-flak-vest'){const r=FLAK_REQUIREMENTS;if(metals.cloth<r.cloth||metals.steel<r.steel||metals.component<r.component)return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${metals.cloth}/${r.cloth} tissu · ${metals.steel}/${r.steel} acier · ${metals.component}/${r.component} composant.`};}
  if(bill.recipe==='make-flak-helmet'){const r=FLAK_HELMET_REQUIREMENTS;if(metals.steel<r.steel||metals.component<r.component||metals.plasteel<r.plasteel)return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${metals.steel}/${r.steel} acier · ${metals.component}/${r.component} composants · ${metals.plasteel}/${r.plasteel} plastacier.`};}
  if(bill.recipe==='make-recon-helmet'){const r=RECON_HELMET_REQUIREMENTS;if(metals.plasteel<r.plasteel||metals['advanced-component']<r['advanced-component'])return {code:'missing-ingredients',reason:`Dans le rayon et les filtres : ${metals.plasteel}/${r.plasteel} plastacier · ${metals['advanced-component']}/${r['advanced-component']} composant avancé.`};}
  if(isArtRecipe(bill.recipe))available=Math.max(0,...byMaterial.values());
  if(available<PRODUCTION_RECIPES[bill.recipe].units)return {code:'missing-ingredients',reason:`Ingrédients insuffisants : ${available}/${PRODUCTION_RECIPES[bill.recipe].units} non réservés dans le rayon et les filtres.`};
  if(reservedServiceCells(world).has(spot.z*world.width+spot.x))return {code:'workplace-occupied',reason:'La place devant le poste est réservée par une autre activité.'};
  return {code:'waiting',reason:'Attend un artisan disponible ; accès, priorités et place de dépôt à vérifier.'};
}
