/** Exact V190 exhaustive A versus V191 progressive B, prepared 250² queries.
 * Run alone ONLY after coordinator-approved source freeze and targeted tests:
 * node --experimental-strip-types scripts/benchmark-predation-v191.ts
 * Writes tmp/predation-benchmark-v191.json; no tick/GPU/frame-rate claim. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,readdirSync,writeFileSync } from 'node:fs';
import os from 'node:os';
import { join,relative,resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { emptyLandscape } from '../src/sim/generation.ts';
import { adoptEnvironment } from '../src/sim/environment-step.ts';
import { newBreakdownCalendar } from '../src/sim/breakdowns.ts';
import { createApparelWearCalendar } from '../src/sim/apparel-renewal.ts';
import { animalSpecies,faunaBiome,type AnimalSpeciesId } from '../src/sim/animal-species.ts';
import { adultAgeTicks } from '../src/sim/animal-life.ts';
import { animalNavigation } from '../src/sim/wildlife-navigation.ts';
import { animalPreyCandidates,animalPreyScore } from '../src/sim/wildlife-predation.ts';
import { createMedicalRecord,medicalStatus } from '../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { WeightedSearch } from '../src/sim/weighted-search.ts';
import { freshRot } from '../src/sim/food-preservation.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import type { Cell,World } from '../src/sim/types.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const script=join(root,'scripts','benchmark-predation-v191.ts');
const output=join(root,'tmp','predation-benchmark-v191.json');
const historicalCommit='c4d69e5a70141a1f6fe7b76529534b8a955193ac';
const historicalFile='src/sim/wildlife-navigation.ts';
const historicalBlob='e5973f60b8ee08ab81d60dacfb60cf3c02d881e8';
const hash=(data:string|Buffer)=>createHash('sha256').update(data).digest('hex');
const git=(...args:string[])=>execFileSync('git',args,{cwd:root});
const snapshot=(world:World)=>JSON.stringify(world);
function sourceDigest(){
  const files:string[]=[],directory=join(root,'src');
  function visit(dir:string):void {
    for(const entry of readdirSync(dir,{withFileTypes:true})){
      const path=join(dir,entry.name);
      if(entry.isDirectory())visit(path);else if(entry.isFile())files.push(path);
    }
  }
  visit(directory);files.sort();const digest=createHash('sha256');
  for(const path of files){const data=readFileSync(path),name=relative(directory,path).replaceAll('\\','/');digest.update(`${name.length}:${name}:${data.length}:`);digest.update(data);}
  return {sha256:digest.digest('hex'),files:files.length,scriptSha256:hash(readFileSync(script))};
}
const sources=sourceDigest();
// Historical implementation, not a guessed copy. Git compares normalized file
// contents: every tracked source dependency must remain the V190 implementation.
const sourceChanges=git('diff','--name-only',historicalCommit,'--','src').toString().trim().split(/\r?\n/).filter(Boolean);
assert.ok(sourceChanges.every(path=>path===historicalFile),'Only the navigation implementation may differ from V190');
assert.equal(git('ls-files','--others','--exclude-standard','--','src').toString().trim(),'','Untracked runtime source is outside this comparison');
const original=git('show',`${historicalCommit}:${historicalFile}`);
const blob=createHash('sha1').update(`blob ${original.length}\0`).update(original).digest('hex');
assert.equal(blob,historicalBlob,'Historical navigation blob changed');
// Rebase relative imports into the same CURRENT dependency modules. Above guard
// proves those sources are unchanged; both variants therefore use one class.
const baselineDirectory=join(root,'tmp','predation-v191-baseline');
const baselinePath=join(baselineDirectory,'wildlife-navigation.ts');
const baselineSource=original.toString().replace(/from '\.\//g,"from '../../src/sim/");
mkdirSync(baselineDirectory,{recursive:true});writeFileSync(baselinePath,baselineSource);
const {animalNavigation:exhaustiveNavigation}=await import(pathToFileURL(baselinePath).href) as {animalNavigation:typeof animalNavigation};
const baseline={commit:historicalCommit,file:historicalFile,gitBlob:blob,sha256:hash(original),rebasedModuleSha256:hash(baselineSource),sourceChanges,
  sharedDependencies:'Tracked src differences from V190 restricted to wildlife-navigation.ts; no untracked runtime sources'};

const seed=191,startTick=2000,samples=20,callsPerSample=5,warmups=5;
const from:Cell={x:125,z:125};
const contacts=(c:Cell):Cell[]=>[c,{x:c.x-1,z:c.z},{x:c.x+1,z:c.z},{x:c.x,z:c.z-1},{x:c.x,z:c.z+1}];
const edges:Cell[]=[];
for(let x=0;x<250;x++)edges.push({x,z:0},{x,z:249});
for(let z=1;z<249;z++)edges.push({x:0,z},{x:249,z});
type Route=NonNullable<ReturnType<ReturnType<typeof animalNavigation>['foodPreyOrExitRoute']>>;
type Variant='A-exhaustive-v190'|'B-progressive-v191';
const order:readonly Variant[]=['A-exhaustive-v190','B-progressive-v191','B-progressive-v191','A-exhaustive-v190'];
function preparedWorld():World {
  const w=emptyLandscape(seed,250,250);w.tick=startTick;
  w.breakdown=newBreakdownCalendar(seed,w.tick);
  w.apparelWear=createApparelWearCalendar(w.tick,(seed^0x0a77e1)>>>0);
  w.tiles=Array.from({length:w.width*w.height},()=>({terrain:'grass'}));
  const biome=faunaBiome('temperate-forest'),full=w.width*w.height*biome.animalDensity/10000;
  w.wildlife={profile:'biome-fauna-v2',rng:(seed^0x784caf31)>>>0,animals:[],eatenPlants:0,eatenItems:0,eatenNutrition:0,
    population:{biome:biome.id,fullTargetWeight:full,targetWeight:full*biome.entries.reduce((n,e)=>n+e.commonality,0)/biome.totalCommonality,
      nextCheck:w.tick+122,checks:0,arrivals:0}};
  adoptEnvironment(w);return w;
}
function animal(w:World,species:AnimalSpeciesId,cell:Cell,downed=false):WildAnimal {
  const a:WildAnimal={id:w.nextId++,species,sex:'male',ageTicks:adultAgeTicks(species),...cell,
    food:animalSpecies(species).nutrition*.2,rest:1,state:downed?'downed':'idle',path:[],nextDecision:w.tick};
  if(downed){a.health={...createMedicalRecord(w.tick),body:species,bloodLoss:BLOOD_UNIT*.6};assert.equal(medicalStatus(a.health),'downed');}
  w.wildlife!.animals.push(a);return a;
}
function ring(w:World,center:Cell,radius:number):void {
  for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++)if(Math.max(Math.abs(dx),Math.abs(dz))===radius)
    w.tiles[(center.z+dz)*w.width+center.x+dx]={terrain:'water'};
}
interface Scene {
  name:string;world:World;before:string;worldSha256:string;rngSha256:string;food:Cell[];prey:(Cell&{id:number})[];
  expectedKind:Route['kind'];expectedGoals:Cell[];expectedTargetId?:number;ranking:{id:number;distance:number;score:number;downed:boolean}[];
  reachableCells:number;expectedExhaustion:boolean;
}
function scene(name:string):Scene {
  const world=preparedWorld(),predator=animal(world,'red-fox',from),food:Cell[]=[];
  let chosen:WildAnimal|undefined,kind:Route['kind']='prey',reachableCells=250*250,expectedExhaustion=false;
  if(name==='no-food-near-prey'){
    chosen=animal(world,'hare',{x:128,z:125});animal(world,'hare',{x:225,z:225});
  }else if(name==='no-food-distant-ranked-first'){
    chosen=animal(world,'hare',{x:150,z:125},true);animal(world,'hare',{x:128,z:125});
  }else if(name==='first-prey-inaccessible-then-next'){
    const trapped=animal(world,'hare',{x:150,z:125},true);ring(world,trapped,2);
    chosen=animal(world,'hare',{x:130,z:125});reachableCells-=25;expectedExhaustion=true;
  }else if(name==='food-inaccessible-then-prey'){
    const trapped={x:220,z:220};food.push(trapped);ring(world,trapped,1);
    chosen=animal(world,'hare',{x:128,z:125});reachableCells-=9;expectedExhaustion=true;
  }else if(name==='food-accessible-before-near-prey'){
    food.push({x:220,z:220});animal(world,'hare',{x:128,z:125});kind='food';
  }else if(name==='no-prey-then-border'){
    kind='exit';expectedExhaustion=true;
  }else throw new Error(`Unknown scene ${name}`);
  for(const cell of food)world.piles.push({id:world.nextId++,item:'hare-meat',kind:'food',quantity:1,
    owner:{type:'ground',...cell},...freshRot('hare-meat',world.tick)});
  refreshStock(world);assert.deepEqual(validateWorld(world),[]);
  assert.equal(world.structures.length,0);assert.equal(world.site,undefined);assert.equal(world.jobs.length,0);
  const ranked=animalPreyCandidates(world,predator);
  if(name==='no-food-distant-ranked-first')assert.equal(ranked[0]?.id,chosen!.id,'Distant downed prey must biologically outrank the near healthy prey');
  if(name==='first-prey-inaccessible-then-next')assert.equal(ranked[0]?.x,150,'The inaccessible prey must genuinely rank first');
  const before=snapshot(world);
  return {name,world,before,worldSha256:hash(before),rngSha256:rngHash(world),food,
    prey:ranked.map(({id,x,z})=>({id,x,z})),expectedKind:kind,expectedGoals:kind==='food'?food:kind==='exit'?edges:contacts(chosen!),
    ...chosen?{expectedTargetId:chosen.id}:{},ranking:ranked.map(a=>({id:a.id,distance:Math.hypot(a.x-from.x,a.z-from.z),score:animalPreyScore(predator,a),downed:a.state==='downed'})),
    reachableCells,expectedExhaustion};
}
function rngHash(world:World):string {return hash(JSON.stringify({world:world.rng,wildlife:world.wildlife?.rng}));}
const scenes=['no-food-near-prey','no-food-distant-ranked-first','first-prey-inaccessible-then-next',
  'food-inaccessible-then-prey','food-accessible-before-near-prey','no-prey-then-border'].map(scene);

/** Independent uniform-grid octile oracle: all selected straight routes avoid
 * the isolated water rings. This does not reproduce production parent ties. */
