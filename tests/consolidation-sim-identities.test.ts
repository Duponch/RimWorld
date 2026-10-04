import { expect, test } from 'vitest';
import { applyCommand, stepWorld } from '../src/sim/engine.ts';
import { addMaterial, refreshStock, transferPile } from '../src/sim/materials.ts';
import { removeIdentity } from '../src/sim/collection-remove.ts';
import { jobDuration } from '../src/sim/farming.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';

function finishing(nextId:number) {
  const w = deconstructionCamp();w.tick=2000;const p=w.pawns[0]!;p.x=15;p.z=16;
  expect(applyCommand(w,{type:'designate',kind:'stool',x:16,z:16}).ok).toBe(true);
  const job=w.jobs[0]!;job.construction='frame';addMaterial(w,'wood',25,{type:'job',jobId:job.id},'wood');
  job.progress=jobDuration(w,job)-1;
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false}).ok).toBe(true);
  w.nextId=nextId;refreshStock(w);expect(validateWorld(w)).toEqual([]);
  return {w,job};
}

test('identity exhaustion at final construction preserves delivered matter, RNG, frame and saveability', () => {
  const {w,job}=finishing(Number.MAX_SAFE_INTEGER);const piles=structuredClone(w.piles),rng=w.rng;
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(copy);
  expect(w.nextId).toBe(Number.MAX_SAFE_INTEGER);expect(w.rng).toBe(rng);expect(w.piles).toEqual(piles);
  expect(w.jobs).toContain(job);expect(w.structures).toHaveLength(0);expect(job.progress).toBeLessThan(jobDuration(w,job));
  expect(validateWorld(w)).toEqual([]);expect(serializeWorld(w)).toBe(serializeWorld(copy));
});

test('the final allocatable identity finishes normally when the following nextId is still safe', () => {
  const {w,job}=finishing(Number.MAX_SAFE_INTEGER-1);stepWorld(w);
  expect(w.nextId).toBe(Number.MAX_SAFE_INTEGER);expect(w.jobs).not.toContain(job);
  expect(w.structures).toMatchObject([{id:Number.MAX_SAFE_INTEGER-1,kind:'stool'}]);
  expect(w.piles).toHaveLength(0);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('identity removal preserves unrelated entries for absent, equal-looking and already removed references', () => {
  const first={id:1},last={id:2},entries=[first,last];
  expect(removeIdentity(entries,{id:1})).toBe(false);expect(entries).toEqual([first,last]);
  expect(removeIdentity(entries,first)).toBe(true);expect(entries).toEqual([last]);
  expect(removeIdentity(entries,first)).toBe(false);expect(entries).toEqual([last]);
});

test('pile transfer rejects a foreign reference before fusion, and repeated transfer leaves the remaining owner intact', () => {
  const w=deconstructionCamp();
  addMaterial(w,'wood',5,{type:'ground',x:8,z:8},'wood');const source=w.piles[0]!;
  addMaterial(w,'wood',4,{type:'ground',x:10,z:10},'wood');const target=w.piles[1]!;refreshStock(w);
  const before=serializeWorld(w);
  expect(transferPile(w,{...source}, {type:'ground',x:10,z:10})).toBe(false);expect(serializeWorld(w)).toBe(before);
  expect(transferPile(w,source,{type:'ground',x:10,z:10})).toBe(true);expect(target.quantity).toBe(9);
  const merged=serializeWorld(w);
  expect(transferPile(w,source,{type:'ground',x:10,z:10})).toBe(false);expect(serializeWorld(w)).toBe(merged);
  expect(w.piles).toEqual([target]);
});
