import {expect,test} from 'vitest';
import {applyCommand,advanceWorldCore297} from '../src/sim/engine.ts';
import {effectiveCore297,effectiveLocal297} from '../src/sim/core-phase-297.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {newShipCasketHolder277,type ShipCasket277} from '../src/sim/ship-casket-state-277.ts';
import {retireShipWorkDraft298} from '../src/sim/ship-work-retirement-draft-298.ts';
import {declaredFixture} from './helpers/declared-ship-content298.ts';
import type {World} from '../src/sim/types.ts';

/* Declared service-only diagnostic fixture, not a mission or construction
 * receipt. Source10's finite32² engineering fixture is reused; one installed
 * empty spatial casket is declared as in the existing service fixture. The
 * jobs and casket service below come from ordinary commands. A helper is
 * called only on a separate structuredClone, never on the preparation source.
 * Explicit worker/cargo/queue preparations are stated in each case; no resulting
 * diagnostic World is claimed as a Whole/reload, valid launch or real departure. */
function serviceFixture(){
 const source=declaredFixture(),p=source.pawns[0]!;
 p.x=13;p.z=10;p.path=[];p.moveCooldown=0;p.planCooldown=0;p.jobId=null;p.state='idle';delete p.motion;delete p.draft;
 const casket:ShipCasket277={id:source.nextId++,kind:'ship-cryptosleep-casket',x:14,z:10,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null},shipCryptosleep277:newShipCasketHolder277(source.tick)};
 source.structures.push(casket);
 return {source,p,casket,bed:source.structures.find(s=>s.kind==='bed')!};
}
function designate(source:World,s:{id:number;x:number;z:number}){
 expect(applyCommand(source,{type:'designate',kind:'deconstruct',x:s.x,z:s.z}).ok).toBe(true);
 const job=source.jobs.find(j=>j.deconstruction?.structureId===s.id)!;expect(job).toBeDefined();return job;
}
const quantities=(w:World)=>Object.fromEntries([...new Set(w.piles.map(p=>p.item))].sort().map(item=>[item,w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0)]));

test('remaining stationary work and delivered cargo retire by original identity while unrelated queued work is retained',()=>{
 const {source,casket,bed}=serviceFixture(),retired=designate(source,casket),kept=designate(source,bed),sourceBefore=JSON.stringify(source);
 const view=structuredClone(source),p=view.pawns[0]!,part=view.structures.find(s=>s.id===casket.id)!,job=view.jobs.find(j=>j.id===retired.id)!,other=view.jobs.find(j=>j.id===kept.id)!;
 // Explicit own-work/queue fixture. No work step or reservation acquisition is
 // credited: these states test the real release and placement services only.
 p.jobId=job.id;p.state='working';job.reservedBy=p.id;p.orders.queue=[job.id,other.id];
 addMaterial(view,'steel',3,{type:'job',jobId:job.id},'steel');
 addMaterial(view,'steel',1,{type:'pawn',pawnId:p.id},'steel');refreshStock(view);
 const delivered=view.piles.find(q=>q.owner.type==='job'&&q.owner.jobId===job.id)!,carried=view.piles.find(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id)!;
 const ids=view.piles.map(q=>q.id),total=quantities(view),rng=view.rng,nextId=view.nextId,core=effectiveCore297(view),otherBefore=JSON.stringify(other);
 expect(retireShipWorkDraft298(view,[part])).toEqual({ok:true});
 expect(view.pawns[0]).toBe(p);expect(view.structures).toContain(part); // Caller owns actual part retirement.
 expect(view.jobs).not.toContain(job);expect(view.jobs).toContain(other);expect(JSON.stringify(other)).toBe(otherBefore);
 expect(p.orders.queue).toEqual([other.id]);expect(p.jobId).toBeNull();
 expect(view.piles.find(q=>q.id===delivered.id)).toBe(delivered);expect(view.piles.find(q=>q.id===carried.id)).toBe(carried);
 expect(delivered.owner).toEqual({type:'ground',x:job.x,z:job.z});expect(carried.owner.type).toBe('ground');
 expect(view.piles.map(q=>q.id)).toEqual(ids);expect(quantities(view)).toEqual(total);
 expect(view.rng).toBe(rng);expect(view.nextId).toBe(nextId);expect(effectiveCore297(view)).toBe(core);expect(JSON.stringify(source)).toBe(sourceBefore);
});

