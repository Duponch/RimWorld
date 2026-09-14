import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { applyCommand, stepWorld, serializeWorld } from '../src/sim/index.ts';
import { cookingFixture } from './fixtures/cooking.ts';

const mode=process.argv[2];if(mode!=='record'&&mode!=='compare')throw new Error('Use record or compare');
const folder='tmp/navigation-access-baseline';mkdirSync(folder,{recursive:true});
const results=[],deadline=performance.now()+120000;
for(const scenario of ['cooking','hungry-policies'])for(const count of [3,30,100]) {
  const w=cookingFixture(count);
  for(let tick=1;tick<=450;tick++) {
    if(tick===101&&scenario==='hungry-policies')for(const [i,p] of w.pawns.entries()) {
      p.hunger=20;p.needCooldown=0;
      if(!applyCommand(w,{type:'food-policy-assign',pawnId:p.id,policyId:[2,3,4][i%3]!}).ok)throw new Error('Invalid policy fixture');
    }
    stepWorld(w);
    if([1,100,150,300,450].includes(tick)) {
      const text=serializeWorld(w),name=`${scenario}-${count}-${tick}.json`,path=`${folder}/${name}`;
      if(mode==='record')writeFileSync(path,text);else if(readFileSync(path,'utf8')!==text){writeFileSync(`tmp/navigation-mismatch-${name}`,text);throw new Error(`World continuation differs: ${name}`);}
      results.push({scenario,count,tick,bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex')});
    }
    if(performance.now()>deadline)throw new Error('120 s parity watchdog');
  }
  console.log(`${mode}: ${scenario} ${count} pawns, 450 ticks`);
}
writeFileSync(`artifacts/navigation-access-${mode}.json`,JSON.stringify({date:new Date().toISOString(),mode,comparison:'Exact serialized bytes at 30 checkpoints, including all simulation state; hashes retained for provenance, no hash-only comparison',results},null,2));
