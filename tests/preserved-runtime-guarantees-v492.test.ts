// Two preserved V7 guarantees, through the unchanged qualified V4 Runtime harness.
// Actual V9 Engine/Runtime/codec/owner. Only that harness controls wall/tasks.
// No Native authority, simulated dependencies, source writes or played-state downgrade.
import {test} from 'vitest';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {frontierHarness} from './frontier-runtime-harness';
import {applyCommand} from '../src/sim/index';
import {effectiveCore297} from '../src/sim/core-phase-297';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/serialization';
import type {World} from '../src/sim/types';
const hash=(raw:string)=>createHash('sha256').update(raw).digest('hex');
function sameRaw(actual:string,expected:string,label:string){
 // Whole byte equality, with bounded error output; no field-only substitute.
 assert.equal(actual===expected,true,label+' bytes='+actual.length+'/'+expected.length+' SHA='+hash(actual)+'/'+hash(expected));
}

test('actual x1 over60Core preserves non-starvation: at least20phases, no gap over3Core, real progression and Whole/RNG',()=>{
 const h=frontierHarness({speed:1}),id=h.input.pawnId,command={type:'draft-move' as const,pawnIds:[id],target:{x:25,z:5},queue:false};
 const ordered=h.request({type:'command',command});assert.equal(ordered.reply.ok,true);assert.equal(applyCommand(h.oracle as World,command).ok,true);
 assert.ok(ordered.rows.at(-1)!.world.pawns.find(p=>p.id===id)!.motion,'The actual command must arm a real captured edge');
 const commandedX=h.motion.last!.pawns.find(p=>p.id===id)!.x,start=h.publications.length;
 // Original V7 stimulus: fifty20ms wakes at actual speed1 pay sixty physical Cores.
 for(let n=1;n<=50;n++){h.at(1000+n*20);h.wake();h.drain();}
 assert.equal(h.lastCore(),60);const delivered=h.publications.slice(start),phases=delivered.filter(p=>p.kind==='phase');
 assert.ok(phases.length>=20,'Normal x1 must retain a genuine physical phase stream, not macro-only publication');
 assert.ok(delivered.some(p=>p.core>0&&p.core<10));assert.ok(delivered.some(p=>p.core>=50));
 const cores=delivered.map(p=>p.core);assert.ok(cores.length>0);assert.ok(cores[0]!>0&&cores[0]!<=3,'The first actually funded receipt must not starve behind a quiet macro');
 for(let n=1;n<cores.length;n++){
  assert.ok(cores[n]!>cores[n-1]!,'Every retained current receipt advances the confirmed frontier');
  assert.ok(cores[n]!-cores[n-1]!<=3,'No quiet x1 starvation beyond three actually funded Core');
 }
 assert.equal(h.frameOwner.currentCore,cores.at(-1));
 const progressed=h.motion.last!.pawns.find(p=>p.id===id)!;assert.ok(progressed.x>3,'Original progression requirement');
 assert.ok(progressed.x>commandedX,'Progress must continue beyond the first edge armed by the command');
 const owner=h.owner();assert.equal(effectiveCore297(owner),60);assert.deepEqual(validateWorld(owner),[]);
 const actual=serializeCampaign(owner),oracle=h.oracleCores(60);assert.equal(owner.rng,h.oracle.rng);sameRaw(actual,oracle,'Complete sixty-Core authority');
 sameRaw(h.saved(),actual,'Real SAVE after the whole oracle');h.assertFullDecoder();
});

test('real Pause atphase9 publishes FullCore9 before ACK, cancels only unplayed credit and actual SAVE/load is exact',()=>{
 const h=frontierHarness();h.at(1250);assert.equal(h.slice(),1);while(h.lastCore()<9)assert.equal(h.runOne(),1);
 assert.equal(h.lastCore(),9);assert.ok(h.queued()>0,'Pause interrupts an actually reserved90Core batch');
 const before=serializeCampaign(h.owner()),oracle=h.oracleCores(9);sameRaw(before,oracle,'Actual played prefix before Pause');
 const start=h.publications.length,pause=h.request({type:'speed',speed:0});assert.equal(pause.reply.ok,true);
 const full=pause.rows.at(-1)!;assert.ok(full,'A real full publication, not reply metadata, must be delivered');
 assert.equal(effectiveCore297(full.world),9);assert.equal(full.world.tick,0);assert.equal(full.world.phaseCore297,9);
 assert.equal(full.packet.corePhase297!.core,9);assert.equal(full.packet.speed,0);assert.equal(h.frameOwner.currentCore,9);
 assert.equal(h.publications[start]!.kind,'full');assert.equal(h.publications[start]!.core,9);
 const publication=h.order.indexOf('publication:9:0'),ack=h.order.indexOf('reply:'+pause.id);
 assert.ok(publication>=0&&ack>publication,'The actual FullCore9 is sent before the Pause ACK');
 const captures=h.motion.cores.length,publications=h.publications.length;h.drain();
 assert.equal(h.lastCore(),9);assert.equal(h.motion.cores.length,captures);assert.equal(h.publications.length,publications,'Stale unpaid continuations cannot publish after Pause');
 const saved=h.saved();sameRaw(saved,before,'Actual SAVE preserves every played field atphase9');h.assertFullDecoder();
 const decoded=deserializeCampaign(saved);assert.deepEqual(validateWorld(decoded),[]);sameRaw(serializeCampaign(decoded),saved,'Real codec whole roundtrip of the partial physical phase');
 const epoch=full.packet.epoch,reload=h.request({type:'load',data:saved});assert.equal(reload.reply.ok,true);
 const loaded=reload.rows.at(-1)!;assert.ok(loaded.packet.epoch>epoch,'Actual Runtime LOAD replaces the owner generation');
 assert.equal(effectiveCore297(loaded.world),9);assert.equal(loaded.world.tick,0);assert.equal(loaded.world.phaseCore297,9);assert.equal(loaded.packet.corePhase297!.core,9);
 sameRaw(h.saved(),saved,'Real Runtime SAVE after actual LOAD is byte exact');
 const loadedCaptures=h.motion.cores.length,loadedPublications=h.publications.length;h.drain();assert.equal(h.lastCore(),9);
 assert.equal(h.motion.cores.length,loadedCaptures);assert.equal(h.publications.length,loadedPublications);h.assertFullDecoder();
});
