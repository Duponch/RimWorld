import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import { STARTING_ARRIVAL_PROFILE } from '../src/sim/starting-arrival-state';
import { StartingArrivalLayer,STARTING_ARRIVAL_PARTS,STARTING_ARRIVAL_OPENING_TICKS } from '../src/render/StartingArrivalLayer';
import { AnimationDetail } from '../src/render/AnimationDetail';
import { startingArrivalPresentation } from '../src/ui/starting-arrival';

function fixture(){
  const world=createWorld(335,32,32),people=world.pawns.slice(0,3);
  world.pawns=[];
  world.startingArrival={profile:STARTING_ARRIVAL_PROFILE,phase:'incoming',start:0,landAt:15,openAt:27,personalTick:0,
    pods:people.map((pawn,index)=>({id:world.nextId++,cell:{x:12+index*2,z:9},pawn,items:[],drops:[]}))};
  return world;
}
function opened(world:ReturnType<typeof fixture>,tick=27){
  const arrival=world.startingArrival!;if(arrival.phase==='opened')throw new Error('Fixture already opened');
  world.tick=tick;world.startingArrival={profile:arrival.profile,phase:'opened',start:0,landAt:15,openAt:27,openedAt:tick,cells:arrival.pods.map(p=>({...p.cell}))};
}

test('three actual capsules share one fixed resident batch without drawing held people or mutating snapshots',()=>{
  const world=fixture(),layer=new StartingArrivalLayer();
  try{
    const mesh=layer.mesh,geometry=mesh.geometry,matrix=mesh.instanceMatrix,color=mesh.colorBuffer,attributes={...geometry.attributes};
    expect(layer.group.children).toEqual([mesh]);expect(matrix.count).toBe(3*STARTING_ARRIVAL_PARTS);
    const before=structuredClone(world);layer.adopt(world);layer.present(0);
    expect(mesh.activeCount).toBe(3*STARTING_ARRIVAL_PARTS);expect(mesh.castShadow&&mesh.receiveShadow).toBe(true);
    expect(world.pawns).toHaveLength(0);expect(world).toEqual(before);
    const centers=geometry.getAttribute('arrivalCenter') as THREE.InstancedBufferAttribute;
    const versions=[matrix.version,color.version,centers.version];
    for(let tick=1;tick<=14;tick++){world.tick=tick;layer.adopt(structuredClone(world));layer.present(tick);}
    expect([matrix.version,color.version,centers.version]).toEqual(versions);
    expect(mesh.geometry).toBe(geometry);expect(mesh.instanceMatrix).toBe(matrix);expect(mesh.colorBuffer).toBe(color);
    for(const [name,attribute] of Object.entries(attributes))expect(geometry.getAttribute(name)).toBe(attribute);
    for(let index=0;index<3;index++)expect([centers.getX(index*STARTING_ARRIVAL_PARTS),centers.getZ(index*STARTING_ARRIVAL_PARTS)]).toEqual([12+index*2,9]);
    for(const x of [10.6,17.4])for(const y of [0,24.95])for(const z of [7.6,10.4])expect(mesh.boundingSphere.containsPoint(new THREE.Vector3(x,y,z))).toBe(true);
  }finally{layer.dispose();}
});

test('blocked arrival never opens from a predicted clock or a missed deadline; only its receipt authorizes fading',()=>{
  const world=fixture(),layer=new StartingArrivalLayer();
  try{
    world.tick=14;layer.adopt(world);layer.present(999);expect(layer.tick.value).toBe(14);expect(layer.opening.value.y).toBe(0);
    world.tick=15;world.startingArrival!.phase='landed';layer.adopt(world);
    for(const tick of [27,28,200]){world.tick=tick;const before=structuredClone(world);layer.adopt(world);layer.present(tick);expect(layer.opening.value.y).toBe(0);expect(layer.presentation).toMatchObject({phase:'landed',capsules:3,visible:true});expect(world).toEqual(before);}
    opened(world,200);layer.adopt(world);layer.present(200);
    expect(layer.opening.value.toArray()).toEqual([200,1]);expect(layer.presentation.phase).toBe('opening');
    world.tick=202;layer.adopt(world);layer.present(202);expect(layer.presentation.visible).toBe(true);
    world.tick=200+STARTING_ARRIVAL_OPENING_TICKS;expect(layer.adopt(world)).toBe(true);expect(layer.present(world.tick)).toBe(false);
    expect(layer.presentation).toEqual({phase:'retired',capsules:0,visible:false});
    const tick=layer.tick.value;layer.present(999);expect(layer.tick.value).toBe(tick);
  }finally{layer.dispose();}
});

