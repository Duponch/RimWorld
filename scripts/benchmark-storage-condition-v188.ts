/** Prepared CPU sub-benchmark; run alone after sources are frozen:
 * node --experimental-strip-types scripts/benchmark-storage-condition-v188.ts
 * Writes tmp/storage-condition-benchmark-v188.json. No ticks are advanced. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,readdirSync,writeFileSync } from 'node:fs';
import os from 'node:os';
import { join,relative,resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { createWorld } from '../src/sim/engine.ts';
import { newApparelState } from '../src/sim/apparel-rules.ts';
import { newWeaponState } from '../src/sim/equipment-rules.ts';
import { ITEM_DEFINITIONS,type ItemId } from '../src/sim/items.ts';
import { mayImproveStorage } from '../src/sim/idle-logistics.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { freshRot } from '../src/sim/food-preservation.ts';
import { storageAccepts } from '../src/sim/storage-filters.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import type { MaterialPile,StockpileCell,World } from '../src/sim/types.ts';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const script=join(root,'scripts','benchmark-storage-condition-v188.ts');
const output=join(root,'tmp','storage-condition-benchmark-v188.json');
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
const fixtureItems=['cloth-shirt','revolver','wood','cloth','herbal-medicine'] as const;
const qualities=['awful','poor','normal','good','excellent','masterwork','legendary'] as const;
// Deliberately explicit fixture maxima: the oracle does not import condition,
// damage, storage or cache helpers. Expand this table when expanding fixtures.
const fixtureMaxHp:Partial<Record<ItemId,number>>={'cloth-shirt':100,revolver:100,wood:150,cloth:80,'herbal-medicine':60};
function independentAdmission(zone:StockpileCell,pile:MaterialPile,conditions=true):boolean {
  if(zone.filters[pile.kind]!==true||zone.items!==undefined&&zone.items[pile.item]!==true)return false;
  if(!conditions)return true;
  const quality=pile.apparel?.quality??pile.weapon?.quality;
  if(zone.quality&&quality!==undefined) {
    const rank=qualities.indexOf(quality);
    if(rank<qualities.indexOf(zone.quality.min)||rank>qualities.indexOf(zone.quality.max))return false;
  }
  if(zone.hitPoints) {
    const max=fixtureMaxHp[pile.item];assert.ok(max,`Unspecified oracle HP: ${pile.item}`);
    const hp=pile.apparel?.hitPoints??pile.weapon?.hitPoints??max-(pile.damage??0);
    const scaled=Math.fround(Math.fround(hp/max)*100),lo=Math.floor(scaled),hi=Math.ceil(scaled);
    const nearest=scaled-lo<hi-scaled?lo:scaled-lo>hi-scaled?hi:lo%2===0?lo:hi;
    const rounded=Math.max(0,Math.min(100,nearest))/100;
    if(rounded<zone.hitPoints.min/100-1e-5||rounded>zone.hitPoints.max/100+1e-5)return false;
  }
  return true;
}
function eligible(pile:MaterialPile):boolean {
  return pile.owner.type==='ground'&&!pile.apparel?.forbidden&&!pile.weapon?.forbidden
    &&(pile.kind!=='chunk'||pile.haulRequested===true);
}
/** Exhaustive static oracle. Deliberately no cache, spatial map or early return:
 * every source/destination pair is examined. This is the pre-navigation gate,
 * not the final reservation, path, pickup or delivery decision. */
function exhaustiveOracle(world:World,conditions=true):boolean {
  assert.equal(world.structures.some(s=>s.prisoner),false);
  let improves=false;
  for(const pile of world.piles)if(eligible(pile)&&pile.owner.type==='ground') {
    const owner=pile.owner;
    const source=world.stockpiles.find(z=>z.x===owner.x&&z.z===owner.z);
    const current=source&&independentAdmission(source,pile,conditions)&&pile.quantity<=source.capacity?source.priority:0;
    for(const destination of world.stockpiles) {
      const existing=world.piles.find(p=>p.owner.type==='ground'&&p.owner.x===destination.x&&p.owner.z===destination.z);
      const capacity=Math.min(destination.capacity,ITEM_DEFINITIONS[pile.item].stackLimit);
      if(destination.priority>current&&independentAdmission(destination,pile,conditions)
        &&(!existing||existing.item===pile.item)&&capacity>(existing?.quantity??0))improves=true;
    }
  }
  return improves;
}
/** Bounded comparator: shared geometry/category candidates, but admission is
 * re-evaluated for every pile. Same shipped API; no state-equivalence cache. */
