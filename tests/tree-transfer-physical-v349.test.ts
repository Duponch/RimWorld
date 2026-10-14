import {expect,test} from 'vitest';
import {preparedTreeWrapper,treeTransferScene} from './scenarios/tree-transfer-v349';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {advanceMinifiedTrees,treeHeldPosition,isMinifiedTree} from '../src/sim/tree-transfer';
import {treeExpiryYield} from '../src/sim/tree-transfer-rules';
import {damagePile,damageResource} from '../src/sim/thing-damage';
import {applyBulletStagger} from '../src/sim/stagger';
import {newBreakdownCalendar} from '../src/sim/breakdowns';
import {createApparelWearCalendar} from '../src/sim/apparel-renewal';
import {refreshStock} from '../src/sim/materials';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization';
import type {World} from '../src/sim/types';

// Declared late-epoch legacy scenes. The genuine actor planner, pickup, segment,
// stagger, damage and expiry producers run; the seven-day stamp is a prepared
// boundary checkpoint, not a claim of 42,000 played ticks or a human campaign.
function valid(w:World){expect(validateWorld(w)).toEqual([]);}
function exact(w:World){valid(w);expect(deserializeWorld(serializeWorld(w))).toEqual(w);}
function until(w:World,done:()=>boolean,max=180){for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,pawns:w.pawns,jobs:w.jobs,piles:w.piles})).toBe(true);valid(w);}
function lateWrapper(){
  const {w,pile,source}=preparedTreeWrapper(null);w.tick=42000;
  w.breakdown=newBreakdownCalendar(w.seed,w.tick);w.apparelWear=createApparelWearCalendar(w.tick,(w.seed^w.tick^0x0a77e1)>>>0);
  source.amount=200;delete source.damage;pile.plantPack={packedAt:w.tick,expiresAt:w.tick+42000};refreshStock(w);exact(w);return {w,pile,source};
}
function nearDeadline(w:World,pile:ReturnType<typeof lateWrapper>['pile']){pile.plantPack={packedAt:w.tick+1-42000,expiresAt:w.tick+1};exact(w);}
function actualCarrier(segment:boolean){
  const scene=lateWrapper(),{w,pile}=scene,p=w.pawns[0]!;
  expect(applyCommand(w,{type:'replant-tree',pileId:pile.id,x:24,z:20}).ok).toBe(true);
  until(w,()=>pile.owner.type==='pawn'&&(!segment||!!p.motion&&p.motion.end>w.tick));
  if(segment){applyBulletStagger(w,p,w.tick*10,1);stepWorld(w,2);expect(p.motion!.end).toBeGreaterThan(w.tick);expect(treeHeldPosition(p,w.tick)).toEqual(p.motion!.from);}
  nearDeadline(w,pile);return {...scene,p};
}
const products=(w:World)=>w.piles.filter(p=>p.item==='wood');
const units=(w:World)=>products(w).reduce((n,p)=>n+p.quantity,0);

// This bypasses no actors: the held wrapper below came from a real tree Job.
test('V349 ground seven-day boundary uses real World output placement and splits a legacy yield above 75',()=>{
  const {w,pile,source}=lateWrapper();nearDeadline(w,pile);const id=pile.id,originalId=source.id,roll=treeExpiryYield(pile,w.rng,1)!,nextId=w.nextId;
  expect(roll.quantity).toBe(100);const copy=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  expect(w.piles.some(p=>p.id===id||isMinifiedTree(p))).toBe(false);expect(w.resources.some(r=>r.id===originalId)).toBe(false);
  expect(products(w).map(p=>p.quantity)).toEqual([75,25]);expect(products(w)[0]!.owner).toEqual({type:'ground',x:12,z:10});expect(units(w)).toBe(100);expect(new Set(products(w).map(p=>p.id)).size).toBe(2);expect(w.nextId).toBe(nextId+2);expect(w.rng).toBe(roll.rng);exact(w);
});

test.each([false,true])('V349 expiry at a real held segment=%s keeps the captured edge and drops split remains at the physical carrier',segment=>{
  const {w,pile,source,p}=actualCarrier(segment),physical=segment?structuredClone(p.motion!.from):{x:p.x,z:p.z},edge=structuredClone(p.motion),roll=treeExpiryYield(pile,w.rng,1)!;
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  expect(units(w)).toBe(100);expect(products(w).map(p=>p.quantity)).toEqual([75,25]);expect(products(w)[0]!.owner).toEqual({type:'ground',...physical});expect(products(w).every(p=>p.owner.type==='ground')).toBe(true);
  expect(w.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)).toBe(false);expect(w.jobs.some(j=>j.tree?.resourceId===source.id)).toBe(false);expect(p.jobId).toBeNull();expect(p.orders.queue).toEqual([]);expect(p.interruptedCargo).toBeUndefined();expect(w.resources.some(r=>r.id===source.id)).toBe(false);expect(w.rng).toBe(roll.rng);
  if(segment)expect(p.motion).toEqual(edge);exact(w);
});

