import {expect,test} from 'vitest';
import {CorePhasePublisher297} from '../src/bridge/core-phase-publisher-297';
import type {World} from '../src/sim/types';
// NUM: actual Publisher state/prepare/commit, partial numeric World only.
// No SIM, Native provenance, real-time wall deadline or performance claim.
function world(core=0):World{return{schemaVersion:297,tick:Math.floor(core/10),phaseCore297:core%10,nextId:100,width:2,height:2,tiles:[{terrain:'soil'}],pawns:[],projectiles:[]} as unknown as World;}
function move(w:World,core:number){w.tick=Math.floor(core/10);w.phaseCore297=core%10;}
function observe(p:CorePhasePublisher297,core:number,now:number,macro=false,hard=false){p.observe({core,actorsChanged:[],projectileEvents:{upserted:[],removed:[]},requiresFull:hard},macro,now);}
function setup(){const p=new CorePhasePublisher297(),w=world();p.commitFull(p.prepareFull(w,1,1,[]),100);return{p,w};}

test('first quiet wall budget persists across later macros, expires at20ms and never permits a cross-macro phase',()=>{
 const {p,w}=setup();move(w,10);observe(p,10,1000,true);expect(p.quietBudgetExpired(1019.999)).toBe(false);expect(p.canDeferFull).toBe(true);
 move(w,20);observe(p,20,1019,true);expect(p.quietBudgetExpired(1020)).toBe(true);expect(p.needsFull).toBe(true);expect(()=>p.preparePhase(w,[],6)).toThrow('Full publication');
 move(w,21);observe(p,21,1021);const full=p.prepareFull(w,1,2,[]);expect(full.metadata.core).toBe(21);p.commitFull(full,1022);expect(p.quietBudgetExpired(1023)).toBe(false);expect(p.needsFull).toBe(false);
});
test('abandoned Full send and stale Full commit do not consume or re-anchor the quiet wall budget',()=>{
 const {p,w}=setup();move(w,10);observe(p,10,1000,true);const abandoned=p.prepareFull(w,1,2,[]);expect(p.quietBudgetExpired(1019)).toBe(false);
 move(w,11);observe(p,11,1010);expect(()=>p.commitFull(abandoned,1019)).toThrow('raced');expect(p.canDeferFull).toBe(true);expect(p.quietBudgetExpired(1020)).toBe(true);
 const retry=p.prepareFull(w,1,2,[]);expect(retry.metadata.core).toBe(11);p.commitFull(retry,1021);expect(p.hasPending).toBe(false);expect(p.quietBudgetExpired(1022)).toBe(false);
});
test('only a successful Full gives a subsequent quiet macro a fresh20ms budget',()=>{
 const {p,w}=setup();move(w,10);observe(p,10,1000,true);p.commitFull(p.prepareFull(w,1,2,[]),1020);move(w,20);observe(p,20,2000,true);
 expect(p.quietBudgetExpired(2019)).toBe(false);expect(p.quietBudgetExpired(2020)).toBe(true);expect(p.canDeferFull).toBe(true);
});
test('reset revokes the prior owner budget and next owner starts from its actual new observation',()=>{
 const {p,w}=setup();move(w,10);observe(p,10,1000,true);p.reset();expect(p.quietBudgetExpired(0)).toBe(false);expect(p.canDeferFull).toBe(false);expect(p.needsFull).toBe(true);
 move(w,0);p.commitFull(p.prepareFull(w,2,1,[]),300);move(w,10);observe(p,10,310,true);expect(p.quietBudgetExpired(329)).toBe(false);expect(p.quietBudgetExpired(330)).toBe(true);
});
test('hard and an existing batch tail can publish before quiet expiry without a new timing authority',()=>{
 const {p,w}=setup();move(w,10);observe(p,10,1000,true);expect(p.quietBudgetExpired(1001)).toBe(false);p.requestFull();expect(p.canDeferFull).toBe(false);p.commitFull(p.prepareFull(w,1,2,[]),1001);
 move(w,20);observe(p,20,1010,true);expect(p.quietBudgetExpired(1011)).toBe(false);p.commitFull(p.prepareFull(w,1,3,[]),1011);expect(p.needsFull).toBe(false);
});
test('nonmonotone or nonfinite wall input is refused before writes and cannot invalidate a prepared Full',()=>{
 const {p,w}=setup();move(w,10);observe(p,10,1000,true);const current=p.prepareFull(w,1,2,[]);
 expect(()=>p.quietBudgetExpired(999)).toThrow('Nonmonotone');expect(()=>p.quietBudgetExpired(Number.NaN)).toThrow('Nonmonotone');expect(()=>observe(p,20,999,true)).toThrow('Nonmonotone');expect(()=>observe(p,20,Number.NaN,true)).toThrow('Nonmonotone');
 expect(p.canDeferFull).toBe(true);expect(p.quietBudgetExpired(1020)).toBe(true);expect(()=>p.commitFull(current,1021)).not.toThrow();expect(p.hasPending).toBe(false);
});
