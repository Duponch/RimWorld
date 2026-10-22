/** Read-only travel preparation. No gameplay clock, owner, ID or random draw is
 * advanced. Food coverage and nutrition-weighted rot duration are independent. */
import type {World,Pawn,MaterialPile} from './types.ts';
import {TICKS_PER_DAY} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {GroupMassCapture} from './group-capture.ts';
import type {GroupMassView} from './group-panel-state.ts';
import {ITEM_DEFINITIONS,rawFoodThought,type ItemId} from './items.ts';
import {HUNGER_PER_TICK} from './human-need-rates.ts';
import {allowedFoodFromPolicies} from './food-policy.ts';
import {foodScore} from './food-selection.ts';
import {caravanAnimalFoodEver256,caravanAnimalFoodScore256} from './group-animal-food-256.ts';
import {animalNutritionMax,animalFoodPerDay,animalFoodWantEat256} from './animal-life.ts';
import {animalPlantDiet256} from './animal-diet-v256.ts';
import {animalSpecies} from './animal-species.ts';
import {groupForagedNutritionPerDay256} from './group-forage-256.ts';
import {LOCAL_BIOME_DATA_256} from './local-biome-data-v256.ts';
import {ROT_DAYS,isPerishable,rotAge,rotRateAtTemperature} from './food-preservation.ts';
import {planetTile,planetGeography256} from './planet-geography-256.ts';
import {worldSeasonalTemperature} from './world-surface-movement.ts';
import {seasonTemperature} from './site-climate.ts';
import {planetHomeCivilCore,planetAbsoluteCore256,planetTileCoordinates,tileCivilCore,tileHour,planetEdgeCost,findPlanetRoute,planetQueryBudget,validPlanetRoute,roundEven,type PlanetCostContext} from './planet-navigation.ts';
import {actualFinalPushDestination256} from './group-campaign-geometry-256.ts';
import {groupPlayerOwner256} from './group-route-interval-256.ts';
import {backgroundSkillRefusal} from './colonist-backgrounds.ts';

export const TRAVEL_ESTIMATE_HORIZON_DAYS=600;
export type TravelWarning='no-food'|'short-food'|'rot-soon'|'disliked-food'|'no-social';
export interface GroupTravelEstimate {ok:true;foodDays:number;rotDays:number;nutrition:number;forageNutritionPerDay:number;warnings:readonly TravelWarning[];durationCore:number;operations:number}
export type GroupTravelEstimateResult=GroupTravelEstimate|{ok:false;reason:string};
export interface TravelArrival {tile:number;elapsedCore:number}
export interface GroupItinerary {ok:true;points:readonly number[];route:readonly number[];arrivals:readonly TravelArrival[];waypointCore:readonly number[];durationCore:number}
export type GroupItineraryResult=GroupItinerary|{ok:false;reason:string};
const failed=(reason:string)=>({ok:false as const,reason});
const alive=(p:Pawn|WildAnimal)=>p.state!=='dead'&&!p.health?.death;
const massCapture=(m:GroupMassView):GroupMassCapture=>({grams:m.grams,capacityGrams:m.capacityGrams,carriers:m.byMember,...m.ridingFactor!==undefined?{ridingFactor:m.ridingFactor}:{}});

/** Edge costs, civil time and actual world-object final push share runtime
 * rules. At most two night boundaries per capped edge, no per-tick loop. */
export function groupRouteArrivals(w:World,route:readonly number[],mass:GroupMassCapture,initial?:TravelArrival):readonly TravelArrival[] {
 return routeArrivals(w,route,{homeCivilCore:planetHomeCivilCore(w),mass},initial);
}
function routeArrivals(w:World,route:readonly number[],cost:PlanetCostContext,initial?:TravelArrival):readonly TravelArrival[] {
 if(!w.planet||!route.length)throw Error('Route de préparation absente.');
 const planet=w.planet,home=cost.homeCivilCore;
 const pay=(from:number,to:number,remaining:number,start:number,started:boolean,last:boolean)=>{
  let left=remaining,elapsed=start;
  for(let boundary=0;left>0;boundary++){
   if(boundary>6)throw Error('Estimation nocturne hors borne.');
   const hour=tileHour(planet,from,home+elapsed),night=hour<6||hour>22,final=started&&last&&left<=10000&&actualFinalPushDestination256(w,to);
   if(night&&!final){elapsed+=(hour<6?6-hour:30-hour)*2500;continue;}
   const daylight=final?left:Math.max(1,(22-hour)*2500),used=Math.min(left,daylight);elapsed+=used;left-=used;started=true;
  }
  return elapsed;
 };
 const arrivals:TravelArrival[]=initial&&initial.tile!==route[0]?[{tile:initial.tile,elapsedCore:0},{tile:route[0]!,elapsedCore:pay(initial.tile,route[0]!,initial.elapsedCore,0,true,route.length===1)}]:[initial??{tile:route[0]!,elapsedCore:0}];
 let elapsed=arrivals.at(-1)!.elapsedCore;
 for(let i=1;i<route.length;i++){
  const from=route[i-1]!,to=route[i]!,edge=planetEdgeCost(planet,from,to,{...cost,homeCivilCore:home+elapsed});
  if(edge===undefined)throw Error('Une étape du trajet n’est plus accessible.');
  elapsed=pay(from,to,edge,elapsed,false,i===route.length-1);
  arrivals.push({tile:to,elapsedCore:elapsed});
 }
 return arrivals;
}

