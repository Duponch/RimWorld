import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/engine';
import { STARTING_ARRIVAL_PROFILE } from '../src/sim/starting-arrival-state';
import { StartingArrivalLayer,STARTING_ARRIVAL_PARTS,STARTING_ARRIVAL_OPENING_TICKS } from '../src/render/StartingArrivalLayer';
import { AnimationDetail } from '../src/render/AnimationDetail';
import { startingArrivalPresentation } from '../src/ui/starting-arrival';
import { CORE_STARTING_ARRIVAL_PROFILE_256,type CoreStartingArrivalPending256 } from '../src/sim/starting-pod-state-256';
import { PresentationChanges } from '../src/bridge/presentation-changes';

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
function coreFixture(){
  const world=fixture(),legacy=world.startingArrival!;
  if(legacy.phase==='opened')throw Error('Expected held people');
  const arrival:CoreStartingArrivalPending256={profile:CORE_STARTING_ARRIVAL_PROFILE_256,phase:'incoming',start:0,landAt:20,openAt:32,personalTick:0,atCore:0,openedCells:[],
    pods:legacy.pods.map((pod,index)=>({id:pod.id,skyfallerId:world.nextId++,cell:pod.cell,pawn:pod.pawn,items:[],animals:[],order:[],phase:'incoming',fallCore:120+index*40,remainingCore:120+index*40,ageCore:0,roofHit:false}))};
  world.startingArrival=arrival;return {world,arrival};
}
function clocks(layer:StartingArrivalLayer){
  const centers=layer.mesh.geometry.getAttribute('arrivalCenter') as THREE.InstancedBufferAttribute;
  return Array.from({length:layer.mesh.activeCount/STARTING_ARRIVAL_PARTS},(_,row)=>({x:centers.getX(row*STARTING_ARRIVAL_PARTS),clock:centers.getY(row*STARTING_ARRIVAL_PARTS),z:centers.getZ(row*STARTING_ARRIVAL_PARTS)}));
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

test.each([1,12,40])('Core shells use one fractional confirmed clock in every animation band (%i pixels/cell)',pixels=>{
  const detail=new AnimationDetail(),layer=new StartingArrivalLayer(undefined,detail),{world,arrival}=coreFixture();
  const camera=new THREE.OrthographicCamera(-360/pixels,360/pixels,360/pixels,-360/pixels,.1,1000);camera.position.set(12,30,30);camera.lookAt(12,0,9);
  try{
    const before=structuredClone(world);world.tick=4;detail.beginFrame(0,camera,720,4);layer.adopt(world);
    expect(clocks(layer).map(row=>row.clock)).toEqual([12,16,20]);
    const centers=layer.mesh.geometry.getAttribute('arrivalCenter') as THREE.InstancedBufferAttribute,version=centers.version;
    for(const tick of [4.05,4.10,4.15,4.20]){
      detail.beginFrame((tick-4)*1000/6,camera,720,tick);layer.present(tick,6);expect(layer.tick.value).toBe(tick);
      expect(centers.version).toBe(version);expect(layer.opening.value.y).toBe(0);
    }
    // No new frame/wall time may move a paused or starved playhead.
    detail.beginFrame(5000,camera,720,4.20);layer.present(4.20,6);expect(layer.tick.value).toBe(4.20);
    layer.present(99,6);expect(layer.tick.value).toBe(6);
    layer.present(99);expect(layer.tick.value).toBe(4);
    world.tick=5;arrival.pods.forEach(p=>p.remainingCore-=10);layer.adopt(world);
    expect(centers.version).toBe(version);expect(clocks(layer).map(row=>row.clock)).toEqual([12,16,20]);
    arrival.pods[0]!.phase='landed';arrival.pods[0]!.remainingCore=0;world.tick=12;layer.adopt(world);layer.present(12,14);
    expect(clocks(layer).map(row=>row.clock)).toEqual([0,16,20]);
    // Adoption only reads the physical owner; no person is released by rendering.
    expect(world.pawns).toEqual(before.pawns);expect(arrival.pods.map(p=>p.pawn)).toEqual((before.startingArrival as CoreStartingArrivalPending256).pods.map(p=>p.pawn));
  }finally{layer.dispose();}
});

test('each confirmed Core discharge opens its own retained shell once; final receipt does not resurrect older shells',()=>{
  const {world,arrival}=coreFixture(),layer=new StartingArrivalLayer();
  try{
    world.tick=23;arrival.phase='landed';arrival.pods.forEach(p=>{p.phase='landed';p.remainingCore=0;});layer.adopt(world);
    const first=arrival.pods.shift()!;arrival.openedCells.push({...first.cell});world.tick=24;layer.adopt(world);
    expect(clocks(layer)).toContainEqual({...first.cell,clock:-25});expect(layer.presentation.capsules).toBe(3);
    layer.present(24.125,26);expect(layer.tick.value).toBe(24.125);expect(world.pawns).toHaveLength(0);
    // A pending save has no timestamp for its already discharged cells.
    const reload=new StartingArrivalLayer();try{reload.adopt(structuredClone(world),true);expect(reload.presentation.capsules).toBe(2);expect(clocks(reload).every(row=>row.clock===0)).toBe(true);}finally{reload.dispose();}
    world.tick=27;layer.adopt(world);expect(layer.presentation.capsules).toBe(2);
    const rest=arrival.pods.map(p=>p.cell);world.tick=32;world.startingArrival={profile:arrival.profile,phase:'opened',start:0,landAt:20,openAt:32,openedAt:32,cells:[first.cell,...rest]};layer.adopt(world);
    expect(clocks(layer)).toEqual(rest.map(cell=>({...cell,clock:-33})));
    const centers=layer.mesh.geometry.getAttribute('arrivalCenter') as THREE.InstancedBufferAttribute,version=centers.version;
    for(const tick of [32.1,32.2,32.3]){layer.present(tick,34);expect(layer.tick.value).toBe(tick);expect(centers.version).toBe(version);}
    expect(layer.present(35,35)).toBe(true);expect(layer.presentation.visible).toBe(false);
    const retiredTick=layer.tick.value;layer.present(999,999);expect(layer.tick.value).toBe(retiredTick);
    const next=coreFixture();layer.adopt(next.world,true);expect(clocks(layer).map(row=>row.clock)).toEqual([12,16,20]);
  }finally{layer.dispose();}
});

test('Core destruction without an opening receipt never animates discharge',()=>{
  const {world,arrival}=coreFixture(),layer=new StartingArrivalLayer();
  try{
    layer.adopt(world);arrival.pods.shift();world.tick=1;layer.adopt(world);
    expect(layer.presentation.capsules).toBe(2);expect(clocks(layer).every(row=>row.clock>0)).toBe(true);expect(layer.opening.value.y).toBe(0);
  }finally{layer.dispose();}
});

test('Core final receipt reload uses its durable timestamp, and a late reload draws no expired shells',()=>{
  const {world,arrival}=coreFixture(),layer=new StartingArrivalLayer();
  try{
    world.tick=33;world.startingArrival={profile:arrival.profile,phase:'opened',start:0,landAt:20,openAt:32,openedAt:32,cells:arrival.pods.map(p=>p.cell)};
    const before=structuredClone(world);layer.adopt(world,true);expect(clocks(layer).map(row=>row.clock)).toEqual([-33,-33,-33]);expect(world).toEqual(before);
    world.tick=35;layer.adopt(world,true);expect(layer.presentation).toEqual({phase:'retired',capsules:0,visible:false});
  }finally{layer.dispose();}
});

test('phase observer publishes impact and actual discharge, without publishing every Core fall countdown',()=>{
  const {world,arrival}=coreFixture(),changes=new PresentationChanges();
  expect(changes.capture(world)).toBe(true);
  world.tick=1;arrival.atCore=10;arrival.pods.forEach(p=>p.remainingCore-=10);expect(changes.capture(world)).toBe(false);
  world.tick=12;arrival.pods[0]!.phase='landed';arrival.pods[0]!.remainingCore=0;expect(changes.capture(world)).toBe(true);
  const discharged=arrival.pods.shift()!;arrival.openedCells.push(discharged.cell);world.tick=24;expect(changes.capture(world)).toBe(true);
  expect(changes.capture(structuredClone(world))).toBe(false);
});

test('banner reports the true contained names, obstruction and initial pause, then hides on an opening receipt',()=>{
  const world=fixture(),names=world.startingArrival!.phase==='opened'?[]:world.startingArrival!.pods.map(p=>p.pawn.name),before=structuredClone(world);
  expect(startingArrivalPresentation(world,0)).toEqual({phase:'incoming',label:'3 capsules en approche',names,paused:true});expect(world).toEqual(before);
  world.tick=15;world.startingArrival!.phase='landed';expect(startingArrivalPresentation(world,1)).toMatchObject({phase:'landed',label:'3 capsules au sol',paused:false});
  world.tick=27;expect(startingArrivalPresentation(world,0)).toMatchObject({phase:'blocked',label:'Ouverture obstruée',paused:true});
  opened(world);expect(startingArrivalPresentation(world,0)).toBeUndefined();delete world.startingArrival;expect(startingArrivalPresentation(world,1)).toBeUndefined();
});
