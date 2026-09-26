import {test,expect} from 'vitest';
import * as THREE from 'three/webgpu';
import {PawnLayer} from '../src/render/PawnLayer';
import {createWorld} from '../src/sim/index';
import {startingPawn} from '../src/sim/starting-pawns';
import {appearanceOf} from '../src/sim/pawn-appearance';
import {appearanceShape} from '../src/render/pawn-appearance-shape';

test('resident appearance survives actor growth, reordering and restored legacy identity without mutating gameplay',()=>{
  const world=createWorld(42,32,32),layer=new PawnLayer();
  const old=world.pawns[0]!;delete old.appearance;
  const before=JSON.stringify(world);layer.update(world,1,true);
  const geometry=layer.feedbackSource!,material=(layer.group.children[0] as THREE.Mesh).material;
  expect(JSON.stringify(world)).toBe(before);
  const instances=geometry.getAttribute('aShape') as THREE.InterleavedBufferAttribute;
  const expected=appearanceShape(appearanceOf(old,world.seed));
  expect(Array.from({length:4},(_,i)=>instances.getComponent(0,i))).toEqual(expected);
  const identities=world.pawns.map(p=>({...p}));
  for(let i=0;i<100;i++)world.pawns.push(startingPawn(world.nextId++,`Test ${i}`,12,12,0,55,world.seed));
  layer.update(world,1,false);
  const grown=layer.feedbackSource!,shape=grown.getAttribute('aShape') as THREE.InterleavedBufferAttribute;
  expect((layer.group.children[0] as THREE.Mesh).material).toBe(material);
  expect(shape.count).toBeGreaterThanOrEqual(world.pawns.length);
  expect(shape.data).toBe((grown.getAttribute('aSkin') as THREE.InterleavedBufferAttribute).data);
  expect(shape.data).toBe((grown.getAttribute('aEquipment') as THREE.InterleavedBufferAttribute).data);
  expect(Array.from({length:4},(_,i)=>shape.getComponent(0,i))).toEqual(expected);
  world.pawns.reverse();layer.update(world,1,false);
  const index=world.pawns.findIndex(p=>p.id===old.id);
  expect(Array.from({length:4},(_,i)=>shape.getComponent(index,i))).toEqual(expected);
  expect(world.pawns.find(p=>p.id===old.id)).toEqual(identities[0]);
  // WebGPU guarantees eight buffer slots and sixteen attributes. Unused fire/selection
  // attributes live on the geometry but are not requested by the human shader.
  const names=['position','normal','color','boneId','bindPivot','dye','aFrom','aTo','aMotion','aTravel','aCargo','aTint','aEquipment','aSkin','aHair','aShape'];
  const buffers=new Set(names.map(n=>{const a=grown.getAttribute(n);return a instanceof THREE.InterleavedBufferAttribute?a.data:a;}));
  expect(buffers.size).toBeLessThanOrEqual(8);expect(names.length).toBeLessThanOrEqual(16);
});
