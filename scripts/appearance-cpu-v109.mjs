import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
const world=deserializeWorld(await decodeStoredSave(readFileSync('public/test-saves/v98/mixed-100.json','utf8')));
stepWorld(world,50);
const samples=[];
for(let i=0;i<200;i++){const start=performance.now();stepWorld(world);samples.push(performance.now()-start);}
assert.deepEqual(validateWorld(world),[]);
const saved=serializeWorld(world),clone=deserializeWorld(saved);stepWorld(world,30);stepWorld(clone,30);assert.equal(serializeWorld(clone),serializeWorld(world));
samples.sort((a,b)=>a-b);
const report={fixture:'v98/mixed-100.json',warmupTicks:50,measuredTicks:200,pawns:world.pawns.length,p50:samples[100],p95:samples[190],max:samples.at(-1),continuationTicks:30,validationErrors:[],note:'Short isolated CPU window; validation and serialization outside timing. Not a causal before/after or a long colony balancing test.'};
writeFileSync('artifacts/appearance-cpu-v109.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
