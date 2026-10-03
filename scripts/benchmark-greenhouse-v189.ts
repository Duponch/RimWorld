/** Prepared, separate CPU sub-benchmarks. Run alone with sources frozen:
 * node --experimental-strip-types scripts/benchmark-greenhouse-v189.ts
 * Writes tmp/greenhouse-benchmark-v189.json; no full engine tick is measured. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,readdirSync,writeFileSync } from 'node:fs';
import os from 'node:os';
import { join,relative,resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { createWorld } from '../src/sim/engine.ts';
import { adoptEnvironment } from '../src/sim/environment-step.ts';
import { LightEnvironmentCache,type LightEnvironment } from '../src/sim/light-environment.ts';
import { lightSources,type LightSource } from '../src/sim/light-sources.ts';
import { LocalLightCache } from '../src/sim/local-light.ts';
import { reconcilePlantLighting } from '../src/sim/plant-lighting.ts';
import { plantGrowth } from '../src/sim/plants.ts';
import { RoomTopologyCache } from '../src/sim/room-topology.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { newBuildingFuel } from '../src/sim/fuel.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import type { Resource,Structure,World } from '../src/sim/types.ts';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const script=join(root,'scripts','benchmark-greenhouse-v189.ts');
const output=join(root,'tmp','greenhouse-benchmark-v189.json');
const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
function sourceDigest():{sha256:string;files:number;scriptSha256:string} {
  const paths:string[]=[],directory=join(root,'src');
  function visit(dir:string):void {
    for(const entry of readdirSync(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name);
      if(entry.isDirectory())visit(path);else if(entry.isFile())paths.push(path);
    }
  }
  visit(directory);paths.sort();const digest=createHash('sha256');
  for(const path of paths) {
    const data=readFileSync(path),name=relative(directory,path).replaceAll('\\','/');
    digest.update(`${name.length}:${name}:${data.length}:`);digest.update(data);
  }
  return {sha256:digest.digest('hex'),files:paths.length,scriptSha256:hash(readFileSync(script))};
}
const sources=sourceDigest();
const latitude={ 'temperate-reference':22.21,'boreal-reference':39.71,'arid-reference':4.01 } as const;

/** Independent discrete oracle: no shipped growth/integral/light/soil helper.
 * Fixtures contain rice on grass, saved thermal factors, and no floors. */
function oracleCivil(world:World,tick:number):number {
  return world.climate?world.climate.calendarOrigin+tick-world.climate.adoptedAt:tick+(world.gameProfile?1500:0);
}
function oracleSky(world:World,tick:number):number {
  const civil=oracleCivil(world,tick);
  if(!world.climate) {
    const angle=(civil%6000/6000-.5)*2*Math.PI;
    return Math.max(0,Math.min(1,Math.cos(Math.max(0,Math.acos(Math.cos(angle)*Math.SQRT1_2)-23.25*Math.PI/180))/.7));
  }
  const lat=latitude[world.climate.profile],year=((civil%360000)+360000)%360000;
  const day=Math.floor(year/6000),angle=(year%6000/6000-.5)*2*Math.PI;
  // All prepared profiles are below latitude70: seasonal offset .2, peek1.
  const y=-Math.cos(day/60*2*Math.PI)*.2;
  const dot=(Math.cos(angle)*Math.cos(lat*Math.PI/180)+y*Math.sin(lat*Math.PI/180))/Math.sqrt(1+y*y);
  const correction=(19+17*Math.max(0,Math.min(1,(60-Math.abs(lat))/60)))*Math.PI/180;
  return Math.max(0,Math.min(1,Math.cos(Math.max(0,Math.acos(Math.max(-1,Math.min(1,dot)))-correction))/.7));
}
function oracleGrowth(world:World,plant:Resource,roofs:ReadonlySet<number>):number {
  assert.equal(plant.kind,'rice');assert.equal(plant.species,undefined);
  assert.equal(world.tiles[plant.z*world.width+plant.x]!.terrain,'grass');
  assert.equal(world.tiles[plant.z*world.width+plant.x]!.floor,undefined);
  const base=plant.growth??1;
  if(base>=1||plant.growthLight==='dark'||plant.growthLight!=='artificial-full'&&roofs.has(plant.z*world.width+plant.x))return base;
  let contribution=0;
  for(let tick=(plant.growthTick??world.tick)+1;tick<=world.tick;tick++) {
    const phase=((oracleCivil(world,tick)%6000)+6000)%6000/6000;
    if(phase<.25||phase>.8)continue;
    contribution+=plant.growthLight==='artificial-full'?1:Math.max(0,(oracleSky(world,tick)-.51)/.49);
  }
  return Math.max(0,Math.min(1,base+contribution*(plant.growthThermalFactor??1)/18000));
}
function oracleMode(world:World,plant:Resource,light:LightEnvironment,roofs:ReadonlySet<number>):Resource['growthLight'] {
  const cell=plant.z*world.width+plant.x;
  return (light.artificial[cell]??0)>=1?'artificial-full':roofs.has(cell)?'dark':undefined;
}
/** Explicit exhaustive current-contract reconstruction, not an old engine.
 * Same input field; every crop is checked, and changed growth uses the oracle. */
