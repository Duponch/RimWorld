/** Two independently reproduced transaction regressions from final review.
 * Both started red on the candidate before targeted ROOT repairs.
 * Prepared feature states only; no native campaign or 42k played ticks attested.
 */
import {expect,test} from 'vitest';
import {preparedTreeWrapper} from './scenarios/tree-transfer-v349';
import {medicalCamp} from './scenarios/health';
import {validateInterruptedCargo} from '../src/sim/interrupted-cargo';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {treeExpiryYield} from '../src/sim/tree-transfer-rules';
import {newBreakdownCalendar} from '../src/sim/breakdowns';
import {createApparelWearCalendar} from '../src/sim/apparel-renewal';
import {refreshStock} from '../src/sim/materials';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import type {World,Resource} from '../src/sim/types';
import type {MinifiedTreePile} from '../src/sim/tree-transfer-state';

function valid(w:World):void{expect(validateWorld(w)).toEqual([]);}
function exact(w:World):void{valid(w);expect(deserializeWorld(serializeWorld(w))).toEqual(w);}
function until(w:World,done:()=>boolean,max=250):void{
  for(let n=0;n<max&&!done();n++)stepWorld(w);
  expect(done(),`tick=${w.tick}, actor=${w.pawns[0]?.id}, job=${w.pawns[0]?.jobId}`).toBe(true);
  valid(w);
}

test('V349 future-edge cancellation retains a capable foreign queued job through exact reload and physical cargo deposit',()=>{
  const {w,pile}=preparedTreeWrapper(null),actor=w.pawns[0]!;
  expect(applyCommand(w,{type:'replant-tree',pileId:pile.id,x:24,z:20}).ok).toBe(true);
  const active=w.jobs.find(j=>j.kind==='replant-tree')!;
  until(w,()=>pile.owner.type==='pawn'&&!!actor.motion&&actor.motion.end>w.tick);
  const foreignSource:Resource={id:w.nextId++,kind:'tree',x:20,z:4,amount:12};
  w.resources.push(foreignSource);
  expect(applyCommand(w,{type:'designate',kind:'chop',x:foreignSource.x,z:foreignSource.z}).ok).toBe(true);
  const foreign=w.jobs.find(j=>j.kind==='chop')!;
  expect(applyCommand(w,{type:'order-job',pawnId:actor.id,jobId:foreign.id,queue:true}).ok).toBe(true);
  expect(actor.orders.queue).toEqual([foreign.id]);expect(foreign.reservedBy).toBe(actor.id);
  exact(w);
  const motion=structuredClone(actor.motion),owner=structuredClone(pile.owner),quantity=pile.quantity;
  expect(applyCommand(w,{type:'cancel-job',jobId:active.id}).ok).toBe(true);
  expect(w.jobs.some(j=>j.id===active.id)).toBe(false);expect(actor.jobId).toBeNull();
  expect(actor.interruptedCargo).toBe(true);expect(actor.motion).toEqual(motion);
  expect(pile.owner).toEqual(owner);expect(pile.quantity).toBe(quantity);
  // Do not delete this queue to make serialization pass: it was legitimately
  // accepted, its source and reservation still exist, and the actor can resume
  // after the existing interrupted-cargo producer reaches real contact.
  expect(actor.orders.queue).toEqual([foreign.id]);expect(foreign.reservedBy).toBe(actor.id);
  expect(validateInterruptedCargo({...w,schemaVersion:234 as World['schemaVersion']})).toContain('Invalid interrupted cargo ownership or task.');
  const forged=structuredClone(w);forged.pawns[0]!.orders.queue=[999999];expect(validateWorld(forged).length).toBeGreaterThan(0);
  exact(w); // V235 keeps the capable foreign queue without changing historical guards.
  const copy=deserializeWorld(serializeWorld(w));
  until(w,()=>actor.interruptedCargo===undefined);
  until(copy,()=>copy.pawns.find(p=>p.id===actor.id)!.interruptedCargo===undefined);
  expect(copy).toEqual(w);expect(pile.owner.type).toBe('ground');
  until(w,()=>actor.jobId===foreign.id);
  expect(actor.orders.active).toBe(foreign.id);expect(actor.orders.queue).toEqual([]);
  expect(w.resources.some(r=>r.id===foreignSource.id)).toBe(true);exact(w);
});

test('V349 expiry at the exact pile cap replaces one retired wrapper with one physically planned new stack atomically',()=>{
  const w=medicalCamp(1,200);w.tick=42000;
  w.breakdown=newBreakdownCalendar(w.seed,w.tick);
  w.apparelWear=createApparelWearCalendar(w.tick,(w.seed^w.tick^0x0a77e1)>>>0);
  const source:Resource={id:w.nextId++,kind:'tree',x:12,z:10,amount:20};
  const pile:MinifiedTreePile={id:w.nextId++,kind:'plant',item:'minified-tree',quantity:1,
    owner:{type:'ground',x:12,z:10},innerResource:source,plantPack:{packedAt:1,expiresAt:42001}};
  w.piles=[pile];
  // Non-wood filler prevents a merge that would bypass the new-identity check.
  // One pile per legal open ground cell; the wrapper is the only occupant of
  // its own cell. At commit that cell becomes free, not before its retirement.
  for(let z=0;z<w.height&&w.piles.length<32768;z++)for(let x=0;x<w.width&&w.piles.length<32768;x++){
    if(x===12&&z===10)continue;
    w.piles.push({id:w.nextId++,kind:'steel',item:'steel',quantity:1,owner:{type:'ground',x,z}});
  }
  refreshStock(w);expect(w.piles).toHaveLength(32768);exact(w);
  const nextId=w.nextId,rng=w.rng,roll=treeExpiryYield(pile,rng,1)!,copy=deserializeWorld(serializeWorld(w));
  expect(roll.quantity).toBe(10);
  // One actual tick crosses the boundary; no deadline grace or synthetic drop.
  // Current contradiction: idsAvailable counts old wrapper + the new stack,
  // refuses 32768+1 and advanceMinifiedTrees throws despite a net-zero count.
  expect(()=>stepWorld(w)).not.toThrow();expect(()=>stepWorld(copy)).not.toThrow();
  expect(copy).toEqual(w);expect(w.piles).toHaveLength(32768);
  expect(w.piles.some(p=>p.id===pile.id||p.innerResource?.id===source.id)).toBe(false);
  expect(w.resources.some(r=>r.id===source.id)).toBe(false);
  const products=w.piles.filter(p=>p.item==='wood');expect(products).toHaveLength(1);
  expect(products[0]).toMatchObject({id:nextId,quantity:10,owner:{type:'ground',x:12,z:10}});
  expect(w.nextId).toBe(nextId+1);expect(w.rng).toBe(roll.rng);exact(w);
});