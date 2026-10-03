/** Prepared CPU workloads, never a historical/new-engine speedup comparison.
 * Run alone after source freeze:
 * node --experimental-strip-types scripts/benchmark-predation-v190.ts
 * Output: tmp/predation-benchmark-v190.json. No browser/GPU/frame-rate claim. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,readdirSync,writeFileSync } from 'node:fs';
import os from 'node:os';
import { join,relative,resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { emptyLandscape } from '../src/sim/generation.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { adoptEnvironment } from '../src/sim/environment-step.ts';
import { calendarTick } from '../src/sim/calendar.ts';
import { newBreakdownCalendar } from '../src/sim/breakdowns.ts';
import { createApparelWearCalendar } from '../src/sim/apparel-renewal.ts';
import { animalSpecies,faunaBiome,type AnimalSpeciesId } from '../src/sim/animal-species.ts';
import { adultAgeTicks } from '../src/sim/animal-life.ts';
import { animalNavigation } from '../src/sim/wildlife-navigation.ts';
import { animalPreyCandidates } from '../src/sim/wildlife-predation.ts';
import { WeightedSearch } from '../src/sim/weighted-search.ts';
import { freshRot } from '../src/sim/food-preservation.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import type { Cell,World } from '../src/sim/types.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const script=join(root,'scripts','benchmark-predation-v190.ts');
const output=join(root,'tmp','predation-benchmark-v190.json');
const hash=(data:string|Buffer)=>createHash('sha256').update(data).digest('hex');
const snapshot=(world:World)=>JSON.stringify(world);
function sourceDigest(){
  const files:string[]=[],directory=join(root,'src');
  function visit(dir:string):void {
    for(const entry of readdirSync(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name);
      if(entry.isDirectory())visit(path);else if(entry.isFile())files.push(path);
    }
  }
  visit(directory);files.sort();const digest=createHash('sha256');
  for(const path of files){const data=readFileSync(path),name=relative(directory,path).replaceAll('\\','/');digest.update(`${name.length}:${name}:${data.length}:`);digest.update(data);}
  return {sha256:digest.digest('hex'),files:files.length,scriptSha256:hash(readFileSync(script))};
}
const sources=sourceDigest();
const seed=190,startTick=2000,ticksPerCall=100,samples=20;
const herbivores:readonly AnimalSpeciesId[]=['hare','deer','gazelle','muffalo'];
function preparedWorld(foxCount:0|10):World {
  const w=emptyLandscape(seed,250,250);w.tick=startTick;
  w.breakdown=newBreakdownCalendar(seed,w.tick);
  w.apparelWear=createApparelWearCalendar(w.tick,(seed^0x0a77e1)>>>0);
  w.tiles=Array.from({length:w.width*w.height},()=>({terrain:'grass'}));
  for(let row=0;row<32;row++)for(let column=0;column<32;column++)w.resources.push({
    id:w.nextId++,kind:'berries',x:7+column*7,z:7+row*7,amount:10,growth:1,growthTick:w.tick,
  });
  const biome=faunaBiome('temperate-forest',foxCount>0),full=w.width*w.height*biome.animalDensity/10000;
  w.wildlife={profile:foxCount?'biome-fauna-v2':'biome-herbivores-v1',rng:(seed^0x784caf31)>>>0,
    animals:[],eatenPlants:0,eatenItems:0,eatenNutrition:0,
    population:{biome:biome.id,fullTargetWeight:full,targetWeight:full*biome.entries.reduce((n,e)=>n+e.commonality,0)/biome.totalCommonality,
      nextCheck:w.tick+122,checks:0,arrivals:0}};
  for(let i=0;i<100;i++){
    const fox=i>=100-foxCount,species=fox?'red-fox':herbivores[i%herbivores.length]!;
    // Each fox starts four cells from an actual hare. This is deliberately a
    // prepared pursuit workload, with different actors from the herbivore scene.
    const anchor=fox?(i-(100-foxCount))*4:i;
    const a:WildAnimal={id:w.nextId++,species,sex:i%2?'male':'female',ageTicks:adultAgeTicks(species),
      x:30+anchor%10*20+(fox?4:0),z:30+Math.floor(anchor/10)*20,
      food:animalSpecies(species).nutrition*.2,rest:1,state:'idle',path:[],nextDecision:w.tick};
    w.wildlife.animals.push(a);
  }
  adoptEnvironment(w);refreshStock(w);
  assert.equal(calendarTick(w)%6000,startTick);
  assert.ok(calendarTick(w)%6000>=1750&&(calendarTick(w)+ticksPerCall)%6000<5500,'Window must remain awake daylight');
  assert.deepEqual(validateWorld(w),[]);return w;
}
const scenes=[0,10].map(count=>{
  const w=preparedWorld(count as 0|10),before=snapshot(w),counts:Record<string,number>={};
  for(const a of w.wildlife!.animals)counts[a.species]=(counts[a.species]??0)+1;
  return {name:count?'90-herbivores-and-10-foxes':'100-historical-herbivores',world:w,before,worldSha256:hash(before),counts};
});

/** Independent uniform-grid octile oracle. Fixtures have no site/furniture/
 * floors: the only unavailable cells are an eight-cell water ring far from all
 * selected paths. It verifies cost/contact, not the production parent ordering. */
