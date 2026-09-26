import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {artWorkTotal} from '../src/sim/art-rules.ts';
import {validArtWorkShape,validateArtWorks} from '../src/sim/art-work.ts';
import {createWorld} from '../src/sim/engine.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import type {World} from '../src/sim/types.ts';

test('the immutable V103 room demo migrates only its schema and disabled Art priority',()=>{
  const raw=JSON.parse(readFileSync('public/test-saves/v103/salles.json','utf8'));
  expect(raw.schemaVersion).toBe(103);
  const migrated=deserializeWorld(JSON.stringify(raw));
  expect(migrated).toEqual({...raw,schemaVersion:106,
    pawns:raw.pawns.map((p:Record<string,unknown>)=>({...p,priorities:{...(p.priorities as object),art:0,handle:0}}))});
  expect(validateWorld(migrated)).toEqual([]);
  for(const edit of [
    (v:any)=>v.pawns[0].priorities.art=1,
    (v:any)=>v.piles[0].artWork={recipe:'small-sculpture',authorId:v.pawns[0].id,progress:0,material:'wood',parts:[50]},
    (v:any)=>v.structures.push({id:v.nextId++,kind:'small-sculpture',x:2,z:2,orientation:0,footprint:'standard',material:'wood',quality:'normal',art:{authorId:v.pawns[0].id,createdAt:v.tick}}),
  ]){
    const future=structuredClone(raw);edit(future);
    expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/version 103/);
  }
});

function prepared():World {
  const world=createWorld(42,32,32);
  world.tick=2000;world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[];world.jobs=[];world.structures=[];world.piles=[];world.packed=[];world.stockpiles=[];
  world.pawns=world.pawns.slice(0,1);
  const authorId=world.pawns[0]!.id;
  world.piles.push({id:world.nextId++,kind:'unfinished',item:'unfinished-sculpture',quantity:1,
    owner:{type:'ground',x:8,z:8},artWork:{recipe:'large-sculpture',authorId,progress:artWorkTotal('large-sculpture','wood')/2,
      material:'wood',parts:[75,25]}});
  world.packed.push({building:{id:world.nextId++,kind:'small-sculpture',x:9,z:8,orientation:0,footprint:'standard',
    material:'marble-blocks',quality:'excellent',art:{authorId,createdAt:world.tick}},owner:{type:'ground',x:9,z:8}});
  refreshStock(world);
  return world;
}

test('V104 saves preserve the whole sculpture and homogeneous authored workpiece',()=>{
  const world=prepared(),work=world.piles[0]!;
  expect(validArtWorkShape(work as unknown as Record<string,unknown>,104)).toBe(true);
  expect(validArtWorkShape(work as unknown as Record<string,unknown>,103)).toBe(false);
  expect(validateArtWorks(world,104)).toEqual([]);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
});

test('V104 rejects malformed work, ownership and packed artwork without repairing it',()=>{
  const good=prepared();
  for(const edit of [
    (v:World)=>{v.piles[0]!.artWork!.parts=[75,24];},
    (v:World)=>{v.piles[0]!.artWork!.progress=artWorkTotal('large-sculpture','wood')+1;},
    (v:World)=>{v.piles[0]!.artWork!.authorId=999999;},
    (v:World)=>{v.packed[0]!.building.art!.createdAt=v.tick+1;},
    (v:World)=>{v.packed[0]!.building.art!.authorId=999999;},
    (v:World)=>{v.packed[0]!.building.quality='unknown' as never;},
    (v:World)=>{v.packed[0]!.building.material='cloth' as never;},
  ]){
    const bad=structuredClone(good);edit(bad);
    expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  const future=structuredClone(good);future.schemaVersion=103 as World['schemaVersion'];
  delete (future.pawns[0]!.priorities as Partial<typeof future.pawns[0]['priorities']>).art;
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/version 103/);
});
