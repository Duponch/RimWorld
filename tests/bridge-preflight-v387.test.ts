import {expect,test} from 'vitest';
import {destroyBridge} from '../src/sim/bridge.ts';
import {ensureFireState} from '../src/sim/fire-rules.ts';
import {secondaryContext} from '../src/sim/secondary-site-context.ts';
import {bridgeWorkshopV387} from './scenarios/bridge-v387.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';

test.each(['bomb','fire'] as const)('%s late preflight refusal leaves tile, roof, plant, people, ledgers and identities untouched',cause=>{
  const {world:w,bridgeCell}=bridgeWorkshopV387(16),index=bridgeCell.z*w.width+bridgeCell.x;
  w.tiles[index]!.bridge=true;
  const wall={id:w.nextId++,kind:'wall' as const,material:'wood' as const,...bridgeCell,orientation:0 as const,footprint:'standard' as const};w.structures.push(wall);
  const cell={x:bridgeCell.x+1,z:bridgeCell.z},plant={id:w.nextId++,kind:'rice' as const,...cell,amount:6,growth:.1,growthTick:w.tick};w.resources=[plant];
  w.roofing={constructed:[index,index+1],build:[],remove:[],cursor:0};w.pawns[0]!.x=cell.x;w.pawns[0]!.z=cell.z;
  if(cause==='fire')ensureFireState(w).ledger.items.wood=Number.MAX_SAFE_INTEGER;
  else w.destroyed={count:0,lost:{},items:{wood:Number.MAX_SAFE_INTEGER}};
  // Every shared read-only object is frozen. The target remains mutable so
  // the discarded preview must copy it rather than merely skip the writes.
  for(const [i,tile] of w.tiles.entries())if(i!==index)Object.freeze(tile);
  Object.freeze(plant);Object.freeze(w.resources);
  const before=JSON.stringify(w),tiles=w.tiles,resources=w.resources,pawn=w.pawns[0],roof=w.roofing,filth=w.filth;
  expect(destroyBridge(w,bridgeCell,cause,35)).toBe(false);
  expect(JSON.stringify(w)).toBe(before);expect(w.tiles).toBe(tiles);expect(w.resources).toBe(resources);
  expect(w.tiles[index]).toMatchObject({terrain:'marsh',bridge:true});expect(w.structures[0]).toBe(wall);
  expect(w.pawns[0]).toBe(pawn);expect(w.roofing).toBe(roof);expect(w.filth).toBe(filth);expect(w.resources[0]).toBe(plant);
  // An admitted retirement must still reconcile the roof by replacing the
  // affected plant record, rather than writing through its shared object.
  if(cause==='fire')w.fires!.ledger.items.wood=0;else w.destroyed!.items!.wood=0;
  expect(destroyBridge(w,bridgeCell,cause,35)).toBe(true);expect(w.tiles[index]).toEqual({terrain:'marsh'});
  expect(w.roofing!.constructed).toEqual([]);expect(w.resources[0]).not.toBe(plant);expect(plant.growth).toBe(.1);
});

test('secondary late refusal uses current pre-flush arrays and isolates both campaign authority and the inactive map',()=>{
  const {w}=preparedCassandraExpedition(),local=secondaryContext(w)!;
  const index=local.tiles.findIndex((t,i)=>['grass','soil','rich-soil','gravel'].includes(t.terrain)&&!t.floor&&!t.snowDepth&&!local.resources.some(r=>r.z*local.width+r.x===i)&&!local.pawns.some(p=>p.z*local.width+p.x===i)&&!local.structures.some(s=>s.z*local.width+s.x===i));
  expect(index).toBeGreaterThanOrEqual(0);const cell={x:index%local.width,z:Math.floor(index/local.width)};
  local.tiles=local.tiles.map((t,i)=>i===index?{terrain:'marsh',bridge:true}:t);
  const wall={id:local.nextId++,kind:'wall' as const,material:'wood' as const,...cell,orientation:0 as const,footprint:'standard' as const};local.structures=[...local.structures,wall];
  local.destroyed={count:0,lost:{},items:{wood:Number.MAX_SAFE_INTEGER}};
  for(const tile of w.tiles)Object.freeze(tile);for(const [i,tile] of local.tiles.entries())if(i!==index)Object.freeze(tile);
  for(const resource of [...w.resources,...local.resources])Object.freeze(resource);
  const before=JSON.stringify(w),localBefore=JSON.stringify(local),homeTiles=w.tiles,localTiles=local.tiles,homePawn=w.pawns[0],localPawn=local.pawns[0],planet=w.planet;
  expect(destroyBridge(local,cell,'bomb',35)).toBe(false);expect(JSON.stringify(w)).toBe(before);expect(JSON.stringify(local)).toBe(localBefore);
  expect(w.tiles).toBe(homeTiles);expect(local.tiles).toBe(localTiles);expect(local.structures.at(-1)).toBe(wall);
  expect(w.pawns[0]).toBe(homePawn);expect(local.pawns[0]).toBe(localPawn);expect(w.planet).toBe(planet);
});