const octile=(a:Cell,b:Cell)=>{
  const dx=Math.abs(a.x-b.x),dz=Math.abs(a.z-b.z),diagonal=Math.min(dx,dz);
  return diagonal*1414+(Math.max(dx,dz)-diagonal)*1000;
};
const contacts=(c:Cell):Cell[]=>[c,{x:c.x-1,z:c.z},{x:c.x+1,z:c.z},{x:c.x,z:c.z-1},{x:c.x,z:c.z+1}];
type Route=NonNullable<ReturnType<ReturnType<typeof animalNavigation>['foodPreyOrExitRoute']>>;
function assertRoute(w:World,from:Cell,route:Route,expectedKind:Route['kind'],goals:readonly Cell[],targetId?:number):void {
  assert.equal(route.kind,expectedKind);assert.equal(route.targetId,targetId);
  let previous=from,cost=0;
  const blocked=(c:Cell)=>w.tiles[c.z*w.width+c.x]?.terrain==='water';
  for(const next of route.path){
    assert.ok(Number.isInteger(next.x)&&Number.isInteger(next.z)&&next.x>=0&&next.z>=0&&next.x<w.width&&next.z<w.height);
    const dx=Math.abs(next.x-previous.x),dz=Math.abs(next.z-previous.z);
    assert.equal(Math.max(dx,dz),1);assert.ok(!blocked(next));
    if(dx&&dz){assert.ok(!blocked({x:previous.x,z:next.z}));assert.ok(!blocked({x:next.x,z:previous.z}));}
    cost+=dx&&dz?1414:1000;previous=next;
  }
  assert.ok(goals.some(c=>c.x===previous.x&&c.z===previous.z));
  assert.equal(cost,Math.min(...goals.map(c=>octile(from,c))));
}
const navigationWorld=structuredClone(scenes[1]!.world),trappedFood={x:239,z:239},reachableFood={x:12,z:12};
for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(dx||dz)navigationWorld.tiles[(239+dz)*250+239+dx]={terrain:'water'};
for(const cell of [reachableFood,trappedFood])navigationWorld.piles.push({id:navigationWorld.nextId++,item:'hare-meat',kind:'food',quantity:1,
  owner:{type:'ground',...cell},...freshRot('hare-meat',navigationWorld.tick)});
refreshStock(navigationWorld);assert.deepEqual(validateWorld(navigationWorld),[]);
assert.equal(navigationWorld.site,undefined);assert.equal(navigationWorld.structures.length,0);
const predator=navigationWorld.wildlife!.animals.find(a=>a.species==='red-fox')!;
const candidates=animalPreyCandidates(navigationWorld,predator);
// All admissible prey in this healthy adult fixture are hares with equal CP,
// health and size. The independent ordering consequently reduces to distance.
const oraclePrey=navigationWorld.wildlife!.animals.filter(a=>a.species==='hare').sort((a,b)=>
  Math.hypot(a.x-predator.x,a.z-predator.z)-Math.hypot(b.x-predator.x,b.z-predator.z)||a.id-b.id)[0]!;