test('V349 fatal wrapper damage on a real staggered edge releases exact tree claims and places remains before the future logical cell',()=>{
  const {w,pile,source,p}=actualCarrier(true),edge=structuredClone(p.motion)!,physical={...edge.from},roll=treeExpiryYield(pile,w.rng,1)!,original=structuredClone(source);
  expect(damagePile(w,pile,100,'bomb')).toBe(true);expect(p.motion).toEqual(edge);expect(products(w).map(i=>i.quantity)).toEqual([75,25]);expect(products(w)[0]!.owner).toEqual({type:'ground',...physical});expect(products(w).every(i=>i.owner.type==='ground')).toBe(true);expect(w.rng).toBe(roll.rng);expect(source).toEqual(original);
  expect(w.piles.some(i=>i.id===pile.id)).toBe(false);expect(w.resources.some(r=>r.id===source.id)).toBe(false);expect(w.jobs.some(j=>j.tree?.resourceId===source.id)).toBe(false);expect(p.jobId).toBeNull();expect(p.interruptedCargo).toBeUndefined();exact(w);
});

test('V349 ordinary wrapper wear changes its own HP without damaging, duplicating or yielding the contained original',()=>{
  const {w,pile,source}=lateWrapper(),original=structuredClone(source),rng=w.rng,deadline=pile.plantPack.expiresAt;
  expect(damagePile(w,pile,99,'bullet')).toBe(true);expect(pile.damage).toBe(99);expect(pile.innerResource).toBe(source);expect(source).toEqual(original);expect(pile.plantPack.expiresAt).toBe(deadline);expect(products(w)).toEqual([]);expect(w.rng).toBe(rng);exact(w);
});

test('V349 fatal large legacy wrapper output refuses a full real map before any loss, draw, ID or owner mutation',()=>{
  const {w,pile}=lateWrapper();for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(x!==12||z!==10)w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:75,owner:{type:'ground',x,z}});refreshStock(w);exact(w);const before=structuredClone(w);
  expect(damagePile(w,pile,100,'bomb')).toBe(false);expect(w).toEqual(before);expect(w.piles.includes(pile)).toBe(true);exact(w);
});

test.each([false,true])('V349 destroying the original of an active=%s extraction releases that identity while keeping its wall plan',active=>{
  const w=treeTransferScene('oak',.1),source=w.resources[0]!,p=w.pawns[0]!;
  expect(applyCommand(w,{type:'designate',kind:'wall',material:'wood',x:source.x,z:source.z}).ok).toBe(true);const wallId=w.jobs.find(j=>j.kind==='wall')!.id;
  expect(applyCommand(w,{type:'extract-tree',resourceId:source.id}).ok).toBe(true);const extractId=w.jobs.find(j=>j.kind==='extract-tree')!.id;if(active)until(w,()=>w.jobs.find(j=>j.id===extractId)!.progress>0);exact(w);
  expect(damageResource(w,source,200,'bomb')).toBe(true);expect(w.resources.some(r=>r.id===source.id)).toBe(false);expect(w.jobs.some(j=>j.id===extractId)).toBe(false);expect(w.jobs.some(j=>j.id===wallId)).toBe(true);expect(w.pawns.every(actor=>actor.jobId!==extractId&&!actor.orders.queue.includes(extractId))).toBe(true);if(active)expect(p.jobId).toBeNull();expect(w.piles.some(isMinifiedTree)).toBe(false);expect(products(w)).toEqual([]);exact(w);
});

// Direct shared producer remains callable outside engine dispatch and applies
// no output while its owner's own deadline is still in the future.
test('V349 early expiry dispatch is a no-op on a valid late-epoch original',()=>{const {w}=lateWrapper(),before=structuredClone(w);advanceMinifiedTrees(w);expect(w).toEqual(before);exact(w);});

test.each(['damage','expiry'] as const)('V349 %s of retained interrupted tree cargo clears only the now-empty retention flag',mode=>{
 const {w,pile,p}=actualCarrier(true),job=w.jobs.find(j=>j.kind==='replant-tree')!,motion=structuredClone(p.motion);
 expect(applyCommand(w,{type:'cancel-job',jobId:job.id}).ok).toBe(true);expect(p.interruptedCargo).toBe(true);expect(pile.owner.type).toBe('pawn');exact(w);
 if(mode==='damage')expect(damagePile(w,pile,100,'bullet')).toBe(true);else{pile.plantPack={packedAt:w.tick-42000,expiresAt:w.tick};advanceMinifiedTrees(w);}
 expect(w.piles.some(i=>i.id===pile.id)).toBe(false);expect(p.motion).toEqual(motion);expect(p.interruptedCargo).toBeUndefined();expect(products(w).every(i=>i.owner.type==='ground')).toBe(true);exact(w);
});
