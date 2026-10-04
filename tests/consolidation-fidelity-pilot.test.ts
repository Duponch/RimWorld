import { readFileSync } from 'node:fs';
import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { crashlandedDecisions,crashlandedThreatActive } from './scenarios/crashlanded-player.ts';

test('the public pre-intro checkpoint creates a real manhunter and pilot suspends care for physical shelter or defense',()=>{
  const w=deserializeWorld(readFileSync('public/test-saves/v201/animal-en-rage.json','utf8'));
  expect(w.tick).toBe(20399);expect(crashlandedThreatActive(w)).toBe(false);
  stepWorld(w);expect(crashlandedThreatActive(w)).toBe(true);
  expect(w.wildlife!.animals.some(a=>a.manhunter&&a.state!=='dead')).toBe(true);
  const checkpoint=serializeWorld(w),resumed=deserializeWorld(checkpoint);expect(serializeWorld(resumed)).toBe(checkpoint);
  const first=crashlandedDecisions(w);expect(serializeWorld(w)).toBe(checkpoint);
  expect(first.length).toBeGreaterThan(0);expect(first.every(d=>d.command.type==='draft')).toBe(true);
  for(const d of first)expect(applyCommand(w,d.command).ok).toBe(true);
  const next=crashlandedDecisions(w);
  expect(next.length).toBeGreaterThan(0);
  expect(next.every(d=>['draft-move','shoot','fire-at-will'].includes(d.command.type))).toBe(true);
  for(const d of next)expect(applyCommand(w,d.command).ok,JSON.stringify(d)).toBe(true);
  expect(validateWorld(w)).toEqual([]);
  const atAdmission=serializeWorld(w),copy=deserializeWorld(atAdmission);
  stepWorld(w,20);stepWorld(copy,20);expect(serializeWorld(copy)).toBe(serializeWorld(w));
  expect(w.pawns.every(p=>p.orders.active!=='rescue'&&p.orders.active!=='tend')).toBe(true);
});
