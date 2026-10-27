// V488 Clock and task-port semantics; actual implementation, controlled host transport only.
import {test} from 'vitest';
import assert from 'node:assert/strict';
import {FixedClock} from '../src/bridge/fixed-clock';
import {WorkerTaskScheduler} from '../src/bridge/worker-task-scheduler';

test('one reservation samples once and consumption debits exactly its nine genuine tick credits',()=>{
 const clock=new FixedClock();clock.reset(1000);assert.equal(clock.reserve(1250,6),9);assert.throws(()=>clock.reserve(1500,6));assert.throws(()=>clock.advance(1500,6));
 for(let n=0;n<9;n++)assert.equal(clock.consume(),true);assert.equal(clock.consume(),false);assert.equal(clock.reserve(1250,6),0);assert.equal(clock.reserve(1270,6),0);assert.equal(clock.reserve(1278,6),1);assert.equal(clock.consume(),true);assert.equal(clock.consume(),false);
});
test('elapsed250 and budget15 are sampled once; cancellation drops whole unplayed credit without replay',()=>{
 // Deliberate standalone NUM speed100 tests the generic clock cap, not a Runtime speed.
 const clock=new FixedClock();clock.reset(0);assert.equal(clock.reserve(10000,100),15);assert.equal(clock.consume(),true);assert.equal(clock.consume(),true);clock.cancelUnplayed(20000);
 assert.equal(clock.consume(),false);assert.equal(clock.reserve(20000,1),0);assert.equal(clock.reserve(20167,1),1);assert.equal(clock.consume(),true);assert.equal(clock.consume(),false);
 const capped=new FixedClock();capped.reset(0);assert.equal(capped.reserve(250,100),15);for(let n=0;n<15;n++)assert.equal(capped.consume(),true);assert.equal(capped.reserve(250,1),15,'Unplayed capped debt is retained until explicit cancellation');capped.cancelUnplayed(250);assert.equal(capped.reserve(250,1),0);
});
test('pause keeps only previously sampled fractional phase, including after partial consumption',()=>{
 const clock=new FixedClock();clock.reset(0);assert.equal(clock.reserve(245,6),8);for(let n=0;n<3;n++)assert.equal(clock.consume(),true);clock.cancelUnplayed(500);assert.equal(clock.consume(),false);
 assert.equal(clock.reserve(500,1),0);assert.equal(clock.reserve(530,1),1,'820 retained units plus180 new units');assert.equal(clock.consume(),true);assert.equal(clock.consume(),false);
 const phase=new FixedClock();phase.reset(0);assert.equal(phase.reserve(20,6),0);phase.cancelUnplayed(100);assert.equal(phase.reserve(5000,0),0);assert.equal(phase.reserve(5047,1),1);assert.equal(phase.consume(),true);
});
test('stale wall times cannot move the sampling anchor backwards; reset clears phase and reservations',()=>{
 const clock=new FixedClock();clock.reset(1000);assert.equal(clock.reserve(900,6),0);assert.equal(clock.reserve(1020,6),0);clock.cancelUnplayed(900);assert.equal(clock.reserve(1067,1),1);clock.reset(2000);assert.equal(clock.consume(),false);assert.equal(clock.reserve(2000,6),0);assert.equal(clock.reserve(2020,6),0);clock.reset(3000);assert.equal(clock.reserve(3047,1),0);
});
test('invalid reservation/cancellation and overflow reject atomically without spending or rebasing credit',()=>{
 const clock=new FixedClock();clock.reset(0);assert.equal(clock.reserve(20,6),0);
 for(const [now,speed]of [[NaN,1],[Infinity,1],[1000,NaN],[1000,Infinity],[1000,-1],[1000,Number.MAX_VALUE]])assert.throws(()=>clock.reserve(now!,speed!));
 assert.throws(()=>clock.cancelUnplayed(NaN));assert.equal(clock.reserve(47,1),0);assert.equal(clock.reserve(67,1),1);assert.equal(clock.consume(),true);assert.equal(clock.consume(),false);
});

function ports(){
 const pending:(()=>void)[]=[],received:unknown[]=[],state={unrefs:0,fail:false};let created=0;
 const channel={port1:{onmessage:undefined as undefined|((event:{data:unknown})=>void),unref(){state.unrefs++;}},port2:{unref(){state.unrefs++;},postMessage(data:unknown){if(state.fail){state.fail=false;throw Error('NUM post failed');}const owned=structuredClone(data);received.push(owned);pending.push(()=>channel.port1.onmessage?.({data:owned}));}}};
 return {state,pending,received,create(){created++;return channel as unknown as MessageChannel;},created:()=>created,deliver(){const action=pending.shift();assert.ok(action,'Expected actual posted task');action();},replay(data:unknown){channel.port1.onmessage?.({data});}};
}
test('scheduler creates one channel and coalesces requests without invoking work in the requester stack',()=>{
 const p=ports();let calls=0;const scheduler=new WorkerTaskScheduler(()=>calls++,()=>p.create());assert.equal(p.created(),1);assert.equal(p.state.unrefs,2);assert.equal(scheduler.scheduled,false);
 scheduler.request();scheduler.request();scheduler.request();assert.equal(calls,0);assert.equal(scheduler.scheduled,true);assert.equal(p.pending.length,1);p.deliver();assert.equal(calls,1);assert.equal(scheduler.scheduled,false);scheduler.request();assert.equal(p.pending.length,1);p.deliver();assert.equal(calls,2);
});
test('scheduler clears pending before work so work can queue exactly one continuation',()=>{
 const p=ports();let calls=0;const scheduler=new WorkerTaskScheduler(()=>{calls++;if(calls===1){scheduler.request();scheduler.request();}},()=>p.create());scheduler.request();p.deliver();assert.equal(calls,1);assert.equal(scheduler.scheduled,true);assert.equal(p.pending.length,1);p.deliver();assert.equal(calls,2);assert.equal(scheduler.scheduled,false);
});
test('stale generation returns before pending and cannot erase a newer continuation',()=>{
 const p=ports();let calls=0;const scheduler=new WorkerTaskScheduler(()=>calls++,()=>p.create());scheduler.request();const old=p.received[0];scheduler.invalidate();assert.equal(scheduler.scheduled,false);scheduler.request();assert.equal(p.pending.length,2);
 p.deliver();assert.equal(calls,0);assert.equal(scheduler.scheduled,true);p.deliver();assert.equal(calls,1);assert.equal(scheduler.scheduled,false);p.replay(old);p.replay(p.received[1]);assert.equal(calls,1);scheduler.request();assert.equal(scheduler.scheduled,true);p.deliver();assert.equal(calls,2);
});
test('failed posting leaves no phantom pending flag and a later request remains usable',()=>{
 const p=ports();let calls=0;const scheduler=new WorkerTaskScheduler(()=>calls++,()=>p.create());p.state.fail=true;assert.throws(()=>scheduler.request(),/NUM post failed/);assert.equal(scheduler.scheduled,false);assert.equal(p.pending.length,0);scheduler.request();p.deliver();assert.equal(calls,1);assert.equal(scheduler.scheduled,false);
});
test('a thrown task does not retain pending or silently execute a second task',()=>{
 const p=ports();let calls=0;const scheduler=new WorkerTaskScheduler(()=>{if(++calls===1)throw Error('NUM task failed');},()=>p.create());scheduler.request();assert.throws(()=>p.deliver(),/NUM task failed/);assert.equal(scheduler.scheduled,false);assert.equal(p.pending.length,0);scheduler.request();p.deliver();assert.equal(calls,2);
});