function uncachedStateReference(world:World):boolean {
  const key=(x:number,z:number)=>z*world.width+x;
  const zones=new Map(world.stockpiles.map(z=>[key(z.x,z.z),z]));
  const ground=new Map(world.piles.flatMap(p=>p.owner.type==='ground'?[[key(p.owner.x,p.owner.z),p] as const]:[]));
  const candidates=new Map<ItemId,StockpileCell[]>();
  for(const zone of world.stockpiles)for(const item of Object.keys(ITEM_DEFINITIONS) as ItemId[]) {
    const existing=ground.get(key(zone.x,zone.z));
    if(storageAccepts(zone,item)&&(!existing||existing.item===item)
      &&Math.min(zone.capacity,ITEM_DEFINITIONS[item].stackLimit)>(existing?.quantity??0)) {
      const list=candidates.get(item)??[];list.push(zone);candidates.set(item,list);
    }
  }
  for(const pile of ground.values())if(eligible(pile)&&pile.owner.type==='ground') {
    const source=zones.get(key(pile.owner.x,pile.owner.z));
    const current=source&&storageAccepts(source,pile)&&pile.quantity<=source.capacity?source.priority:0;
    for(const destination of candidates.get(pile.item)??[])
      if(destination.priority>current&&storageAccepts(destination,pile))return true;
  }
  return false;
}
/** Reconstructed historical category/item-only gate, used exclusively on an
 * absent-range scene. It is not a saved historical engine or a full tick. */
function historicalWithoutConditions(world:World):boolean {
  assert.ok(world.stockpiles.every(z=>z.quality===undefined&&z.hitPoints===undefined));
  const key=(x:number,z:number)=>z*world.width+x;
  const zones=new Map(world.stockpiles.map(z=>[key(z.x,z.z),z]));
  const ground=new Map(world.piles.flatMap(p=>p.owner.type==='ground'?[[key(p.owner.x,p.owner.z),p] as const]:[]));
  const best=new Map<ItemId,number>();
  for(const zone of world.stockpiles)for(const item of Object.keys(ITEM_DEFINITIONS) as ItemId[]) {
    const existing=ground.get(key(zone.x,zone.z));
    if(zone.filters[ITEM_DEFINITIONS[item].kind]===true&&(zone.items===undefined||zone.items[item]===true)
      &&(!existing||existing.item===item)&&Math.min(zone.capacity,ITEM_DEFINITIONS[item].stackLimit)>(existing?.quantity??0))
      best.set(item,Math.max(best.get(item)??0,zone.priority));
  }
  for(const pile of ground.values())if(eligible(pile)&&pile.owner.type==='ground') {
    const source=zones.get(key(pile.owner.x,pile.owner.z));
    const current=source&&source.filters[pile.kind]===true&&(source.items===undefined||source.items[pile.item]===true)
      &&pile.quantity<=source.capacity?source.priority:0;
    if((best.get(pile.item)??0)>current)return true;
  }
  return false;
}
function preparedWorld():World {
  const world=createWorld(188,250,250);
  world.resources=[];world.piles=[];world.structures=[];world.jobs=[];world.stockpiles=[];world.packed=[];world.growingZones=[];
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  for(let i=0;i<128;i++)world.stockpiles.push({id:world.nextId++,x:150+i%16,z:150+Math.floor(i/16),priority:4,capacity:75,
    filters:{apparel:true,weapon:true,wood:true,food:false,textile:true,medicine:true},
    items:Object.fromEntries(fixtureItems.map(item=>[item,true])),quality:{min:'good',max:'legendary'},hitPoints:{min:70,max:100}});
  for(let i=0;i<1024;i++) {
    const item=fixtureItems[i%fixtureItems.length]!,hpPercent=[20,35,50,60,80][Math.floor(i/5)%5]!,max=fixtureMaxHp[item]!;
    const hp=Math.max(1,Math.floor(max*hpPercent/100));
    const pile:MaterialPile={id:world.nextId++,item,kind:ITEM_DEFINITIONS[item].kind,quantity:item==='cloth-shirt'||item==='revolver'?1:25,
      owner:{type:'ground',x:20+i%64,z:20+Math.floor(i/64)},...freshRot(item,world.tick)};
    if(item==='cloth-shirt')pile.apparel={...newApparelState(item),quality:hpPercent>=70?'normal':qualities[i%qualities.length]!,hitPoints:hp};
    else if(item==='revolver')pile.weapon={...newWeaponState(item),quality:hpPercent>=70?'normal':qualities[i%qualities.length]!,hitPoints:hp};
    else pile.damage=max-Math.min(hp,Math.floor(max*.6));
    world.piles.push(pile);
  }
  refreshStock(world);return world;
}
function verify(world:World,expected:boolean):void {
  assert.deepEqual(validateWorld(world),[]);
  assert.equal(exhaustiveOracle(world),expected);
  assert.equal(uncachedStateReference(world),expected);
  assert.equal(mayImproveStorage(world),expected);
}
const rejected=preparedWorld();verify(rejected,false);
// Same ItemId, different state: first refuse every ordinary instance, then
// admit the last instance. A cache keyed only by item must fail this check.
const late=structuredClone(rejected),last=late.piles[late.piles.length-1]!;
last.item='cloth-shirt';last.kind='apparel';last.quantity=1;delete last.damage;
last.apparel={...newApparelState('cloth-shirt'),quality:'masterwork',hitPoints:80};refreshStock(late);verify(late,true);
// Refused source priority becomes zero, permitting a lower-priority destination.
const lower=structuredClone(late),lowerPile=structuredClone(last);lower.piles=[lowerPile];
lower.stockpiles=lower.stockpiles.slice(0,2);const source=lower.stockpiles[0]!,destination=lower.stockpiles[1]!;
source.quality={min:'legendary',max:'legendary'};destination.priority=1;lowerPile.owner={type:'ground',x:source.x,z:source.z};
refreshStock(lower);verify(lower,true);
// Occupied/full cells and whitelist refusals must not create candidates.
const full=structuredClone(lower);full.stockpiles=[structuredClone(destination)];const stored=structuredClone(lowerPile);
stored.id=full.nextId++;stored.owner={type:'ground',x:destination.x,z:destination.z};full.piles.push(stored);refreshStock(full);verify(full,false);
const whitelist=structuredClone(lower);whitelist.stockpiles[1]!.items={'wood':true};verify(whitelist,false);
const legacy=structuredClone(rejected);for(const zone of legacy.stockpiles){delete zone.quality;delete zone.hitPoints;}
verify(legacy,true);assert.equal(historicalWithoutConditions(legacy),exhaustiveOracle(legacy,false));

