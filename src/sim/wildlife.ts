import { processBurningAnimal } from './firefighting-animals.ts';
import { malnutritionModifiers } from './malnutrition.ts';
import { processAnimalVomiting } from './food-hygiene.ts';
import { bleedFilth } from './filth.ts';
import { medicalBleed } from './injury-state.ts';
import { moveAnimalMelee } from './wildlife-melee.ts';
import { captureWorldShotGrid } from './combat-world.ts';
import { blockedCells } from './pathfinding.ts';
import { advanceAnimalHealth,animalBody } from './wildlife-health.ts';
import { animalEscape } from './wildlife-flight.ts';
import { animalFoods,animalMealTarget,finishAnimalMeal } from './wildlife-food.ts';
import { animalNavigation,moveAnimal } from './wildlife-navigation.ts';
import { HARE,MAX_WILDLIFE,wildlifeRandom,type WildAnimal,type WildlifeState } from './wildlife-state.ts';
import { isPlant } from './plants.ts';
import { calendarTick } from './calendar.ts';
import type { Cell,World } from './types.ts';
import { animalSpecies,faunaBiome,selectBiomeSpecies,type AnimalSpeciesId,type FaunaBiomeId } from './animal-species.ts';
import { animalHandlingHolding } from './animal-handling.ts';
import { animalCareInProgress,animalCareTargets } from './animal-care.ts';
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
    food:species.nutrition*(.5+.4*wildlifeRandom(s)),rest:.9+.1*wildlifeRandom(s),state:'idle',path:[],nextDecision});
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
  const biome=faunaBiome(biomeId),implemented=biome.entries.reduce((n,e)=>n+e.commonality,0);
  const fullTargetWeight=world.width*world.height*biome.animalDensity/10000,targetWeight=fullTargetWeight*implemented/biome.totalCommonality;
  const s=world.wildlife={profile:'biome-herbivores-v1',rng:(world.seed^0x784caf31)>>>0||1,animals:[],eatenPlants:0,eatenNutrition:0,eatenItems:0,
    population:{biome:biomeId,fullTargetWeight,targetWeight,nextCheck:world.tick+ANIMAL_POPULATION_CHECK_TICKS,checks:0,arrivals:0}};
  for(let attempts=0;attempts<256&&wildPopulationWeight(s)<targetWeight&&s.animals.length<MAX_WILDLIFE;attempts++){
    let roll=wildlifeRandom(s)*implemented,speciesId:AnimalSpeciesId|undefined;
    for(const entry of biome.entries){roll-=entry.commonality;if(roll<0){speciesId=entry.species;break;}}
    if(!speciesId)break;const species=animalSpecies(speciesId),[min,max]=species.wildGroupSize;
    const count=min+Math.floor(wildlifeRandom(s)*(max-min+1));if(!placeSpeciesGroup(world,s,speciesId,count))break;
  }
}

