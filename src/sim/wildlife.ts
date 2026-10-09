import { processBurningAnimal } from './firefighting-animals.ts';
import { advanceAnimalManhunter,processAnimalManhunter } from './animal-manhunter.ts';
import { malnutritionModifiers } from './malnutrition.ts';
import { processAnimalVomiting } from './food-hygiene.ts';
import { bleedFilth } from './filth.ts';
import { medicalBleed } from './injury-state.ts';
import { moveAnimalMelee } from './wildlife-melee.ts';
import { captureWorldShotGrid } from './combat-world.ts';
import { blockedCells } from './pathfinding.ts';
import { advanceAnimalHealth,animalBody } from './wildlife-health.ts';
import { animalEscape } from './wildlife-flight.ts';
import { animalFoods,animalMealTarget,finishAnimalMeal,grazingPen,reservedPlantWorkCells } from './wildlife-food.ts';
import { animalNavigation,moveAnimal } from './wildlife-navigation.ts';
import { HARE,MAX_WILDLIFE,wildlifeRandom,type WildAnimal,type WildlifeState } from './wildlife-state.ts';
import { isPlant } from './plants.ts';
import { calendarTick } from './calendar.ts';
import type { Cell,Resource,World } from './types.ts';
import { animalSpecies,faunaBiome,selectBiomeSpecies,type AnimalSpeciesId,type FaunaBiomeId } from './animal-species.ts';
import { animalHandlingHolding } from './animal-handling.ts';
import { animalCareInProgress,animalCareTargets } from './animal-care.ts';
import { veterinaryCareSpeciesAllowed,veterinaryNeedsRest } from './veterinary-rules.ts';
import { adultAgeTicks, advanceAnimalLife, animalFoodPerDay, animalLifeStage, animalNutritionMax } from './animal-life.ts';
import { atMapEdge,cancelAnimalExit,exitSuppressed,finishAnimalExits,stopExitTargeting,WILDLIFE_EXIT_FOOD_CHECK } from './wildlife-exit.ts';
import { animalPreyCandidates,animalPredationTarget,reconcileAnimalPredation,cancelAnimalPredation } from './wildlife-predation.ts';
const contact=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)<=1;
const neighbours=(c:Cell):Cell[]=>[{x:c.x,z:c.z},{x:c.x-1,z:c.z},{x:c.x+1,z:c.z},{x:c.x,z:c.z-1},{x:c.x,z:c.z+1}];
export const ANIMAL_POPULATION_CHECK_TICKS=122; // 1,220 Core ticks; Core checks every 1,213.

function occupiedWildlifeCells(world:World,s:WildlifeState):Set<number>{
  return new Set([
    ...world.pawns.map(p=>p.z*world.width+p.x),...s.animals.map(a=>a.z*world.width+a.x),
    ...world.piles.flatMap(p=>p.owner.type==='ground'?[p.owner.z*world.width+p.owner.x]:[]),
    ...world.packed.flatMap(p=>p.owner.type==='ground'?[p.owner.z*world.width+p.owner.x]:[]),
  ]);
}
function addAnimal(world:World,s:WildlifeState,speciesId:AnimalSpeciesId,place:Cell,nextDecision:number):boolean {
  if(!Number.isSafeInteger(world.nextId+1))return false;
  const species=animalSpecies(speciesId);
  s.animals.push({id:world.nextId++,species:speciesId,sex:wildlifeRandom(s)<.5?'female':'male',x:place.x,z:place.z,
    ageTicks:adultAgeTicks(speciesId),food:species.nutrition*(.5+.4*wildlifeRandom(s)),rest:.9+.1*wildlifeRandom(s),state:'idle',path:[],nextDecision});
  return true;
}
function placeSpeciesGroup(world:World,s:WildlifeState,speciesId:AnimalSpeciesId,count:number):number {
  count=Math.min(count,MAX_WILDLIFE-s.animals.length);
  if(count<=0||!Number.isSafeInteger(world.nextId+count))return 0;
  const nav=animalNavigation(world),plants=world.resources.filter(isPlant),occupied=occupiedWildlifeCells(world,s);
  const anchors=plants.length?plants.flatMap(neighbours):[{x:Math.floor(world.width/2),z:Math.floor(world.height/2)}].flatMap(neighbours);
  if(!anchors.length)return 0;
  const offset=Math.floor(wildlifeRandom(s)*anchors.length),ordered=anchors.slice(offset).concat(anchors.slice(0,offset));let added=0;
  for(const place of ordered){const key=place.z*world.width+place.x;if(!nav.free(place)||occupied.has(key))continue;
    if(!addAnimal(world,s,speciesId,place,world.tick+1+(s.animals.length+added)%60))break;occupied.add(key);added++;if(added>=count||s.animals.length>=MAX_WILDLIFE)break;
  }
  return added;
}
// A tamed hare keeps its physical body in this collection, but no longer
// satisfies the wild ecological target used to plan new arrivals.
export const wildPopulationWeight=(s:WildlifeState)=>s.animals.reduce((sum,a)=>sum+(a.domestic?0:animalSpecies(a.species).ecoSystemWeight),0);

