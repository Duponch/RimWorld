import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import { CORPSE_DESSICATION_TICKS,CORPSE_ROT_TICKS } from '../src/sim/corpses';
import { groundCapacity } from '../src/sim/ground-placement';
import { pileParts } from '../src/render/pile-parts';
import { ColonyRenderer } from '../src/render/ColonyRenderer';
import { humanCorpseVisualStage,retainedHumanCorpseOffsets,PawnLayer } from '../src/render/PawnLayer';
import type { MaterialPile,World } from '../src/sim/types';
import { clearGroup } from '../src/render/primitives';

test('loose apparel stays centred on its logical cell',()=>{
  const parts=pileParts([{x:7,z:11,kind:'apparel',item:'cloth-shirt',quantity:1,supplied:false}]);
  const bounds=(axis:'x'|'z')=>[Math.min(...parts.map(p=>p[axis]-(axis==='x'?p.sx!:p.sz!)/2)),Math.max(...parts.map(p=>p[axis]+(axis==='x'?p.sx!:p.sz!)/2))];
  const [minX,maxX]=bounds('x'),[minZ,maxZ]=bounds('z');
  expect((minX+maxX)/2).toBeCloseTo(7);
  expect((minZ+maxZ)/2).toBeCloseTo(11,1);
});

test('one body owns a floor cell while rot changes the existing human rig',()=>{
  const world=createWorld(),pawn=world.pawns[0]!;
  world.piles=[];pawn.state='dead';pawn.body={observedAt:world.tick,rot:{progress:0,atTick:world.tick}};
  const layer=new PawnLayer();
  const shape=()=>{layer.update(world,1,false);return layer.feedbackSource!.getAttribute('aShape').getX(0);};
  expect(humanCorpseVisualStage(world,pawn)).toBe(0);
  const base=shape();
  world.tick+=CORPSE_ROT_TICKS;
  expect(humanCorpseVisualStage(world,pawn)).toBe(1);
  expect(shape()).toBe(base+10);
  world.tick+=CORPSE_DESSICATION_TICKS-CORPSE_ROT_TICKS;
  expect(humanCorpseVisualStage(world,pawn)).toBe(2);
  expect(shape()).toBe(base+20);
  const ground={type:'ground' as const,x:pawn.x,z:pawn.z};
  const pile:MaterialPile={id:world.nextId++,kind:'corpse',item:'human-corpse',quantity:1,owner:ground,humanCorpse:{pawnId:pawn.id},rot:{progress:0,atTick:world.tick}};
  world.piles.push(pile);pawn.body.pileId=pile.id;delete pawn.body.rot;
  expect(groundCapacity(world,ground,'human-corpse')).toBe(0);
  expect(groundCapacity(world,ground,'hare-corpse')).toBe(0);
  expect(humanCorpseVisualStage(world,pawn)).toBe(0);
  clearGroup(layer.group);
});

test('selected object corners are thick geometry rebuilt only on selection changes',()=>{
  const world:World=createWorld(),pile:MaterialPile={id:world.nextId++,kind:'apparel',item:'cloth-shirt',quantity:1,owner:{type:'ground',x:4,z:5}};
  world.piles.push(pile);
  const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial());
  const facade={world,selectedObject:{kind:'pile' as const,id:pile.id},objectSelection:mesh,objectSelectionSignature:''};
  const update=(ColonyRenderer.prototype as unknown as {updateSelectedObject:()=>void}).updateSelectedObject;
  update.call(facade);
  const geometry=mesh.geometry,position=geometry.getAttribute('position');
  expect(position.count).toBe(48); // eight two-triangle strokes for four corners
  expect(Math.abs(position.getZ(0)-position.getZ(2))).toBeCloseTo(.048);
  update.call(facade);expect(mesh.geometry).toBe(geometry);
  geometry.dispose();(mesh.material as THREE.Material).dispose();
});

test('two retained bodies at one logical cell get stable presentation offsets',()=>{
  const world=createWorld(),[a,b]=world.pawns;
  a!.state=b!.state='dead';a!.body={observedAt:world.tick};b!.body={observedAt:world.tick};
  b!.x=a!.x;b!.z=a!.z;
  const logical=[a!.x,a!.z,b!.x,b!.z];
  const offsets=retainedHumanCorpseOffsets(world);
  expect(offsets.get(a!.id)).not.toEqual(offsets.get(b!.id));
  expect(retainedHumanCorpseOffsets(world)).toEqual(offsets);
  expect([a!.x,a!.z,b!.x,b!.z]).toEqual(logical);
});
