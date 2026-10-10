import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import type { MaterialPile,World } from '../src/sim/types';
import { CargoHandoffs,CARGO_HANDOFF_TICKS } from '../src/render/cargo-handoff';
import { PawnLayer } from '../src/render/PawnLayer';
import { MotionTimeline } from '../src/render/MotionTimeline';
import { WORLD_SCALE } from '../src/world/scale';
import { CARRY_CAPACITY } from '../src/sim/definitions';
import { itemCargoKind } from '../src/render/item-presentation';

const hand=()=>({x:10.3,y:1.02,z:10.4,yaw:.4});
function baseWorld():World {
  const world=createWorld();
  world.tick=100;
  world.pawns[0]!.x=10;world.pawns[0]!.z=10;world.pawns[0]!.state='idle';
  world.piles=[];
  return world;
}
function wood(id:number,quantity:number,owner:MaterialPile['owner']):MaterialPile {
  return {id,kind:'wood',item:'wood',quantity,owner};
}

test('pickup starts at the actual table surface and ends at the resident pawn cargo pose',()=>{
  const previous=baseWorld();
  previous.structures=[{id:500,kind:'table',x:10,z:10,orientation:0,footprint:'standard'}];
  previous.piles=[wood(501,20,{type:'ground',x:10,z:10})];
  const current={...previous,tick:101,piles:[wood(501,20,{type:'pawn',pawnId:previous.pawns[0]!.id})]};
  const ledger=new CargoHandoffs();ledger.adopt(previous,current,101,true,hand);
  const item=ledger.active.get(previous.pawns[0]!.id)!;
  expect(item.direction).toBe('pickup');
  expect(item.from).toMatchObject({x:10,z:10,y:WORLD_SCALE.tableHeight+.15});
  expect(item.groundScale).toBeCloseTo(.64);
  expect(ledger.hiddenQuantity(501)).toBe(0);
  expect(ledger.complete(101+CARGO_HANDOFF_TICKS-.01)).toBe(false);
  expect(ledger.active.size).toBe(1);
  expect(ledger.complete(101+CARGO_HANDOFF_TICKS)).toBe(false);
  expect(ledger.active.size).toBe(0);
});

test('floor release masks exactly the arriving quantity until landing, including a merge',()=>{
  const previous=baseWorld(),id=previous.pawns[0]!.id;
  previous.pawns[0]!.haul={sourcePileId:509,quantity:20,phase:'deliver',destination:{type:'aside',x:11,z:10},carryPileId:510};
  previous.piles=[wood(510,20,{type:'pawn',pawnId:id}),wood(511,15,{type:'ground',x:11,z:10})];
  const current={...previous,tick:101,piles:[wood(511,35,{type:'ground',x:11,z:10})]};
  const ledger=new CargoHandoffs();ledger.adopt(previous,current,101,true,hand);
  const item=ledger.active.get(id)!;
  expect(item.direction).toBe('drop');expect(item.targetPileId).toBe(511);
  expect(item.from).toEqual(hand());
  expect(item.to).toMatchObject({x:11,z:10,y:.15});
  expect(current.piles[0]!.quantity-ledger.hiddenQuantity(511)).toBe(15);
  expect(ledger.complete(101.8)).toBe(false);
  expect(ledger.complete(101+CARGO_HANDOFF_TICKS)).toBe(true);
  expect(ledger.hiddenQuantity(511)).toBe(0);
  ledger.adopt(current,{...current,tick:103},103,true,hand);
  expect(ledger.active.size).toBe(0); // no replay on the next snapshot
});

