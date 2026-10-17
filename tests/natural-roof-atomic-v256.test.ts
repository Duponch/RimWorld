import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {reconcileRoofSupport} from '../src/sim/roofing.ts';
import {roofCollapseProjection256} from '../src/sim/roof-collapse-projection-256.ts';
import {damageFrameFromRoof256,frameMaxHp256,validFrameDamage256,type DamagedFrame256} from '../src/sim/roof-frame-256.ts';
import {damageRetainedHumanBody256,advanceHumanCorpses} from '../src/sim/human-corpses.ts';
import {validHumanBodyShape} from '../src/sim/burial-save.ts';
import {validRetainedCorpseDamage256} from '../src/sim/retained-corpse-damage-256.ts';
import {injurePawn,reconcilePawnHealth,healthRandom} from '../src/sim/health.ts';
import {createMedicalRecord,addResolvedInjury} from '../src/sim/injury-state.ts';
import type {Job} from '../src/sim/types.ts';
function camp(){const w=deconstructionCamp();Object.assign(w,{schemaVersion:256});return w;}
function frame(w:ReturnType<typeof camp>):Job{
 const j:Job={id:w.nextId++,kind:'bed',x:16,z:16,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:8,food:0},construction:'frame'};
 w.jobs.push(j);return j;
}

test('late roof refusal leaves actual bodies, things, identities and both random streams unchanged',()=>{
 const w=camp(),at=16*w.width+18;
 addMaterial(w,'wood',3,{type:'ground',x:18,z:16},'wood');const wood=w.piles.find(p=>p.item==='wood')!;wood.damage=149;
 w.resources.push({id:w.nextId++,kind:'rice',x:18,z:16,amount:1,growth:1,growthTick:w.tick,damage:149});
 w.destroyed={count:0,lost:{},resources:{rice:Number.MAX_SAFE_INTEGER}};
 w.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[at],thick:[]}};
 const before=JSON.stringify(w),piles=w.piles,resources=w.resources,person=w.pawns[0],tile=w.tiles[at];
 expect(()=>reconcileRoofSupport(w,false,{x:17,z:16})).toThrow();
 expect(JSON.stringify(w)).toBe(before);expect(w.piles).toBe(piles);expect(w.resources).toBe(resources);expect(w.piles[0]).toBe(wood);expect(w.pawns[0]).toBe(person);expect(w.tiles[at]).toBe(tile);
});

test('killed Frame returns quarter of actual delivered supplies, preserving condition with a real fragment',()=>{
 const w=camp(),j=frame(w);addMaterial(w,'wood',8,{type:'job',jobId:j.id},'wood');
 const held=w.piles.find(p=>p.owner.type==='job')!;held.damage=20;const originalId=held.id,allocation=w.nextId;
 const plan=roofCollapseProjection256(w),draft=plan.view,copy=draft.jobs.find(p=>p.id===j.id)!;
 expect(damageFrameFromRoof256(draft,copy,99999,true)).toBe(true);
 expect(w.jobs).toContain(j);expect(w.piles).toContain(held);expect(held.quantity).toBe(8);
 expect(plan.finish().adopt()).toBe(true);
 const returned=w.piles.filter(p=>p.owner.type==='ground'&&p.item==='wood');
 expect(returned.reduce((n,p)=>n+p.quantity,0)).toBe(2);expect(returned[0]).toMatchObject({id:allocation,damage:20});
 expect(w.piles.some(p=>p.id===originalId)).toBe(false);expect(w.destroyed?.items?.wood).toBe(6);expect(w.jobs).not.toContain(j);
});

test('whole actual Frame leaving keeps its identity; no recipe supplies or new ID are offered',()=>{
 const w=camp(),j=frame(w);j.escrow.wood=1;addMaterial(w,'wood',1,{type:'job',jobId:j.id},'wood');
 const held=w.piles.find(p=>p.owner.type==='job')!,allocation=w.nextId;w.rng=1;
 const plan=roofCollapseProjection256(w);expect(damageFrameFromRoof256(plan.view,plan.view.jobs.find(p=>p.id===j.id)!,99999,true)).toBe(true);
 expect(plan.finish().adopt()).toBe(true);expect(w.nextId).toBe(allocation);expect(w.piles).toContain(held);
 expect(held).toMatchObject({quantity:1,owner:{type:'ground',x:16,z:16}});expect(w.destroyed?.items?.wood??0).toBe(0);
});