test('a genuinely paid edge keeps its captured motion and carried original when its declared work destination retires',()=>{
 const {source,p,casket,bed}=serviceFixture(),retired=designate(source,casket),kept=designate(source,bed);
 p.x=3;p.z=5;for(const key of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[key]=0;
 expect(applyCommand(source,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);
 expect(applyCommand(source,{type:'draft-move',pawnIds:[p.id],target:{x:12,z:5},queue:false}).ok).toBe(true);
 const before=effectiveCore297(source);expect(advanceWorldCore297(source).core).toBe(before+1);
 expect(p.motion).toBeDefined();expect(p.motion!.start).toBeLessThan(effectiveLocal297(source));expect(p.motion!.end).toBeGreaterThan(effectiveLocal297(source));
 const sourceBefore=JSON.stringify(source),view=structuredClone(source),worker=view.pawns[0]!,part=view.structures.find(s=>s.id===casket.id)!,job=view.jobs.find(j=>j.id===retired.id)!;
 // Only the work/cargo association is diagnostic. The edge itself was armed
 // by the ordinary player command and has consumed one real Core above.
 worker.jobId=job.id;job.reservedBy=worker.id;worker.orders.queue=[kept.id];
 addMaterial(view,'steel',2,{type:'pawn',pawnId:worker.id},'steel');refreshStock(view);
 const carried=view.piles.find(q=>q.owner.type==='pawn'&&q.owner.pawnId===worker.id)!,motion=worker.motion!,paid=JSON.stringify(motion),position={x:worker.x,z:worker.z};
 const total=quantities(view),rng=view.rng,nextId=view.nextId,core=effectiveCore297(view),draft=JSON.stringify(worker.draft);
 expect(retireShipWorkDraft298(view,[part])).toEqual({ok:true});
 expect(worker.motion).toBe(motion);expect(JSON.stringify(worker.motion)).toBe(paid);expect(worker).toMatchObject(position);expect(JSON.stringify(worker.draft)).toBe(draft);
 expect(view.piles.find(q=>q.id===carried.id)).toBe(carried);expect(carried.owner).toEqual({type:'pawn',pawnId:worker.id});
 expect(worker.interruptedCargo).toBe(true);expect(worker.planCooldown).toBe(0);expect(worker.jobId).toBeNull();expect(worker.orders.queue).toEqual([kept.id]);
 expect(quantities(view)).toEqual(total);expect(view.rng).toBe(rng);expect(view.nextId).toBe(nextId);expect(effectiveCore297(view)).toBe(core);expect(JSON.stringify(source)).toBe(sourceBefore);
});

test('an ordinary casket service targeting a retiring part is released without changing its holder or unrelated work',()=>{
 const {source,p,casket,bed}=serviceFixture(),kept=designate(source,bed);
 expect(applyCommand(source,{type:'order-enter-ship-casket',pawnId:p.id,casketId:casket.id}).ok).toBe(true);
 expect(p.shipCasketTask277?.casketId).toBe(casket.id);
 const sourceBefore=JSON.stringify(source),view=structuredClone(source),worker=view.pawns[0]!,part=view.structures.find(s=>s.id===casket.id) as ShipCasket277;
 worker.orders.queue=[kept.id]; // Explicit unrelated queued-work fixture.
 const holder=part.shipCryptosleep277,holderBefore=JSON.stringify(holder),other=view.jobs.find(j=>j.id===kept.id)!,otherBefore=JSON.stringify(other),rng=view.rng,nextId=view.nextId,core=effectiveCore297(view);
 expect(retireShipWorkDraft298(view,[part])).toEqual({ok:true});
 expect(worker.shipCasketTask277).toBeUndefined();expect(worker.orders.queue).toEqual([kept.id]);
 expect(part.shipCryptosleep277).toBe(holder);expect(JSON.stringify(holder)).toBe(holderBefore);expect(view.structures).toContain(part);
 expect(view.jobs).toContain(other);expect(JSON.stringify(other)).toBe(otherBefore);
 expect(view.rng).toBe(rng);expect(view.nextId).toBe(nextId);expect(effectiveCore297(view)).toBe(core);expect(JSON.stringify(source)).toBe(sourceBefore);
});
