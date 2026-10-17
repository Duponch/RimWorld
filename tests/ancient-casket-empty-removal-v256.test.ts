import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {healthRandom} from '../src/sim/health.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {validateDeconstruction} from '../src/sim/deconstruction-save.ts';
import {deconstructionDuration} from '../src/sim/deconstruction-rules.ts';
import {planEmptyAncientCasketRemoval256} from '../src/sim/ancient-casket-empty-removal-256.ts';
import {validateAncientCasketPhysical256} from '../src/sim/ancient-casket-physical-256.ts';
import type {AncientCasket256} from '../src/sim/ancient-casket-state-256.ts';

/** Real existing map, declared prepared empty source only. This fixture does
 * not generate an Ancient, hide loot or claim ScatterShrines is activated. */
function fixture(){const w=medicalCamp(),p=w.pawns[0]!;w.jobs=[];w.structures=[];w.piles=[];w.packed=[];p.priorities.build=1;p.planCooldown=0;p.x=11;p.z=10;p.path=[];p.moveCooldown=0;p.state='idle';delete p.motion;
 const c:AncientCasket256={id:w.nextId++,kind:'ancient-cryptosleep-casket',x:10,z:10,orientation:0,footprint:'standard',factionId:null,casket:{revision:1,groupId:-1,heldAt:w.tick,contentsKnown:true,humans:[],animals:[],items:[]}};w.structures.push(c);return {w,p,c};}

test('empty Vanish retires the original once with no products, ledger/RNG/clock/grid/allocator rewrites',()=>{
 const {w,c}=fixture(),tick=w.tick,rng=w.rng,next=w.nextId,tiles=w.tiles,ledger=structuredClone(w.deconstructed),destroyed=structuredClone(w.destroyed),plan=planEmptyAncientCasketRemoval256(w,c,'vanish');expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);
 expect(plan.commit()).toBe(true);expect(plan.commit()).toBe(false);expect(w.structures).not.toContain(c);expect(w.piles).toEqual([]);expect(w.nextId).toBe(next);expect(w.rng).toBe(rng);expect(w.tick).toBe(tick);expect(w.tiles).toBe(tiles);expect(w.deconstructed).toEqual(ledger);expect(w.destroyed).toEqual(destroyed);expect(validateWorld(w)).toEqual([]);
});
test('ordinary engine deconstruction pays real work/contact then refunds steel90+uranium2/3, saves exact loss without fuel',()=>{
 const {w,p,c}=fixture(),prior=structuredClone(w.deconstructed);expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:c.x,z:c.z,targetId:c.id}).ok).toBe(true);const job=w.jobs.find(j=>j.deconstruction?.structureId===c.id)!;expect(job).toBeDefined();expect(deconstructionDuration(job)).toBe(2);expect(validateAncientCasketPhysical256(w)).toEqual([]);
 expect(w.structures).toContain(c);expect(w.piles).toEqual([]);for(let i=0;i<40&&w.structures.includes(c);i++)stepWorld(w);
 expect(w.structures).not.toContain(c);const steel=w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0),uranium=w.piles.filter(p=>p.item==='uranium').reduce((n,p)=>n+p.quantity,0);expect(steel).toBe(90);expect([2,3]).toContain(uranium);expect(w.piles.every(p=>p.owner.type==='ground')).toBe(true);expect(w.pawns[0]).toBe(p);
 expect(w.deconstructed.count).toBe(prior.count+1);expect(w.deconstructed.lostSteel).toBe((prior.lostSteel??0)+90);expect(w.deconstructed.lostUranium).toBe(5-uranium);expect(w.deconstructed.fuelTicks).toBe(prior.fuelTicks);expect(w.bombWaves).toBeUndefined();expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});