function deepFreeze(value:unknown):void {
  if(value===null||typeof value!=='object'||Object.isFrozen(value)||ArrayBuffer.isView(value))return;
  for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);
}
const scenes=[{name:'active-ranges-all-rejected',world:rejected,expected:false,reference:uncachedStateReference},
  {name:'active-ranges-last-instance-admitted',world:late,expected:true,reference:uncachedStateReference},
  {name:'legacy-absent-ranges',world:legacy,expected:true,reference:historicalWithoutConditions}];
const rounds=2,warmups=10,samples=20,callsPerSample=5;
const order=['reference','optimized','optimized','reference'] as const;
const percentile=(values:number[],p:number)=>values.slice().sort((a,b)=>a-b)[Math.ceil(values.length*p)-1]!;
const results:Array<{scene:string;round:number;slot:number;variant:string;p50Ms:number;p95Ms:number;valuesMs:number[]}>=[];
const frozenScenes=scenes.map(scene=>{
  deepFreeze(scene.world);const before=JSON.stringify(scene.world),rng=scene.world.rng;
  return {...scene,before,rng,worldSha256:hash(before),rngSha256:hash(JSON.stringify(rng))};
});
for(const scene of frozenScenes)for(let round=0;round<rounds;round++)for(const [slot,variant] of order.entries()) {
  assert.deepEqual(sourceDigest(),sources,'Sources changed during measurement');
  const fn=variant==='optimized'?mayImproveStorage:scene.reference;
  for(let i=0;i<warmups;i++)assert.equal(fn(scene.world),scene.expected);
  const valuesMs:number[]=[];
  for(let i=0;i<samples;i++) {
    const start=performance.now();let result=false;
    for(let call=0;call<callsPerSample;call++)result=fn(scene.world);
    valuesMs.push((performance.now()-start)/callsPerSample);assert.equal(result,scene.expected);
  }
  assert.equal(JSON.stringify(scene.world),scene.before,'World changed');assert.deepEqual(scene.world.rng,scene.rng,'PRNG changed');
  results.push({scene:scene.name,round,slot,variant,p50Ms:percentile(valuesMs,.5),p95Ms:percentile(valuesMs,.95),valuesMs});
}
assert.deepEqual(sourceDigest(),sources);
const report={date:new Date().toISOString(),node:process.version,execArgv:process.execArgv,
  hardware:{cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem(),platform:os.platform(),release:os.release(),arch:os.arch()},
  prepared:true,map:[250,250],seed:188,rounds,order,warmups,samples,callsPerSample,units:'milliseconds/call',sources,
  scenes:frozenScenes.map(s=>({name:s.name,piles:s.world.piles.length,stockpiles:s.world.stockpiles.length,
    expected:s.expected,worldSha256:s.worldSha256,rngSha256:s.rngSha256})),
  correctness:'Independent exhaustive static oracle; mixed states, lower-priority exit from refused source, full occupancy and item whitelist. World/PRNG unchanged.',
  scope:'mayImproveStorage conservative pre-navigation gate only. Conditional comparator shares shipped admission but omits state cache; absent-range comparator reconstructs historical coarse gate.',
  limits:'Prepared distributions, not natural colony load. No full tick, worker, snapshot, renderer CPU, RAF, GPU, frame rate or general cost claim. Run successively with heavy campaigns and browser closed.',results};
mkdirSync(join(root,'tmp'),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify({path:output,results:results.map(({valuesMs,...summary})=>summary)}));
