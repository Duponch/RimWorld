/** Short, isolated CPU cost. No browser, RAF, worker or GPU measurement. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { createWorld } from '../src/sim/engine.ts';
import { advanceWildlife,enableWildlife } from '../src/sim/wildlife.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { World } from '../src/sim/types.ts';

const paths=['src/sim/wildlife.ts','src/sim/wildlife-state.ts','src/sim/wildlife-exit.ts',
  'src/sim/wildlife-navigation.ts','src/sim/wildlife-save.ts','scripts/wildlife-exit-bench-v186.ts'];
const hashes=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const before=hashes(),base=createWorld(186,250,250);
base.tiles=base.tiles.map(()=>({terrain:'grass'}));base.pawns=[];base.structures=[];base.jobs=[];base.piles=[];base.packed=[];
base.resources=[{id:base.nextId++,kind:'berries',x:125,z:125,amount:10,growth:1,growthTick:0}];
refreshStock(base);enableWildlife(base,1);base.resources=[];
const animal=base.wildlife!.animals[0]!;
animal.x=125;animal.z=125;animal.food=0;animal.rest=1;animal.nextDecision=0;
assert.deepEqual(validateWorld(base),[]);
const step=(w:World)=>{w.tick++;advanceWildlife(w);};
function summary(values:number[]){
  const sorted=values.slice().sort((a,b)=>a-b);
  return {samples:values.length,p50Ms:sorted[Math.floor(sorted.length/2)]!,p95Ms:sorted[Math.ceil(sorted.length*.95)-1]!};
}
const results=[];
for(const count of [1,64,256]){
  const prepared=structuredClone(base),state=prepared.wildlife!;
  for(let i=1;i<count;i++){
    const a=structuredClone(animal);a.id=prepared.nextId++;a.x=125+i%8;a.z=125+Math.floor(i/8);state.animals.push(a);
  }
  const times:number[]=[];
  for(let i=0;i<16;i++){
    const w=structuredClone(prepared),start=performance.now();step(w);const elapsed=performance.now()-start;
    if(i>=4)times.push(elapsed);
    // Independent prepared twins, then a real serialized continuation.
    if(i===4){
      const twin=structuredClone(prepared);step(twin);assert.deepEqual(twin,w);
      assert.deepEqual(validateWorld(w),[]);
      const resumed=deserializeWorld(serializeWorld(w));step(w);step(resumed);assert.deepEqual(resumed,w);
      assert.equal(state.exitedAnimals,undefined);
      assert.equal(w.wildlife!.animals.filter(a=>a.exiting).length,Math.min(2,count));
    }
  }
  results.push({animals:count,firstDecision:summary(times)});
}
assert.deepEqual(hashes(),before,'sources changed while measuring');
const report={date:new Date().toISOString(),schema:base.schemaVersion,cpu:cpus()[0]?.model,map:[250,250],
  scene:'Prepared flat terrain, awake starving hares at map centre; one decision tick, no full engine',
  limits:'Not a baseline comparison, natural campaign, worker/RAF or GPU measurement. The counts are artificial stress scenes.',
  sourceHashes:before,results};
mkdirSync('tmp',{recursive:true});writeFileSync('tmp/wildlife-exit-bench-v186.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({output:'tmp/wildlife-exit-bench-v186.json',results}));
