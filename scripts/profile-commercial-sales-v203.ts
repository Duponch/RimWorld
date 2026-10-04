/** Absolute consultation sub-cost on a prepared 250² camp, not full-tick FPS. */
import assert from 'node:assert/strict';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { quoteCommercialSell } from '../src/sim/commercial-post.ts';
import { reconcileCommercialOnMap } from '../src/sim/commercial-loading.ts';
import { serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { commercialCamp } from '../tests/helpers/commercial-v193.ts';

const files=['commercial-post','commercial-loading','commercial-trip','commercial-state','commercial-save','commercial-mass'].map(n=>`src/sim/${n}.ts`);
const hashes=()=>Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const frozen=hashes();
function sample(fn:()=>void){for(let i=0;i<20;i++)fn();const samples:number[]=[];for(let i=0;i<200;i++){const t=performance.now();fn();samples.push(performance.now()-t);}
  samples.sort((a,b)=>a-b);return {p50:samples[99],p95:samples[189],max:samples.at(-1)};}
const results=[];
for(const count of [1,10,30]){
  const {world:w,pawnId,foodId}=commercialCamp(250);w.piles=w.piles.filter(i=>i.item!=='silver');
  for(let i=0;i<1000;i++)addMaterial(w,'wood',1,{type:'ground',x:70+i%100,z:10+Math.floor(i/100)},'wood');
  const cargo=[];
  for(let i=0;i<count;i++){addMaterial(w,'textile',1,{type:'ground',x:8+i,z:125},'cloth');cargo.push({pileId:w.piles.at(-1)!.id,quantity:1});}
  refreshStock(w);assert.equal(applyCommand(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:3,silver:0,cargo}).ok,true);
  assert.deepEqual(validateWorld(w),[]);const initial=serializeWorld(w);
  const reconcile=sample(()=>reconcileCommercialOnMap(w));assert.equal(serializeWorld(w),initial);
  for(let n=0;n<3000&&w.commercialTrip?.phase!=='at-post';n++)stepWorld(w);
  const trip=w.commercialTrip;assert.equal(trip?.phase,'at-post');if(trip?.phase!=='at-post')throw Error('Missing physical arrival');
  assert.deepEqual(validateWorld(w),[]);const lines=trip.items.filter(i=>i.item==='cloth').map(i=>({pileId:i.id,quantity:i.quantity}));
  const expected=quoteCommercialSell(w,lines);assert.equal(expected.ok,true);const atPost=serializeWorld(w);
  const quote=sample(()=>{const q=quoteCommercialSell(w,lines);assert.equal(q.ok,true);});
  assert.deepEqual(quoteCommercialSell(w,lines),expected);assert.equal(serializeWorld(w),atPost);
  results.push({count,map:[w.width,w.height],actors:3,groundPiles:w.piles.length,tripPiles:trip.items.length,postPiles:w.civilianPost!.stock.length,reconcile,quote});
}
assert.deepEqual(hashes(),frozen);mkdirSync('tmp/v203',{recursive:true});
const report={scope:'Prepared absolute loading reconciliation and sale quote, 250², three actors, 1000 unrelated ground piles; 20 warmups/200 samples each. Real travel outside timer. No A/B, full tick, GPU, FPS or natural economy claim.',node:process.version,cpu:cpus()[0]?.model,hashes:frozen,results};
writeFileSync('tmp/v203/commercial-sales-cpu.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
