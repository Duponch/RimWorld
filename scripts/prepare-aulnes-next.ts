/** ROOT-only private output. No public/catalogue publication path exists here. */
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadAulnesV381,prepareAulnesTuquesNext,AULNES_NEXT_SOURCE,AULNES_NEXT_PARENT_SHA,AULNES_NEXT_RECIPIENTS} from './aulnes-tuques-next.ts';
import {aulnesHash} from './aulnes-workshop-v381.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {encodeStoredSave,decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {storageAt,storageCellAccepts} from '../src/sim/shelf-storage.ts';
import {queryCookingBillStatus} from '../src/sim/cooking-diagnostics.ts';
import type {World} from '../src/sim/types.ts';

function strict(w:World){assert.deepEqual(validateWorld(w),[]);const raw=serializeWorld(w);assert.equal(serializeWorld(deserializeWorld(raw)),raw);return raw;}
async function main(){
  const args=process.argv.slice(2),at=args.indexOf('--ticks'),ticks=at<0?0:Number(args[at+1]);
  assert.ok(Number.isSafeInteger(ticks)&&ticks>=0&&ticks<=360,'Default preparation only; optional ordinary continuation is bounded360ticks.');
  const {world:source,storedHash}=await loadAulnesV381(),{world,preparation}=prepareAulnesTuquesNext(source);
  mkdirSync('tmp',{recursive:true});const out=mkdtempSync('tmp/aulnes-next-'),start=world.tick;
  let lastValid=strict(world);writeFileSync(resolve(out,'prepared-world.json'),lastValid);
  const originalPeople=source.pawns.map(p=>p.id),products=new Set<number>(),started=new Set<number>();
  try{
    // Observation only: no work/priorities/needs/owners/RNG or clothing orders
    // are adjusted to make this short optional continuation succeed.
    for(let i=0;i<ticks;i++){
      stepWorld(world);
      for(const p of world.piles){if(p.item==='muffalo-wool-tuque')products.add(p.id);if(p.unfinished?.billId===preparation.billId)started.add(p.id);}
      assert.ok(originalPeople.every(id=>world.pawns.some(p=>p.id===id&&p.state!=='dead')),`Historic person lost at${world.tick}.`);
      if((i+1)%120===0||i===ticks-1){lastValid=strict(world);writeFileSync(resolve(out,'last-valid-world.json'),lastValid);}
    }
    const raw=strict(world),encoded=await encodeStoredSave(raw);assert.equal(await decodeStoredSave(encoded),raw);
    writeFileSync(resolve(out,'les-aulnes-proposition.json'),encoded);writeFileSync(resolve(out,'played-world.json'),raw);
    if(ticks){const resumed=deserializeWorld(raw),copy=structuredClone(world);stepWorld(resumed);stepWorld(copy);assert.equal(strict(resumed),strict(copy));}
    const stored=world.piles.filter(p=>p.item==='muffalo-wool-tuque'&&p.owner.type==='ground'&&(()=>{if(p.owner.type!=='ground')return false;const s=storageAt(world,p.owner);return !!s&&storageCellAccepts(world,s,p);})());
    const bench=world.structures.find(s=>s.id===preparation.benchId)!,bill=bench.bills!.find(b=>b.id===preparation.billId)!;
    const report={source:AULNES_NEXT_SOURCE,parentRawSha256:AULNES_NEXT_PARENT_SHA,sourceStoredHash:storedHash,start,end:world.tick,ticks,schema:world.schemaVersion,sha256:aulnesHash(raw),preparation,
      stage:ticks?'continued-private':'prepared-only',productionObserved:products.size,storedIds:stored.map(p=>p.id),unfinishedIds:[...started],billStatus:queryCookingBillStatus(world,bench,bill),
      manualWearNotPerformed:true,readyForManualWear:stored.length>=2,intendedRecipients:AULNES_NEXT_RECIPIENTS.map(id=>{const p=world.pawns.find(p=>p.id===id)!;return {id,name:p.name,state:p.state,hunger:p.hunger,rest:p.rest};}),
      limit:'No publication decision or native wearing qualification. If two products are not ready, this is a preserved bounded preparation/continuation, not a completed clothing objective.'};
    writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report}));
  }catch(error){writeFileSync(resolve(out,'last-valid-world.json'),lastValid);writeFileSync(resolve(out,'failure.txt'),String(error));throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