test('partial output keeps the reduced load in hand and animates only its deposited fraction',()=>{
  const previous=baseWorld(),id=previous.pawns[0]!.id;
  previous.pawns[0]!.cooking={phase:'output',storageId:null,actionCell:{x:11,z:10}} as typeof previous.pawns[0]['cooking'];
  previous.piles=[wood(540,20,{type:'pawn',pawnId:id})];
  const current={...previous,tick:101,piles:[wood(540,12,{type:'pawn',pawnId:id}),wood(541,8,{type:'ground',x:11,z:10})]};
  const ledger=new CargoHandoffs();ledger.adopt(previous,current,101,true,hand);
  expect(ledger.active.get(id)).toMatchObject({partial:true,targetPileId:541,pile:{quantity:8}});
  expect(ledger.hiddenQuantity(541)).toBe(8);
  const layer=new PawnLayer(),timeline=new MotionTimeline();
  layer.update(previous,1,true);timeline.tick=100;layer.updateTravel(previous,timeline);
  layer.adoptCargo(previous,current,101,true);layer.update(current,1,false);
  const held=layer.feedbackSource!.getAttribute('aCargo') as THREE.InstancedBufferAttribute;
  const transient=layer.group.children[4] as THREE.Mesh;
  const transfer=transient.geometry.getAttribute('aTransferCargo') as THREE.InstancedBufferAttribute;
  expect(held.getX(0)).toBe(itemCargoKind('wood'));expect(held.getY(0)).toBeCloseTo(Math.min(1,12/CARRY_CAPACITY));
  expect(held.getW(0)).toBe(0); // the remaining load is still attached to the hand
  expect((transient.geometry as THREE.InstancedBufferGeometry).instanceCount).toBe(1);
  expect(transfer.getX(0)).toBe(itemCargoKind('wood'));expect(transfer.getY(0)).toBeCloseTo(8/CARRY_CAPACITY);
  expect(layer.presentCargo(101+CARGO_HANDOFF_TICKS,current)).toBe(true);
  expect((transient.geometry as THREE.InstancedBufferGeometry).instanceCount).toBe(0);
  layer.dispose();
});

test('ambiguous nearby growth cannot impersonate a delivery without a task destination',()=>{
  const previous=baseWorld(),id=previous.pawns[0]!.id;
  previous.piles=[wood(550,10,{type:'pawn',pawnId:id}),wood(551,5,{type:'ground',x:11,z:10}),wood(552,5,{type:'ground',x:10,z:11})];
  const current={...previous,tick:101,piles:[wood(551,15,{type:'ground',x:11,z:10}),wood(552,15,{type:'ground',x:10,z:11})]};
  const ledger=new CargoHandoffs();ledger.adopt(previous,current,101,true,hand);
  expect(ledger.active.size).toBe(0);
});

test('an explicit task cell selects the correct one of two simultaneous nearby growths',()=>{
  const previous=baseWorld(),id=previous.pawns[0]!.id;
  previous.pawns[0]!.haul={sourcePileId:580,quantity:10,phase:'deliver',destination:{type:'aside',x:10,z:11},carryPileId:581};
  previous.piles=[wood(581,10,{type:'pawn',pawnId:id}),wood(582,5,{type:'ground',x:11,z:10}),wood(583,5,{type:'ground',x:10,z:11})];
  const current={...previous,tick:101,piles:[wood(582,15,{type:'ground',x:11,z:10}),wood(583,15,{type:'ground',x:10,z:11})]};
  const ledger=new CargoHandoffs();ledger.adopt(previous,current,101,true,hand);
  expect(ledger.active.get(id)?.targetPileId).toBe(583);
  expect(ledger.hiddenQuantity(582)).toBe(0);
  expect(ledger.hiddenQuantity(583)).toBe(10);
});

test('a target re-owned before landing cancels the former drop',()=>{
  const previous=baseWorld(),id=previous.pawns[0]!.id,other=previous.pawns[1]!.id;
  previous.piles=[wood(590,10,{type:'pawn',pawnId:id})];
  const released={...previous,tick:101,piles:[wood(590,10,{type:'ground',x:11,z:10})]};
  const ledger=new CargoHandoffs();ledger.adopt(previous,released,101,true,hand);
  expect(ledger.hiddenQuantity(590)).toBe(10);
  const taken={...released,tick:102,piles:[wood(590,10,{type:'pawn',pawnId:other})]};
  ledger.adopt(released,taken,102,true,hand);
  expect(ledger.hiddenQuantity(590)).toBe(0);
  expect(ledger.active.get(id)).toBeUndefined();
});