assert.equal(candidates[0]?.id,oraclePrey.id);
const edges:Cell[]=[];
for(let x=0;x<250;x++)edges.push({x,z:0},{x,z:249});
for(let z=1;z<249;z++)edges.push({x:0,z},{x:249,z});
const queryCases=[
  {name:'reachable-food-priority',food:[reachableFood],prey:candidates,expected:'food' as const,goals:[reachableFood],targetId:undefined},
  {name:'unreachable-food-then-prey',food:[trappedFood],prey:candidates,expected:'prey' as const,goals:contacts(oraclePrey),targetId:oraclePrey.id},
  {name:'unreachable-food-then-border',food:[trappedFood],prey:[],expected:'exit' as const,goals:edges,targetId:undefined},
];
const navigationBefore=snapshot(navigationWorld),navigationRng=navigationWorld.rng,wildlifeRng=navigationWorld.wildlife!.rng;
const witnesses:Record<string,{fields:number;visited:number}>={};
// Instrument only untimed oracle calls; restore the prototype before timing.
for(const query of queryCases){
  const fields=new Set<WeightedSearch>(),advance=WeightedSearch.prototype.advance;
  WeightedSearch.prototype.advance=function(...args:Parameters<typeof advance>){fields.add(this);return advance.apply(this,args);};
  try {
    const route=animalNavigation(navigationWorld,false,true).foodPreyOrExitRoute(predator,query.food,query.prey,true)!;
    assertRoute(navigationWorld,predator,route,query.expected,query.goals,query.targetId);
    assert.equal(fields.size,1,'One logical query must use one field, including failed food fallback');
    const field=[...fields][0]!;
    if(query.expected!=='food')assert.equal(field.field.visited,250*250-9,'Failed food must exhaust the reachable component exactly once');
    witnesses[query.name]={fields:fields.size,visited:field.field.visited};
  }finally {WeightedSearch.prototype.advance=advance;}
}
assert.equal(snapshot(navigationWorld),navigationBefore);

interface Measurement {scene:string;scope:string;slot:number;samples:number;callsPerSample:number;warmups:number;ticksPerCall?:number;p50Ms:number;p95Ms:number;valuesMs:number[];observations:unknown}
const results:Measurement[]=[],percentile=(v:number[],p:number)=>v.slice().sort((a,b)=>a-b)[Math.ceil(v.length*p)-1]!;
function measure(scene:string,scope:string,slot:number,callsPerSample:number,warmups:number,prepare:()=>void,invoke:()=>unknown,check:(value:unknown)=>void,observations:()=>unknown,ticks?:number):void {
  assert.deepEqual(sourceDigest(),sources,'Sources changed during benchmark');
  for(let i=0;i<warmups;i++){prepare();check(invoke());}
  const valuesMs:number[]=[];
  for(let sample=0;sample<samples;sample++){
    let elapsed=0;
    for(let call=0;call<callsPerSample;call++){
      prepare();const start=performance.now(),value=invoke();elapsed+=performance.now()-start;check(value);
    }
    valuesMs.push(elapsed/callsPerSample);
  }
  results.push({scene,scope,slot,samples,callsPerSample,warmups,...ticks?{ticksPerCall:ticks}:{},p50Ms:percentile(valuesMs,.5),p95Ms:percentile(valuesMs,.95),valuesMs,observations:observations()});
}
// Same input, explicit reconstruction versus reuse of standability capture.
// Both run the current navigation algorithm and allocate one fresh field/call.
const navOrder=['reconstructed','captured','captured','reconstructed'] as const;
for(const query of queryCases)for(const [slot,variant] of navOrder.entries()){
  const captured=animalNavigation(navigationWorld,false,true);
  measure('250-square-navigation',`${query.name}/${variant}`,slot,5,5,()=>{},
    ()=> (variant==='captured'?captured:animalNavigation(navigationWorld,false,true)).foodPreyOrExitRoute(predator,query.food,query.prey,true),
    value=>assertRoute(navigationWorld,predator,value as Route,query.expected,query.goals,query.targetId),()=>witnesses[query.name]);
  assert.equal(snapshot(navigationWorld),navigationBefore);assert.equal(navigationWorld.rng,navigationRng);assert.equal(navigationWorld.wildlife!.rng,wildlifeRng);
}
for(const scene of scenes)measure(scene.name,'biological-candidates-all-foxes',0,5,5,()=>{},
  ()=>scene.world.wildlife!.animals.filter(a=>a.species==='red-fox').map(a=>animalPreyCandidates(scene.world,a).map(p=>p.id)),
  ()=>assert.equal(snapshot(scene.world),scene.before),()=>({predators:scene.counts['red-fox']??0,animals:100}));

