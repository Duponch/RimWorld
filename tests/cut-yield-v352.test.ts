/** V352 CUT yield regression oracles.
 * Oracles below never call harvestRoll/berryYield/plantHarvestYield to calculate
 * expectations. They model the bounded current common contract, not all Core stats.
 */
import {expect,test} from 'vitest';
import {treeTransferScene} from './scenarios/tree-transfer-v349';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {gatherResource} from '../src/sim/gathering';
import {plantCanYieldNow} from '../src/sim/plants';
import {refreshStock} from '../src/sim/materials';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import type {PlantSpecies} from '../src/sim/biome-flora';
import type {Resource,World} from '../src/sim/types';

function independentDraws(seed:number,count:number){
 let state=BigInt(seed>>>0);const mask=0xffffffffn,values:number[]=[];
 for(let n=0;n<count;n++){
  state=(state^((state<<13n)&mask))&mask;state=(state^(state>>17n))&mask;state=(state^((state<<5n)&mask))&mask;
  values.push(Number(state)/4294967296);
 }
 return {values,rng:Number(state)};
}
function independentYield(seed:number,raw:number,efficiency:number,tree:boolean){
 const draws=independentDraws(seed,3);let cursor=0;
 if(!tree&&draws.values[cursor++]!>efficiency)return {quantity:0,rng:independentDraws(seed,cursor).rng};
 let quantity=Math.floor(raw)+(draws.values[cursor++]!<raw%1?1:0);
 if(efficiency>1){const surplus=quantity*efficiency;quantity=Math.floor(surplus)+(draws.values[cursor++]!<surplus%1?1:0);}
 return {quantity,rng:independentDraws(seed,cursor).rng};
}
function exact(w:World){
 expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
 const raw=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1,true)));
 expect(raw.status).toBe('applied');if(raw.status==='applied')expect(raw.world).toEqual(w);
}
function scene(species:PlantSpecies|null='berry-bush',kind?:Resource['kind'],amount?:number,level=8){
 const w=treeTransferScene(species,1),p=w.pawns[0]!,r=w.resources[0]!;delete r.damage;
 if(kind)r.kind=kind;if(amount!==undefined)r.amount=amount;
 if(!r.species&&r.kind!=='tree'){r.growth=1;r.growthTick=w.tick;}
 p.skills.plants={level,xp:0,dailyXp:0,passion:0};p.priorities.gather=1;w.rng=42;refreshStock(w);exact(w);return {w,p,r};
}
const PRODUCTIVE=[
 {species:'berry-bush' as const,item:'berries',raw:10},
 {species:'agave' as const,item:'agave-fruit',raw:10},
 {species:'healroot-wild' as const,item:'herbal-medicine',raw:1},
 {species:'oak' as const,item:'wood',raw:46},
];

test.each(PRODUCTIVE)('V352 mature typed CUT $species resolves its common human yield then destroys the original',row=>{
 const {w,p,r}=scene(row.species),id=r.id,seed=w.rng,nextId=w.nextId,expected=independentYield(seed,row.raw,1,r.kind==='tree');
 expect(plantCanYieldNow(w,r)).toBe(true);expect(gatherResource(w,r,'cut',undefined,p)).toBe(expected.quantity);
 expect(w.rng).toBe(expected.rng);expect(w.resources.some(x=>x.id===id)).toBe(false);
 expect(w.piles.map(x=>[x.item,x.quantity])).toEqual([[row.item,expected.quantity]]);expect(w.nextId).toBe(nextId+1);exact(w);
});

test.each([
 {kind:'haygrass' as const,item:'hay',raw:18},{kind:'healroot' as const,item:'herbal-medicine',raw:1},
 {kind:'tree' as const,item:'wood',raw:1},
])('V352 CUT current $kind retains declared legacy identity and selects its actual product',row=>{
 const {w,p,r}=scene(null,row.kind,row.raw),id=r.id,expected=independentYield(42,row.raw,1,row.kind==='tree');
 expect(Object.hasOwn(r,'species')).toBe(false);expect(gatherResource(w,r,'cut',undefined,p)).toBe(expected.quantity);
 expect(w.piles.map(x=>[x.item,x.quantity])).toEqual([[row.item,expected.quantity]]);expect(w.rng).toBe(expected.rng);
 expect(w.resources.some(x=>x.id===id)).toBe(false);expect(Object.hasOwn(r,'species')).toBe(false);exact(w);
});

test.each([{seed:9728,level:0,efficiency:.6,quantity:0,draws:1},{seed:1,level:0,efficiency:.6,quantity:1,draws:2},{seed:11,level:20,efficiency:1.13,quantity:2,draws:3}])('V352 human CUT preserves existing failure/base/surplus draw order seed=$seed',row=>{
 const {w,p,r}=scene('healroot-wild',undefined,undefined,row.level);w.rng=row.seed;
 const expected=independentYield(row.seed,1,row.efficiency,false);expect(expected.quantity).toBe(row.quantity);expect(expected.rng).toBe(independentDraws(row.seed,row.draws).rng);
 expect(gatherResource(w,r,'cut',undefined,p)).toBe(row.quantity);expect(w.rng).toBe(expected.rng);
 expect(w.piles.reduce((n,x)=>n+x.quantity,0)).toBe(row.quantity);expect(w.resources).toEqual([]);exact(w);
});

