import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import { nutrientPasteParts } from '../src/render/nutrient-paste-parts';
import { pileSurfaces } from '../src/render/pile-surfaces';
import { pileParts } from '../src/render/pile-parts';
import { pasteCollectionSource,pawnWorkPose } from '../src/render/work-presentation';
import { CargoHandoffs,CARGO_HANDOFF_TICKS } from '../src/render/cargo-handoff';
import { PawnLayer } from '../src/render/PawnLayer';
import { MotionTimeline } from '../src/render/MotionTimeline';
import { pasteSpot } from '../src/sim/nutrient-paste';
import type { MaterialPile,Structure } from '../src/sim/types';

function fixture(){
  const world=createWorld(282,32,32);world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[];world.jobs=[];world.piles=[];
  const dispenser:Structure={id:world.nextId++,kind:'nutrient-paste-dispenser',x:12,z:12,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
  const hopper:Structure={id:world.nextId++,kind:'hopper',x:10,z:12,orientation:0,footprint:'standard',material:'steel'};
  world.structures=[dispenser,hopper];return {world,dispenser,hopper};
}

test('the static dispenser fits its full footprint and its recovery slot remains outside the shell after rotation',()=>{
  const {world,dispenser}=fixture();world.structures=[dispenser];const base=nutrientPasteParts(world);
  expect(base.every(p=>Math.abs(p.x-dispenser.x)+(p.sx??1)/2<=1.5&&p.z-dispenser.z-(p.sz??1)/2>=-1.5&&p.z-dispenser.z+(p.sz??1)/2<=2.5)).toBe(true);
  for(const orientation of [1,2,3] as const){
    dispenser.orientation=orientation;const parts=nutrientPasteParts(world),angle=orientation*Math.PI/2;
    for(let i=0;i<base.length;i++){
      const dx=base[i]!.x-dispenser.x,dz=base[i]!.z-dispenser.z;
      expect(parts[i]!.x-dispenser.x).toBeCloseTo(dx*Math.cos(angle)+dz*Math.sin(angle));
      expect(parts[i]!.z-dispenser.z).toBeCloseTo(dz*Math.cos(angle)-dx*Math.sin(angle));
    }
    const spot=pasteSpot(dispenser);expect(Math.hypot(spot.x-dispenser.x,spot.z-dispenser.z)).toBe(3);
  }
  const rotated=nutrientPasteParts(world);dispenser.power!.on=false;world.tick+=100;world.piles.push({id:world.nextId++,item:'rice',kind:'food',quantity:20,owner:{type:'ground',x:10,z:12}});
  expect(nutrientPasteParts(world)).toEqual(rotated);
});

test('hopper presents its actual pile inside the open shell without creating an ingredient model',()=>{
  const {world,hopper}=fixture(),shape=nutrientPasteParts(world),surface=pileSurfaces(world).get(hopper.z*world.width+hopper.x)!;
  expect(surface).toEqual({x:0,y:.14,z:0,scale:.72});
  const piles=pileParts([{x:hopper.x,z:hopper.z,item:'rice',kind:'food',quantity:6,supplied:false,surface}]);
  expect(piles.every(p=>Math.abs(p.x-hopper.x)+(p.sx??1)/2<.4&&Math.abs(p.z-hopper.z)+(p.sz??1)/2<.4)).toBe(true);
  world.piles=[{id:world.nextId++,item:'rice',kind:'food',quantity:6,owner:{type:'ground',x:hopper.x,z:hopper.z}}];expect(nutrientPasteParts(world)).toEqual(shape);
  const meal=pileParts([{x:14,z:15,item:'nutrient-paste-meal',kind:'food',quantity:1,supplied:false}]);expect(meal).toHaveLength(2);expect(meal.every(p=>p.y>0)).toBe(true);
});

test('a merge into a hopper uses the actual destination and masks only the incoming cargo until arrival',()=>{
  const {world,hopper}=fixture(),pawn=world.pawns[0]!,id=pawn.id,carryId=world.nextId++,groundId=world.nextId++;
  const rice=(pileId:number,quantity:number,owner:MaterialPile['owner']):MaterialPile=>({id:pileId,item:'rice',kind:'food',quantity,owner});
  pawn.haul={sourcePileId:world.nextId++,quantity:10,carryPileId:carryId,phase:'deliver',destination:{type:'hopper',structureId:hopper.id}};
  world.piles=[rice(carryId,10,{type:'pawn',pawnId:id}),rice(groundId,6,{type:'ground',x:hopper.x,z:hopper.z})];
  const after={...world,tick:world.tick+1,piles:[rice(groundId,16,{type:'ground',x:hopper.x,z:hopper.z})]},ledger=new CargoHandoffs();
  ledger.adopt(world,after,after.tick,true,()=>({x:12,y:1,z:13,yaw:0}));
  expect(ledger.active.get(id)).toMatchObject({direction:'drop',targetPileId:groundId,to:{x:hopper.x,z:hopper.z}});expect(ledger.active.get(id)!.to.y).toBeCloseTo(.29);
  expect(ledger.hiddenQuantity(groundId)).toBe(10);expect(after.piles[0]!.quantity-ledger.hiddenQuantity(groundId)).toBe(6);
  expect(ledger.complete(after.tick+CARGO_HANDOFF_TICKS)).toBe(true);expect(ledger.hiddenQuantity(groundId)).toBe(0);
});

test('collect has an ordinary meal in hand, no fake ground pickup and no cooking pose',()=>{
  const {world,dispenser}=fixture(),p=world.pawns[0]!,spot=pasteSpot(dispenser),carryId=world.nextId++;
  p.x=spot.x;p.z=spot.z;p.state='moving';p.need={kind:'eat',phase:'collect',sourcePileId:null,carryPileId:carryId,quantity:1,progress:0,dining:null,paste:{dispenserId:dispenser.id,spot,producedAt:world.tick}};
  world.piles=[{id:carryId,item:'nutrient-paste-meal',kind:'food',quantity:1,owner:{type:'pawn',pawnId:p.id}}];
  expect(pasteCollectionSource(p)).toEqual(p.need.paste);expect(pawnWorkPose(p,undefined,'nutrient-paste-dispenser')).toBe(0);
  const layer=new PawnLayer(),ledger=new CargoHandoffs(),previous={...world,piles:[]},timeline=new MotionTimeline();
  try{
    ledger.adopt(previous,world,world.tick,true,()=>({x:p.x,y:1,z:p.z,yaw:0}));expect(ledger.active.size).toBe(0);
    layer.update(world,1,true);const cargo=layer.feedbackSource!.getAttribute('aCargo') as THREE.InstancedBufferAttribute;
    expect(cargo.getX(0)).toBe(2);expect(cargo.getY(0)).toBeGreaterThan(0);
    timeline.tick=world.tick;timeline.tracks.set(p.id,[{start:world.tick-1,end:world.tick,from:{x:spot.x-1,z:spot.z},to:spot,fromFraction:0,toFraction:1}]);layer.updateTravel(world,timeline);
    const motion=layer.feedbackSource!.getAttribute('aMotion'),to=layer.feedbackSource!.getAttribute('aTo');expect(motion.getX(0)).toBe(0);expect(motion.getZ(0)).toBe(0);expect(to.getW(0)).toBeCloseTo(Math.PI);
    p.need.phase='travel';expect(pasteCollectionSource(p)).toBeUndefined();
  }finally{layer.dispose();}
});
