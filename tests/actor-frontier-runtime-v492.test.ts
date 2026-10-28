
import{test}from'vitest';
import assert from'node:assert/strict';
import{frontierHarness}from'./frontier-runtime-harness';
import{serializeCampaign,validateWorld}from'../src/sim/serialization';
import{effectiveCore297}from'../src/sim/core-phase-297';
import{applyCommand}from'../src/sim/index';
import{validCoreAudioCues297}from'../src/bridge/core-phase-data-297';
import type{World}from'../src/sim/types';

function assertWholeOracle(h:ReturnType<typeof frontierHarness>,additionalCore:number){
 const actual=serializeCampaign(h.owner());assert.deepEqual(validateWorld(h.owner()),[]);const expected=h.oracleCores(additionalCore);
 assert.equal(h.owner().rng,h.oracle.rng);assert.equal(actual,expected,'Whole authority including WorldPawns, local phase and persisted path budgets matches the real Core oracle');return actual;
}
test('frontier calm macros share one20ms budget with actors and Full waits for the genuine batch tail',()=>{
 const h=frontierHarness(),start=h.publications.length;h.at(1056);assert.equal(h.slice(),1);while(h.lastCore()<9)h.runOne();
 h.at(1080);while(h.lastCore()<19)h.runOne();const beforeTail=h.publications.slice(start);
 assert.deepEqual(beforeTail.filter(p=>p.kind==='full'),[],'An old quiet-wall deadline must not emit Full before the logical tail');
 const crossed=h.phaseRows.filter(p=>p.packet.toCore>=10);assert.ok(crossed.length>0,'A confirmed frontier must cross a calm macro');
 assert.ok(crossed.every(p=>p.packet.type==='actor-frontier-297'));assert.ok(h.pending()?.canDeferFull);
 h.at(1100);assert.equal(h.runOne(),1);assert.equal(h.lastCore(),20);assert.equal(h.queued(),0);
 const receipts=h.publications.slice(start);assert.deepEqual(receipts.filter(p=>p.kind==='full').map(p=>p.core),[20]);
 for(let n=1;n<receipts.length;n++)assert.ok(receipts[n]!.at-receipts[n-1]!.at>=20,'Normal Full and actor sends share the same TOTAL budget');
 const actual=assertWholeOracle(h,20);assert.equal(h.saved(),actual);h.assertFullDecoder();
});
test('command atCore9 then calm macro10 publishes confirmed actors atCore11 before a90Core tail without manufacturing a World',()=>{
 const h=frontierHarness(),id=h.input.pawnId;h.at(1250);h.slice();while(h.lastCore()<9)h.runOne();
 const command={type:'draft-move'as const,pawnIds:[id],target:{x:25,z:5},queue:false},r=h.request({type:'command',command});
 assert.equal(r.reply.ok,true);assert.equal(effectiveCore297(r.rows.at(-1)!.world),9);assert.equal(r.rows.at(-1)!.packet.corePhase297!.actorMode297,'frontier');
 assert.ok(r.rows.at(-1)!.world.pawns.find(p=>p.id===id)!.motion);assert.ok(h.order.indexOf('publication:9:6')<h.order.indexOf('reply:'+r.id));
 h.oracleCores(9);assert.equal(applyCommand(h.oracle as World,command).ok,true);const start=h.publications.length;
 h.at(1269);assert.equal(h.runOne(),1);assert.equal(h.lastCore(),10);
 assert.equal(h.trace.observations.find(x=>x.core===10)!.hard,false);assert.equal(h.trace.discrete.findLast(x=>x.core===10)!.changed,false);assert.equal(h.publications.length,start);
 h.at(1270);assert.equal(h.runOne(),1);assert.equal(h.lastCore(),11);assert.ok(h.queued()>0,'The reserved90Core batch has not ended');
 assert.deepEqual(h.publications.slice(start).map(p=>[p.kind,p.core]),[['phase',11]]);
 const phase=h.phaseRows.at(-1)!;assert.equal(phase.packet.type,'actor-frontier-297');assert.equal(phase.packet.fromCore,9);assert.equal(phase.actorCore,11);assert.equal(effectiveCore297(phase.fullWorld),9);assert.equal(effectiveCore297(phase.world),11);
 const actual=assertWholeOracle(h,2),beforePause=h.publications.length,pause=h.request({type:'speed',speed:0});
 assert.equal(pause.reply.ok,true);assert.equal(effectiveCore297(pause.rows.at(-1)!.world),11);assert.equal(h.publications[beforePause]!.kind,'full');assert.equal(h.publications[beforePause]!.core,11);
 h.drain();assert.equal(h.lastCore(),11);assert.equal(h.saved(),actual);h.assertFullDecoder();
});
test('zero-credit wake flushes a calm pending Full without changing Whole, RNG, phase or persisted search budget',()=>{
 const h=frontierHarness(),start=h.publications.length;h.at(1056);h.slice();h.drain();assert.equal(h.lastCore(),20);
 h.at(1075.9);h.wake();h.drain();assert.equal(h.lastCore(),27);assert.ok(h.pending()?.canDeferFull);
 assert.equal(h.publications.slice(start).filter(p=>p.kind==='full').length,0);const owner=h.owner(),before=serializeCampaign(owner),rng=owner.rng;
 h.at(1076);assert.equal(h.slice(),0);h.drain();assert.equal(h.owner(),owner);assert.equal(h.lastCore(),27);assert.equal(owner.rng,rng);assert.equal(serializeCampaign(owner),before);
 assert.deepEqual(h.publications.slice(start).filter(p=>p.kind==='full').map(p=>p.core),[27],'Count publications BEFORE dispatching actual SAVE, which still publishes');
 assert.equal(before,h.oracleCores(27));assert.equal(h.saved(),before);h.assertFullDecoder();
});
test('a genuine door close and cue preserve the V7 hard barrier through later calm Cores',()=>{
 const h=frontierHarness({doorAtCore:11}),start=h.publications.length;h.at(1056);h.slice();while(h.lastCore()<14)h.runOne();
 assert.equal(h.publications.slice(start).filter(p=>p.kind==='full').length,0);assert.equal(h.pending()?.canDeferFull,false);assert.ok(h.audioPending().some(c=>c.kind==='door.close'));
 h.at(1076);h.runOne();assert.equal(h.lastCore(),15);assert.deepEqual(h.publications.slice(start).filter(p=>p.kind==='full').map(p=>p.core),[15]);
 assert.equal(h.doorCues().length,1);assert.equal(h.doorCues()[0]!.tick,1.1);h.drain();const actual=assertWholeOracle(h,20);h.request({type:'speed',speed:0});assert.equal(h.doorCues().length,1);assert.equal(h.saved(),actual);h.assertFullDecoder();
});
test('a real discrete fuel exhaustion remains sticky hard rather than being hidden by later quiet observations',()=>{
 const h=frontierHarness({fireTicks:1});h.at(1056);h.slice();while(h.lastCore()<14)h.runOne();assert.equal(h.motion.last!.structures.find(s=>s.kind==='campfire')!.fuel!.ticks,0);assert.ok(h.trace.discrete.some(x=>x.core===10&&x.changed));assert.equal(h.pending()?.canDeferFull,false);
 h.at(1076);h.runOne();assert.equal(h.rows.at(-1)!.packet.corePhase297!.core,15);h.drain();assert.equal(h.saved(),assertWholeOracle(h,20));h.assertFullDecoder();
});
test.each(['encode','send']as const)('real failed %s leaves the hard and audio prefix uncommitted; load alone replaces the faulted owner',kind=>{
 const h=frontierHarness({doorAtCore:11});h.at(1056);h.slice();while(h.lastCore()<14)h.runOne();const pending=structuredClone(h.audioPending());assert.ok(pending.some(c=>c.kind==='door.close'));const priorCore=h.frameOwner.currentCore;
 h.fail(kind);h.at(1076);h.runOne();assert.equal(h.lastCore(),15);assert.equal(h.messages.filter(m=>m.type==='fault').length,1);assert.equal(h.frameOwner.currentCore,priorCore);
 assert.ok(h.pending()?.needsFull);assert.deepEqual(h.audioPending(),pending,'Preparation and failed send may not consume the owned audio prefix');
 assert.equal(h.request({type:'save'}).reply.outcome,'unknown');const played=h.lastCore();h.drain();assert.equal(h.lastCore(),played);
 h.allow();h.at(1200);assert.equal(h.request({type:'load',data:h.input.raw}).reply.ok,true);assert.equal(h.saved(),h.initial);assert.equal(h.audioPending().length,0);h.assertFullDecoder();
});
test('real failed actor send cannot advance the presentation owner or clear the quiet pending Full',()=>{
 const h=frontierHarness();h.at(1056);h.slice();while(h.lastCore()<9)h.runOne();const committed=h.frameOwner.currentCore;
 h.fail('send');h.at(1080);h.runOne();assert.equal(h.lastCore(),10);assert.equal(h.messages.filter(m=>m.type==='fault').length,1);assert.equal(h.frameOwner.currentCore,committed);
 assert.ok(h.pending()?.needsFull);const owner=serializeCampaign(h.owner());h.drain();assert.equal(serializeCampaign(h.owner()),owner);
});
test('real load replaces a quiet frontier owner and stale queued tasks cannot spend or publish from its debt',()=>{
 const h=frontierHarness();h.at(1056);h.slice();while(h.lastCore()<10)h.runOne();assert.ok(h.pending()?.canDeferFull);assert.ok(h.queued()>0);const epoch=h.rows.at(-1)!.packet.epoch;
 h.at(1076);const r=h.request({type:'load',data:h.input.raw});assert.equal(r.reply.ok,true);assert.ok(r.rows.at(-1)!.packet.epoch>epoch);assert.equal(effectiveCore297(r.rows.at(-1)!.world),0);
 const n=h.publications.length;h.drain();assert.equal(h.lastCore(),0);assert.equal(h.publications.length,n);assert.equal(h.saved(),h.initial);h.assertFullDecoder();
});
test('real working cues may travel on a guarded frontier phase without audio-only Full promotion or replay',()=>{
 const h=frontierHarness({deconstruct:true});h.at(1250);h.slice();
 for(let n=2;n<=260;n++){h.at(1250+n*3);if(h.queued())h.runOne();else h.slice();}
 const work=h.phaseRows.filter(p=>p.packet.audioCues.some(c=>c.kind==='deconstruction.work'));assert.ok(work.length>0,'An actual continuing work cue, not a fabricated queue, must reach an actor-frontier packet');
 for(const row of work){assert.equal(row.packet.type,'actor-frontier-297');assert.equal(validCoreAudioCues297(row.packet.audioCues,row.packet.fromCore,row.packet.toCore),true);}
 const all=h.publications.flatMap(p=>p.audio as readonly {id:string;kind:string;tick:number}[]),ids=all.map(c=>c.id);assert.equal(new Set(ids).size,ids.length,'A successful owned prefix must not replay');
 const core=h.lastCore(),actual=assertWholeOracle(h,core);h.request({type:'speed',speed:0});h.drain();assert.equal(h.saved(),actual);h.assertFullDecoder();
});
test('real deconstruction births still trigger the existing allocator guard and preserve full World replay',()=>{
 const h=frontierHarness({deconstruct:true}),initial=h.oracle.nextId;
 for(let n=1;n<=4&&!h.trace.allocator.some(x=>x.required&&x.core>0);n++){h.at(1000+n*250);h.wake();h.drain();}
 assert.ok(h.motion.last!.deconstructed.count>0);assert.ok(h.motion.last!.nextId>initial);assert.ok(h.trace.allocator.some(x=>x.required&&x.core>0));assert.ok(h.rows.some(x=>x.world.piles.some(p=>p.item==='wood')));
 const actual=assertWholeOracle(h,h.lastCore());assert.equal(h.saved(),actual);h.assertFullDecoder();
});
test('real projectile arrival before a quiet macro retains V7 hard FX and its causal impact cue',()=>{
 const h=frontierHarness({projectile:true}),start=h.publications.length;h.at(1056);h.slice();while(h.lastCore()<9)h.runOne();
 const projectile=h.motion.last!.projectiles?.[0];assert.ok(projectile?.arrival);assert.equal(projectile.arrival.coreTick,8);assert.ok(h.audioPending().some(c=>c.kind==='weapon.impact-ground'));
 h.at(1076);h.runOne();assert.equal(h.lastCore(),10);assert.equal(h.publications.slice(start).filter(p=>p.kind==='full').at(-1)!.core,10);
 assert.equal(h.rows.at(-1)!.packet.corePhase297!.projectilesRetained.find(p=>p.id===projectile.id)!.endCore,8);h.drain();assert.equal(h.saved(),assertWholeOracle(h,20));h.assertFullDecoder();
});
