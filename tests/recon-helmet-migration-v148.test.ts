import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {newApparelState} from '../src/sim/apparel-rules.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {researchCost} from '../src/sim/research.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import type {World} from '../src/sim/types.ts';

const historical=()=>JSON.parse(readFileSync('public/test-saves/v139/industrie-avancee.json','utf8')) as World;
const declared144=():World=>{
  const old=deserializeWorld(JSON.stringify(historical()));
  (old as {schemaVersion:number}).schemaVersion=144;
  return old;
};

test('V139 and valid V144 migration preserve ownership, policies, research, work and RNG without granting recon gear',()=>{
  const from139=historical(),migrated=deserializeWorld(JSON.stringify(from139));
  expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
  expect(validateWorld(migrated)).toEqual([]);
  expect(migrated.rng).toBe(from139.rng);
  expect(migrated.research?.reconArmor).toBeUndefined();
  expect(migrated.piles.some(p=>p.item==='recon-helmet'||p.item==='unfinished-recon-helmet')).toBe(false);
  expect(migrated.apparelPolicies?.every(p=>!p.allowedItems.includes('recon-helmet'))).toBe(true);
  const old=declared144(),resumed=deserializeWorld(JSON.stringify(old));
  expect(resumed).toEqual({...old,schemaVersion:SCHEMA_VERSION});
});

test('a V144 file rejects future research, item, policy, bill and unfinished work before migrating',()=>{
  const research=declared144();
  research.research!.reconArmor={points:researchCost('recon-armor'),completedAt:research.tick};
  expect(()=>deserializeWorld(JSON.stringify(research))).toThrow();

  const item=declared144();
  item.piles.push({id:item.nextId++,kind:'apparel',item:'recon-helmet',quantity:1,owner:{type:'ground',x:12,z:12},apparel:newApparelState('recon-helmet')});
  expect(()=>deserializeWorld(JSON.stringify(item))).toThrow();

  const policy=declared144();
  (policy.apparelPolicies![0] as unknown as {allowedItems:string[]}).allowedItems=[...policy.apparelPolicies![0]!.allowedItems,'recon-helmet'];
  expect(()=>deserializeWorld(JSON.stringify(policy))).toThrow();

  const bill=declared144();
  bill.structures.find(s=>s.kind==='fabrication-bench')!.bills!.push(newCookingBill(bill.nextId++,'make-recon-helmet'));
  expect(()=>deserializeWorld(JSON.stringify(bill))).toThrow();

  const packed=declared144(),bench=packed.structures.find(s=>s.kind==='fabrication-bench')!;
  packed.structures=packed.structures.filter(s=>s!==bench);
  packed.packed.push({building:bench,owner:{type:'ground',x:bench.x,z:bench.z}});
  bench.bills!.push(newCookingBill(packed.nextId++,'make-recon-helmet'));
  expect(()=>deserializeWorld(JSON.stringify(packed))).toThrow();

  const work=declared144();
  work.piles.push({id:work.nextId++,kind:'unfinished',item:'unfinished-recon-helmet',quantity:1,owner:{type:'ground',x:12,z:12},flakWork:{recipe:'make-recon-helmet',authorId:work.pawns[0]!.id,progress:0,parts:[{item:'plasteel',quantity:30},{item:'advanced-component',quantity:1}]}});
  expect(()=>deserializeWorld(JSON.stringify(work))).toThrow();
});
