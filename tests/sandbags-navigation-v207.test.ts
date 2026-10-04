import { expect,test } from 'vitest';
import type { Structure } from '../src/sim/types';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { canStandAt,captureStandability,furnitureDelay } from '../src/sim/furniture-travel';
import { candidateAccess } from '../src/sim/candidate-access';
import { blockedCells,routeToCell } from '../src/sim/pathfinding';
import { raidRoute } from '../src/sim/raid-space';
import { isBreachableBarrier } from '../src/sim/barriers';
import { RoofContext } from '../src/sim/roof-rules';
import { RoomTopologyCache } from '../src/sim/room-topology';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction';

test('pass-through cost42 and shared non-repetition preserve weighted route and a real saved travel segment',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!,z=p.z,s:Structure=fixtureBuilding(w,'sandbags',p.x+1,z);s.material='cloth';
  // A one-cell corridor forces the existing solver to traverse the low cover.
  w.tiles=w.tiles.map((_,i)=>({terrain:Math.floor(i/w.width)===z?'grass':'water'}));
  expect(blockedCells(w)[z*w.width+s.x]).toBe(0);expect(canStandAt(w,s)).toBe(false);expect(captureStandability(w)(s)).toBe(false);
  expect(furnitureDelay(w,p,s)).toBe(4.2);expect(furnitureDelay(w,s,{x:s.x+1,z})).toBe(0);
  const second:Structure=fixtureBuilding(w,'sandbags',s.x+1,z);second.material='cloth';expect(furnitureDelay(w,s,second)).toBe(0);
  const table:Structure=fixtureBuilding(w,'table',s.x-1,z,1);table.material='wood';expect(furnitureDelay(w,table,s)).toBe(0);w.structures=w.structures.filter(b=>b!==table);
  const goal={x:s.x+2,z},access=candidateAccess(w,p,blockedCells(w),new Set());expect(routeToCell(w,goal,access)).toEqual([{x:s.x,z},{x:second.x,z},goal]);
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);expect(applyCommand(w,{type:'draft-move',pawnIds:[p.id],target:goal,queue:false}).ok).toBe(true);
  for(let i=0;i<100&&p.motion?.to.x!==s.x;i++)stepWorld(w);expect(p.motion?.to).toEqual({x:s.x,z});expect(p.motion?.terrainDelay).toBe(4.2);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,30);stepWorld(copy,30);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(p.x).toBe(goal.x);expect(validateWorld(w)).toEqual([]);
});

test('low cover neither supports a roof nor encloses a room and is never selected as a raid breach',()=>{
  const w=deconstructionCamp(2),p=w.pawns[0]!,target=w.pawns[1]!;p.x=10;p.z=16;target.x=20;target.z=16;
  const s:Structure=fixtureBuilding(w,'sandbags',15,16);s.material='cloth';w.tiles=w.tiles.map((_,i)=>({terrain:Math.floor(i/w.width)===16?'grass':'water'}));
  expect(new RoofContext(w).holders[16*w.width+15]).toBe(0);expect(new RoomTopologyCache().read(w).at(15,16)?.kind).toBe('space');expect(isBreachableBarrier(s)).toBe(false);
  // Start actor is omitted from the colony target list so only the far pawn is acquired.
  const route=raidRoute({...w,pawns:[target]},p,false,blockedCells(w));expect(route).not.toBeNull();expect(route?.barrier).toBeUndefined();expect(route?.path.some(c=>c.x===s.x&&c.z===s.z)).toBe(true);
});
