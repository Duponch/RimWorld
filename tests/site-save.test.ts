import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect,test } from 'vitest';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { createScenarioWorld } from '../src/sim/new-game';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization';
import { stepWorld } from '../src/sim/engine';
import { applyCommand } from '../src/sim/engine';
import { survivorDecisions,survivorInitialAreas } from './scenarios/survivor-player';
import { furnitureDelay,navigationCosts,terrainTravelDelay } from '../src/sim/furniture-travel';
import { HILLINESS,resolveSite } from '../src/sim/site';
import { SCHEMA_VERSION } from '../src/sim/types';
import { withMigratedBasic } from './scenarios/legacy-skills';

test.each(HILLINESS)('shared player can place its first physical camp on the chosen %s site',hilliness=>{
  const world=createScenarioWorld(42,250,'crashlanded',{hilliness});
  expect(survivorInitialAreas(world)).toBe(true);
  expect(world.tiles.some(t=>t.terrain==='rich-soil')).toBe(true);
  const decisions=survivorDecisions(world);expect(decisions).toHaveLength(5);
  for(const d of decisions)expect(applyCommand(world,d.command),d.reason).toMatchObject({ok:true});
  expect(world.jobs.filter(j=>j.kind==='bed')).toHaveLength(3);expect(world.growingZones[0]!.cells).toHaveLength(20);
  expect(validateWorld(world)).toEqual([]);
});

test('real V82 snapshot migrates without inventing a site, terrain, clock or new stock; future data is rejected before migration',()=>{
  const historical=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/scenario-v82.json.gz',import.meta.url))).toString());
  expect(historical.schemaVersion).toBe(82);expect(historical.scenario.revision).toBe(1);
  const migrated=deserializeWorld(JSON.stringify(historical));
  expect(migrated).toEqual(withMigratedBasic({...historical,schemaVersion:SCHEMA_VERSION}));expect(migrated.site).toBeUndefined();
  for(const mutate of [(w:any)=>w.site=resolveSite(w.seed),(w:any)=>w.scenario.revision=2,(w:any)=>w.tiles[0]={terrain:'rich-soil'},(w:any)=>w.tiles[0]={terrain:'gravel'}]) {
    const bad=structuredClone(historical);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/version 82/);
  }
  const continued=deserializeWorld(serializeWorld(migrated));stepWorld(migrated,80);stepWorld(continued,80);expect(continued).toEqual(migrated);
});

test('new site provenance, physical landing and both new soils survive continuation and snapshot patches',()=>{
  const world=createScenarioWorld(42,64,'crashlanded',{hilliness:'large-hills'});
  expect(world.site).toEqual(resolveSite(42,{hilliness:'large-hills'}));expect(world.scenario!.revision).toBe(5);
  expect(world.research?.stonecutting).toMatchObject({completedAt:0});
  expect(world.research?.smithing).toBeUndefined();
  expect(world.piles.filter(p=>p.item==='silver').reduce((n,p)=>n+p.quantity,0)).toBe(800);
  expect(world.piles.filter(p=>p.item==='bolt-action-rifle')).toHaveLength(1);
  expect(world.piles.filter(p=>p.item==='plasteel-knife')).toMatchObject([{quantity:1,weapon:{quality:'normal',hitPoints:280}}]);
  expect(world.visitors?.introAt).toBe(15000);
  const ground=world.piles.filter(p=>p.owner.type==='ground');
  expect(new Set(ground.map(p=>p.owner.type==='ground'?`${p.owner.x},${p.owner.z}`:'')).size).toBe(ground.length);
  for(const p of world.pawns)expect(ground.some(q=>q.owner.type==='ground'&&q.owner.x===p.x&&q.owner.z===p.z)).toBe(false);
  expect(validateWorld(world)).toEqual([]);
  const restored=deserializeWorld(serializeWorld(world));stepWorld(world,85);stepWorld(restored,85);expect(restored).toEqual(world);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(world,0,1,true)));
  expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Checkpoint refused');
  expect(first.world).toEqual(world);const before=structuredClone(first.world);
  const i=world.tiles.findIndex(t=>t.terrain==='grass');world.tiles[i]={terrain:'rich-soil'};
  const second=decoder.adopt(structuredClone(encoder.encode(world,0,1)));
  expect(second.status).toBe('applied');if(second.status!=='applied')throw Error('Delta refused');expect(second.world).toEqual(world);
  world.tiles[i]={terrain:'gravel'};
  const third=decoder.adopt(structuredClone(encoder.encode(world,0,1)));
  expect(third.status).toBe('applied');if(third.status!=='applied')throw Error('Delta refused');expect(third.world).toEqual(world);expect(first.world).toEqual(before);
});

test('site contracts reject missing/foreign provenance and natural floor costs agree with search without changing historical soils',()=>{
  expect(()=>createScenarioWorld(42,64,'survivors',{hilliness:'flat'})).toThrow();
  expect(()=>resolveSite(42,{hilliness:'mountain'} as any)).toThrow();
  const world=createScenarioWorld(42,64,'crashlanded');
  for(const mutate of [(w:any)=>delete w.site,(w:any)=>w.site.river='large',(w:any)=>w.site.stones=['slate','slate'],(w:any)=>w.site.biome='boreal-forest',(w:any)=>w.scenario.revision=1,(w:any)=>w.site.extra=true]) {
    const bad=structuredClone(world);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  const cell={x:0,z:0};world.piles=[];world.structures=[];world.jobs=[];
  for(const terrain of ['grass','rich-soil','gravel'] as const) {
    world.tiles[0]={terrain};expect(terrainTravelDelay(world,0)).toBe(.2);expect(furnitureDelay(world,{x:1,z:0},cell)).toBe(.2);expect(navigationCosts(world).floors.get(0)).toBe(67);
  }
  delete world.site;
  for(const terrain of ['grass','soil'] as const){world.tiles[0]={terrain};expect(terrainTravelDelay(world,0)).toBe(0);expect(navigationCosts(world).floors.has(0)).toBe(false);}
});
