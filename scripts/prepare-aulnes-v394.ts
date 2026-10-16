/** ROOT-only private preparation/continuation; no public or catalogue writes. */
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadAulnesV386,prepareAulnesPolicyV394,observeAulnesV394,AULNES_V394_SOURCE,AULNES_V394_PARENT_SHA} from './aulnes-policy-v394.ts';
import {aulnesHash} from './aulnes-workshop-v381.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {encodeStoredSave,decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import type {World} from '../src/sim/types.ts';

function strict(world:World){assert.deepEqual(validateWorld(world),[]);const raw=serializeWorld(world);assert.equal(serializeWorld(deserializeWorld(raw)),raw);return raw;}
async function main(){
  const args=process.argv.slice(2),at=args.indexOf('--ticks'),ticks=at<0?0:Number(args[at+1]);
  assert.ok(Number.isSafeInteger(ticks)&&ticks>=0&&ticks<=360,'Private continuation is bounded to360 ordinary ticks; default only prepares.');
  const {world:source,storedHash}=await loadAulnesV386(),{world,preparation}=prepareAulnesPolicyV394(source);
  mkdirSync('tmp',{recursive:true});const out=mkdtempSync('tmp/aulnes-v394-'),start=world.tick,before=observeAulnesV394(world);
  let lastValid=strict(world);writeFileSync(resolve(out,'prepared-world.json'),lastValid);
  const people=source.pawns.map(p=>({id:p.id,name:p.name}));
  try{
    // The saved initial state contains the real held wool, sleeping people and
    // engaged work. A one-tick branch qualifies exact replay within the horizon.
    let replayRaw:string|undefined;if(ticks){const resumed=deserializeWorld(lastValid);stepWorld(resumed);replayRaw=serializeWorld(resumed);}
    for(let i=0;i<ticks;i++){
      stepWorld(world);if(i===0&&replayRaw!==undefined)assert.equal(serializeWorld(world),replayRaw,'The ordinary first tick must resume exactly.');
      assert.ok(people.every(old=>world.pawns.some(p=>p.id===old.id&&p.name===old.name&&p.state!=='dead')),`An inherited person was lost at${world.tick}; preserve partial state, do not extend.`);
    }
    const raw=strict(world);lastValid=raw;const encoded=await encodeStoredSave(raw);assert.equal(await decodeStoredSave(encoded),raw);
    writeFileSync(resolve(out,'played-world.json'),raw);writeFileSync(resolve(out,'les-aulnes-proposition.json'),encoded);
    const after=observeAulnesV394(world),report={source:AULNES_V394_SOURCE,parentRawSha256:AULNES_V394_PARENT_SHA,sourceStoredHash:storedHash,start,end:world.tick,ticks,schema:world.schemaVersion,sha256:aulnesHash(raw),preparation,
      stage:ticks?'continued-private':'prepared-only',exactFirstTickReplay:ticks>0,before,after,
      newTuqueIds:after.tuques.filter(p=>!before.tuques.some(old=>old.id===p.id)).map(p=>p.id),
      automaticTuqueWearers:after.tuques.flatMap(p=>p.owner.type==='apparel'?[p.owner.pawnId]:[]),
      manualWearNotPerformed:true,publicationDecision:'ROOT only after qualification; unfinished work/sleep/automatic approach remains a real partial result. No extension, forced wear or public pointer is performed.'};
    writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report}));
  }catch(error){writeFileSync(resolve(out,'last-valid-world.json'),lastValid);writeFileSync(resolve(out,'failure-world.json'),JSON.stringify(world));writeFileSync(resolve(out,'failure.txt'),String(error));throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
