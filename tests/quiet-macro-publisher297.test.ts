import {expect,test} from 'vitest';
import {CorePhasePublisher297} from '../src/bridge/core-phase-publisher-297';
import type {World} from '../src/sim/types';
import type {CoreProjectileTrace297} from '../src/bridge/core-phase-projection-297';
// NUM publisher-state/ownership staging only; not valid World, SIM or Native.
function world(core=0):World{return{schemaVersion:297,tick:Math.floor(core/10),phaseCore297:core%10,nextId:100,width:2,height:2,tiles:[{terrain:'soil'}],pawns:[],projectiles:[]} as unknown as World;}
function move(w:World,core:number){w.tick=Math.floor(core/10);w.phaseCore297=core%10;}
function observe(p:CorePhasePublisher297,core:number,macro=false,hard=false,upserted:CoreProjectileTrace297[]=[],removed:number[]=[]){p.observe({core,actorsChanged:[],projectileEvents:{upserted,removed},requiresFull:hard},macro);}
function setup(){const p=new CorePhasePublisher297(),w=world();p.commitFull(p.prepareFull(w,1,1,[]),100);return{p,w};}

test('quiet macro requires Full and forbids crossing phases, remaining deferrable across later calm Cores until a real Full commit',()=>{
 const {p,w}=setup();move(w,10);observe(p,10,true);expect(p.needsFull).toBe(true);expect(p.canDeferFull).toBe(true);expect(()=>p.preparePhase(w,[],1)).toThrow('Full publication');
 move(w,21);observe(p,20,true);observe(p,21);expect(p.canDeferFull).toBe(true);const staged=p.prepareFull(w,1,2,[]);expect(p.canDeferFull).toBe(true);p.commitFull(staged,140);expect(p.needsFull).toBe(false);expect(p.canDeferFull).toBe(false);
 move(w,22);observe(p,22);expect(p.preparePhase(w,[],1).packet.toCore).toBe(22);
});
test('hard survives a later calm macro and a failed/abandoned Full prepare; only successful current commit clears it',()=>{
 const {p,w}=setup();move(w,10);observe(p,10,true);p.requestFull();observe(p,11);expect(p.canDeferFull).toBe(false);
 move(w,20);observe(p,20,true);const abandoned=p.prepareFull(w,1,2,[]);expect(p.needsFull).toBe(true);expect(p.canDeferFull).toBe(false);
 observe(p,21);expect(()=>p.commitFull(abandoned,150)).toThrow('raced');expect(p.needsFull).toBe(true);move(w,21);p.commitFull(p.prepareFull(w,1,2,[]),160);expect(p.needsFull).toBe(false);
});
test('a20ms not-due observation cannot consume or clear pending Full state, and reset still requires a new anchor',()=>{
 const {p,w}=setup();observe(p,10,true);expect(p.due(119)).toBe(false);expect(p.due(120)).toBe(true);move(w,10);p.prepareFull(w,1,2,[]);expect(p.needsFull).toBe(true);expect(p.due(120)).toBe(true);
 p.reset();expect(p.needsFull).toBe(true);expect(p.canDeferFull).toBe(false);expect(()=>p.preparePhase(w,[],1)).toThrow('Full publication');move(w,0);p.commitFull(p.prepareFull(w,2,1,[]),200);expect(p.needsFull).toBe(false);
});
test('unsent FX from before a quiet macro stays observable through failed send, while committed retained history alone is not a pending event',()=>{
 const {p,w}=setup(),trace:CoreProjectileTrace297={id:99,emittedAtCore:5,endCore:9,durationCore:4,delayCore:0,from:{x:0,z:0},to:{x:1,z:0},emp:false};
 observe(p,5,false,false,[trace]);expect(p.hasPendingProjectileEvents).toBe(true);expect(p.due(119)).toBe(false);observe(p,8,false,false,[],[99]);observe(p,10,true);expect(p.canDeferFull).toBe(true);expect(p.hasPendingProjectileEvents).toBe(true);
 move(w,10);const failed=p.prepareFull(w,1,2,[]);expect(failed.metadata.projectilesRetained).toEqual([trace]);expect(p.hasPendingProjectileEvents).toBe(true);expect(p.needsFull).toBe(true);
 p.requestFull();expect(()=>p.commitFull(failed,130)).toThrow('raced');expect(p.hasPendingProjectileEvents).toBe(true);p.commitFull(p.prepareFull(w,1,2,[]),140);expect(p.hasPendingProjectileEvents).toBe(false);
 move(w,20);observe(p,20,true);expect(p.canDeferFull).toBe(true);expect(p.hasPendingProjectileEvents).toBe(false);expect(p.prepareFull(w,1,3,[]).metadata.projectilesRetained).toEqual([trace]);
});
test('ordinary same-civil FX can commit as a phase and do not force a later quiet macro merely because history is retained',()=>{
 const {p,w}=setup(),trace:CoreProjectileTrace297={id:99,emittedAtCore:5,endCore:9,durationCore:4,delayCore:0,from:{x:0,z:0},to:{x:1,z:0},emp:false};move(w,5);observe(p,5,false,false,[trace]);expect(p.needsFull).toBe(false);expect(p.hasPendingProjectileEvents).toBe(true);
 p.commitPhase(p.preparePhase(w,[],1),121);expect(p.hasPendingProjectileEvents).toBe(false);move(w,10);observe(p,10,true);expect(p.canDeferFull).toBe(true);expect(p.hasPendingProjectileEvents).toBe(false);
});
test('a prepared same-civil phase cannot commit after a quiet macro has superseded its generation',()=>{
 const {p,w}=setup();move(w,5);observe(p,5);const phase=p.preparePhase(w,[],1);move(w,10);observe(p,10,true);expect(()=>p.commitPhase(phase,130)).toThrow('Stale');expect(p.needsFull).toBe(true);expect(p.canDeferFull).toBe(true);
});