test('paid completion preflight uses two rounding and two occupied-rect draws with atomic source/identity witnesses',()=>{
 const {w,p,c}=fixture();expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:c.x,z:c.z,targetId:c.id}).ok).toBe(true);const j=w.jobs.find(j=>j.deconstruction?.structureId===c.id)!;
 // Explicit completed-work boundary, separate from the engine chronology case.
 p.jobId=j.id;p.state='working';j.reservedBy=p.id;j.status='active';j.progress=deconstructionDuration(j);
 const stream={rng:w.rng};healthRandom(stream);healthRandom(stream);const uranium=2+(Math.fround(((stream.rng|0)+2147483648)/4294967295)<.5?1:0);healthRandom(stream);healthRandom(stream);const before=JSON.stringify(w),plan=planEmptyAncientCasketRemoval256(w,c,'deconstruct');expect(plan.ok).toBe(true);expect(JSON.stringify(w)).toBe(before);if(!plan.ok)throw Error(plan.reason);
 expect(plan.commit()).toBe(true);expect(w.rng).toBe(stream.rng);expect(w.piles.filter(p=>p.item==='uranium').reduce((n,p)=>n+p.quantity,0)).toBe(uranium);expect(new Set(w.piles.map(p=>p.id)).size).toBe(w.piles.length);expect(w.piles.every(p=>p.id<w.nextId)).toBe(true);
 const stale=fixture(),old=planEmptyAncientCasketRemoval256(stale.w,stale.c,'vanish');expect(old.ok).toBe(true);stale.c.damage=1;const changed=serializeWorld(stale.w);if(old.ok)expect(old.commit()).toBe(false);expect(serializeWorld(stale.w)).toBe(changed);
});
test('nonterminal damage retains actual rubble and starts the real empty wick; nonempty terminal loss still refuses atomically',()=>{
 const {w,c}=fixture();expect(damageStructure(w,c,60,'bullet')).toBe(true);expect(c.damage).toBe(60);expect(w.filth?.items.some(f=>f.kind==='building-rubble')).toBe(true);expect(validateWorld(w)).toEqual([]);
 expect(damageStructure(w,c,139,'bullet')).toBe(true);expect(c.damage).toBe(199);expect(c.casketWick).toBeUndefined();expect(damageStructure(w,c,1,'bullet')).toBe(true);expect(c.damage).toBe(200);expect(c.casketWick!.endCore-c.casketWick!.startedAtCore).toBeGreaterThanOrEqual(140);expect(validateWorld(w)).toEqual([]);
 const raw=fixture();expect(damageStructure(raw.w,raw.c,1,'bullet',raw.w.rng,{core:raw.w.tick*10,rawAmount:250})).toBe(true);expect(raw.w.structures).not.toContain(raw.c);expect(raw.w.bombWaves).toHaveLength(1);
 const held=fixture();held.c.casket.items.push({id:held.w.nextId++,kind:'gold',item:'gold',quantity:1,owner:{type:'ancient-casket',casketId:held.c.id}});const before=serializeWorld(held.w);expect(damageStructure(held.w,held.c,250,'bullet')).toBe(false);expect(planEmptyAncientCasketRemoval256(held.w,held.c,'vanish').ok).toBe(false);expect(planEmptyAncientCasketRemoval256(held.w,held.c,'deconstruct').ok).toBe(false);expect(serializeWorld(held.w)).toBe(before);
});
test('allocator exhaustion and no paid worker refuse before deletion/refunds/RNG, Vanish needs no new ID',()=>{
 const {w,p,c}=fixture();expect(planEmptyAncientCasketRemoval256(w,c,'deconstruct').ok).toBe(false);expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:c.x,z:c.z,targetId:c.id}).ok).toBe(true);const j=w.jobs.find(j=>j.deconstruction?.structureId===c.id)!;p.jobId=j.id;p.state='working';j.reservedBy=p.id;j.status='active';j.progress=deconstructionDuration(j);w.nextId=Number.MAX_SAFE_INTEGER;
 const before=JSON.stringify(w);expect(planEmptyAncientCasketRemoval256(w,c,'deconstruct').ok).toBe(false);expect(JSON.stringify(w)).toBe(before);const vanish=planEmptyAncientCasketRemoval256(w,c,'vanish');expect(vanish.ok).toBe(true);if(vanish.ok)expect(vanish.commit()).toBe(true);expect(w.nextId).toBe(Number.MAX_SAFE_INTEGER);expect(w.piles).toEqual([]);
});
test('lossUranium is real prospective256 only; checkpoint/delta retain it and old/undefined/accessor counters refuse',()=>{
 const {w}=fixture();const ledger=w.deconstructed;ledger.lostUranium=2;expect(validateDeconstruction(w,256,true)).toEqual([]);expect(validateDeconstruction(w,255,true)).toContain('Invalid or future deconstructed uranium loss.');
 Object.defineProperty(ledger,'lostUranium',{value:undefined,enumerable:true,configurable:true,writable:true});expect(validateDeconstruction(w,256,true)).toContain('Invalid or future deconstructed uranium loss.');Object.defineProperty(ledger,'lostUranium',{get(){throw Error('Do not read');},enumerable:true,configurable:true});expect(validateDeconstruction(w,256,true)).toContain('Invalid or future deconstructed uranium loss.');Object.defineProperty(ledger,'lostUranium',{value:2,enumerable:true,configurable:true,writable:true});
 const enc=new SnapshotEncoder(),dec=new SnapshotDecoder(),first=dec.adopt(structuredClone(enc.encode(w,0,0)));expect(first.status,JSON.stringify(first)).toBe('applied');ledger.lostUranium=3;const next=dec.adopt(structuredClone(enc.encode(w,0,0)));expect(next.status,JSON.stringify(next)).toBe('applied');if(next.status!=='applied')throw Error('Actual delta refused');expect(next.world.deconstructed.lostUranium).toBe(3);
});