/** V91 biome initialization spends ecological weight, never density as a head
 * count. The target is reduced by the exact commonality share implemented in
 * this bounded catalogue, leaving unavailable Core species unredistributed. */
export function enableBiomeWildlife(world:World,biomeId:FaunaBiomeId):void {
  if(world.wildlife)return;
  const biome=faunaBiome(biomeId,world.schemaVersion>=178),implemented=biome.entries.reduce((n,e)=>n+e.commonality,0);
  const fullTargetWeight=world.width*world.height*biome.animalDensity/10000,targetWeight=fullTargetWeight*implemented/biome.totalCommonality;
  const s=world.wildlife={profile:world.schemaVersion>=178?'biome-fauna-v2':'biome-herbivores-v1',rng:(world.seed^0x784caf31)>>>0||1,animals:[],eatenPlants:0,eatenNutrition:0,eatenItems:0,
    population:{biome:biomeId,fullTargetWeight,targetWeight,nextCheck:world.tick+ANIMAL_POPULATION_CHECK_TICKS,checks:0,arrivals:0}};
  for(let attempts=0;attempts<256&&wildPopulationWeight(s)<targetWeight&&s.animals.length<MAX_WILDLIFE;attempts++){
    let roll=wildlifeRandom(s)*implemented,speciesId:AnimalSpeciesId|undefined;
    for(const entry of biome.entries){roll-=entry.commonality;if(roll<0){speciesId=entry.species;break;}}
    if(!speciesId)break;const species=animalSpecies(speciesId),[min,max]=species.wildGroupSize;
    const count=min+Math.floor(wildlifeRandom(s)*(max-min+1));if(!placeSpeciesGroup(world,s,speciesId,count))break;
  }
}

function advancePopulation(world:World,s:WildlifeState):void {
  const population=s.population;if(!['biome-herbivores-v1','biome-fauna-v2'].includes(s.profile)||!population||world.tick<population.nextCheck)return;
  if(!Number.isSafeInteger(population.checks+1))return;
  population.nextCheck=world.tick+ANIMAL_POPULATION_CHECK_TICKS;population.checks++;
  if(wildPopulationWeight(s)>=population.targetWeight||s.animals.length>=MAX_WILDLIFE)return;
  const biome=faunaBiome(population.biome,s.profile==='biome-fauna-v2');
  const maximumGroup=biome.entries.reduce((maximum,entry)=>Math.max(maximum,animalSpecies(entry.species).wildGroupSize[1]),0);
  if(!Number.isSafeInteger(population.arrivals+1)||!Number.isSafeInteger(world.nextId+Math.min(maximumGroup,MAX_WILDLIFE-s.animals.length)))return;
  if(wildlifeRandom(s)>=.026955556*biome.animalDensity)return;
  const speciesId=selectBiomeSpecies(biome,wildlifeRandom(s));if(!speciesId)return;
  const species=animalSpecies(speciesId),[min,max]=species.wildGroupSize,count=min+Math.floor(wildlifeRandom(s)*(max-min+1));
  const added=placeSpeciesGroup(world,s,speciesId,count);if(added)population.arrivals++;
}