test('loading an opening receipt restores its real cells; a completed receipt remains invisible and a new world resets it',()=>{
  const world=fixture();opened(world);world.tick=28;
  const layer=new StartingArrivalLayer();
  try{
    layer.adopt(world,true);expect(layer.presentation).toMatchObject({phase:'opening',capsules:3});expect(layer.opening.value.x).toBe(27);
    world.tick=30;layer.adopt(world);layer.present(30);expect(layer.presentation.visible).toBe(false);
    const completed=new StartingArrivalLayer();try{completed.adopt(world);expect(completed.presentation).toEqual({phase:'retired',capsules:0,visible:false});}finally{completed.dispose();}
    const next=fixture();layer.adopt(next,true);layer.present(0);expect(layer.presentation).toMatchObject({phase:'incoming',capsules:3,visible:true});
    delete next.startingArrival;layer.adopt(next);expect(layer.presentation).toEqual({phase:'none',capsules:0,visible:false});
  }finally{layer.dispose();}
});

test('compile preparation restores exact empty matrices and retains newer visibility from uniform-only adoption',()=>{
  const world=fixture(),layer=new StartingArrivalLayer();
  try{
    const matrix=layer.mesh.instanceMatrix,initial=Array.from(matrix.array),restore=layer.prepareForCompile();
    expect(layer.mesh.activeCount).toBe(1);expect(layer.mesh.frustumCulled).toBe(false);restore();
    expect(Array.from(matrix.array)).toEqual(initial);expect(layer.mesh.activeCount).toBe(0);expect(layer.mesh.frustumCulled).toBe(true);
    const newer=layer.prepareForCompile();layer.adopt(world);newer();expect(Array.from(matrix.array)).toEqual(initial);expect(layer.mesh.activeCount).toBe(3*STARTING_ARRIVAL_PARTS);
    const active=layer.prepareForCompile();delete world.startingArrival;layer.adopt(world);active();expect(layer.mesh.visible).toBe(false);
    const changed=layer.prepareForCompile();matrix.array[12]=7;matrix.needsUpdate=true;layer.mesh.activeCount=3*STARTING_ARRIVAL_PARTS;changed();expect(matrix.array[12]).toBe(7);expect(layer.mesh.activeCount).toBe(3*STARTING_ARRIVAL_PARTS);
  }finally{layer.dispose();}
});

test('lighting prepares both resident surfaces; switching textures never reallocates capsule buffers',()=>{
  const configured:THREE.MeshStandardNodeMaterial[]=[],layer=new StartingArrivalLayer(surface=>configured.push(surface));
  try{
    expect(configured).toHaveLength(2);const painted=layer.mesh.material,matrix=layer.mesh.instanceMatrix;
    layer.setTexturesEnabled(false);const plain=layer.mesh.material as THREE.MeshStandardNodeMaterial;
    expect(plain).not.toBe(painted);expect(plain.positionNode).toBe((painted as THREE.MeshStandardNodeMaterial).positionNode);
    let textures=0;plain.colorNode!.traverse(node=>{if('isTextureNode' in node&&node.isTextureNode)textures++;});expect(textures).toBe(0);
    layer.setTexturesEnabled(true);expect(layer.mesh.material).toBe(painted);expect(layer.mesh.instanceMatrix).toBe(matrix);
  }finally{layer.dispose();}expect(layer.group.children).toHaveLength(0);
});

test('impact revokes retained distant coefficients instead of leaving a grounded capsule in midair',()=>{
  const detail=new AnimationDetail(),layer=new StartingArrivalLayer(undefined,detail),world=fixture();
  const camera=new THREE.OrthographicCamera(-100,100,100,-100,.1,1000);camera.position.set(12,30,30);camera.lookAt(12,0,9);
  try{
    const configured=layer as unknown as {animation:{owners:{values:Float64Array}[]}};
    detail.beginFrame(0,camera,720,0);layer.adopt(world);layer.present(0);expect(configured.animation.owners).toHaveLength(3);expect(configured.animation.owners[0]!.values[1]).toBe(24);
    world.tick=15;world.startingArrival!.phase='landed';detail.beginFrame(100,camera,720,15);layer.adopt(world);layer.present(15);
    expect(configured.animation.owners[0]!.values[1]).toBe(0);
  }finally{layer.dispose();}
});

test('banner reports the true contained names, obstruction and initial pause, then hides on an opening receipt',()=>{
  const world=fixture(),names=world.startingArrival!.phase==='opened'?[]:world.startingArrival!.pods.map(p=>p.pawn.name),before=structuredClone(world);
  expect(startingArrivalPresentation(world,0)).toEqual({phase:'incoming',label:'3 capsules en approche',names,paused:true});expect(world).toEqual(before);
  world.tick=15;world.startingArrival!.phase='landed';expect(startingArrivalPresentation(world,1)).toMatchObject({phase:'landed',label:'3 capsules au sol',paused:false});
  world.tick=27;expect(startingArrivalPresentation(world,0)).toMatchObject({phase:'blocked',label:'Ouverture obstruée',paused:true});
  opened(world);expect(startingArrivalPresentation(world,0)).toBeUndefined();delete world.startingArrival;expect(startingArrivalPresentation(world,1)).toBeUndefined();
});
