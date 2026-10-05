import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect,test } from 'vitest';
import { prepareScytherDemo,SCYTHER_DEMO_PATH,SCYTHER_DEMO_ID,SCYTHER_OPPORTUNITY_TICK,scytherPreparedThreat } from '../scripts/create-scyther-v213-test-save.ts';
import { decodeStoredSave } from '../src/ui/save-storage-codec.ts';
import { deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { producedScytherArrival } from './helpers/scyther-v213.ts';

test('the public payload is strictly prepared before the actual future opportunity, with byte provenance and no defense or salvage result',async()=>{
  const stored=readFileSync(SCYTHER_DEMO_PATH,'utf8'),raw=await decodeStoredSave(stored),w=deserializeWorld(raw);
  const manifest=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8'));
  expect(manifest.saves.find((s:{id:string})=>s.id===SCYTHER_DEMO_ID).sha256).toBe(createHash('sha256').update(raw).digest('hex'));
  const current=prepareScytherDemo();
  expect(current.raids!.mechanoid!.ranged).toEqual({adoptedAt:current.tick});
  delete current.raids!.mechanoid!.ranged;
  expect(w.raids!.mechanoid!.ranged).toBeUndefined();
  expect(w).toEqual(current);expect(validateWorld(w)).toEqual([]);expect(w.tick).toBe(SCYTHER_OPPORTUNITY_TICK-10);expect(scytherPreparedThreat(w).points).toBeGreaterThan(300);
  expect(w.mechanoids).toBeUndefined();expect(w.raids!.mechActive).toBeUndefined();expect(w.projectiles).toBeUndefined();expect(w.mechSalvage).toBeUndefined();expect(w.piles.some(p=>p.mechCorpse)).toBe(false);
  expect(w.structures.filter(s=>s.turret).every(s=>s.turret!.holdFire&&s.turret!.ammoQ===240)).toBe(true);
});
test('the ordinary adopted Cassandra opportunity creates the staged mechanical owners before any injury or shot',()=>{
  const w=producedScytherArrival();expect(validateWorld(w)).toEqual([]);expect(w.raids!.mechActive!.phase).toBe('staging');expect(w.mechanoids).toHaveLength(2);
  expect(w.mechanoids!.every(m=>m.state!=='dead'&&m.health===undefined)).toBe(true);expect(w.projectiles?.length??0).toBe(0);expect(w.mechSalvage).toBeUndefined();
});