function octile(a:Cell,b:Cell):number {
  const dx=Math.abs(a.x-b.x),dz=Math.abs(a.z-b.z),diagonal=Math.min(dx,dz);
  return diagonal*1414+(Math.max(dx,dz)-diagonal)*1000;
}
function assertRoute(s:Scene,route:Route):number {
  assert.ok(route);assert.equal(route.kind,s.expectedKind);assert.equal(route.targetId,s.expectedTargetId);
  let previous=from,cost=0;
  const blocked=(c:Cell)=>s.world.tiles[c.z*s.world.width+c.x]?.terrain==='water';
  for(const next of route.path){
    assert.ok(Number.isInteger(next.x)&&Number.isInteger(next.z)&&next.x>=0&&next.z>=0&&next.x<s.world.width&&next.z<s.world.height);
    const dx=Math.abs(next.x-previous.x),dz=Math.abs(next.z-previous.z);
    assert.equal(Math.max(dx,dz),1);assert.ok(!blocked(next));
    if(dx&&dz){assert.ok(!blocked({x:previous.x,z:next.z}));assert.ok(!blocked({x:next.x,z:previous.z}));}
    cost+=dx&&dz?1414:1000;previous=next;
  }
  const goals=s.expectedGoals.filter(c=>!blocked(c));
  assert.ok(goals.some(c=>c.x===previous.x&&c.z===previous.z));
  assert.equal(cost,Math.min(...goals.map(c=>octile(from,c))));return cost;
}
function prepare(s:Scene,variant:Variant){
  const world=structuredClone(s.world),food=structuredClone(s.food),prey=structuredClone(s.prey),origin={...from};
  const navigation=(variant==='A-exhaustive-v190'?exhaustiveNavigation:animalNavigation)(world,false,true);
  return {world,invoke:()=>navigation.foodPreyOrExitRoute(origin,food,prey,true)};
}
function unchanged(s:Scene,world:World):void {
  assert.equal(hash(snapshot(world)),s.worldSha256,'Query mutated World');assert.equal(rngHash(world),s.rngSha256,'Query changed PRNG');
}
interface Witness {fields:number;finalizedVisits:number;advanceCalls:number;cost:number;route:Route;pathSha256:string;worldSha256:string;rngSha256:string}
const witnesses:Record<string,Record<Variant,Witness>>={};
for(const s of scenes){
  const entries={} as Record<Variant,Witness>;
  for(const variant of ['A-exhaustive-v190','B-progressive-v191'] as const){
    const input=prepare(s,variant),fields=new Set<WeightedSearch>(),advance=WeightedSearch.prototype.advance;let advanceCalls=0;
    // Untimed instrumentation, restored before all warmups and measurements.
    WeightedSearch.prototype.advance=function(...args:Parameters<typeof advance>){fields.add(this);advanceCalls++;return advance.apply(this,args);};
    try {
      const route=input.invoke()!,cost=assertRoute(s,route);assert.equal(fields.size,1,'A query must retain one search identity');
      const field=[...fields][0]!.field,end=route.path.at(-1)??from;
      assert.equal(field.costs[end.z*s.world.width+end.x],cost,'Independent route cost must equal finalized field cost');
      if(field.settled)assert.equal(field.settled[end.z*s.world.width+end.x],1,'Contact must be finalized, never merely discovered');
      if((variant==='A-exhaustive-v190'&&s.expectedKind!=='food')||s.expectedExhaustion)
        assert.equal(field.visited,s.reachableCells,'Failure/border must exhaust exactly the reachable component');
      if(variant==='B-progressive-v191'&&s.name==='no-food-near-prey')assert.ok(field.visited<s.reachableCells,'Nearby prey must stop before exhaustive flood');
      unchanged(s,input.world);
      entries[variant]={fields:fields.size,finalizedVisits:field.visited,advanceCalls,cost,route,pathSha256:hash(JSON.stringify(route.path)),worldSha256:s.worldSha256,rngSha256:s.rngSha256};
    }finally {WeightedSearch.prototype.advance=advance;}
  }
  assert.deepEqual(entries['B-progressive-v191'].route,entries['A-exhaustive-v190'].route,'Target/contact and every parent step must equal V190');
  assert.equal(entries['B-progressive-v191'].cost,entries['A-exhaustive-v190'].cost);
  witnesses[s.name]=entries;assert.equal(snapshot(s.world),s.before);
}

