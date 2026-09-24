import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import type { World,MaterialPile } from '../src/sim/types';
import { WEAPON_VISUALS } from '../src/render/weapon-shape';
import { APPAREL_CARGO } from '../src/render/character-apparel';
import { BIOME_CARGO } from '../src/render/biome-cargo';
import { pawnGeometry,cargoGeometry,PARKA_HOOD_DYE } from '../src/render/pawn-geometry';
import { pileParts } from '../src/render/pile-parts';
import { equipmentDescription,equipmentProjection } from '../src/render/character-equipment';
import { PawnLayer } from '../src/render/PawnLayer';
import { ColonyRenderer } from '../src/render/ColonyRenderer';
import { BoxBatches } from '../src/render/BoxBatches';
import { BoxMesh } from '../src/render/BoxMesh';
import { clearGroup } from '../src/render/primitives';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { PresentationChanges } from '../src/bridge/presentation-changes';

test('the three weapons share distinct authored ground/cargo/equipment shapes in resident geometry',()=>{
  const body=pawnGeometry(),cargo=cargoGeometry(),dye=body.getAttribute('dye'),kind=cargo.getAttribute('cargoKind');
  const count=(attribute:THREE.BufferAttribute|THREE.InterleavedBufferAttribute,value:number)=>Array.from({length:attribute.count},(_,i)=>attribute.getX(i)).filter(v=>v===value).length;
  const spans:number[]=[];
  expect(WEAPON_VISUALS.some(weapon=>Number(weapon.dye)===PARKA_HOOD_DYE)).toBe(false);
  expect(count(dye,PARKA_HOOD_DYE)).toBe(36);
  for(const weapon of WEAPON_VISUALS) {
    expect([...Object.values(APPAREL_CARGO),...Object.values(BIOME_CARGO)]).not.toContain(weapon.cargo);
    expect(count(dye,weapon.dye)).toBe(weapon.parts.length*36);expect(count(kind,weapon.cargo)).toBe(weapon.parts.length*36);
    const ground=pileParts([{x:5,z:5,item:weapon.item,kind:'weapon',quantity:1,supplied:false}]);
    expect(ground).toHaveLength(weapon.parts.length);
    weapon.parts.forEach((part,i)=>expect(ground[i]).toMatchObject({sx:part.size[0],sy:part.size[2],sz:part.size[1],color:part.color}));
    spans.push(Math.max(...ground.map(p=>p.x+p.sx!/2))-Math.min(...ground.map(p=>p.x-p.sx!/2)));
  }
  expect(spans[1]).toBeGreaterThan(spans[0]!);expect(spans[1]).toBeGreaterThan(spans[2]!);expect(spans[0]).not.toBe(spans[2]);
  expect(count(kind,30)).toBe(72);
  const silver=pileParts([{x:5,z:5,item:'silver',kind:'silver',quantity:500,supplied:false}]);expect(silver).toHaveLength(6);
  body.dispose();cargo.dispose();
});

test('inventory remains hidden while real cargo/equipment and ground transfers retain the same meshes',()=>{
  const w=createWorld(),p=w.pawns[0]!;w.piles=[];
  const weapon:MaterialPile={id:w.nextId++,kind:'weapon',item:'revolver',quantity:1,owner:{type:'equipment',pawnId:p.id},weapon:{quality:'normal',hitPoints:100}};
  const silver:MaterialPile={id:w.nextId++,kind:'silver',item:'silver',quantity:50,owner:{type:'inventory',pawnId:p.id}};w.piles=[weapon,silver];
  const layer=new PawnLayer();layer.update(w,1,true);const meshes=[...layer.group.children] as THREE.Mesh[],geometries=meshes.map(m=>m.geometry),materials=meshes.map(m=>m.material),rig=meshes[0]!;
  const check=(equipment:number,cargo:number)=>{
    const before=JSON.stringify(w);layer.update(w,1,false);expect(JSON.stringify(w)).toBe(before);
    expect(layer.group.children).toEqual(meshes);expect(meshes.map(m=>m.geometry)).toEqual(geometries);expect(meshes.map(m=>m.material)).toEqual(materials);
    expect(rig.geometry.getAttribute('aEquipment').getX(0)).toBe(equipment);expect(rig.geometry.getAttribute('aCargo').getX(0)).toBe(cargo);
  };
  for(const variant of WEAPON_VISUALS) {
    weapon.item=variant.item;weapon.weapon!.hitPoints=variant.item==='plasteel-knife'?280:100;weapon.owner={type:'equipment',pawnId:p.id};check(variant.equipment,0);
    expect(equipmentProjection(w).get(p.id)).toBe(weapon);expect(equipmentDescription(weapon)).toContain(`${weapon.weapon!.hitPoints}/${weapon.weapon!.hitPoints} PV`);
    weapon.owner={type:'pawn',pawnId:p.id};check(0,variant.cargo);
    weapon.owner={type:'inventory',pawnId:p.id};check(0,0);expect(equipmentProjection(w).has(p.id)).toBe(false);
  }
  silver.owner={type:'pawn',pawnId:p.id};check(0,30);silver.owner={type:'inventory',pawnId:p.id};check(0,0);
  // Exercise the actual pile projection without constructing a WebGPU renderer.
  const boxes=new BoxBatches(),pileGroup=new THREE.Group(),facade={boxes,pileGroup,pileChunks:new Map()};
  const update=(ColonyRenderer.prototype as unknown as {updatePiles:(world:World,newMap:boolean)=>void}).updatePiles;
  update.call(facade,w,true);const floor=pileGroup.children.flatMap(c=>c.children) as BoxMesh[];expect(floor.every(m=>m.activeCount===0)).toBe(true);
  silver.owner={type:'ground',x:4,z:4};update.call(facade,w,false);expect(floor.reduce((n,m)=>n+m.activeCount,0)).toBe(2);
  silver.owner={type:'inventory',pawnId:p.id};update.call(facade,w,false);expect(floor.every(m=>m.activeCount===0)).toBe(true);
  boxes.dispose();clearGroup(layer.group);
});

test('visitor and trade phases publish promptly and round-trip through deltas without mutating older frames',()=>{
  const w=createWorld(),p=w.pawns[0]!,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),changes=new PresentationChanges();
  const transfer=()=>{const result=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(result.status).toBe('applied');if(result.status!=='applied')throw new Error('snapshot refused');expect(result.world).toEqual(w);return result.world;};
  expect(changes.capture(w)).toBe(true);expect(changes.capture(w)).toBe(false);const original=transfer(),copy=structuredClone(original);
  p.visitor={group:1,role:'trader',phase:'arriving',goal:{x:8,z:8},personalFoodIds:[]};
  expect(changes.capture(w)).toBe(true);transfer();expect(original).toEqual(copy);
  p.visitor.phase='staying';expect(changes.capture(w)).toBe(true);transfer();
  p.trade={traderId:w.pawns[1]!.id,phase:'approach',startedAt:w.tick};expect(changes.capture(w)).toBe(true);transfer();
  p.trade.phase='ready';expect(changes.capture(w)).toBe(true);transfer();expect(changes.capture(structuredClone(w))).toBe(false);
  w.trade={count:1,silverPaid:30,silverReceived:0,forgone:0,bought:{medicine:1},sold:{},recent:[]};
  expect(changes.capture(w)).toBe(true);transfer();
  delete p.trade;p.visitor.phase='leaving';expect(changes.capture(w)).toBe(true);transfer();
});
