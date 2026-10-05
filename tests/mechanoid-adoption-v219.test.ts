import { readFileSync } from 'node:fs';
import { expect,test } from 'vitest';
import { prepareScytherDemo,SCYTHER_CELLS } from '../scripts/create-scyther-v213-test-save.ts';
import { applyCommand } from '../src/sim/engine.ts';
import { newCookingBill,validBillSettings } from '../src/sim/cooking-bills.ts';
import { chooseMechanoidComposition,enableMechanoidRaids,validMechanoidComposition } from '../src/sim/mechanoid-raids.ts';
import { validateMechanoidRaids } from '../src/sim/mechanoid-raid-save.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';

function legacyMechanicalCamp():World {
  const w=prepareScytherDemo();Object.assign(w,{schemaVersion:196});delete w.raids!.mechanoid!.ranged;
  const table=w.structures.find(s=>s.kind==='machining-table')!;
  table.bills!.push(newCookingBill(w.nextId++,'shred-mechanoid',196));
  return w;
}

test('immutable public196 migrates its number alone without adopting mechanical ranged permission',()=>{
  const raw=readFileSync('public/test-saves/v216/globe-voyage.json','utf8'),before=JSON.parse(raw);
  expect(before.schemaVersion).toBe(196);
  const w=deserializeWorld(raw);expect(w).toEqual({...before,schemaVersion:SCHEMA_VERSION});
  expect(w.raids?.mechanoid?.ranged).toBeUndefined();
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('old mechanical agenda and bill stay unchanged until explicit idempotent adoption',()=>{
  const historical=legacyMechanicalCamp(),before=structuredClone(historical);
  const w=deserializeWorld(JSON.stringify(historical));expect(w).toEqual({...before,schemaVersion:SCHEMA_VERSION});
  const policyBefore=structuredClone(w.raids!.mechanoid!),agendaBefore=structuredClone(w.raids!.cassandra),rng=w.rng,next=w.nextId;
  const table=w.structures.find(s=>s.kind==='machining-table')!,bill=table.bills![0]!;
  expect(Object.keys(bill.filters)).toEqual(['scyther-corpse']);
  expect(applyCommand(w,{type:'enable-mech-raids'})).toEqual({ok:true});
  expect(w.raids!.mechanoid).toEqual({...policyBefore,ranged:{adoptedAt:w.tick}});
  expect(w.raids!.cassandra).toEqual(agendaBefore);expect(w.rng).toBe(rng);expect(w.nextId).toBe(next);
  const adopted=structuredClone(w);expect(applyCommand(w,{type:'enable-mech-raids'})).toEqual({ok:true});expect(w).toEqual(adopted);
  expect(w.mechanoids).toBeUndefined();expect(w.projectiles).toBeUndefined();
  expect(applyCommand(w,{type:'bill-update',structureId:table.id,billId:bill.id,settings:{...bill,target:2}})).toEqual({ok:true});
  expect(Object.keys(bill.filters)).toEqual(['scyther-corpse']);
  expect(applyCommand(w,{type:'bill-update',structureId:table.id,billId:bill.id,settings:{...bill,filters:{...bill.filters,'lancer-corpse':true,'pikeman-corpse':false}}})).toEqual({ok:true});
  expect(bill.filters['lancer-corpse']).toBe(true);expect(bill.filters['pikeman-corpse']).toBe(false);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  expect(table).toMatchObject({...SCYTHER_CELLS.machining});
});

test('strict196 rejects future permission, carcass filters and own undefined keys before neutral migration',()=>{
  const before=legacyMechanicalCamp(),future=structuredClone(before);future.raids!.mechanoid!.ranged={adoptedAt:future.tick};
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/Invalid version 196 save/);
  const ownUndefined=structuredClone(before);ownUndefined.raids!.mechanoid!.ranged=undefined;
  expect(validateMechanoidRaids(ownUndefined,196)).toContain('Invalid mechanoid raid policy.');
  for(const item of ['lancer-corpse','pikeman-corpse'] as const){
    const corrupt=structuredClone(before),bill=corrupt.structures.find(s=>s.kind==='machining-table')!.bills![0]!;
    bill.filters[item]=true;expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow(/Invalid version 196 save/);
    bill.filters[item]=undefined;expect(validBillSettings(bill,bill.recipe,196)).toBe(false);
    const storage=structuredClone(before);storage.stockpiles.push({id:storage.nextId++,x:5,z:5,priority:1,capacity:75,filters:{wood:false,food:false,steel:false,component:false,furniture:false},items:{[item]:true}});
    expect(()=>deserializeWorld(JSON.stringify(storage))).toThrow(/Invalid version 196 save/);
  }
  expect(deserializeWorld(JSON.stringify(before))).toEqual({...before,schemaVersion:SCHEMA_VERSION});
});

test('ranged ticket uses affordable successive members while the unadopted selector retains its historical RNG branch',()=>{
  // Frozen historical selector outcomes: one private draw, no ranged members.
  for(const [initial,after,served] of [[2654435761,1361921809,false],[3668339987,4152677553,false],[387276917,3630703352,true]] as const){
    const random={rng:initial};expect(chooseMechanoidComposition(600,random)).toEqual(served?{budget:600,roster:['scyther','scyther','scyther','scyther']}:null);expect(random.rng).toBe(after);
  }
  let served=false,absent=false,mixed=false;
  for(let seed=1;seed<=160;seed++){
    const initial=(Math.imul(seed,2654435761)>>>0)||1;
    const draw={rng:initial},choice=chooseMechanoidComposition(600,draw,true);
    if(!choice){absent=true;continue;}served=true;expect(validMechanoidComposition(choice,true)).toBe(true);
    if(choice.roster.includes('lancer')&&choice.roster.includes('pikeman'))mixed=true;
  }
  expect({served,absent,mixed}).toEqual({served:true,absent:true,mixed:true});
  for(const roster of [['lancer','lancer'],['pikeman','scyther'],['pikeman']] as const)
    expect(validMechanoidComposition({budget:300,roster:[...roster]},true)).toBe(false);
  const historical=legacyMechanicalCamp(),rng=historical.rng,policy=structuredClone(historical.raids!.mechanoid);
  expect(enableMechanoidRaids(historical)).toBe(true);expect(historical.raids!.mechanoid).toEqual(policy);expect(historical.rng).toBe(rng);
});