/** Planner data lives only in its caller. Each leg uses the preceding leg's
 * arrival clock; accepting the UI plan still chooses only points[1]. */
export function previewGroupItinerary(w:World,points:readonly number[],mass:GroupMassView):GroupItineraryResult {
 try{return previewItinerary(w,points,{homeCivilCore:planetHomeCivilCore(w),mass:massCapture(mass)},false);}
 catch(e){return failed(e instanceof Error?e.message:String(e));}
}
/** Native WorldRoutePlanner fallback, without any invented person/capacity.
 * Search(null caravan)=3300; displayed ETA average=3464 Core/movement. */
export function previewGenericItinerary261(w:World,points:readonly number[]):GroupItineraryResult {
 try{return previewItinerary(w,points,{homeCivilCore:planetHomeCivilCore(w),genericTicksPerMove:3464},true);}
 catch(e){return failed(e instanceof Error?e.message:String(e));}
}
/** TradeRequest's null-caravan estimate uses3300 for both search and arrival;
 * the route planner's displayed3464 fallback remains unchanged. */
export function previewTradeRequestItinerary284(w:World,points:readonly number[]):GroupItineraryResult {
 try{return previewItinerary(w,points,{homeCivilCore:planetHomeCivilCore(w),genericTicksPerMove:3300},true);}
 catch(e){return failed(e instanceof Error?e.message:String(e));}
}
function previewItinerary(w:World,points:readonly number[],cost:PlanetCostContext,generic:boolean):GroupItineraryResult {
 try{
  if(!w.planet||points.length<(generic?0:1)||points.length>25)return failed('Le plan accepte au plus25 étapes, origine comprise.');
  if(generic&&points.some(id=>!validPlanetRoute(w.planet!,[id],id,id)))return failed('Cette étape est inaccessible.');
  if(!points.length)return {ok:true,points:[],route:[],arrivals:[],waypointCore:[],durationCore:0};
  const route:number[]=[points[0]!],arrivals:TravelArrival[]=[{tile:points[0]!,elapsedCore:0}],waypointCore=[0];let elapsed=0;
  for(let i=1;i<points.length;i++){
   if(points[i]===points[i-1])return failed('Choisissez une autre case pour cette étape.');
   const at=cost.homeCivilCore+elapsed,search:PlanetCostContext=generic?{homeCivilCore:at,genericTicksPerMove:3300}:{...cost,homeCivilCore:at};
   const path=findPlanetRoute(w.planet,points[i-1]!,points[i]!,search,planetQueryBudget(w.planet));
   if(path.kind!=='found')return failed(path.kind==='deferred'?'Le calcul d’étape est différé.':'Cette étape est inaccessible.');
   const times=routeArrivals(w,path.tiles,cost,{tile:points[i-1]!,elapsedCore:elapsed});route.push(...path.tiles.slice(1));arrivals.push(...times.slice(1));elapsed=times.at(-1)!.elapsedCore;waypointCore.push(elapsed);
  }
  return {ok:true,points:[...points],route,arrivals,waypointCore,durationCore:elapsed};
 }catch(e){return failed(e instanceof Error?e.message:String(e));}
}

interface Eater {max:number;between:number;fedDays:number;grazer:boolean;accept(item:ItemId):boolean;score(item:ItemId):number}
/** Inputs are the original selected owners and one entry per physical stack.
 * Selected ground quantities may be detached quantity views of those stacks. */
