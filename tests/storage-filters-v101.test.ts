import { expect,test } from 'vitest';
import { storageAccepts } from '../src/sim/storage-filters';
import { storageCapacity } from '../src/sim/ground-placement';
import { mayImproveStorage } from '../src/sim/idle-logistics';
import { planHaulOrder } from '../src/sim/player-hauling';
import { planWork } from '../src/sim/work-planner';
import { blockedCells } from '../src/sim/pathfinding';
import { addMaterial } from '../src/sim/materials';
import { applyCommand } from '../src/sim/engine';
import { deconstructionCamp } from './scenarios/deconstruction';

test('category remains necessary and an absent item list preserves historical storage',()=>{
  const w=deconstructionCamp();w.stockpiles=[];
  expect(applyCommand(w,{type:'stockpile',enabled:true,x:15,z:16,filters:{wood:false,food:true}}).ok).toBe(true);
  const zone=w.stockpiles[0]!;
  expect(storageAccepts(zone,'berries')).toBe(true);
  expect(storageAccepts(zone,'rice')).toBe(true);
  expect(storageAccepts(zone,'wood')).toBe(false);
  Object.assign(zone,{items:{berries:true,wood:true}});
  expect(storageAccepts(zone,'berries')).toBe(true);
  expect(storageAccepts(zone,'rice')).toBe(false);
  expect(storageAccepts(zone,'wood')).toBe(false);
  expect(storageCapacity(w,zone,'rice')).toBe(0);
  expect(storageCapacity(w,zone,'berries')).toBeGreaterThan(0);
  Object.assign(zone,{items:{}});
  expect(storageAccepts(zone,'berries')).toBe(false);
});

test('a rejected item already on a stockpile can leave for a lower-priority accepting stockpile',()=>{
  const w=deconstructionCamp(),pawn=w.pawns[0]!;w.stockpiles=[];
  pawn.priorities.haul=1;
  expect(applyCommand(w,{type:'stockpile',enabled:true,x:15,z:16,priority:4,filters:{wood:false,food:false,weapon:true}}).ok).toBe(true);
  expect(applyCommand(w,{type:'stockpile',enabled:true,x:17,z:16,priority:2,filters:{wood:false,food:false,weapon:true}}).ok).toBe(true);
  const [sourceZone,destinationZone]=w.stockpiles;
  Object.assign(sourceZone!,{items:{'bolt-action-rifle':true}});
  Object.assign(destinationZone!,{items:{revolver:true}});
  addMaterial(w,'weapon',1,{type:'ground',x:sourceZone!.x,z:sourceZone!.z},'revolver');
  const pile=w.piles.find(p=>p.item==='revolver'&&p.owner.type==='ground'&&p.owner.x===sourceZone!.x&&p.owner.z===sourceZone!.z)!;
  expect(storageCapacity(w,sourceZone!,'revolver')).toBe(0);
  expect(mayImproveStorage(w)).toBe(true);
  expect(planHaulOrder(w,pawn,{type:'pile',pileId:pile.id}).task?.destination).toEqual({type:'stockpile',stockpileId:destinationZone!.id});
  w.jobs=[];pawn.priorities={clean:0,firefight:0,warden:0,basic:0,hunt:0,research:0,patient:0,bedrest:0,doctor:0,mine:0,art:0,craft:0,gather:0,build:0,haul:1,grow:0,cook:0};
  pawn.hunger=100;pawn.rest=100;pawn.state='idle';pawn.planCooldown=0;
  planWork(w,pawn,()=>blockedCells(w),new Set(),{remaining:8,pairs:32768});
  expect(pawn.haul?.destination).toEqual({type:'stockpile',stockpileId:destinationZone!.id});
  pawn.haul=null;
  Object.assign(sourceZone!,{items:{revolver:true}});
  expect(planHaulOrder(w,pawn,{type:'pile',pileId:pile.id}).task).toBeUndefined();
});