test('a second pickup cancels an unfinished drop and a re-owned target clears its visual mask',()=>{
  const previous=baseWorld(),id=previous.pawns[0]!.id;
  previous.piles=[wood(560,10,{type:'pawn',pawnId:id}),wood(561,10,{type:'ground',x:10,z:11})];
  const released={...previous,tick:101,piles:[wood(560,10,{type:'ground',x:11,z:10}),wood(561,10,{type:'ground',x:10,z:11})]};
  const ledger=new CargoHandoffs();ledger.adopt(previous,released,101,true,hand);
  expect(ledger.hiddenQuantity(560)).toBe(10);
  const next={...released,tick:102,piles:[wood(560,10,{type:'ground',x:11,z:10}),wood(561,10,{type:'pawn',pawnId:id})]};
  ledger.adopt(released,next,102,true,hand);
  expect(ledger.hiddenQuantity(560)).toBe(0);
  expect(ledger.active.get(id)?.direction).toBe('pickup');
  const taken={...next,tick:103,piles:[wood(560,10,{type:'pawn',pawnId:previous.pawns[1]!.id}),wood(561,10,{type:'pawn',pawnId:id})]};
  ledger.adopt(next,taken,103,true,hand);
  expect(ledger.hiddenQuantity(560)).toBe(0);
});

test('wood delivered to a job ends at the wood side of its static marker',()=>{
  const previous=baseWorld(),id=previous.pawns[0]!.id;
  previous.piles=[wood(570,10,{type:'pawn',pawnId:id})];
  previous.jobs=[{id:571,kind:'wall',x:11,z:10,orientation:0,footprint:'standard',status:'active',reservedBy:id,progress:0,escrow:{wood:0,food:0}}];
  const current={...previous,tick:101,piles:[wood(570,10,{type:'job',jobId:571})]};
  const ledger=new CargoHandoffs();ledger.adopt(previous,current,101,true,hand);
  expect(ledger.active.get(id)?.to).toMatchObject({x:10.88,z:10.16});
});

test('paused adoption and fresh load use the authoritative pile immediately',()=>{
  const previous=baseWorld(),id=previous.pawns[0]!.id;
  previous.piles=[wood(520,10,{type:'pawn',pawnId:id})];
  const current={...previous,tick:101,piles:[wood(520,10,{type:'ground',x:10,z:11})]};
  const ledger=new CargoHandoffs();
  ledger.adopt(previous,current,101,true,hand);
  expect(ledger.hiddenQuantity(520)).toBe(10);
  ledger.adopt(current,current,101,false,hand);
  expect(ledger.hiddenQuantity(520)).toBe(0);
  ledger.adopt(undefined,current,101,true,hand);
  expect(ledger.active.size).toBe(0);
});

test('resident cargo buffer moves on the confirmed clock without per-frame uploads',()=>{
  const previous=baseWorld(),id=previous.pawns[0]!.id;
  previous.piles=[wood(530,12,{type:'pawn',pawnId:id})];
  const layer=new PawnLayer(),timeline=new MotionTimeline();
  layer.update(previous,1,true);timeline.tick=100;layer.updateTravel(previous,timeline);
  const current={...previous,tick:101,piles:[wood(530,12,{type:'ground',x:10,z:11})]};
  layer.adoptCargo(previous,current,101,true);
  expect(layer.hiddenPileQuantity(530)).toBe(12);
  layer.update(current,1,false);
  const geometry=layer.feedbackSource!,cargo=geometry.getAttribute('aCargo') as THREE.InstancedBufferAttribute;
  const handoff=(layer.group.children[1] as THREE.Mesh).geometry.getAttribute('aHandoffTo') as THREE.InstancedBufferAttribute;
  expect(cargo.getX(0)).toBe(itemCargoKind('wood'));expect(cargo.getW(0)).toBeLessThan(0);
  expect(handoff.getZ(0)).toBe(11);
  const version=cargo.version;
  expect(layer.presentCargo(101.5,current)).toBe(false);
  expect(cargo.version).toBe(version);
  expect(layer.presentCargo(101+CARGO_HANDOFF_TICKS,current)).toBe(true);
  expect(cargo.getX(0)).toBe(0);expect(layer.hiddenPileQuantity(530)).toBe(0);
  layer.dispose();
});