// Separate absolute full-tick workloads. A/B/B/A alternates SCENES, not engine
// variants. Different worlds/actors forbid interpreting their ratio as a gain.
const fullOrder=[0,1,1,0],endHashes=new Map<string,string>(),endObservations=new Map<string,unknown>();
for(const [slot,index] of fullOrder.entries()){
  const scene=scenes[index]!,originalIds=new Set(scene.world.wildlife!.animals.map(a=>a.id));let current:World;
  measure(scene.name,'full-engine-100-local-ticks',slot,2,2,()=>{current=structuredClone(scene.world);},()=>{stepWorld(current,ticksPerCall);return current;},value=>{
    const w=value as World;assert.equal(w.tick,startTick+ticksPerCall);assert.deepEqual(validateWorld(w),[]);
    const living=w.wildlife!.animals.filter(a=>originalIds.has(a.id)),corpses=w.piles.filter(p=>p.corpse&&originalIds.has(p.id));
    assert.equal(new Set([...living,...corpses].map(a=>a.id)).size,living.length+corpses.length,'Original identity cloned');
    assert.equal(living.length+corpses.length+(w.wildlife!.exitedAnimals??0)+w.wildlife!.eatenItems,100,'Animal identity terminal accounting');
    assert.equal(w.wildlife!.population!.checks,0,'Window must stop before ecological replenishment');
    const digest=hash(snapshot(w)),expected=endHashes.get(scene.name);
    if(expected)assert.equal(digest,expected,'Repeated fresh checkpoints must reproduce exact state/RNG');else endHashes.set(scene.name,digest);
    endObservations.set(scene.name,{endWorldSha256:digest,rng:w.rng,wildlifeRng:w.wildlife!.rng,living:living.length,corpses:corpses.length,
      hunters:living.filter(a=>a.predation).length,recoveries:living.filter(a=>a.strike).length,eatenNutrition:w.wildlife!.eatenNutrition,eatenItems:w.wildlife!.eatenItems});
  },()=>endObservations.get(scene.name),ticksPerCall);
  assert.equal(snapshot(scene.world),scene.before);
}
assert.deepEqual(sourceDigest(),sources,'Sources changed during benchmark');
const report={date:new Date().toISOString(),node:process.version,execArgv:process.execArgv,
  hardware:{cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem(),platform:os.platform(),release:os.release(),arch:os.arch()},
  sources,prepared:true,map:[250,250],seed,startTick,samples,navOrder,fullOrder,fullTicksPerCall:ticksPerCall,
  scenes:scenes.map(s=>({name:s.name,animals:100,counts:s.counts,plants:s.world.resources.length,worldSha256:s.worldSha256,climate:s.world.climate})),
  navigation:{witnesses,worldSha256:hash(navigationBefore),candidates:candidates.length,blockedCells:8,foodGoalQueries:'Explicit kernel goal subsets, not full food-policy selection'},
  units:'milliseconds/call; full-engine calls contain 100 local ticks',
  correctness:'Independent uniform-grid octile path/contact oracle, equal-health adult hare ordering, one-field identity and exhaustive reachable-cell witnesses; query World/RNG unchanged. Full tick uses actual prepared transitions, strict save validation, original identity accounting and exact repeat hashes.',
  timing:'Preparation/cloning, validation, hashing, oracle checks and instrumentation excluded. Navigation reconstruction includes standability capture; captured variant retains only that capture, never the search field. Full engine includes cold per-World derived caches and the real 100-tick progression.',
  comparison:'Navigation A/B/B/A uses the same input and current algorithm. Full-tick A/B/B/A alternates distinct herbivore/predator workloads: absolute costs, no historical engine, no speedup or general overhead attribution.',
  limits:'Prepared empty colony, daylight, 1024 mature berry plants and 100 animals. Predator positions intentionally enable hunting. No long natural campaign, colony worker load, snapshot adoption, renderer CPU, RAF, GPU or FPS claim. Run successively with other heavy/native controls.',results};
mkdirSync(join(root,'tmp'),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify({path:output,results:results.map(({valuesMs,...summary})=>summary)}));
