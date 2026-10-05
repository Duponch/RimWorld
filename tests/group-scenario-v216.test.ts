import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {GROUP_SCENARIO_ID,GROUP_SCENARIO_CELLS,GROUP_SCENARIO_FOOD_CELLS,prepareGroupScenario,groupScenarioEntry} from '../src/sim/group-scenario.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import {biologicalYears} from '../src/sim/human-age.ts';
import {groupMemberReason} from '../src/sim/group-authority.ts';
import {parseTestColonies,testColonyUrl} from '../src/ui/test-colonies.ts';
import {appendGroupScenarioEntry} from '../scripts/create-group-v216-test-save.ts';

test('the public preparation is before adoption, every pickup and any trip; original adults and finite ground stock survive exact loading',()=>{
  const world=prepareGroupScenario();expect(world.tick).toBe(0);expect(world.schemaVersion).toBe(SCHEMA_VERSION);
  expect(validateWorld(world)).toEqual([]);expect(world.pawns).toHaveLength(3);
  for(const person of world.pawns){
    expect(biologicalYears(person.age!)).toBeGreaterThanOrEqual(18);expect(person.health).toBeUndefined();
    expect(groupMemberReason(world,person)).toBeUndefined();expect(person.path).toEqual([]);expect(person.orders).toEqual({active:null,queue:[]});
  }
  for(const key of ['planet','group','groupLosses','civilianPost','scout','commercialTrip'])expect(Object.hasOwn(world,key)).toBe(false);
  const ground=world.piles.filter(p=>p.owner.type==='ground');
  expect(ground.map(p=>[p.item,p.quantity,p.owner])).toEqual([
    ...[10,10,4].map((quantity,i)=>['survival-meal',quantity,{type:'ground',...GROUP_SCENARIO_FOOD_CELLS[i]!}]),['silver',500,{type:'ground',...GROUP_SCENARIO_CELLS.silver}],
    ['cloth',60,{type:'ground',...GROUP_SCENARIO_CELLS.cloth}],['medicine',6,{type:'ground',...GROUP_SCENARIO_CELLS.medicine}],
  ]);
  expect(world.piles.filter(p=>p.owner.type==='apparel')).toHaveLength(3);
  expect(world.piles.some(p=>p.owner.type==='inventory'||p.owner.type==='pawn')).toBe(false);expect(world.jobs).toEqual([]);expect(world.events).toEqual([]);
  const raw=serializeWorld(world);expect(deserializeWorld(raw)).toEqual(world);expect(prepareGroupScenario()).toEqual(world);

  // A genuine195 public payload gains only its schema number, never this scene.
  const old=JSON.parse(readFileSync('public/test-saves/v214/proches-et-chambre.json','utf8'));
  expect(old.schemaVersion).toBe(195);const migrated=deserializeWorld(JSON.stringify(old));
  expect(migrated).toEqual({...old,schemaVersion:SCHEMA_VERSION});
  expect(['planet','group','groupLosses'].every(key=>!Object.hasOwn(migrated,key))).toBe(true);
});

test('the58th hashed catalogue entry appends without changing historical text or fiches and refuses conflicting publication',()=>{
  const world=prepareGroupScenario(),raw=serializeWorld(world),entry=groupScenarioEntry(world,createHash('sha256').update(raw).digest('hex'));
  const published=readFileSync('public/test-saves/manifest.json','utf8'),manifest=JSON.parse(published);
  // Works both before and after Root publishes the new payload. The first57
  // entries remain the historical owners of their exact original paths/hashes.
  const historical=manifest.saves.slice(0,57);expect(historical.some((save:{id:string})=>save.id===GROUP_SCENARIO_ID)).toBe(false);
  const old=manifest.saves.some((save:{id:string})=>save.id===GROUP_SCENARIO_ID)
    ? published.slice(0,published.lastIndexOf(',\n    {\n      "id": "'+GROUP_SCENARIO_ID+'"'))+'\n  ]\n}\n'
    :published;
  const before=JSON.parse(old);expect(before.saves).toHaveLength(57);
  const after=appendGroupScenarioEntry(old,entry),next=parseTestColonies(JSON.parse(after));
  expect(next).toHaveLength(58);expect(next.slice(0,57)).toEqual(historical);expect(next.at(-1)).toEqual(entry);
  expect(after.startsWith(old.slice(0,old.lastIndexOf('  ]')).trimEnd()+',\n')).toBe(true);
  expect(new Set(next.map(save=>save.id)).size).toBe(58);expect(testColonyUrl(entry)).toBe('/test-saves/v216/globe-voyage.json');
  expect(appendGroupScenarioEntry(after,entry)).toBe(after);
  expect(()=>appendGroupScenarioEntry(after,{...entry,sha256:'0'.repeat(64)})).toThrow('V216 entry differs');
});