test('V352 productive CUT reuses the existing medicinal HP basis, rather than silently adding global Core HP rules',()=>{
 const {w,p,r}=scene('healroot-wild');r.damage=30;w.rng=1;const expected=independentYield(1,.75,1,false);
 expect(expected.quantity).toBe(1);expect(plantCanYieldNow(w,r)).toBe(true);
 expect(gatherResource(w,r,'cut',undefined,p)).toBe(expected.quantity);expect(w.rng).toBe(expected.rng);exact(w);
});

test.each(['immature','blighted','sterile'] as const)('V352 nonyieldable CUT %s remains zero with no productive draw',mode=>{
 const {w,p,r}=scene(mode==='sterile'?'grass':mode==='blighted'?null:'berry-bush',mode==='blighted'?'rice':undefined,mode==='blighted'?6:undefined);
 if(mode==='immature'){r.growth=.65;r.growthTick=w.tick;}
 if(mode==='blighted')r.blight={since:w.tick,severity:.2,lastHarmTick:w.tick,nextCheck:w.tick+(r.id-w.tick%200+200)%200+1,rng:123};
 exact(w);
 const rng=w.rng,nextId=w.nextId;expect(plantCanYieldNow(w,r)).toBe(false);
 // Mature damaged medicine and failure are separate tests; no universal Core
 // failure-RNG parity for immature plants is claimed by this bounded change.
 expect(gatherResource(w,r,'cut',undefined,p)).toBe(0);expect(w.piles).toEqual([]);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
 expect(w.resources.includes(r)).toBe(false);
 exact(w);
});

test('V352 saturated typed CUT output refuses before source, RNG, IDs, stocks or existing materials mutate',()=>{
 const {w,p,r}=scene();for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:75,owner:{type:'ground',x,z}});
 refreshStock(w);exact(w);const before=structuredClone(w);expect(gatherResource(w,r,'cut',undefined,p)).toBeNull();expect(w).toEqual(before);exact(w);
});

test('V352 schema234 typed CUT stays literal and neutral migration does not create retrospective products or draws',()=>{
 const {w}=scene(),legacy=structuredClone(w);Object.assign(legacy,{schemaVersion:234});
 const migrated=deserializeWorld(JSON.stringify(legacy));expect(migrated.schemaVersion).toBe(235);expect(migrated.rng).toBe(legacy.rng);expect(migrated.piles).toEqual([]);
 const rng=legacy.rng,nextId=legacy.nextId;expect(gatherResource(legacy,legacy.resources[0]!,'cut',undefined,legacy.pawns[0])).toBe(0);
 expect(legacy.piles).toEqual([]);expect(legacy.rng).toBe(rng);expect(legacy.nextId).toBe(nextId);
 expect(deserializeWorld(JSON.stringify(legacy)).piles).toEqual([]);
});

test.each(['berry-bush','grass'] as const)('V352 real direct CUT %s learns only on productive contact and remains exact mid-work',species=>{
 const {w,p,r}=scene(species);expect(applyCommand(w,{type:'designate',kind:'cut',x:r.x,z:r.z}).ok).toBe(true);
 const job=w.jobs.find(j=>j.kind==='cut')!;expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false}).ok).toBe(true);
 for(let n=0;n<180&&job.progress===0;n++){if(Math.abs(p.x-r.x)+Math.abs(p.z-r.z)>1)expect(p.skills.plants!.xp).toBe(0);stepWorld(w);}
 expect(job.progress).toBeGreaterThan(0);expect(p.skills.plants!.xp>0).toBe(species==='berry-bush');exact(w);
 const copy=deserializeWorld(serializeWorld(w));for(let n=0;n<240&&w.resources.some(x=>x.id===r.id);n++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);}
 expect(w.resources.some(x=>x.id===r.id)).toBe(false);if(species==='grass')expect(p.skills.plants!.xp).toBe(0);exact(w);
});
// A legacy tree has no species descriptor, but its actual CUT product is wood.
test('V352 completed legacy tree CUT names its real wood output in the event',()=>{
 const {w,p,r}=scene(null,'tree',1),sourceId=r.id;
 expect(applyCommand(w,{type:'designate',kind:'cut',x:r.x,z:r.z}).ok).toBe(true);
 const job=w.jobs.find(j=>j.kind==='cut')!;expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false}).ok).toBe(true);
 for(let n=0;n<240&&w.resources.some(x=>x.id===sourceId);n++)stepWorld(w);
 expect(w.resources.some(x=>x.id===sourceId)).toBe(false);
 expect(w.piles.map(x=>[x.item,x.quantity])).toEqual([['wood',1]]);
 expect(w.events.filter(e=>e.type==='job').map(e=>e.message)).toContain(`${p.name} a récolté 1 bois.`);exact(w);
});
