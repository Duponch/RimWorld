import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect,test } from 'vitest';
import { preparePodRescueDemo } from '../scripts/generate-pod-rescue-demo-v187.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';

test('published capsule scene matches its explicit generator and manifest checksum, with no patient fabricated',()=>{
  const raw=readFileSync('public/test-saves/v187/secours-capsule.json','utf8'),published=deserializeWorld(raw);
  expect(published).toEqual(preparePodRescueDemo());expect(validateWorld(published)).toEqual([]);
  const manifest=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8'));
  const entry=manifest.saves.find((s:{id:string})=>s.id==='secours-capsule-v187');
  expect(entry).toMatchObject({prepared:true,width:32,height:32,pawns:3,tick:0,release:'v187'});
  expect(entry.sha256).toBe(createHash('sha256').update(raw).digest('hex'));
  expect(published.podRescues!.incidents).toEqual([]);expect(published.podRescues!.departed).toEqual([]);
  expect(published.pawns.every(p=>!p.podRescue)).toBe(true);
});

test('the published pending capsule opens through ordinary ticks, with exact save continuation and one shirt',()=>{
  const w=deserializeWorld(readFileSync('public/test-saves/v187/secours-capsule.json','utf8'));
  stepWorld(w,4);const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,6);stepWorld(resumed,6);
  expect(resumed).toEqual(w);expect(validateWorld(w)).toEqual([]);
  const patient=w.pawns.find(p=>p.podRescue)!;expect(patient.state).toBe('downed');
  expect(patient.podRescue!.admittedAt).toBeUndefined();expect(w.podRescues!.incidents).toHaveLength(1);
  expect(w.piles.filter(p=>p.item==='cloth-shirt'&&p.owner.type==='apparel'&&p.owner.pawnId===patient.id)).toHaveLength(1);
});