function exhaustiveReconcile(world:World,light:LightEnvironment):void {
  if(!world.structures.some(s=>s.kind==='sun-lamp')&&!world.resources.some(p=>p.growthLight!==undefined))return;
  const roofs=new Set(world.roofing?.constructed??[]);
  for(const plant of world.resources) {
    const mode=oracleMode(world,plant,light,roofs);
    if(plant.growthLight===mode)continue;
    plant.growth=oracleGrowth(world,plant,roofs);plant.growthTick=world.tick;
    if(mode===undefined)delete plant.growthLight;else plant.growthLight=mode;
  }
}
function preparedWorld(horticultural:boolean):World {
  const w=createWorld(189,250,250);
  w.pawns=[];w.resources=[];w.piles=[];w.structures=[];w.jobs=[];w.stockpiles=[];w.packed=[];w.growingZones=[];w.wildlife=undefined;
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.gameProfile=undefined;w.tick=1600;
  const occupied=new Set<number>(),planted=new Set<number>(),roofs:number[]=[];
  const add=(kind:Structure['kind'],x:number,z:number):Structure=>{
    const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:kind==='wall'?'wood':'steel'};
    w.structures.push(s);occupied.add(z*w.width+x);return s;
  };
  const rice=(x:number,z:number):void=>{
    const cell=z*w.width+x;if(planted.has(cell)||occupied.has(cell))return;
    planted.add(cell);w.resources.push({id:w.nextId++,kind:'rice',x,z,amount:6,growth:.1,growthTick:w.tick,
      ...(w.resources.length%7===0?{growthThermalFactor:.5}:{})});
  };
  for(const z of [30,70,110,150])for(const x of [30,70,110,150,190]) {
    for(let dz=-6;dz<=6;dz++)for(let dx=-6;dx<=6;dx++) {
      if(Math.abs(dx)===6||Math.abs(dz)===6)add('wall',x+dx,z+dz);
      else roofs.push((z+dz)*w.width+x+dx);
    }
    for(const dx of [-11,-9,-7]) {
      const generator=add('wood-generator',x+dx,z-8);
      generator.power={on:true,parentId:null};generator.fuel={...newBuildingFuel('wood-generator'),ticks:10000};
      for(let dz=0;dz<2;dz++)for(let ax=0;ax<2;ax++)occupied.add((z-8+dz)*w.width+x+dx+ax);
    }
    let wire:Structure|undefined;
    for(const [dx,dz] of [[-6,-6],[-5,-6],[-5,-5]]) {
      wire=add('power-conduit',x+dx!,z+dz!);wire.power={on:false,parentId:null};
    }
    const lamp=add(horticultural?'sun-lamp':'standing-lamp',x,z);
    lamp.power={on:true,parentId:wire!.id};
    for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++)rice(x+dx,z+dz);
  }
  const indoor=w.resources.length;
  for(let z=8;z<243&&w.resources.length<indoor+8192;z+=2)for(let x=8;x<243&&w.resources.length<indoor+8192;x+=2)rice(x,z);
  assert.equal(w.resources.length,indoor+8192);
  w.roofing={constructed:roofs.sort((a,b)=>a-b),build:[],remove:[],cursor:0};
  adoptEnvironment(w);assert.ok(w.climate);
  refreshStock(w);return w;
}
function deepFreeze(value:unknown):void {
  if(value===null||typeof value!=='object'||Object.isFrozen(value)||ArrayBuffer.isView(value))return;
  for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);
}
const snapshot=(world:unknown)=>JSON.stringify(world);
function assertSameGrowth(actual:World,reference:World):void {
  assert.equal(actual.resources.length,reference.resources.length);
  for(let i=0;i<actual.resources.length;i++) {
    const a=actual.resources[i]!,b=reference.resources[i]!;
    assert.equal(a.id,b.id);assert.equal(a.growthLight,b.growthLight);assert.equal(a.growthTick,b.growthTick);
    assert.ok(Math.abs((a.growth??1)-(b.growth??1))<1e-10,`Growth mismatch on ${a.id}`);
  }
}
const scenes=[false,true].map(horticultural=>{
  const world=preparedWorld(horticultural),reference=structuredClone(world),cache=new LightEnvironmentCache();
  const environment=cache.read(world);
  exhaustiveReconcile(reference,environment);reconcilePlantLighting(world,environment);assertSameGrowth(world,reference);
  assert.deepEqual(validateWorld(world),[]);
  const start=world.tick;world.tick+=200;
  const roofs=new Set(world.roofing?.constructed??[]);
  // Representatives cover each light regime, thermal factor and spatial region.
  const selected=new Set<Resource>();
  for(const mode of [undefined,'dark','artificial-full'] as const)for(const factor of [undefined,.5]) {
    const candidate=world.resources.find(p=>p.growthLight===mode&&p.growthThermalFactor===factor);if(candidate)selected.add(candidate);
  }
  for(let i=0;selected.size<64&&i<world.resources.length;i+=127)selected.add(world.resources[i]!);
  const witnesses=[...selected];
  assert.equal(witnesses.length,64);
  for(const p of witnesses)assert.ok(Math.abs(plantGrowth(world,p)-oracleGrowth(world,p,roofs))<1e-10);
  const queryOracle=witnesses.reduce((sum,p)=>sum+oracleGrowth(world,p,roofs),0);
  world.tick=start;
  const stableLight=cache.read(world);reconcilePlantLighting(world,stableLight);
  const before=snapshot(world),rng=world.rng;deepFreeze(world);
  return {name:horticultural?'covered-soil-with-20-sun-lamps':'covered-soil-without-sun-lamp',horticultural,world,stableLight,roofs,witnessIds:witnesses.map(p=>p.id),queryOracle,before,rng,
    worldSha256:hash(before),captured:world.resources.filter(p=>p.growthLight!==undefined).length,
    full:world.resources.filter(p=>p.growthLight==='artificial-full').length};
});