/** Only new camps or explicit opt-in. No wildlife is invented during migration. */
export function enableWildlife(world:World,count=Math.min(12,Math.max(3,Math.floor(world.width*world.height/5000))),distribution?:'natural'):void {
  if(world.wildlife)return;
  if(distribution!==undefined&&distribution!=='natural')throw new Error('Invalid wildlife distribution.');
  if(!Number.isSafeInteger(count)||count<0||count>MAX_WILDLIFE||!Number.isSafeInteger(world.nextId+count))throw new Error('Invalid wildlife population.');
  const s=world.wildlife={profile:'temperate-hares-v1' as const,rng:(world.seed^0x784caf31)>>>0||1,animals:[] as WildAnimal[],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  const nav=animalNavigation(world),plants=world.resources.filter(isPlant);
  if(!distribution)plants.sort((a,b)=>Math.hypot(a.x-world.width/2,a.z-world.height/2)-Math.hypot(b.x-world.width/2,b.z-world.height/2));
  const occupied=distribution?new Set([
    ...world.pawns.map(p=>p.z*world.width+p.x),
    ...world.piles.flatMap(p=>p.owner.type==='ground'?[p.owner.z*world.width+p.owner.x]:[]),
    ...world.packed.flatMap(p=>p.owner.type==='ground'?[p.owner.z*world.width+p.owner.x]:[]),
  ]):undefined;
  const used=new Set<number>();
  for(let n=0;n<count&&plants.length;n++) {
    const offset=n===0&&!distribution?0:Math.floor(wildlifeRandom(s)*plants.length);
    const places=plants.slice(offset).concat(plants.slice(0,offset)).flatMap(neighbours);
    const admissible=(c:Cell)=>nav.free(c)&&!used.has(c.z*world.width+c.x)&&!occupied?.has(c.z*world.width+c.x);
    // Disperse the available species where habitat permits; a crowded small
    // fixture can fall back to any admissible unoccupied location.
    const place=distribution?places.find(c=>admissible(c)&&s.animals.every(a=>(a.x-c.x)**2+(a.z-c.z)**2>=36))??places.find(admissible):places.find(admissible);if(!place)break;
    used.add(place.z*world.width+place.x);
    s.animals.push({id:world.nextId++,species:'hare',sex:wildlifeRandom(s)<.5?'female':'male',ageTicks:adultAgeTicks('hare'),x:place.x,z:place.z,food:HARE.nutrition*(.5+.4*wildlifeRandom(s)),rest:.9+.1*wildlifeRandom(s),state:'idle',path:[],nextDecision:world.tick+1+n%60});
  }
}
export function reconcileWildlife(world:World,resourcesById?:ReadonlyMap<number,Resource>,workCells?:ReadonlySet<number>):void {
  const animals=world.wildlife?.animals??[];
  const mates=animals.some(a=>a.mating)?new Map(animals.map(a=>[a.id,a])):undefined;
  for(const a of animals){
    if(a.predation)reconcileAnimalPredation(world,a);
    if(a.exiting&&exitSuppressed(a))cancelAnimalExit(world,a);
    if(a.meal&&!animalMealTarget(world,a,resourcesById,workCells)){delete a.meal;a.path=[];a.state=a.motion&&a.motion.end>world.tick?'moving':'idle';a.nextDecision=world.tick;}
    if(a.mating){
      const female=mates?.get(a.mating.femaleId);
      if(a.state==='dead'||!a.domestic||animalLifeStage(a)!=='adult'||!female||female.state==='dead'||!female.domestic
        ||animalLifeStage(female)!=='adult'||female.species!==a.species||female.sex!=='female'||female.pregnancy){
        delete a.mating;a.path=[];a.nextDecision=world.tick;
      }
    }
  }
}
export function advanceWildlife(world:World):void {
  const s=world.wildlife;if(!s)return;advancePopulation(world,s);advanceAnimalLife(world);if(!s.animals.length)return;
  // A meal can remain active for many ticks. Capture its plant identity once
  // for this synchronous decision, then discard the index before other world
  // systems can mutate resources. A handful of meals are cheaper to scan
  // directly; the first measured large-map win was at 16 active meals.
  // The public reconciliation API remains live.
  let mealResources:Map<number,Resource>|undefined;
  let activePlantMeals=0;
  for(const animal of s.animals)if(animal.meal?.kind==='plant')activePlantMeals++;
  if(activePlantMeals>=16){
    mealResources=new Map();for(const resource of world.resources)mealResources.set(resource.id,resource);
  }
  let plantWorkCells:ReadonlySet<number>|undefined;
  const getPlantWorkCells=()=>plantWorkCells??=reservedPlantWorkCells(world);
  reconcileWildlife(world,mealResources,activePlantMeals?getPlantWorkCells():undefined);
  let nav:ReturnType<typeof animalNavigation>|undefined,hareNav:ReturnType<typeof animalNavigation>|undefined,searches=0;
  const getNav=(animal:WildAnimal)=>animal.species==='hare'||animal.species==='snow-hare'||animalSpecies(animal.species).predator
    ?hareNav??=animalNavigation(world,false,true):nav??=animalNavigation(world);
  let physical:Uint8Array|undefined,shot:ReturnType<typeof captureWorldShotGrid>|undefined;
  const getPhysical=()=>physical??=blockedCells(world,true),getShot=()=>shot??=captureWorldShotGrid(world);
  const hour=Math.floor(calendarTick(world)%6000/250),night=hour<7||hour>=22;
  let ledAnimals:Set<number>|undefined;
  for(const pawn of world.pawns)if(pawn.animalHandling?.kind==='lead'&&pawn.animalHandling.phase!=='approach')
    for(const id of pawn.animalHandling.ropees??[pawn.animalHandling.animalId])(ledAnimals??=new Set()).add(id);
  const matingFemales=new Set(s.animals.flatMap(a=>a.mating?[a.mating.femaleId]:[]));
  const departures=new Set<number>();
  // Rotate priority; at most one potentially map-wide search per tick.
  for(let i=0;i<s.animals.length;i++) {
    const a=s.animals[(world.tick+i)%s.animals.length]!;
    const species=animalSpecies(a.species);
    advanceAnimalHealth(world,a);
    // Burning prevents all new attacks; its reaction can begin at the first
    // local boundary after recovery. Other blows expire in the Core substep.
    if(a.burning&&a.strike&&a.strike.untilCore<=world.tick*10)delete a.strike;
    if(a.exiting&&exitSuppressed(a))cancelAnimalExit(world,a);
    if(a.state==='dead')continue;
    if(a.health)bleedFilth(world,a,medicalBleed(a.health),a.state==='downed'||a.state==='sleeping',.4);
    const body=animalBody(a);
    // Local ground-rest adaptation: keep the existing food/danger priorities.
    // V277 also retains convalescence after tending, as Core medical rest does.
    const medicalRest=!!a.domestic&&a.domestic.care!=='none'&&!a.burning&&!a.flee&&!a.threat&&!a.retaliation&&!a.strike
      &&(animalCareTargets(a).length>0||world.schemaVersion>=212&&veterinaryCareSpeciesAllowed(a.species,world.schemaVersion)
        &&!!a.health&&veterinaryNeedsRest(a.health));
    const nutrition=animalNutritionMax(a);
    const wantFood=species.predator?.3:.45,urgent=species.predator?.12:.18,hungry=species.predator?.24:.36;
    a.food=Math.max(0,a.food-animalFoodPerDay(a)/6000*malnutritionModifiers(a.health?.malnutrition).hungerFactor*(a.food<nutrition*urgent?.25:a.food<nutrition*hungry?.5:1));
    a.rest=Math.max(0,Math.min(1,a.rest+(a.state==='sleeping'?.0003809524*.8:-.00015833333*(a.rest<.01?.6:a.rest<.14?.3:a.rest<.28?.7:1))));
    advanceAnimalManhunter(world,a);
    if(a.flee&&world.tick>=a.flee.until){delete a.flee;a.path=[];if(!a.motion||a.motion.end<=world.tick)a.state='idle';}
    if(processAnimalVomiting(world,a))continue;
    if(a.state==='downed'||a.motion&&a.motion.end>world.tick)continue;
    // New panic travel waits only for the already committed physical recovery.
    // Fire damage keeps advancing in the shared fire clock during this wait.
    if(a.strike){a.path=[];if(a.state!=='sleeping')a.state='idle';continue;}
    if(a.predation&&(a.burning||a.flee))cancelAnimalPredation(world,a);
    if(a.burning&&processBurningAnimal(world,a,{free:c=>getNav(a).free(c),route:goals=>{if(searches>=1)return null;searches++;return getNav(a).route(a,goals);},move:()=>{moveAnimal(world,a,getNav(a).step,body.capacities.moving);}}))continue;
    if(a.manhunter&&processAnimalManhunter(world,a,getNav(a),getPhysical(),()=>{if(searches>=1)return false;searches++;return true;}))continue;
    if(moveAnimalMelee(world,a,()=>getNav(a),getPhysical,getShot))continue;
    if(a.stun)continue;
    if(a.predation){
      const target=animalPredationTarget(world,a);
      if(!target){
        const pile=world.piles.find(p=>p.id===a.predation!.targetId&&p.corpse);
        if(pile){
          const food=animalFoods(world,a).find(f=>f.id===pile.id);
          if(!food){cancelAnimalPredation(world,a);continue;}
          if(searches>=1)continue;
          searches++;const path=getNav(a).route(a,neighbours(food));
          if(path){cancelAnimalPredation(world,a);a.meal={kind:'pile',id:food.id,quantity:1,progress:0};a.path=path;a.state='moving';a.nextDecision=world.tick;}
          else cancelAnimalPredation(world,a);
        }
        // A retained dead actor must complete its fall and become a real pile.
        continue;
      }
      if(contact(a,target)){a.path=[];a.state='idle';continue;}
      const end=a.path.at(-1);
      if(!end||!contact(end,target)||world.tick>=a.nextDecision){
        // A deferred target review does not revoke an existing safe edge.
        // moveAnimal still validates terrain/corners before consuming it.
        if(searches<1){
          searches++;const path=getNav(a).route(a,neighbours(target));
          if(!path){cancelAnimalPredation(world,a);a.nextDecision=world.tick+25;continue;}
          a.path=path;a.nextDecision=world.tick+25;
        }
      }
      if(a.path.length)moveAnimal(world,a,getNav(a).step,body.capacities.moving);
      continue;
    }
    if(a.flee){
      if(world.tick>=a.flee.until){delete a.flee;a.path=[];a.state='idle';}
      else {
        if(a.path.length){moveAnimal(world,a,getNav(a).step,body.capacities.moving);if(!a.path.length)delete a.flee;continue;}
        if(a.nextDecision>world.tick||searches>=1)continue;
        searches++;const path=animalEscape(world,a,getNav(a));
        if(path){a.path=path;moveAnimal(world,a,getNav(a).step,body.capacities.moving);}
        a.nextDecision=world.tick+20;continue;
      }
    }
    // A handler or veterinarian holds the animal only at real adjacent
    // interaction. Their approach reserves work but never freezes wildlife.
    const danger=!!(a.burning||a.flee||a.threat||a.retaliation||a.strike||a.manhunter);
    // The handler advances both bodies on confirmed ticks. Ordinary wildlife
    // decisions must not replace its route while the rope is held.
    if(!danger&&(ledAnimals?.has(a.id)||matingFemales.has(a.id)))continue;
    const held=!danger&&((!!a.taming?.designated||!!a.domestic)&&animalHandlingHolding(world,a.id)
      ||!!a.domestic&&animalCareInProgress(world,a));
    if(held&&!(a.state==='eating'&&a.meal)){cancelAnimalExit(world,a);continue;}
    if(a.state==='sleeping') {
      if(medicalRest&&a.food>=nutrition*.45&&!a.sleepUntilCore&&getNav(a).free(a))continue;
      if(!medicalRest&&a.rest<1&&!a.sleepUntilCore&&getNav(a).free(a))continue;
      a.state='idle';a.nextDecision=world.tick+1;
    }
    if(a.meal) {
      const target=animalMealTarget(world,a,mealResources,a.meal.kind==='plant'?getPlantWorkCells():undefined);
      if(!target){delete a.meal;a.path=[];a.state='idle';a.nextDecision=world.tick;continue;}
      if(contact(a,target)&&getNav(a).free(a)) {
        a.path=[];
        if(a.state!=='eating'){a.state='eating';a.meal.progress=0;}
        else if((a.meal.progress+=Math.max(.15,(.05+.95*body.capacities.eating)*(.7+.3*body.capacities.manipulation)))>=species.ingestTicks){
          const meal=a.meal,resourcesBefore=world.resources;
          finishAnimalMeal(world,a);
          if(meal.kind==='plant'){
            plantWorkCells=undefined; // Eating may remove harvest/cut jobs at this cell.
            if(world.resources!==resourcesBefore)mealResources?.delete(meal.id);
          }
          nav=undefined;hareNav=undefined;
        }
        continue;
      }
      if(!a.path.length){delete a.meal;a.state='idle';a.nextDecision=world.tick;}
    }
    if(a.exiting){
      const arrived=atMapEdge(world,a)&&!a.path.length;
      // A committed blow must finish recovery while its identity still exists.
      if(arrived&&stopExitTargeting(world,a.id))continue;
      let checked=false;
      if((arrived||!a.path.length||world.tick>=a.exiting.nextFoodCheck)&&a.nextDecision<=world.tick&&searches<1){
        searches++;
        const food=animalFoods(world,a),route=species.predator
          ?getNav(a).foodPreyOrExitRoute(a,food.flatMap(neighbours),animalPreyCandidates(world,a),true)
          :getNav(a).foodOrExitRoute(a,food.flatMap(neighbours));
        if(route?.kind==='prey'){
          delete a.exiting;a.predation={targetId:route.targetId!,startedAtCore:world.tick*10,firstHit:true};a.path=route.path;a.state='moving';a.nextDecision=world.tick;continue;
        }
        if(route?.kind==='food'){
          const end=route.path.at(-1)??a,target=food.find(f=>contact(end,f))!;
          delete a.exiting;a.meal={kind:target.kind,id:target.id,quantity:target.quantity,progress:0};
          a.path=route.path;a.state='moving';a.nextDecision=world.tick;continue;
        }
        if(!route){cancelAnimalExit(world,a);a.path=[];a.state='hungry';a.nextDecision=world.tick+WILDLIFE_EXIT_FOOD_CHECK;continue;}
        a.path=route.path;a.exiting.destination={...(a.path.at(-1)??a)};
        a.exiting.nextFoodCheck=world.tick+WILDLIFE_EXIT_FOOD_CHECK;checked=true;
      }
      if(arrived&&checked&&!a.path.length){departures.add(a.id);continue;}
      if(a.path.length)moveAnimal(world,a,getNav(a).step,body.capacities.moving);
      continue;
    }
    if(a.path.length){const pen=grazingPen(world,a);if(pen&&!pen.has(a.path[0]!.z*world.width+a.path[0]!.x)){a.path=[];delete a.meal;a.nextDecision=world.tick;}else{moveAnimal(world,a,getNav(a).step,body.capacities.moving);continue;}}
    if(a.mating)continue;
    if(a.nextDecision>world.tick)continue;
    const n=getNav(a);
    if(a.food<nutrition*wantFood&&searches<1) {
      searches++;
      const food=animalFoods(world,a),goals=food.flatMap(neighbours);
      const choice=species.predator?n.foodPreyOrExitRoute(a,goals,animalPreyCandidates(world,a),a.food<=0&&!a.domestic):a.food<=0&&!a.domestic?n.foodOrExitRoute(a,goals):undefined;
      if(choice?.kind==='prey'){
        a.predation={targetId:choice.targetId!,startedAtCore:world.tick*10,firstHit:true};a.path=choice.path;a.state='moving';a.nextDecision=world.tick;continue;
      }
      const path=choice?.kind==='food'?choice.path:species.predator||a.food<=0&&!a.domestic?undefined:n.route(a,goals);
      if(path) {
        const end=path.at(-1)??a,target=food.find(f=>contact(end,f))!;
        a.meal={kind:target.kind,id:target.id,quantity:target.quantity,progress:0};a.path=path;a.state='moving';a.nextDecision=world.tick;continue;
      }
      if(choice?.kind==='exit'){
        a.path=choice.path;a.exiting={destination:{...(a.path.at(-1)??a)},nextFoodCheck:world.tick+WILDLIFE_EXIT_FOOD_CHECK};
        a.state='moving';a.nextDecision=world.tick;continue;
      }
      a.nextDecision=world.tick+100;a.state='hungry';
    } else if(a.food<nutrition*wantFood)continue;
    if((medicalRest?a.food>=nutrition*.45:a.rest<.3||night&&a.rest<.75)&&!a.sleepUntilCore&&n.free(a)) {a.state='sleeping';continue;}
    // Bounded neighbouring moves avoid full-map wandering floods. No random
    // walk through walls/closed doors; diagonal length stays Euclidean.
    const pen=grazingPen(world,a);
    const choices=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,z])=>({x:a.x+x!,z:a.z+z!})).filter(c=>n.free(c)&&n.step(a,c)&&(!pen||pen.has(c.z*world.width+c.x)));
    if(choices.length){a.path=[choices[Math.floor(wildlifeRandom(s)*choices.length)]!];moveAnimal(world,a,n.step,body.capacities.moving);}
    a.nextDecision=Math.max(a.nextDecision,world.tick+12+Math.floor(wildlifeRandom(s)*13));
  }
  finishAnimalExits(world,departures);
}
