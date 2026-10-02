/** V181 CPU comparison. Freeze 761a634 at tmp/bereavement-v181-baseline/src first.
 * Run only after sources are stable: node --experimental-strip-types scripts/bereavement-bench-v181.ts
 * Output: tmp/bereavement-bench-v181.json. No renderer, worker or browser. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { World } from '../src/sim/types.ts';

type Variant='baseline'|'current';
type Runtime={
  createScenarioWorld:(seed:number,size:number,id:'crashlanded',options:{biome:'boreal-forest';hilliness:'small-hills'})=>World;
  stepWorld:(world:World)=>void;serializeWorld:(world:World)=>string;validateWorld:(world:World)=>string[];
  startingPawn:(id:number,name:string,x:number,z:number,index:number,recreation:number,seed:number)=>World['pawns'][number];
  blockedCells:(world:World)=>Uint8Array;
  SnapshotEncoder:new()=>{encode:(world:World,stepMs:number,speed:number)=>unknown};
  SnapshotDecoder:new()=>{adopt:(packet:unknown)=>{status:string}};
};
type Sample={round:number;slot:number;variant:Variant;milliseconds:number};
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const source={baseline:join(root,'tmp','bereavement-v181-baseline','src'),current:join(root,'src')};
const output=join(root,'tmp','bereavement-bench-v181.json');
const order:readonly Variant[]=['baseline','current','current','baseline'];
const rounds=4,warmups=2,steps=60,size=250,seed=42,bridgePawns=100;

function digest(directory:string):{sha256:string;files:number}{
  const paths:string[]=[];
  const visit=(dir:string):void=>{for(const entry of readdirSync(dir,{withFileTypes:true})){
    const path=join(dir,entry.name);if(entry.isDirectory())visit(path);else if(entry.isFile())paths.push(path);
  }};
  visit(directory);paths.sort((a,b)=>relative(directory,a).localeCompare(relative(directory,b)));
  const hash=createHash('sha256');for(const path of paths){const data=readFileSync(path),name=relative(directory,path).replaceAll('\\','/');
    hash.update(`${name.length}:${name}:${data.length}:`);hash.update(data);}
  return {sha256:hash.digest('hex'),files:paths.length};
}
async function runtime(directory:string):Promise<Runtime>{
  const load=(sub:string,name:string)=>import(pathToFileURL(join(directory,sub,name+'.ts')).href);
  const [game,engine,save,pawns,pathfinding,bridge]=await Promise.all([
    load('sim','new-game'),load('sim','engine'),load('sim','serialization'),
    load('sim','starting-pawns'),load('sim','pathfinding'),load('bridge','snapshots'),
  ]);
  return {createScenarioWorld:game.createScenarioWorld,stepWorld:engine.stepWorld,
    serializeWorld:save.serializeWorld,validateWorld:save.validateWorld,
    startingPawn:pawns.startingPawn,blockedCells:pathfinding.blockedCells,
    SnapshotEncoder:bridge.SnapshotEncoder,SnapshotDecoder:bridge.SnapshotDecoder};
}
function makeWorld(api:Runtime,variant:Variant):World{
  const world=api.createScenarioWorld(seed,size,'crashlanded',{biome:'boreal-forest',hilliness:'small-hills'});

  if(world.pawns.length!==3||world.wildlife?.animals.length!==8||world.jobs.length)
    throw new Error(`${variant}: expected three pawns, eight naturally generated animals and no active jobs.`);
  const errors=api.validateWorld(world);if(errors.length)throw new Error(`${variant} source invalid: ${errors.join(' ')}`);
  return world;
}
function normalized(api:Runtime,world:World):string{
  const data=JSON.parse(api.serializeWorld(world));data.schemaVersion=169;return JSON.stringify(data);
}
function assertEqual(a:string,b:string,label:string):void{if(a!==b)throw new Error(`${label}: World/PRNG differs beyond schemaVersion only.`);}
function summary(samples:Sample[]):{n:number;meanMs:number;p50Ms:number;p95Ms:number;minMs:number;maxMs:number}{
  const values=samples.map(x=>x.milliseconds).sort((a,b)=>a-b),n=values.length;
  return {n,meanMs:values.reduce((a,b)=>a+b,0)/n,p50Ms:(values[(n-1)>>1]!+values[n>>1]!)/2,
    p95Ms:values[Math.ceil(.95*n)-1]!,minMs:values[0]!,maxMs:values[n-1]!};
}
function timedTick(api:Runtime,sourceWorld:World):{milliseconds:number;world:World}{
  const world=structuredClone(sourceWorld),start=performance.now();
  for(let i=0;i<steps;i++)api.stepWorld(world);
  return {milliseconds:performance.now()-start,world};
}
function bridgeWorld(api:Runtime,sourceWorld:World):World{
  const world=structuredClone(sourceWorld),blocked=api.blockedCells(world);
  const occupied=new Set([...world.pawns,...world.resources].map(v=>v.z*world.width+v.x));
  for(const pile of world.piles)if(pile.owner.type==='ground')occupied.add(pile.owner.z*world.width+pile.owner.x);
  for(let cell=0;cell<blocked.length&&world.pawns.length<bridgePawns;cell++){
    if(blocked[cell]||occupied.has(cell))continue;
    const x=cell%world.width,z=Math.floor(cell/world.width),id=world.nextId++;
    // startingPawn's scenario index is a 0..2 profile selector; larger values
    // subtract unbounded hunger/rest and do not represent a valid new person.
    const pawn=api.startingPawn(id,`Mesure ${id}`,x,z,world.pawns.length%3,55,seed);
    world.pawns.push(pawn);occupied.add(cell);
  }
  if(world.pawns.length!==bridgePawns)throw new Error('No room for 100 prepared pawns.');
  const errors=api.validateWorld(world);if(errors.length)throw new Error(`Prepared bridge world invalid: ${errors.join(' ')}`);
  return world;
}
function bridgePackets(api:Runtime,world:World):{checkpoint:unknown;deltas:unknown[]}{
  const encoder=new api.SnapshotEncoder(),checkpoint=structuredClone(encoder.encode(world,0,1));
  const deltas=Array.from({length:steps},()=>structuredClone(encoder.encode(world,0,1)));
  return {checkpoint,deltas};
}
function normalizedPacket(packet:unknown):string{
  const value=JSON.parse(JSON.stringify(packet));value.world.schemaVersion=169;return JSON.stringify(value);
}
function timedAdoption(api:Runtime,packets:{checkpoint:unknown;deltas:unknown[]}):number{
  const decoder=new api.SnapshotDecoder();
  if(decoder.adopt(packets.checkpoint).status!=='applied')throw new Error('Bridge checkpoint refused.');
  const start=performance.now();
  for(const packet of packets.deltas)if(decoder.adopt(packet).status!=='applied')throw new Error('Bridge delta refused.');
  return performance.now()-start;
}
async function main():Promise<void>{
  if(!existsSync(join(source.baseline,'sim','engine.ts')))throw new Error('Missing frozen 761a634 source archive.');
  const cache=join(root,'tmp','host-cache');mkdirSync(join(cache,'temp'),{recursive:true});
  process.env.TEMP=join(cache,'temp');process.env.TMP=process.env.TEMP;process.env.NPM_CONFIG_CACHE=join(cache,'npm-cache');
  const before={baseline:digest(source.baseline),current:digest(source.current)};
  const api={baseline:await runtime(source.baseline),current:await runtime(source.current)};
  const world={baseline:makeWorld(api.baseline,'baseline'),current:makeWorld(api.current,'current')};
  assertEqual(normalized(api.baseline,world.baseline),normalized(api.current,world.current),'Initial boreal scene');
  const prepared={baseline:bridgeWorld(api.baseline,world.baseline),current:bridgeWorld(api.current,world.current)};
  assertEqual(normalized(api.baseline,prepared.baseline),normalized(api.current,prepared.current),'100-pawn bridge scene');
  const packets={baseline:bridgePackets(api.baseline,prepared.baseline),current:bridgePackets(api.current,prepared.current)};
  assertEqual(normalizedPacket(packets.baseline.checkpoint),normalizedPacket(packets.current.checkpoint),'Bridge checkpoint');
  assertEqual(normalizedPacket(packets.baseline.deltas[0]),normalizedPacket(packets.current.deltas[0]),'Bridge delta');
  const tick:Sample[]=[],adoption:Sample[]=[],final=new Map<Variant,string>();
  for(let i=0;i<warmups;i++)for(const variant of ['baseline','current'] as const){
    timedTick(api[variant],world[variant]);timedAdoption(api[variant],packets[variant]);
  }
  for(let round=1;round<=rounds;round++)for(const [index,variant] of order.entries()){
    const sample=timedTick(api[variant],world[variant]),serialized=normalized(api[variant],sample.world);
    if(final.has(variant))assertEqual(final.get(variant)!,serialized,`${variant} repeated continuation`);
    final.set(variant,serialized);tick.push({round,slot:index+1,variant,milliseconds:sample.milliseconds});
    adoption.push({round,slot:index+1,variant,milliseconds:timedAdoption(api[variant],packets[variant])});
  }
  assertEqual(final.get('baseline')!,final.get('current')!,'60-tick boreal continuation');
  const after={baseline:digest(source.baseline),current:digest(source.current)};
  if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Source tree changed during measurement.');
  const result={at:new Date().toISOString(),node:process.version,platform:process.platform,cpu:{model:cpus()[0]?.model??'unknown',logicalCores:cpus().length},source:{paths:source,before,after},
    protocol:{sequence:'A/B/B/A',rounds,warmups,seed,map:`${size}x${size}`,biome:'boreal-forest',colonists:3,animals:8,
      tickSteps:steps,bridgePawns,bridgeDeltas:steps,oracle:'Exact serialized World and all existing PRNG states; schemaVersion normalized to 169 only; all existing state retained.',
      limitation:'Three natural colonists and eight animals, before the first Misc opportunity. Sixty same-tick delta adoptions with 100 prepared pawns. CPU Node batches only; no event effects, worker, browser, renderer, GPU or general tick/FPS claim.'},
    tick:{baseline:summary(tick.filter(s=>s.variant==='baseline')),current:summary(tick.filter(s=>s.variant==='current')),samples:tick},
    snapshotAdoption:{baseline:summary(adoption.filter(s=>s.variant==='baseline')),current:summary(adoption.filter(s=>s.variant==='current')),samples:adoption}};
  mkdirSync(join(root,'tmp'),{recursive:true});writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({output,source:before,tick:result.tick,snapshotAdoption:result.snapshotAdoption},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