function advancePopulation(world:World,s:WildlifeState):void {
  const population=s.population;if(s.profile!=='biome-herbivores-v1'||!population||world.tick<population.nextCheck)return;
  if(!Number.isSafeInteger(population.checks+1))return;
  population.nextCheck=world.tick+ANIMAL_POPULATION_CHECK_TICKS;population.checks++;
  if(wildPopulationWeight(s)>=population.targetWeight||s.animals.length>=MAX_WILDLIFE)return;
  const biome=faunaBiome(population.biome);
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
    s.animals.push({id:world.nextId++,species:'hare',sex:wildlifeRandom(s)<.5?'female':'male',x:place.x,z:place.z,food:HARE.nutrition*(.5+.4*wildlifeRandom(s)),rest:.9+.1*wildlifeRandom(s),state:'idle',path:[],nextDecision:world.tick+1+n%60});
  }
}
export function reconcileWildlife(world:World):void {
  for(const a of world.wildlife?.animals??[])if(a.meal&&!animalMealTarget(world,a)){delete a.meal;a.path=[];a.state=a.motion&&a.motion.end>world.tick?'moving':'idle';a.nextDecision=world.tick;}
}
export function advanceWildlife(world:World):void {
  const s=world.wildlife;if(!s)return;advancePopulation(world,s);if(!s.animals.length)return;
  reconcileWildlife(world);
  let nav:ReturnType<typeof animalNavigation>|undefined,searches=0;
  const getNav=()=>nav??=animalNavigation(world);
  let physical:Uint8Array|undefined,shot:ReturnType<typeof captureWorldShotGrid>|undefined;
  const getPhysical=()=>physical??=blockedCells(world,true),getShot=()=>shot??=captureWorldShotGrid(world);
  const hour=Math.floor(calendarTick(world)%6000/250),night=hour<7||hour>=22;
  // Rotate priority; at most one potentially map-wide search per tick.
  for(let i=0;i<s.animals.length;i++) {
    const a=s.animals[(world.tick+i)%s.animals.length]!;
    const species=animalSpecies(a.species);
    advanceAnimalHealth(world,a);
    if(a.state==='dead')continue;
    if(a.health)bleedFilth(world,a,medicalBleed(a.health),a.state==='downed'||a.state==='sleeping',.4);
    const body=animalBody(a);
    // Local posture adaptation for mobile injured pets: allow a veterinary
    // visit, but wake at the pre-existing 45% food-search threshold. Core's
    // tend work requires a non-standing patient; it gives no 25% food rule.
    const medicalRest=!!a.domestic&&a.domestic.care!=='none'&&!a.burning&&!a.flee&&!a.threat&&!a.retaliation&&!a.strike
      &&animalCareTargets(a).length>0;
    a.food=Math.max(0,a.food-species.foodPerDay/6000*malnutritionModifiers(a.health?.malnutrition).hungerFactor*(a.food<species.nutrition*.18?.25:a.food<species.nutrition*.36?.5:1));
    a.rest=Math.max(0,Math.min(1,a.rest+(a.state==='sleeping'?.0003809524*.8:-.00015833333*(a.rest<.01?.6:a.rest<.14?.3:a.rest<.28?.7:1))));
    if(a.flee&&world.tick>=a.flee.until){delete a.flee;a.path=[];if(!a.motion||a.motion.end<=world.tick)a.state='idle';}
    if(processAnimalVomiting(world,a))continue;
    if(a.state==='downed'||a.motion&&a.motion.end>world.tick)continue;
    if(a.burning&&processBurningAnimal(world,a,{free:c=>getNav().free(c),route:goals=>{if(searches>=1)return null;searches++;return getNav().route(a,goals);},move:()=>{moveAnimal(world,a,getNav().step,body.capacities.moving);}}))continue;
    if(moveAnimalMelee(world,a,getNav,getPhysical,getShot))continue;
    if(a.stun)continue;
    if(a.flee){
      if(world.tick>=a.flee.until){delete a.flee;a.path=[];a.state='idle';}
      else {
        if(a.path.length){moveAnimal(world,a,getNav().step,body.capacities.moving);if(!a.path.length)delete a.flee;continue;}
        if(a.nextDecision>world.tick||searches>=1)continue;
        searches++;const path=animalEscape(world,a,getNav());
        if(path){a.path=path;moveAnimal(world,a,getNav().step,body.capacities.moving);}
        a.nextDecision=world.tick+20;continue;
      }
    }
    // A handler or veterinarian holds the animal only at real adjacent
    // interaction. Their approach reserves work but never freezes wildlife.
    const danger=!!(a.burning||a.flee||a.threat||a.retaliation||a.strike);
    const held=!danger&&((!!a.taming?.designated||!!a.domestic)&&animalHandlingHolding(world,a.id)
      ||!!a.domestic&&animalCareInProgress(world,a));
    if(held&&!(a.state==='eating'&&a.meal))continue;
    if(a.state==='sleeping') {
      if(medicalRest&&a.food>=species.nutrition*.45&&!a.sleepUntilCore&&getNav().free(a))continue;
      if(!medicalRest&&a.rest<1&&!a.sleepUntilCore&&getNav().free(a))continue;
      a.state='idle';a.nextDecision=world.tick+1;
    }
    if(a.meal) {
      const target=animalMealTarget(world,a)!;
      if(contact(a,target)&&getNav().free(a)) {
        a.path=[];
        if(a.state!=='eating'){a.state='eating';a.meal.progress=0;}
        else if((a.meal.progress+=Math.max(.15,(.05+.95*body.capacities.eating)*(.7+.3*body.capacities.manipulation)))>=species.ingestTicks){finishAnimalMeal(world,a);nav=undefined;}
        continue;
      }
      if(!a.path.length){delete a.meal;a.state='idle';a.nextDecision=world.tick;}
    }
    if(a.path.length){moveAnimal(world,a,getNav().step,body.capacities.moving);continue;}
    if(a.nextDecision>world.tick)continue;
    const n=getNav();
    if(a.food<species.nutrition*.45&&searches<1) {
      searches++;
      const food=animalFoods(world,a),goals=food.flatMap(neighbours),path=n.route(a,goals);
      if(path) {
        const end=path.at(-1)??a,target=food.find(f=>contact(end,f))!;
        a.meal={kind:target.kind,id:target.id,quantity:target.quantity,progress:0};a.path=path;a.state='moving';a.nextDecision=world.tick;continue;
      }
      a.nextDecision=world.tick+100;a.state='hungry';
    } else if(a.food<species.nutrition*.45)continue;
    if((medicalRest?a.food>=species.nutrition*.45:a.rest<.3||night&&a.rest<.75)&&!a.sleepUntilCore&&n.free(a)) {a.state='sleeping';continue;}
    // Bounded neighbouring moves avoid full-map wandering floods. No random
    // walk through walls/closed doors; diagonal length stays Euclidean.
    const choices=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,z])=>({x:a.x+x!,z:a.z+z!})).filter(c=>n.free(c)&&n.step(a,c));
    if(choices.length){a.path=[choices[Math.floor(wildlifeRandom(s)*choices.length)]!];moveAnimal(world,a,n.step,body.capacities.moving);}
    a.nextDecision=Math.max(a.nextDecision,world.tick+12+Math.floor(wildlifeRandom(s)*13));
  }
}
