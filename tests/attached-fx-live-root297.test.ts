import {expect,test,vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {uniform} from 'three/tsl';
import {createWorld} from '../src/sim/index';
import {AnimationDetail} from '../src/render/AnimationDetail';
import {FxAnimationCache} from '../src/render/FxAnimationCache';
import {attachedFireMesh,presentAttachedFire} from '../src/render/FireLayer';
import {BrawlCloudLayer} from '../src/render/BrawlCloudLayer';
import {sampleActorRoot} from '../src/render/ActorAnimationCache';

type Observed={mock:{calls:unknown[][];contexts:unknown[]}};
function camera(){const view=new THREE.OrthographicCamera(-360/16,360/16,360/16,-360/16,.1,1000);view.position.set(8,20,30);view.lookAt(8,0,8);view.updateProjectionMatrix();return view;}
function source(count:number){const g=new THREE.InstancedBufferGeometry();for(const name of ['aFrom','aTo','aTravel'])g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(count*4),4));g.instanceCount=count;for(let row=0;row<count;row++){(g.getAttribute('aFrom') as THREE.InstancedBufferAttribute).setXYZW(row,8+row,0,8,0);(g.getAttribute('aTo') as THREE.InstancedBufferAttribute).setXYZW(row,8+row,0,8,0);}return g;}
function setRoot(g:THREE.BufferGeometry,row:number,x:number,y:number,z:number){for(const name of ['aFrom','aTo']){const a=g.getAttribute(name) as THREE.InstancedBufferAttribute;a.setXYZW(row,x,y,z,0);a.needsUpdate=true;}}
function anchor(g:THREE.BufferGeometry,prefix:string,row:number,time:number,blend:number){return sampleActorRoot(g.getAttribute(prefix+'From'),g.getAttribute(prefix+'To'),g.getAttribute(prefix+'Travel'),row,time,blend);}
function caches(observed:Observed){const result=[...new Set(observed.mock.contexts)] as FxAnimationCache[];expect(result.every(cache=>cache instanceof FxAnimationCache)).toBe(true);return result;}
function palette(cache:FxAnimationCache,row:number){const values:number[]=[];for(let cell=0;cell<cache.cells;cell++)for(let component=0;component<4;component++)values.push(cache.get(row,cell,component));return values;}
function writes(observed:Observed,owners:FxAnimationCache[]){return observed.mock.calls.filter((args,index)=>owners.includes(observed.mock.contexts[index] as FxAnimationCache)&&typeof args[1]==='number'&&args[1]>0).length;}
function attributes(g:THREE.BufferGeometry){return Object.fromEntries(Object.keys(g.attributes).map(name=>[name,Array.from(g.getAttribute(name).array)]));}
function expectXYZ(actual:{x:number;y:number;z:number},expected:{x:number;y:number;z:number}){expect(actual.x).toBeCloseTo(expected.x,5);expect(actual.y).toBeCloseTo(expected.y,5);expect(actual.z).toBeCloseTo(expected.z,5);}

test('middle attached-fire compact anchor follows the moved burning source while its actual effect palette remains held',()=>{
  // Declared render streams, matching the existing FX compaction fixture.
  // No World, Engine, Raw save or GPU execution is manufactured here.
  const detail=new AnimationDetail(),view=camera(),g=source(3),clock={travelTime:uniform(0),blend:uniform(1)},mesh=attachedFireMesh(g,clock,1,detail);
  const fire=g.getAttribute('aFire') as THREE.InstancedBufferAttribute,observed=vi.spyOn(FxAnimationCache.prototype,'sample'),sets=vi.spyOn(FxAnimationCache.prototype,'set'),handles=vi.spyOn(detail,'createHandle');
  const clockTokens=()=>handles.mock.results.map(result=>{if(result.type!=='return')throw Error('Real handle creation failed');return {...result.value};});
  try{
    fire.setX(2,.5);fire.needsUpdate=true;const before=attributes(g);
    detail.beginFrame(0,view,720,0);presentAttachedFire(mesh,g,clock,detail);
    const geometry=mesh.geometry as THREE.InstancedBufferGeometry,owners=caches(observed);expect(owners).toHaveLength(1);expect(detail.classify(10,0,8)).toBe(1);
    const cache=owners[0]!,held=palette(cache,2),heldWrites=writes(sets,owners),heldClocks=clockTokens(),initial=anchor(geometry,'a',0,clock.travelTime.value,clock.blend.value);
    expect(geometry.instanceCount).toBe(1);expect(geometry.getAttribute('fxSlot').getX(0)).toBe(2);expect(geometry.getAttribute('aFrom')).not.toBe(g.getAttribute('aFrom'));expect(attributes(g)).toEqual(before);
    expect((mesh.material as THREE.MeshStandardNodeMaterial).positionNode).toBeDefined();expect(heldWrites).toBeGreaterThan(0);
    setRoot(g,2,10.75,.25,8.5);clock.travelTime.value=.04;const movedSource=attributes(g);
    detail.beginFrame(40,view,720,.24);presentAttachedFire(mesh,g,clock,detail);
    const moved=anchor(geometry,'a',0,clock.travelTime.value,clock.blend.value),expected=anchor(g,'a',2,clock.travelTime.value,clock.blend.value);
    // These are the compact attributes consumed by the real positionNode.
    // sampleActorRoot reads those inputs; it does not evaluate the GPU graph.
    expectXYZ(moved,expected);expect(moved.x).toBeGreaterThan(initial.x);expect(geometry.getAttribute('fxSlot').getX(0)).toBe(2);
    expect(palette(cache,2)).toEqual(held);expect(writes(sets,owners)).toBe(heldWrites);expect(clockTokens()).toEqual(heldClocks);expect(attributes(g)).toEqual(movedSource);expect(fire.getX(2)).toBe(.5);
    detail.beginFrame(84,view,720,.504);clock.travelTime.value=.084;presentAttachedFire(mesh,g,clock,detail);expect(writes(sets,owners)).toBeGreaterThan(heldWrites);
  }finally{observed.mockRestore();sets.mockRestore();handles.mockRestore();mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();g.dispose();}
});

