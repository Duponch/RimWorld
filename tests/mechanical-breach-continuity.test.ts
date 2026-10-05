import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { beforeAll,expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { decodeStoredSave } from '../src/ui/save-storage-codec.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { damageStructure,structureMaxHp } from '../src/sim/thing-damage.ts';
import { damageBarrier } from '../src/sim/barriers.ts';
import { finishDeconstruction } from '../src/sim/deconstruction.ts';
import { healthRandom } from '../src/sim/health.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';

const WALL_ID=382,BEFORE_BREACH=271559,BREACH_TICK=271560;
let prefix:string;
let approachPrefix:string;

function publish(w:World,encoder:SnapshotEncoder,decoder:SnapshotDecoder,checkpoint=false):World {
  // postMessage clones the dynamic owners synchronously in the real worker.
  const result=decoder.adopt(structuredClone(encoder.encode(w,0,0,checkpoint)));
  expect(result,`Transport at tick ${w.tick}`).toMatchObject({status:'applied'});
  if(result.status!=='applied')throw Error(JSON.stringify(result));
  return result.world;
}

beforeAll(async()=>{
  const raw=await decodeStoredSave(readFileSync('public/test-saves/v219/ranged-mech.json','utf8'));
  expect(createHash('sha256').update(raw).digest('hex')).toBe('917d4374964a8894131c602f28ea10353976f3aaa896786ab5b944c5abc0e7b6');
  const w=deserializeWorld(raw),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(w.schemaVersion).toBe(SCHEMA_VERSION);expect(w.tick).toBe(270090);
  expect(applyCommand(w,{type:'draft',pawnIds:w.pawns.map(p=>p.id),enabled:true}).ok).toBe(true);
  publish(w,encoder,decoder,true);
  // The authored payload and the ordinary Cassandra/assault/contact producers
  // reach the actual last intact wall. No damage, phase, clock or RNG is patched.
  for(let elapsed=0;elapsed<1600&&w.tick<BEFORE_BREACH;elapsed++){
    stepWorld(w);publish(w,encoder,decoder);
    if(!approachPrefix&&w.mechanoids?.some(m=>m.melee?.order?.structure&&(m.motion?.end??0)>w.tick)){
      expect(validateWorld(w)).toEqual([]);approachPrefix=serializeWorld(w);
    }
    if(w.structures.some(s=>s.id===WALL_ID&&s.damage))expect(validateWorld(w),`Damaged wall at tick ${w.tick}`).toEqual([]);
  }
  expect(w.tick).toBe(BEFORE_BREACH);expect(validateWorld(w)).toEqual([]);
  prefix=serializeWorld(w);expect(approachPrefix).toBeDefined();
},30_000);

test('the unchanged public scene physically reaches a shared nearly destroyed wall with two independent recoveries',()=>{
  const w=deserializeWorld(prefix),wall=w.structures.find(s=>s.id===WALL_ID)!;
  expect(wall).toMatchObject({kind:'wall',material:'wood',x:23,z:19,damage:181});
  expect(structureMaxHp(wall)-wall.damage!).toBe(14);
  expect(w.raids!.mechActive!.phase).toBe('assault');
  const lancer=w.mechanoids!.find(m=>m.id===393)!,pikeman=w.mechanoids!.find(m=>m.id===394)!;
  expect(lancer.melee).toMatchObject({order:{targetId:WALL_ID,structure:true},strike:{atCore:2715473,untilCore:2715593}});
  expect(pikeman.melee).toMatchObject({order:{targetId:WALL_ID,structure:true},strike:{atCore:2715476,untilCore:2715596}});
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  publish(w,new SnapshotEncoder(),new SnapshotDecoder(),true);
});

test('a real lethal hit retires every mechanical barrier order immediately while both paid recoveries and exact replay survive',()=>{
  const w=deserializeWorld(prefix),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  publish(w,encoder,decoder,true);stepWorld(w);
  expect(w.tick).toBe(BREACH_TICK);expect(w.structures.some(s=>s.id===WALL_ID)).toBe(false);
  const lancer=w.mechanoids!.find(m=>m.id===393)!,pikeman=w.mechanoids!.find(m=>m.id===394)!;
  // The lower ID has already paid its new contact before the higher ID's lethal
  // hit. Its strike must remain historical, but its vanished target cannot own
  // an intention while recovery delays the next physical decision.
  expect(lancer.melee).toEqual({order:null,strike:{targetId:WALL_ID,structure:{x:23,z:19},atCore:2715593,untilCore:2715713,tool:'left-fist',outcome:'hit'}});
  expect(pikeman.melee).toEqual({order:null,strike:{targetId:WALL_ID,structure:{x:23,z:19},atCore:2715596,untilCore:2715716,tool:'right-fist',outcome:'hit'}});
  expect(lancer.path).toEqual([]);expect(lancer.raid!.goal).toBeNull();
  expect(validateWorld(w)).toEqual([]);publish(w,encoder,decoder);
  publish(w,encoder,decoder,true);
  const restored=deserializeWorld(serializeWorld(w));expect(restored).toEqual(w);
  for(let elapsed=0;elapsed<100;elapsed++){
    stepWorld(w);stepWorld(restored);expect(restored).toEqual(w);
    expect(validateWorld(w),`Continuation at tick ${w.tick}`).toEqual([]);publish(w,encoder,decoder);
  }
});

test.each(['bullet','bomb','fire','animal-barrier','deconstruction'] as const)('%s removal during a genuine approach retires the vanished barrier intention and retains the committed edge',cause=>{
  const w=deserializeWorld(approachPrefix),m=w.mechanoids!.find(m=>m.melee?.order?.structure&&(m.motion?.end??0)>w.tick)!;
  // This edge and barrier mandate were captured from the same unchanged public
  // replay. Only the removal boundary's external cause differs in this matrix.
  expect(m.melee?.order?.structure).toBe(true);
  expect(m.motion!.end).toBeGreaterThan(w.tick);expect(m.state).toBe('moving');
  expect(m.melee!.strike).toBeNull();
  const target=w.structures.find(s=>s.id===m.melee!.order!.targetId)!,edge=structuredClone(m.motion),cooldown=m.moveCooldown;
  expect(target).toMatchObject({kind:'wall',material:'wood'});
  if(cause==='deconstruction')expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:target.x,z:target.z}).ok).toBe(true);
  expect(validateWorld(w)).toEqual([]);
  const state=m.state,planCooldown=m.planCooldown,rng=w.rng,nextId=w.nextId,piles=structuredClone(w.piles);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();publish(w,encoder,decoder,true);
  const refundRandom={rng};
  if(cause==='deconstruction'){
    const job=w.jobs.find(j=>j.deconstruction?.structureId===target.id)!;
    // Exercise the material commit boundary directly with a real designation;
    // no builder journey or work duration is certified by this focused case.
    expect(finishDeconstruction(w,w.pawns[0]!,job)).toBe(true);healthRandom(refundRandom);
  }else if(cause==='animal-barrier')expect(damageBarrier(w,target,structureMaxHp(target),rng)).toBe(true);
  else expect(damageStructure(w,target,structureMaxHp(target),cause,rng,{core:w.tick*10,rawAmount:structureMaxHp(target),instigatorKey:`pawn:${w.pawns[0]!.id}`})).toBe(true);
  expect(w.structures).not.toContain(target);expect(m.melee).toBeUndefined();expect(m.path).toEqual([]);expect(m.raid!.goal).toBeNull();
  expect(m.motion).toEqual(edge);expect(m.moveCooldown).toBe(cooldown);expect(m.state).toBe(state);expect(m.planCooldown).toBe(planCooldown);
  if(cause==='deconstruction'){
    expect(w.rng).toBe(refundRandom.rng);expect(w.nextId).toBe(nextId+1);
    const returned=w.piles.filter(p=>!piles.some(old=>old.id===p.id));expect(returned).toHaveLength(1);
    expect(returned[0]).toMatchObject({item:'wood',owner:{type:'ground',x:target.x,z:target.z}});
    expect(returned[0]!.quantity).toBeGreaterThanOrEqual(2);expect(returned[0]!.quantity).toBeLessThanOrEqual(3);
    expect(w.deconstructed).toMatchObject({count:1,lostWood:5-returned[0]!.quantity,fuelTicks:0});
    expect(w.piles.filter(p=>piles.some(old=>old.id===p.id))).toEqual(piles);
  }else{
    expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(w.piles).toEqual(piles);
    expect(w.destroyed).toMatchObject({count:1,lost:{wood:5}});
  }
  expect(validateWorld(w)).toEqual([]);publish(w,encoder,decoder);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test.each(['structure','animal-barrier','deconstruction'] as const)('a late %s removal refusal retains all barrier orders, edges, materials and random state exactly',cause=>{
  const w=deserializeWorld(approachPrefix),m=w.mechanoids!.find(m=>m.melee?.order?.structure&&(m.motion?.end??0)>w.tick)!;
  const target=w.structures.find(s=>s.id===m.melee!.order!.targetId)!;
  // Author only a valid saturation boundary. The actual approach, contact
  // intent and edge still come from the public scene's physical producers.
  if(cause==='deconstruction'){
    expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:target.x,z:target.z}).ok).toBe(true);
    w.deconstructed.count=Number.MAX_SAFE_INTEGER;
  }else w.destroyed={count:Number.MAX_SAFE_INTEGER,lost:{wood:5}};
  expect(validateWorld(w)).toEqual([]);const before=structuredClone(w);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();publish(w,encoder,decoder,true);
  if(cause==='deconstruction'){
    const job=w.jobs.find(j=>j.deconstruction?.structureId===target.id)!;
    expect(finishDeconstruction(w,w.pawns[0]!,job)).toBe(false);
  }else if(cause==='animal-barrier')expect(damageBarrier(w,target,structureMaxHp(target),w.rng)).toBe(false);
  else expect(damageStructure(w,target,structureMaxHp(target),'bullet',w.rng,{core:w.tick*10,rawAmount:structureMaxHp(target),instigatorKey:`pawn:${w.pawns[0]!.id}`})).toBe(false);
  // Refusing the final ledger increment must also refuse the cleanup itself.
  expect(w).toEqual(before);expect(validateWorld(w)).toEqual([]);
  expect(publish(w,encoder,decoder)).toEqual(before);expect(deserializeWorld(serializeWorld(w))).toEqual(before);
});
