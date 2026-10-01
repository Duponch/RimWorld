/**
 * V178 CPU-only wild-healroot comparison against a frozen V177 source archive.
 *
 * Prepare tmp/healroot-v178-baseline/src from the chosen baseline commit, then:
 *   node --experimental-strip-types scripts/healroot-bench-v178.ts --baseline=tmp/healroot-v178-baseline/src
 *
 * The script writes tmp/healroot-bench-v178.json. It does not start a browser,
 * renderer, worker or the RimWorld executable.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { World } from '../src/sim/types.ts';

type Biome = 'temperate-forest' | 'boreal-forest' | 'arid-shrubland';
type Variant = 'baseline' | 'current';
type Runtime = {
  createScenarioWorld: (seed:number,size:number,id:'crashlanded',options:{biome:Biome;hilliness:'small-hills'})=>World;
  stepWorld: (world:World)=>void;
  serializeWorld: (world:World)=>string;
  startingPawn: (id:number,name:string,x:number,z:number,index:number,recreation:number,seed:number)=>World['pawns'][number];
  initializeCampTraits: (world:World)=>void;
  addMaterial: (world:World,kind:'apparel',quantity:number,owner:{type:'apparel';pawnId:number},item:'cloth-shirt')=>unknown;
  blockedCells: (world:World)=>Uint8Array;
};
type Counts = {resources:number;plants:number;healroots:number;pawns:number;animals:number;healrootBushParts:number;extraBushPartsVsSingleShrub:number};
type Sample = {round:number;slot:number;variant:Variant;milliseconds:number;counts:Counts};

const repoRoot=resolve(fileURLToPath(new URL('../',import.meta.url)));
const currentSrc=join(repoRoot,'src');
const output=join(repoRoot,'tmp','healroot-bench-v178.json');
const biomes:readonly Biome[]=['temperate-forest','boreal-forest','arid-shrubland'];
const seeds=[42,93,2048] as const;
const order:readonly Variant[]=['baseline','current','current','baseline'];
const mapSize=250,rounds=4,warmups=2,ticksPerBatch=60;

function baselineArgument():string {
  const args=process.argv.slice(2);
  if(args.length!==1||!args[0]!.startsWith('--baseline=')||args[0]!.length<12)
    throw new Error('Usage: node --experimental-strip-types scripts/healroot-bench-v178.ts --baseline=<archive>/src');
  const source=resolve(args[0]!.slice('--baseline='.length));
  if(source===currentSrc||basename(source).toLowerCase()!=='src'||!existsSync(join(source,'sim','new-game.ts')))
    throw new Error('The baseline must be a separate frozen src directory containing sim/new-game.ts.');
  return source;
}
function sourceFiles(root:string):string[] {
  const files:string[]=[];
  const visit=(directory:string):void=>{
    for(const entry of readdirSync(directory,{withFileTypes:true})){
      const path=join(directory,entry.name);
      if(entry.isDirectory())visit(path);
      else if(entry.isFile())files.push(path);
    }
  };
  visit(root);
  return files.sort((a,b)=>relative(root,a).localeCompare(relative(root,b)));
}
function sourceDigest(root:string):{sha256:string;files:number} {
  const files=sourceFiles(root),hash=createHash('sha256');
  for(const path of files){
    const content=readFileSync(path),name=relative(root,path).replaceAll('\\','/');
    hash.update(`${name.length}:${name}:${content.length}:`);hash.update(content);
  }
  return {sha256:hash.digest('hex'),files:files.length};
}
async function runtime(source:string):Promise<Runtime> {
  const load=(name:string)=>import(pathToFileURL(join(source,'sim',name+'.ts')).href);
  const [newGame,engine,serialization,pawns,traits,materials,pathfinding]=await Promise.all([
    load('new-game'),load('engine'),load('serialization'),load('starting-pawns'),load('traits'),load('materials'),load('pathfinding'),
  ]);
  return {
    createScenarioWorld:newGame.createScenarioWorld,stepWorld:engine.stepWorld,serializeWorld:serialization.serializeWorld,
    startingPawn:pawns.startingPawn,initializeCampTraits:traits.initializeCampTraits,
    addMaterial:materials.addMaterial,blockedCells:pathfinding.blockedCells,
  } as Runtime;
}
const makeWorld=(api:Runtime,biome:Biome,seed:number)=>
  api.createScenarioWorld(seed,mapSize,'crashlanded',{biome,hilliness:'small-hills'});
const counts=(world:World):Counts=>{
  const plants=world.resources.filter(resource=>resource.species!==undefined).length;
  const healroots=world.resources.filter(resource=>resource.species==='healroot-wild').length;
  return {resources:world.resources.length,plants,healroots,pawns:world.pawns.length,animals:world.wildlife?.animals.length??0,
    // Five bush placements per healroot in V178. This is a logical instance
    // budget, not a GPU measurement or a claim about visible draw calls.
    healrootBushParts:healroots*5,extraBushPartsVsSingleShrub:healroots*4};
};
function normalized(serialized:string):string {
  const value=JSON.parse(serialized) as Record<string,unknown>;
  value.schemaVersion=167;
  return JSON.stringify(value);
}
const digest=(content:string)=>createHash('sha256').update(content).digest('hex');
function summary(samples:readonly {milliseconds:number}[]):{n:number;meanMs:number;p50Ms:number;p95Ms:number;minMs:number;maxMs:number} {
  const sorted=samples.map(sample=>sample.milliseconds).sort((a,b)=>a-b),n=sorted.length;
  if(!n)throw new Error('Missing timing samples.');
  return {n,meanMs:sorted.reduce((sum,value)=>sum+value,0)/n,p50Ms:(sorted[Math.floor((n-1)/2)]!+sorted[Math.floor(n/2)]!)/2,
    p95Ms:sorted[Math.ceil(n*.95)-1]!,minMs:sorted[0]!,maxMs:sorted[n-1]!};
}
function assertSameCounts(samples:readonly Sample[]):Counts {
  const first=JSON.stringify(samples[0]?.counts);
  if(!first||samples.some(sample=>JSON.stringify(sample.counts)!==first))throw new Error('Repeated generation changed resource counts.');
  return samples[0]!.counts;
}
function addFourthColonist(api:Runtime,world:World,seed:number):void {
  const landing=world.scenario?.landing??world.pawns[0]!;
  const blocked=api.blockedCells(world),occupied=new Set([
    ...world.pawns.map(pawn=>pawn.z*world.width+pawn.x),
    ...world.resources.map(resource=>resource.z*world.width+resource.x),
    ...world.piles.flatMap(pile=>pile.owner.type==='ground'?[pile.owner.z*world.width+pile.owner.x]:[]),
  ]);
  let position:{x:number;z:number}|undefined;
  for(let radius=1;radius<world.width+world.height&&!position;radius++)for(let dz=-radius;dz<=radius&&!position;dz++){
    const distanceX=radius-Math.abs(dz);
    for(const dx of distanceX===0?[0]:[-distanceX,distanceX]){
      const x=landing.x+dx,z=landing.z+dz,index=z*world.width+x;
      if(x>=0&&x<world.width&&z>=0&&z<world.height&&!blocked[index]&&!occupied.has(index)){
        position={x,z};break;
      }
    }
  }
  if(!position)throw new Error('No accessible cell for the fourth colonist.');
  const pawn=api.startingPawn(world.nextId++,'Iris',position.x,position.z,3,55,seed);
  world.pawns.push(pawn);api.initializeCampTraits(world);
  api.addMaterial(world,'apparel',1,{type:'apparel',pawnId:pawn.id},'cloth-shirt');
  if(world.pawns.length!==4||!world.wildlife?.animals.length)throw new Error('Tick scene requires four colonists and ordinary biome fauna.');
}
function rngs(world:World):Record<string,number|undefined> {
  return {world:world.rng,flora:world.flora?.rng,wildlife:world.wildlife?.rng,fire:world.fires?.rng};
}

async function run():Promise<void> {
  const baselineSrc=baselineArgument();
  const cache=join(repoRoot,'tmp','host-cache');
  mkdirSync(join(cache,'temp'),{recursive:true});
  process.env.TEMP=join(cache,'temp');process.env.TMP=process.env.TEMP;process.env.NPM_CONFIG_CACHE=join(cache,'npm-cache');
  const sourceBefore={baseline:sourceDigest(baselineSrc),current:sourceDigest(currentSrc)};
  const apis:{baseline:Runtime;current:Runtime}={baseline:await runtime(baselineSrc),current:await runtime(currentSrc)};

  // Warm each implementation twice before any generation timing. Every timed
  // sample constructs a fresh ordinary 250x250 Crashlanded world.
  for(let i=0;i<warmups;i++)for(const variant of order.slice(0,2))makeWorld(apis[variant],biomes[i]!,seeds[i]!);
  const generation:Record<string,unknown>[]=[];
  for(const biome of biomes)for(const seed of seeds){
    const samples:Sample[]=[],firstArid=new Map<Variant,string>();
    for(let round=1;round<=rounds;round++)for(const [slot,variant] of order.entries()){
      const start=performance.now(),world=makeWorld(apis[variant],biome,seed),milliseconds=performance.now()-start;
      samples.push({round,slot:slot+1,variant,milliseconds,counts:counts(world)});
      if(biome==='arid-shrubland'&&!firstArid.has(variant))firstArid.set(variant,normalized(apis[variant].serializeWorld(world)));
    }
    if(biome==='arid-shrubland'&&firstArid.get('baseline')!==firstArid.get('current'))
      throw new Error(`Arid generation World/PRNG differs between baseline and V178 for seed ${seed}.`);
    const before=samples.filter(sample=>sample.variant==='baseline'),after=samples.filter(sample=>sample.variant==='current');
    generation.push({biome,seed,sequence:'A/B/B/A',rounds,warmupsPerRuntime:warmups,
      baseline:{...summary(before),counts:assertSameCounts(before)},current:{...summary(after),counts:assertSameCounts(after)},
      ratioBaselineOverCurrent:summary(before).meanMs/summary(after).meanMs,
      aridExactWorldAndPrng:biome==='arid-shrubland'?true:undefined,
      samples});
  }

  // The only cross-version tick oracle uses a biome unchanged by V178. Source
  // worlds, fourth colonist and normal generated fauna are prepared untimed.
  const aridBase=makeWorld(apis.baseline,'arid-shrubland',42),aridCurrent=makeWorld(apis.current,'arid-shrubland',42);
  addFourthColonist(apis.baseline,aridBase,42);addFourthColonist(apis.current,aridCurrent,42);
  if(counts(aridBase).healroots||counts(aridCurrent).healroots)throw new Error('Arid tick fixture acquired future healroot.');
  if(normalized(apis.baseline.serializeWorld(aridBase))!==normalized(apis.current.serializeWorld(aridCurrent)))
    throw new Error('Four-colonist arid source World/PRNG differs before timing.');
  const borealCurrent=makeWorld(apis.current,'boreal-forest',42);
  addFourthColonist(apis.current,borealCurrent,42);
  if(!counts(borealCurrent).healroots)throw new Error('Boreal V178 scene has no healroot; choose a recorded seed before benchmarking.');

  const execute=(api:Runtime,source:World)=>{
    const world=structuredClone(source),start=performance.now();
    for(let tick=0;tick<ticksPerBatch;tick++)api.stepWorld(world);
    return {world,milliseconds:performance.now()-start};
  };
  for(let i=0;i<warmups;i++){
    execute(apis.baseline,aridBase);execute(apis.current,aridCurrent);execute(apis.current,borealCurrent);
  }
  const aridSamples:Array<{round:number;slot:number;variant:Variant;milliseconds:number;finalCounts:Counts;finalRng:Record<string,number|undefined>}>=[];
  const borealSamples:Array<{round:number;milliseconds:number;finalCounts:Counts;finalRng:Record<string,number|undefined>}>=[];
  const finalArid=new Map<Variant,string>();let finalBoreal:string|undefined;
  for(let round=1;round<=rounds;round++){
    for(const [slot,variant] of order.entries()){
      const {world,milliseconds}=execute(apis[variant],variant==='baseline'?aridBase:aridCurrent);
      if(counts(world).healroots)throw new Error('Arid tick introduced future healroot.');
      const serialized=normalized(apis[variant].serializeWorld(world));
      if(finalArid.has(variant)&&finalArid.get(variant)!==serialized)throw new Error('Arid continuation varied between identical rounds.');
      finalArid.set(variant,serialized);
      aridSamples.push({round,slot:slot+1,variant,milliseconds,finalCounts:counts(world),finalRng:rngs(world)});
    }
    const {world,milliseconds}=execute(apis.current,borealCurrent);
    const serialized=apis.current.serializeWorld(world);
    if(finalBoreal!==undefined&&finalBoreal!==serialized)throw new Error('Boreal V178 continuation varied between identical rounds.');
    finalBoreal=serialized;
    borealSamples.push({round,milliseconds,finalCounts:counts(world),finalRng:rngs(world)});
  }
  if(finalArid.get('baseline')!==finalArid.get('current'))throw new Error('Exact arid World/PRNG oracle failed after 60 ticks.');
  const aridOld=aridSamples.filter(sample=>sample.variant==='baseline'),aridNew=aridSamples.filter(sample=>sample.variant==='current');

  const sourceAfter={baseline:sourceDigest(baselineSrc),current:sourceDigest(currentSrc)};
  if(JSON.stringify(sourceBefore)!==JSON.stringify(sourceAfter))throw new Error('Source tree changed while the benchmark was running.');
  const report={timestamp:new Date().toISOString(),runtime:process.version,platform:process.platform,cpuModel:cpus()[0]?.model??'unknown',
    source:{baseline:{path:baselineSrc,...sourceBefore.baseline},current:{path:currentSrc,...sourceBefore.current}},
    protocol:{map:`${mapSize}x${mapSize}`,biomes,seeds,generation:{sequence:'A/B/B/A',rounds,warmupsPerRuntime:warmups},
      tick:{aridSequence:'A/B/B/A',boreal:'V178 only',rounds,warmupsPerRuntime:warmups,ticksPerBatch,colonists:4,fauna:'ordinary biome generation'},
      oracle:'Arid baseline and V178 serialized World compared exactly after normalizing only schemaVersion to 167, before and after 60 true ticks; all saved PRNG streams are included.',
      limitation:'Generation in forests changes the flora distribution; their times are descriptive, not an identical-world speedup. CPU simulation only: no snapshot adoption, worker, rendering, GPU or FPS claim. Logical healroot bush-part counts are not measured GPU instances.'},
    generation,
    tick:{arid:{initialCounts:counts(aridCurrent),baseline:summary(aridOld),current:summary(aridNew),
      ratioBaselineOverCurrent:summary(aridOld).meanMs/summary(aridNew).meanMs,exactWorldAndPrng:true,
      finalSha256:digest(finalArid.get('current')!),samples:aridSamples},
      borealCurrentOnly:{initialCounts:counts(borealCurrent),current:summary(borealSamples),finalSha256:digest(finalBoreal!),samples:borealSamples}}};
  mkdirSync(join(repoRoot,'tmp'),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({output,source:report.source,aridTick:report.tick.arid.current,borealTick:report.tick.borealCurrentOnly.current,
    aridExactWorldAndPrng:true,generationSites:generation.length},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await run();