test('middle brawl compact pair anchors follow the moved source pair while all real affine effect palettes remain held',()=>{
  // Renderer-only reciprocal pair from the existing brawl fixture pattern.
  // JSON equality below is immutability, never Whole/Engine validity.
  const world=createWorld(333,32,32),a=world.pawns[0]!,b=world.pawns[1]!;b.x=a.x+1;b.z=a.z;
  a.social={rng:1,memories:[],fight:{opponentId:b.id,startedAt:world.tick}};b.social={rng:2,memories:[],fight:{opponentId:a.id,startedAt:world.tick}};
  const raw=JSON.stringify(world),detail=new AnimationDetail(),view=camera(),g=source(world.pawns.length),clock={travelTime:uniform(0),blend:uniform(1)},layer=new BrawlCloudLayer(clock,detail);
  world.pawns.forEach((pawn,row)=>setRoot(g,row,pawn.x,0,pawn.z));
  const observed=vi.spyOn(FxAnimationCache.prototype,'sample'),sets=vi.spyOn(FxAnimationCache.prototype,'set'),handles=vi.spyOn(detail,'createHandle');
  const clockTokens=()=>handles.mock.results.map(result=>{if(result.type!=='return')throw Error('Real handle creation failed');return {...result.value};});
  try{
    detail.beginFrame(0,view,720,0);layer.update(world,g);layer.present(0);
    const geometries=[...new Set((layer.group.children as THREE.Mesh<THREE.InstancedBufferGeometry>[]).map(mesh=>mesh.geometry))],owners=caches(observed);
    expect(geometries).toHaveLength(5);expect(owners).toHaveLength(5);expect(detail.classify(a.x,0,a.z)).toBe(1);
    const held=owners.map(cache=>palette(cache,0)),heldWrites=writes(sets,owners),heldClocks=clockTokens(),sourceBefore=attributes(g);
    expect(heldWrites).toBeGreaterThan(0);expect(geometries.every(geometry=>geometry.instanceCount>0)).toBe(true);expect(JSON.stringify(world)).toBe(raw);
    const initial=geometries.map(geometry=>({a:anchor(geometry,'aA',0,0,1),b:anchor(geometry,'aB',0,0,1)}));
    setRoot(g,0,a.x+1.25,.2,a.z-.5);setRoot(g,1,b.x+1.25,.2,b.z-.5);clock.travelTime.value=.04;const sourceMoved=attributes(g);
    expect(sourceMoved).not.toEqual(sourceBefore);detail.beginFrame(40,view,720,.24);layer.present(.24);
    for(let index=0;index<geometries.length;index++){
      const geometry=geometries[index]!,pair=geometry.getAttribute('aHit'),slot=geometry.getAttribute('fxSlot');
      const actualA=anchor(geometry,'aA',0,clock.travelTime.value,clock.blend.value),actualB=anchor(geometry,'aB',0,clock.travelTime.value,clock.blend.value);
      // Both roots are consumed by pairCenter in the real graph; no copied
      // affine/particle formula or interpreted final vertex is asserted.
      expectXYZ(actualA,anchor(g,'a',pair.getZ(0),clock.travelTime.value,clock.blend.value));expectXYZ(actualB,anchor(g,'a',pair.getW(0),clock.travelTime.value,clock.blend.value));
      expect(actualA.x).toBeGreaterThan(initial[index]!.a.x);expect(actualB.x).toBeGreaterThan(initial[index]!.b.x);expect(slot.getX(0)).toBe(0);
    }
    expect(owners.map(cache=>palette(cache,0))).toEqual(held);expect(writes(sets,owners)).toBe(heldWrites);expect(clockTokens()).toEqual(heldClocks);expect(layer.time.value).toBe(.24/6);expect(attributes(g)).toEqual(sourceMoved);expect(JSON.stringify(world)).toBe(raw);
    detail.beginFrame(84,view,720,.504);clock.travelTime.value=.084;layer.present(.504);expect(writes(sets,owners)).toBeGreaterThan(heldWrites);expect(JSON.stringify(world)).toBe(raw);
  }finally{observed.mockRestore();sets.mockRestore();handles.mockRestore();layer.dispose();g.dispose();}
});