const rounds=2,warmups=10,samples=20,callsPerSample=5;
const order=['reference','optimized','optimized','reference'] as const;
type Variant=typeof order[number];
interface Measurement {scene:string;scope:string;round:number;slot:number;variant:Variant;p50Ms:number;p95Ms:number;valuesMs:number[];observations:Record<string,number>}
const results:Measurement[]=[];
const percentile=(values:number[],p:number)=>values.slice().sort((a,b)=>a-b)[Math.ceil(values.length*p)-1]!;
function measure(scene:string,scope:string,round:number,slot:number,variant:Variant,
  prepare:()=>void,invoke:()=>unknown,check:(result:unknown)=>void,observations:()=>Record<string,number>):void {
  assert.deepEqual(sourceDigest(),sources,'Sources changed during measurement');
  for(let i=0;i<warmups;i++){prepare();check(invoke());}
  const valuesMs:number[]=[];
  for(let sample=0;sample<samples;sample++) {
    let elapsed=0;
    for(let call=0;call<callsPerSample;call++) {
      prepare();const start=performance.now(),result=invoke();elapsed+=performance.now()-start;check(result);
    }
    valuesMs.push(elapsed/callsPerSample);
  }
  results.push({scene,scope,round,slot,variant,p50Ms:percentile(valuesMs,.5),p95Ms:percentile(valuesMs,.95),valuesMs,observations:observations()});
}
for(const scene of scenes)for(let round=0;round<rounds;round++)for(const [slot,variant] of order.entries()) {
  // Pure growth queries: oracle summation versus shipped O(1) projections.
  const query=structuredClone(scene.world);query.tick+=200;
  const witnesses=scene.witnessIds.map(id=>query.resources.find(p=>p.id===id)!);
  deepFreeze(query);const queryBefore=snapshot(query);
  measure(scene.name,'growth-query-64-witnesses',round,slot,variant,()=>{},
    ()=>witnesses.reduce((sum,p)=>sum+(variant==='optimized'?plantGrowth(query,p):oracleGrowth(query,p,scene.roofs)),0),
    result=>assert.ok(Math.abs(Number(result)-scene.queryOracle)<1e-9),()=>({queriesPerCall:witnesses.length}));
  assert.equal(snapshot(query),queryBefore);assert.equal(query.rng,scene.rng);

  let reads=0;
  const reader=()=>{reads++;return scene.stableLight;};
  measure(scene.name,'plant-reconciliation-stable',round,slot,variant,()=>{},
    ()=>variant==='optimized'?reconcilePlantLighting(scene.world,reader):exhaustiveReconcile(scene.world,scene.stableLight),()=>{},()=>({lightObservations:reads}));
  assert.equal(reads,variant==='optimized'&&scene.horticultural?warmups+samples*callsPerSample:0);
  assert.equal(snapshot(scene.world),scene.before);assert.equal(scene.world.rng,scene.rng);

  // Diffusion only: topology is already captured. A explicitly reconstructs
  // the shipped algorithm each call; B retains its cache. Neither is an old engine.
  const topology=new RoomTopologyCache().read(scene.world),definitions=lightSources(scene.world);
  assert.ok(definitions.length>0);
  const toggled=definitions.filter(s=>s.cell!==definitions.at(-1)!.cell);
  const inputs:readonly LightSource[][]=[definitions,toggled];
  const expected=inputs.map(s=>new LocalLightCache().read(scene.world,topology,s));
  for(const cold of [false,true]) {
    const cache=new LocalLightCache();let phase=0,selected=0,calls=0;
    cache.read(scene.world,topology,inputs[0]!);const initial=cache.rebuilds;
    measure(scene.name,cold?'light-diffusion-changing-source':'light-diffusion-stable',round,slot,variant,
      ()=>{selected=cold?(++phase%2):0;},
      ()=>{calls++;return (variant==='optimized'?cache:new LocalLightCache()).read(scene.world,topology,inputs[selected]!);},
      result=>assert.deepEqual(result,expected[selected]),()=>({calls,rebuilds:variant==='optimized'?cache.rebuilds-initial:calls}));
    if(variant==='optimized')assert.equal(cache.rebuilds-initial,cold?calls:0);
    assert.equal(snapshot(scene.world),scene.before);assert.equal(scene.world.rng,scene.rng);
  }

  if(scene.horticultural) {
    const world=structuredClone(scene.world),reference=structuredClone(scene.world),environment=new LightEnvironmentCache();
    const lamps=world.structures.filter(s=>s.kind==='sun-lamp'),referenceLamps=reference.structures.filter(s=>s.kind==='sun-lamp');
    const stableShape=(w:World)=>snapshot({...w,tick:1600,resources:w.resources.map(({growth,growthTick,growthLight,...p})=>p),
      structures:w.structures.map(s=>s.kind==='sun-lamp'?{...s,power:{...s.power,on:true}}:s)});
    const unrelated=stableShape(world),rng=world.rng;let light:LightEnvironment,changed=0;
    reconcilePlantLighting(world,environment.read(world));
    measure(scene.name,'plant-reconciliation-light-transition',round,slot,variant,
      ()=>{
        world.tick++;reference.tick=world.tick;const on=world.tick%2===0;
        for(const lamp of lamps)lamp.power!.on=on;for(const lamp of referenceLamps)lamp.power!.on=on;
        light=environment.read(world);
      },
      ()=>variant==='optimized'?reconcilePlantLighting(world,light):exhaustiveReconcile(world,light),
      ()=>{
        exhaustiveReconcile(reference,light);assertSameGrowth(world,reference);changed++;
        assert.equal(world.rng,rng);assert.equal(reference.rng,rng);
      },()=>({transitions:changed,lightRebuilds:environment.localLight.rebuilds}));
    assert.equal(environment.localLight.rebuilds,changed+1,'Each supply transition must rebuild the derived field exactly once');
    assert.equal(stableShape(world),unrelated,'Transition changed unrelated state');
  }
}
assert.deepEqual(sourceDigest(),sources,'Sources changed during measurement');
const report={date:new Date().toISOString(),node:process.version,execArgv:process.execArgv,
  hardware:{cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem(),platform:os.platform(),release:os.release(),arch:os.arch()},
  prepared:true,map:[250,250],seed:189,rounds,order,warmups,samples,callsPerSample,units:'milliseconds/call',sources,
  scenes:scenes.map(s=>({name:s.name,plants:s.world.resources.length,structures:s.world.structures.length,roofCells:s.roofs.size,
    captured:s.captured,full:s.full,civilOrigin:s.world.climate,worldSha256:s.worldSha256,rng:s.rng})),
  correctness:'Independent tick-summed rice growth, direct celestial formula, saved thermal factors and captured intervals. Stable World/RNG unchanged; intentional source transitions change only clocks, lamp supply and growth checkpoints. Cache rebuild cadence checked.',
  timing:'Preparation, source alternation, light reads for plant reconciliation, correctness checks and World hashing are outside timed calls. Diffusion includes key/obstacle checks, allocation and flood, but excludes topology reconstruction.',
  references:'Explicit exhaustive current-contract reconciliation and fresh LocalLightCache reconstruction, not a historical engine. Query reference is independent elapsed-tick summation.',
  limits:'Prepared annual-climate rice distributions, not natural colony load. No full tick, worker, snapshots, renderer CPU, RAF, GPU, frame rate or general cost claim. Run successively with heavy campaigns and native browser closed.',results};
mkdirSync(join(root,'tmp'),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify({path:output,results:results.map(({valuesMs,...summary})=>summary)}));