interface Measurement {scene:string;variant:Variant;slot:number;samples:number;callsPerSample:number;warmups:number;p50Ms:number;p95Ms:number;valuesMs:number[];fields:number;finalizedVisits:number}
const results:Measurement[]=[],percentile=(values:number[],p:number)=>values.slice().sort((a,b)=>a-b)[Math.ceil(values.length*p)-1]!;
for(const s of scenes)for(const [slot,variant] of order.entries()){
  assert.deepEqual(sourceDigest(),sources,'Sources changed during benchmark');
  assert.equal(hash(readFileSync(baselinePath)),baseline.rebasedModuleSha256,'Baseline module changed');
  const expected=witnesses[s.name]![variant];
  function check(input:ReturnType<typeof prepare>,route:ReturnType<typeof input.invoke>):void {
    assert.deepEqual(route,expected.route);assert.equal(assertRoute(s,route!),expected.cost);unchanged(s,input.world);
  }
  for(let i=0;i<warmups;i++){const input=prepare(s,variant);check(input,input.invoke());}
  const valuesMs:number[]=[];
  for(let sample=0;sample<samples;sample++){
    let elapsed=0;
    for(let call=0;call<callsPerSample;call++){
      const input=prepare(s,variant),start=performance.now(),route=input.invoke();elapsed+=performance.now()-start;
      check(input,route);
    }
    valuesMs.push(elapsed/callsPerSample);
  }
  results.push({scene:s.name,variant,slot,samples,callsPerSample,warmups,p50Ms:percentile(valuesMs,.5),p95Ms:percentile(valuesMs,.95),valuesMs,
    fields:expected.fields,finalizedVisits:expected.finalizedVisits});
  assert.equal(snapshot(s.world),s.before);assert.equal(rngHash(s.world),s.rngSha256);
}
assert.deepEqual(sourceDigest(),sources,'Sources changed during benchmark');
assert.equal(hash(readFileSync(baselinePath)),baseline.rebasedModuleSha256);
const comparison=scenes.map(s=>{
  const a=results.filter(r=>r.scene===s.name&&r.variant==='A-exhaustive-v190'),b=results.filter(r=>r.scene===s.name&&r.variant==='B-progressive-v191');
  return {scene:s.name,aP50RangeMs:[Math.min(...a.map(r=>r.p50Ms)),Math.max(...a.map(r=>r.p50Ms))],
    bP50RangeMs:[Math.min(...b.map(r=>r.p50Ms)),Math.max(...b.map(r=>r.p50Ms))],
    aFinalizedVisits:witnesses[s.name]!['A-exhaustive-v190'].finalizedVisits,bFinalizedVisits:witnesses[s.name]!['B-progressive-v191'].finalizedVisits,
    exactRoute:true,exactTarget:true,exactContact:true,exactCost:true};
});
const report={date:new Date().toISOString(),node:process.version,execArgv:process.execArgv,
  hardware:{cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem(),platform:os.platform(),release:os.release(),arch:os.arch()},
  sources,baseline,prepared:true,map:[250,250],seed,startTick,samples,callsPerSample,warmups,order,units:'milliseconds per navigation consultation',
  scenes:scenes.map(s=>({name:s.name,from,food:s.food,prey:s.prey,ranking:s.ranking,worldSha256:s.worldSha256,rngSha256:s.rngSha256,
    reachableCells:s.reachableCells,expectedExhaustion:s.expectedExhaustion})),witnesses,comparison,results,
  correctness:'Exact full result, target, contact and every path cell A=B. Independent octile/physical-step cost oracle on uniform grass, isolated water components, real biological ordering prepared outside timing. One WeightedSearch identity per consultation; finalized visits and route field costs captured without timing. World and World/wildlife PRNG hashes unchanged in every call.',
  timing:'Cloning, biological selection, standability capture, validation, instrumentation, hashing and route oracles excluded. Each call receives a fresh identical clone/capture and a fresh field; lazy route mask allocation and navigation query costs included equally. Normal runtime GC remains included; no forced GC or retained field between calls.',
  comparisonScope:'A is exact V190 git blob with import paths rebased only; B is frozen current navigation. Shared source dependencies unchanged from V190. A/B/B/A uses identical worlds, goals and biological candidate order; each slot has 20 samples of 5 calls after 5 warmups.',
  limits:'Prepared kernel queries on empty 250² maps, at most three animals, no buildings/floors or colony work. Explicit edible pile goal subsets do not benchmark full food-policy selection. No full tick, worker/snapshot, renderer/RAF, GPU, FPS, long campaign or general speedup claim. Failed food or first inaccessible prey intentionally retain exhaustive cost. Must run successively after targeted tests and source freeze approval.'};
mkdirSync(join(root,'tmp'),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify({path:output,sources,comparison,results:results.map(({valuesMs,...summary})=>summary)}));