export function estimateGroupTravel(w:World,input:{members:readonly Pawn[];animals:readonly WildAnimal[];items:readonly MaterialPile[];route:readonly number[];mass:GroupMassCapture;initial?:TravelArrival},maximumOperations=500000):GroupTravelEstimateResult {
 let operations=0;const spend=()=>{if(++operations>maximumOperations)throw Error('Estimation indisponible : borne de calcul atteinte.');};
 try{
  const planet=w.planet;if(!planet||!input.route.length)return failed('Choisissez d’abord une route terrestre.');
  const people=input.members.filter(alive),animals=input.animals.filter(alive),owners=new Set([...people,...animals].map(p=>p.id));
  if(owners.size!==people.length+animals.length)throw Error('Un mangeur est compté deux fois.');
  const stackIds=new Set<number>(),items=input.items.filter(p=>{
   if(stackIds.has(p.id)||!Number.isSafeInteger(p.quantity)||p.quantity<1)throw Error('Un stock sélectionné est incohérent ou compté deux fois.');stackIds.add(p.id);
   if(p.owner.type!=='ground'&&(p.owner.type!=='inventory'||!owners.has(p.owner.pawnId)))throw Error('Un stock ne dépend pas des porteurs sélectionnés.');
   return p.kind==='food'&&ITEM_DEFINITIONS[p.item].nutrition>0;
  });
  const arrivals=groupRouteArrivals(w,input.route,input.mass,input.initial),home=planetHomeCivilCore(w),geography=planet.revision===3?planetGeography256(planet):undefined,absoluteStart=planet.revision===3?planetAbsoluteCore256(planet,home):0;
  const tileAt=(elapsed:number)=>{let lo=0,hi=arrivals.length;while(lo+1<hi){const mid=(lo+hi)>>1;if(arrivals[mid]!.elapsedCore<=elapsed)lo=mid;else hi=mid;}return arrivals[lo]!.tile;};
  const climates=new Map<number,{tile:NonNullable<ReturnType<typeof planetTile>>;biome:(typeof LOCAL_BIOME_DATA_256)[keyof typeof LOCAL_BIOME_DATA_256]['scalars'];latitude:number;civil:number}>();
  const environment=(elapsed:number)=>{
   spend();const id=tileAt(elapsed);let climate=climates.get(id);
   if(!climate){const tile=planetTile(planet,id);if(!tile||!Object.hasOwn(LOCAL_BIOME_DATA_256,tile.biome))throw Error('Biome de préparation inconnu.');climate={tile,biome:LOCAL_BIOME_DATA_256[tile.biome as keyof typeof LOCAL_BIOME_DATA_256].scalars,latitude:planetTileCoordinates(planet,id).latitude,civil:tileCivilCore(planet,id,home)};climates.set(id,climate);}
   const temperature=geography?worldSeasonalTemperature(geography.surface.tiles[id]!,absoluteStart+elapsed):seasonTemperature(climate.latitude,climate.tile.meanTemperature,(home+elapsed)/10);
   const civil=((climate.civil+elapsed)%60000+60000)%60000,hour=(civil===0?1:civil)/2500;return {biome:climate.biome,temperature,night:hour<6||hour>22};
  };
  // Current human maximum1; shared runtime eats below24% and falls160%/day
  // while fed. Need_Food estimates that interval ignoring malnutrition.
  const humanMaximum=1,humanBetween=humanMaximum*(1-.24),humanFallPerCore=(w.foodRules==='legacy'?.015:HUNGER_PER_TICK)/1000;
  const eaters:Eater[]=people.map(p=>{const allowed=new Set<ItemId>(allowedFoodFromPolicies(w.foodPolicies,p));return {max:humanMaximum,between:humanBetween,fedDays:Math.ceil(humanBetween/humanFallPerCore)/60000,grazer:false,accept:item=>allowed.has(item),score:item=>foodScore(item,0)};});
  for(const a of animals){const max=animalNutritionMax(a),between=max*(1-animalFoodWantEat256(a)*.8),perDay=animalFoodPerDay(a);if(!(max>0&&between>0&&perDay>0))throw Error('Besoin alimentaire animal inconnu.');
   eaters.push({max,between,fedDays:Math.ceil(between/perDay*60000)/60000,grazer:animalPlantDiet256(a)??!animalSpecies(a.species).predator,accept:item=>caravanAnimalFoodEver256(a,item),score:item=>caravanAnimalFoodScore256({item})});
  }
  const quantities=new Map<ItemId,number>();for(const p of items)quantities.set(p.item,(quantities.get(p.item)??0)+p.quantity);
  const registry=w.worldFactions,player=registry?.factions.find(f=>f.id===registry.playerFactionId)?.def;
  if(player!==undefined&&player!=='PlayerColony'&&player!=='PlayerTribe')throw Error('Faction de préparation inconnue.');
  const carried=new Set(people.filter(p=>p.state==='downed').map(p=>p.id)),foraging=people.reduce((n,p)=>n+groupForagedNutritionPerDay256(p,carried),0)/6*(player==='PlayerTribe'?1.7:1);
  const forageRate=(elapsed:number)=>foraging*6*environment(elapsed).biome.forageability;
  const covered=eaters.map(()=>0);let frontier=0,previous=0,forageProgress=0,stop=false;
  if(eaters.length)for(;;){
   spend();const env=environment(frontier*60000),interval=10000,elapsed=(frontier-previous)*60000;forageProgress+=Math.max(0,elapsed);previous=frontier;
   const food=env.biome.foragedFood==='RawBerries'?'berries':env.biome.foragedFood==='RawAgave'?'agave-fruit':null;
   if(food&&forageProgress>=interval){const units=roundEven(foraging*env.biome.forageability/(ITEM_DEFINITIONS[food].nutrition/100)),cycles=Math.floor(forageProgress/interval);quantities.set(food,(quantities.get(food)??0)+units*cycles);forageProgress-=cycles*interval;}
   let progressed=false;
   for(let i=0;i<eaters.length;i++){
    const eater=eaters[i]!;
    if(eater.grazer&&env.biome.hasVirtualPlants&&env.temperature>=0){covered[i]=covered[i]!<frontier?frontier:covered[i]!+.45;progressed=true;}
    else do{
     let best:ItemId|undefined,bestScore=-Infinity;for(const [item,count]of quantities){spend();if(count>0&&eater.accept(item)){const score=eater.score(item);if(score>bestScore){best=item;bestScore=score;}}}
     if(best===undefined){if(covered[i]!<frontier)stop=true;break;}
     const nutrition=Math.min(ITEM_DEFINITIONS[best].nutrition/100,eater.between),units=Math.min(quantities.get(best)!,Math.ceil(Math.min(.2,eater.max)/nutrition));
     if(!(nutrition>0&&units>0))throw Error('Quantité alimentaire estimée invalide.');
     covered[i]=covered[i]!+nutrition/eater.between*eater.fedDays*units;quantities.set(best,quantities.get(best)!-units);progressed=true;
    }while(covered[i]!<frontier);
    if(stop)break;frontier=Math.max(frontier,covered[i]!);
   }
   if(stop||!progressed||frontier>601)break;
  }
  const foodDays=Math.min(600,...covered),expiry: {days:number;nutrition:number}[]=[],rotDurations=new Map<string,number>();let nutrition=0,soon=0,disliked=0,humanUnits=0;
  for(const p of items){
   spend();let days=600;
   if(isPerishable(p.item)){
    const age=rotAge(p,w.tick),key=`${p.item}:${age}`,cached=rotDurations.get(key);let remaining=ROT_DAYS[p.item]*TICKS_PER_DAY-age,elapsed=0;
    if(cached!==undefined)days=cached;
    else if(remaining<=0)days=0;
    else while(elapsed<601*60000){
     spend();const rate=rotRateAtTemperature(environment(elapsed).temperature),coreRemaining=rate>0?remaining*10/rate:Infinity;
     const step=coreRemaining<600000?27000:coreRemaining<3600000?66000:coreRemaining<10800000?125999:306000,used=Math.min(step,coreRemaining,601*60000-elapsed);
     elapsed+=used;remaining-=used/10*rate;
     if(remaining<=.000001){days=Math.min(600,elapsed/60000);break;}
    }
    rotDurations.set(key,days);
   }
   const weight=ITEM_DEFINITIONS[p.item].nutrition/100*p.quantity;nutrition+=weight;if(days<5)soon+=weight;expiry.push({days,nutrition:weight});
   if(p.item!=='hay'){humanUnits+=p.quantity;if(rawFoodThought(p.item)||p.item==='nutrient-paste-meal'||p.item==='kibble')disliked+=p.quantity;}
  }
  expiry.sort((a,b)=>a.days-b.days);let rotDays=600,weight=0;for(const e of expiry){weight+=e.nutrition;if(weight>=nutrition/2){rotDays=e.days;break;}}
  const warnings:TravelWarning[]=[];if(foodDays<5)warnings.push(foodDays<.1?'no-food':'short-food');else if(nutrition>0&&soon/nutrition>=.75)warnings.push('rot-soon');
  if(people.length&&!people.some(p=>groupPlayerOwner256(p)&&!backgroundSkillRefusal(p,'social')))warnings.push('no-social');if(people.length&&humanUnits>0&&disliked/humanUnits>=.5)warnings.push('disliked-food');
  return {ok:true,foodDays,rotDays,nutrition,forageNutritionPerDay:forageRate(0),warnings,durationCore:arrivals.at(-1)!.elapsedCore,operations};
 }catch(e){return failed(e instanceof Error?e.message:String(e));}
}