test('Frame partial HP and future fields are strict without evaluating malformed header getters',()=>{
 const w=camp(),j=frame(w);expect(frameMaxHp256(j)).toBeGreaterThan(10);
 const plan=roofCollapseProjection256(w);expect(damageFrameFromRoof256(plan.view,plan.view.jobs.find(p=>p.id===j.id)!,10,false)).toBe(true);
 expect(plan.finish().adopt()).toBe(true);expect((j as DamagedFrame256).frameDamage).toBe(10);
 expect(validFrameDamage256(j,256)).toBe(true);expect(validFrameDamage256(j,255)).toBe(false);
 expect(validFrameDamage256({...j,construction:'blueprint'},256)).toBe(false);expect(validFrameDamage256({...j,frameDamage:undefined},256)).toBe(false);
 let reads=0;const bad=Object.defineProperty({frameDamage:10,kind:'wall'},'construction',{get(){reads++;throw Error('getter');}});
 expect(validFrameDamage256(bad,256)).toBe(false);expect(reads).toBe(0);
});

test('real retained human body transfers existing HP damage to its eventual actual corpse pile',()=>{
 const w=camp(),p=w.pawns[0]!;injurePawn(w,p,'brain','crush',99000);expect(p.state).toBe('dead');
 expect(damageRetainedHumanBody256(w,p,20)).toBe(true);expect(p.body?.damage).toBe(20);
 expect(validHumanBodyShape(p.body,256,w.tick)).toBe(true);expect(validHumanBodyShape(p.body,255,w.tick)).toBe(false);
 p.motion=null;p.moveCooldown=0;advanceHumanCorpses(w);
 const pile=w.piles.find(a=>a.humanCorpse?.pawnId===p.id);expect(pile).toBeDefined();expect(pile?.damage).toBe(20);
 expect(p.body?.pileId).toBe(pile?.id);expect(p.body?.damage).toBeUndefined();
});

test('stale projection refuses before patching original objects or RNG; retained actor scalar rejects malformed data',()=>{
 const w=camp(),p=w.pawns[0]!,plan=roofCollapseProjection256(w);plan.view.pawns[0]!.hunger=12;plan.view.rng=123;
 const prepared=plan.finish(),rng=w.rng;p.hunger=99;expect(prepared.adopt()).toBe(false);expect(p.hunger).toBe(99);expect(w.rng).toBe(rng);
 expect(validRetainedCorpseDamage256({state:'dead',health:{death:{tick:0}},corpseDamage:20},256)).toBe(true);
 expect(validRetainedCorpseDamage256({state:'dead',health:{death:{tick:0}},corpseDamage:undefined},256)).toBe(false);
 expect(validRetainedCorpseDamage256({state:'dead',health:{death:{tick:0}},corpseDamage:20},255)).toBe(false);
 expect(validRetainedCorpseDamage256({state:'idle',corpseDamage:20},256)).toBe(false);
 let reads=0;const bad=Object.defineProperty({state:'dead',corpseDamage:20},'health',{get(){reads++;throw Error('getter');}});
 expect(validRetainedCorpseDamage256(bad,256)).toBe(false);expect(reads).toBe(0);
});

test('new roof clinical interruption preserves the actual carry owner over its unfinished edge',()=>{
 const w=camp(),p=w.pawns[0]!,from={x:p.x,z:p.z},to={x:p.x+1,z:p.z};
 p.x=to.x;p.motion={from,to,start:w.tick,end:w.tick+1,speedFactor:1,terrainDelay:0};p.moveCooldown=1;
 addMaterial(w,'wood',2,{type:'pawn',pawnId:p.id},'wood');const held=w.piles.find(a=>a.owner.type==='pawn')!;
 const plan=roofCollapseProjection256(w),copy=plan.view.pawns[0]!,record=createMedicalRecord(w.tick),random={rng:plan.view.rng};
 addResolvedInjury(record,'brain','crush',99000,()=>healthRandom(random));copy.health=record;plan.view.rng=random.rng;
 reconcilePawnHealth(plan.view,copy,undefined,true,true);
 expect(plan.finish().adopt()).toBe(true);expect(p.state).toBe('dead');expect(p.interruptedCargo).toBe(true);
 expect(w.piles).toContain(held);expect(held.owner).toEqual({type:'pawn',pawnId:p.id});expect(p.motion?.from).toEqual(from);expect(p.motion?.end).toBe(w.tick+1);
});
