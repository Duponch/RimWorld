import { moveAnimalMelee } from './wildlife-melee.ts';
import { captureWorldShotGrid } from './combat-world.ts';
import { blockedCells } from './pathfinding.ts';
import { advanceAnimalHealth,animalBody } from './wildlife-health.ts';
import { animalEscape } from './wildlife-flight.ts';
import { animalFoods,animalMealTarget,finishAnimalMeal } from './wildlife-food.ts';
import { animalNavigation,moveAnimal } from './wildlife-navigation.ts';
import { HARE,MAX_WILDLIFE,wildlifeRandom,type WildAnimal } from './wildlife-state.ts';
import { isPlant } from './plants.ts';
import type { Cell,World } from './types.ts';
const contact=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)<=1;
const neighbours=(c:Cell):Cell[]=>[{x:c.x,z:c.z},{x:c.x-1,z:c.z},{x:c.x+1,z:c.z},{x:c.x,z:c.z-1},{x:c.x,z:c.z+1}];

/** Only new camps or explicit opt-in. No wildlife is invented during migration. */
export function enableWildlife(world:World,count=Math.min(12,Math.max(3,Math.floor(world.width*world.height/5000)))):void {
  if(world.wildlife)return;
  if(!Number.isSafeInteger(count)||count<0||count>MAX_WILDLIFE||!Number.isSafeInteger(world.nextId+count))throw new Error('Invalid wildlife population.');
  const s=world.wildlife={profile:'temperate-hares-v1' as const,rng:(world.seed^0x784caf31)>>>0||1,animals:[] as WildAnimal[],eatenPlants:0,eatenNutrition:0,eatenItems:0};
  const nav=animalNavigation(world),plants=world.resources.filter(isPlant).sort((a,b)=>Math.hypot(a.x-world.width/2,a.z-world.height/2)-Math.hypot(b.x-world.width/2,b.z-world.height/2));
  const used=new Set<number>();
  for(let n=0;n<count&&plants.length;n++) {
    const offset=n===0?0:Math.floor(wildlifeRandom(s)*plants.length);
    const place=plants.slice(offset).concat(plants.slice(0,offset)).flatMap(neighbours).find(c=>nav.free(c)&&!used.has(c.z*world.width+c.x));if(!place)break;
    used.add(place.z*world.width+place.x);
    s.animals.push({id:world.nextId++,species:'hare',sex:wildlifeRandom(s)<.5?'female':'male',x:place.x,z:place.z,food:HARE.nutrition*(.5+.4*wildlifeRandom(s)),rest:.9+.1*wildlifeRandom(s),state:'idle',path:[],nextDecision:world.tick+1+n%60});
  }
}
export function reconcileWildlife(world:World):void {
  for(const a of world.wildlife?.animals??[])if(a.meal&&!animalMealTarget(world,a)){delete a.meal;a.path=[];a.state=a.motion&&a.motion.end>world.tick?'moving':'idle';a.nextDecision=world.tick;}
}
export function advanceWildlife(world:World):void {
  const s=world.wildlife;if(!s?.animals.length)return;
  reconcileWildlife(world);
  let nav:ReturnType<typeof animalNavigation>|undefined,searches=0;
  const getNav=()=>nav??=animalNavigation(world);
  let physical:Uint8Array|undefined,shot:ReturnType<typeof captureWorldShotGrid>|undefined;
  const getPhysical=()=>physical??=blockedCells(world,true),getShot=()=>shot??=captureWorldShotGrid(world);
  const hour=Math.floor(world.tick%6000/250),night=hour<7||hour>=22;
  // Rotate priority; at most one potentially map-wide search per tick.
  for(let i=0;i<s.animals.length;i++) {
    const a=s.animals[(world.tick+i)%s.animals.length]!;
    advanceAnimalHealth(world,a);
    if(a.state==='dead')continue;
    const body=animalBody(a);
    a.food=Math.max(0,a.food-HARE.foodPerDay/6000*(a.food<HARE.nutrition*.18?.25:a.food<HARE.nutrition*.36?.5:1));
    a.rest=Math.max(0,Math.min(1,a.rest+(a.state==='sleeping'?.0003809524*.8:-.00015833333*(a.rest<.01?.6:a.rest<.14?.3:a.rest<.28?.7:1))));
    if(a.flee&&world.tick>=a.flee.until){delete a.flee;a.path=[];if(!a.motion||a.motion.end<=world.tick)a.state='idle';}
    if(a.state==='downed'||a.motion&&a.motion.end>world.tick)continue;
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
    if(a.state==='sleeping') {
      if(a.rest<1&&!a.sleepUntilCore&&getNav().free(a))continue;
      a.state='idle';a.nextDecision=world.tick+1;
    }
    if(a.meal) {
      const target=animalMealTarget(world,a)!;
      if(contact(a,target)&&getNav().free(a)) {
        a.path=[];
        if(a.state!=='eating'){a.state='eating';a.meal.progress=0;}
        else if((a.meal.progress+=Math.max(.15,(.05+.95*body.capacities.eating)*(.7+.3*body.capacities.manipulation)))>=HARE.ingestTicks){finishAnimalMeal(world,a);nav=undefined;}
        continue;
      }
      if(!a.path.length){delete a.meal;a.state='idle';a.nextDecision=world.tick;}
    }
    if(a.path.length){moveAnimal(world,a,getNav().step,body.capacities.moving);continue;}
    if(a.nextDecision>world.tick)continue;
    const n=getNav();
    if(a.food<HARE.nutrition*.45&&searches<1) {
      searches++;
      const food=animalFoods(world,a),goals=food.flatMap(neighbours),path=n.route(a,goals);
      if(path) {
        const end=path.at(-1)??a,target=food.find(f=>contact(end,f))!;
        a.meal={kind:target.kind,id:target.id,quantity:target.quantity,progress:0};a.path=path;a.state='moving';a.nextDecision=world.tick;continue;
      }
      a.nextDecision=world.tick+100;a.state='hungry';
    } else if(a.food<HARE.nutrition*.45)continue;
    if((a.rest<.3||night&&a.rest<.75)&&!a.sleepUntilCore&&n.free(a)) {a.state='sleeping';continue;}
    // Bounded neighbouring moves avoid full-map wandering floods. No random
    // walk through walls/closed doors; diagonal length stays Euclidean.
    const choices=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,z])=>({x:a.x+x!,z:a.z+z!})).filter(c=>n.free(c)&&n.step(a,c));
    if(choices.length){a.path=[choices[Math.floor(wildlifeRandom(s)*choices.length)]!];moveAnimal(world,a,n.step,body.capacities.moving);}
    a.nextDecision=Math.max(a.nextDecision,world.tick+12+Math.floor(wildlifeRandom(s)*13));
  }
}
