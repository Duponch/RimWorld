import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { expect,test } from 'vitest';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { COMPLEX_FURNITURE_RESEARCH_COST,complexFurnitureUnlocked,researchCost } from '../src/sim/research.ts';
import { SCENARIOS } from '../src/sim/scenario-definitions.ts';
import { APPAREL_POLICY_INTERVAL,APPAREL_WEAR_INTERVAL } from '../src/sim/apparel-renewal.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';
import { equipmentCamp } from './scenarios/equipment.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';

const fixture=()=>JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/colony-v89.json.gz',import.meta.url))).toString()) as World;
const ordinary=(pawn:World['pawns'][number])=>(pawn.faction??'colony')==='colony'&&!pawn.visitor&&!pawn.prisoner&&pawn.state!=='dead';

test('V89 is validated strictly, then receives only prospective V90 persistence',()=>{
  const source=fixture(),before=structuredClone(source),oldRng=source.rng;
  expect(source.schemaVersion).toBe(89);
  const future=[
    (w:any)=>w.pawns[0].beauty=.4,
    (w:any)=>w.apparelWear={nextWearAt:w.tick+APPAREL_WEAR_INTERVAL,rng:1},
    (w:any)=>w.apparelPolicies=[],
    (w:any)=>w.research.complexFurniture={points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:0},
    (w:any)=>w.scenario.revision=5,
    (w:any)=>w.structures.find((s:any)=>s.kind==='bed').quality='normal',
    (w:any)=>w.piles.find((p:any)=>p.item==='cloth-shirt').apparel.material='cloth',
  ];
  for(const mutate of future){const invalid=structuredClone(source);mutate(invalid);expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/version 89/);}

  const migrated=deserializeWorld(JSON.stringify(source));
  expect(source).toEqual(before);expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
  expect(migrated.tick).toBe(before.tick);expect(migrated.rng).toBe(oldRng);expect(migrated.nextId).toBe(before.nextId);
  expect(migrated.scenario).toEqual(before.scenario);expect(migrated.research).toEqual(before.research);
  expect(migrated.research?.complexFurniture).toBeUndefined();
  expect([...migrated.structures,...migrated.packed.map(p=>p.building)].filter(s=>['bed','table','stool'].includes(s.kind)).every(s=>s.quality==='normal')).toBe(true);
  expect(migrated.piles.filter(p=>p.item==='cloth-shirt'||p.item==='cloth-tribalwear').every(p=>p.apparel?.material==='cloth')).toBe(true);
  expect(migrated.piles.find(p=>p.item==='flak-vest')?.apparel?.material).toBeUndefined();
  expect(migrated.apparelPolicies?.map(p=>p.id)).toEqual([1,2]);expect(migrated.nextApparelPolicyId).toBe(3);
  expect(migrated.apparelWear).toEqual({nextWearAt:migrated.tick+APPAREL_WEAR_INTERVAL,rng:(migrated.seed^migrated.tick^0x0a77e1)>>>0});
  expect(migrated.pawns.every(p=>p.beauty===40)).toBe(true);
  for(const pawn of migrated.pawns)if(ordinary(pawn)){
    expect(pawn.apparelPolicyId).toBe(1);expect(pawn.apparelAutomation).toBe(false);
    expect(pawn.nextApparelCheckAt).toBeGreaterThanOrEqual(migrated.tick+APPAREL_POLICY_INTERVAL.min);
    expect(pawn.nextApparelCheckAt).toBeLessThanOrEqual(migrated.tick+APPAREL_POLICY_INTERVAL.max);
  }else expect([pawn.apparelPolicyId,pawn.apparelAutomation,pawn.nextApparelCheckAt]).toEqual([undefined,undefined,undefined]);
  expect(validateWorld(migrated)).toEqual([]);expect(deserializeWorld(serializeWorld(migrated))).toEqual(migrated);
});

test('V90 rejects broken furniture, apparel calendars and policy references',()=>{
  const migrated=deserializeWorld(JSON.stringify(fixture()));
  const invalid=[
    (w:any)=>delete w.structures.find((s:any)=>s.kind==='bed').quality,
    (w:any)=>w.structures.find((s:any)=>s.kind==='bed').quality='mythic',
    (w:any)=>w.apparelWear.nextWearAt=-1,
    (w:any)=>w.apparelPolicies[0].allowedItems.push(w.apparelPolicies[0].allowedItems[0]),
    (w:any)=>w.pawns.find((p:any)=>ordinary(p)).apparelPolicyId=999,
    (w:any)=>w.nextApparelPolicyId=2,
  ];
  for(const mutate of invalid){const broken=structuredClone(migrated);mutate(broken);expect(validateWorld(broken).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(broken))).toThrow();}
});

test('V90 preserves the exact cumulative duration of a multi-family apparel replacement',()=>{
  const world=equipmentCamp(1),pawn=world.pawns[0]!;
  addMaterial(world,'apparel',1,{type:'apparel',pawnId:pawn.id},'cloth-tribalwear');
  addMaterial(world,'apparel',1,{type:'ground',x:pawn.x+1,z:pawn.z},'cloth-pants');
  const target=world.piles.find(p=>p.item==='cloth-pants')!;
  expect(applyCommand(world,{type:'order-equipment',pawnId:pawn.id,itemId:target.id,action:'wear',queue:false}).ok).toBe(true);
  stepWorld(world);
  expect(pawn.equipmentTask?.duration).toBe(21);
  expect(validateWorld(world)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(world));
  for(const duration of [12.5,13,22,30]){const broken=structuredClone(world);broken.pawns[0]!.equipmentTask!.duration=duration;expect(validateWorld(broken),`duration ${duration}`).not.toEqual([]);expect(()=>deserializeWorld(serializeWorld(broken))).toThrow();}
  stepWorld(world,25);stepWorld(resumed,25);expect(resumed).toEqual(world);
  expect(world.piles.find(p=>p.id===target.id)?.owner).toEqual({type:'apparel',pawnId:pawn.id});
  expect(validateWorld(world)).toEqual([]);
});

test('Mobilier complexe is an independent 300-point project and Crashlanded revision 5 provenance',()=>{
  const migrated=deserializeWorld(JSON.stringify(fixture()));
  expect(researchCost('complex-furniture')).toBe(300_000_000);expect(complexFurnitureUnlocked(migrated)).toBe(false);
  migrated.research!.complexFurniture={points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:migrated.tick};
  expect(complexFurnitureUnlocked(migrated)).toBe(true);expect(validateWorld(migrated)).toEqual([]);
  expect(SCENARIOS.crashlanded.revision).toBe(5);
  const provenance=structuredClone(migrated);provenance.scenario!.revision=5;expect(validateWorld(provenance)).toEqual([]);
});
