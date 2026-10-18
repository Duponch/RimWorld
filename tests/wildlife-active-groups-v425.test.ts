import {expect,test,vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {WildlifeLayer} from '../src/render/WildlifeLayer';
import {wildlifePresentationGroups} from '../src/render/wildlife-presentation-groups';
import {ANIMAL_SPECIES_IDS,type AnimalSpeciesId} from '../src/sim/animal-species';
import {adultAgeTicks} from '../src/sim/animal-life';
import {createMedicalRecord} from '../src/sim/injury-state';
import {ensureFireState} from '../src/sim/fire-rules';
import type {MaterialOwner,MaterialPile} from '../src/sim/types';
import type {ActorAnimationCache} from '../src/render/ActorAnimationCache';
import {animalCombatCamp} from './scenarios/animal-combat';

type Mesh=THREE.Mesh<THREE.InstancedBufferGeometry>;
const bodies=(layer:WildlifeLayer)=>layer.mesh.children.filter(mesh=>mesh.name.startsWith('Wild ')) as Mesh[];
const flames=(layer:WildlifeLayer)=>layer.flames.children as Mesh[];
const body=(layer:WildlifeLayer,species:string)=>bodies(layer).find(mesh=>mesh.name===`Wild ${species} — GPU rig`)!;
function pile(id:number,species:AnimalSpeciesId,owner:MaterialOwner):MaterialPile {
  const health=createMedicalRecord(0);health.body=species;
  return {id,kind:'corpse',item:`${species}-corpse`,quantity:1,owner,
    corpse:{animalId:id,species,sex:'female',ageTicks:adultAgeTicks(species),health}};
}

test('one classification keeps source order, physical corpse ownership and rescue/ground handoff carriers',()=>{
  const world=animalCombatCamp(),base=world.wildlife!.animals[0]!;
  const first={...structuredClone(base),id:900,species:'deer' as const},rescued={...structuredClone(base),id:901,species:'hare' as const},last={...structuredClone(base),id:902,species:'deer' as const};
  world.wildlife!.animals=[first,rescued,last];
  world.pawns[0]!.animalRescue={animalId:rescued.id,spotId:999,phase:'carry'};
  const ground=pile(910,'deer',{type:'ground',x:8,z:9}),held=pile(911,'muffalo',{type:'pawn',pawnId:world.pawns[0]!.id});
  world.piles=[ground,held,pile(912,'hare',{type:'job',jobId:999})];
  const before=structuredClone(world),handoff=vi.fn((id:number)=>id===ground.id?world.pawns[0]!.id:undefined);
  const groups=wildlifePresentationGroups(world,handoff);
  expect([...groups.keys()]).toEqual(['deer','hare','muffalo']);
  expect(groups.get('deer')!.map(animal=>animal.id)).toEqual([900,902,910]);
  expect(groups.get('deer')![0]).toBe(first);expect(groups.get('deer')![1]).toBe(last);
  expect(groups.get('deer')![2]).toMatchObject({corpsePile:ground,carrierId:world.pawns[0]!.id,x:8,z:9,state:'dead'});
  expect(groups.get('hare')).toEqual([{...rescued,carrierId:world.pawns[0]!.id}]);
  expect(groups.get('muffalo')![0]).toMatchObject({corpsePile:held,carrierId:world.pawns[0]!.id});
  expect(handoff.mock.calls).toEqual([[ground.id]]);expect(world).toEqual(before);
});

test('only populated resident species submit bodies; removal clears selection/fire and reactivation reuses the buffers',()=>{
  let world=animalCombatCamp();const animal=world.wildlife!.animals[0]!;
  world.wildlife!.animals=[animal];world.piles=[];
  ensureFireState(world).items=[{id:world.nextId++,x:animal.x,z:animal.z,size:.2,bornCore:0,nextPulseCore:15,complexCore:0,spreadCore:0,attachedAnimalId:animal.id}];
  const layer=new WildlifeLayer(),meshes=bodies(layer),fires=flames(layer);
  const geometries=meshes.map(mesh=>mesh.geometry),materials=meshes.map(mesh=>mesh.material);
  const slot=ANIMAL_SPECIES_IDS.indexOf(animal.species),selection=layer.mesh.children[slot*3+1] as Mesh;
  try {
    expect(meshes.every(mesh=>!mesh.visible)).toBe(true);expect(fires.every(mesh=>!mesh.visible)).toBe(true);
    layer.setSelected(new Set([animal.id]));layer.update(world,undefined,true);
    expect(meshes.filter(mesh=>mesh.visible)).toEqual([meshes[slot]]);expect(fires[slot]!.visible).toBe(true);expect(selection.visible).toBe(true);
    const before=structuredClone(world);layer.update(world,undefined);expect(world).toEqual(before);
    world=structuredClone(world);world.wildlife!.animals=[];world.fires!.items=[];layer.update(world,undefined);
    expect([...meshes,...fires,...(layer.mesh.children as Mesh[])].every(mesh=>!mesh.visible&&mesh.geometry.instanceCount===0)).toBe(true);
    const empty=structuredClone(world);layer.setSelected(new Set());layer.presentAnimations();expect(world).toEqual(empty);
    world=structuredClone(world);world.wildlife!.animals=[animal];layer.update(world,undefined);
    expect(meshes[slot]!.visible).toBe(true);expect(fires[slot]!.visible).toBe(false);expect(selection.visible).toBe(false);
    meshes.forEach((mesh,index)=>{expect(mesh.geometry).toBe(geometries[index]);expect(mesh.material).toBe(materials[index]);});
  } finally {layer.dispose();}
});

test('species present only as corpses remain active and empty species do no animation classification',()=>{
  const world=animalCombatCamp();world.wildlife!.animals=[];world.piles=[pile(910,'muffalo',{type:'ground',x:8,z:9})];
  const layer=new WildlifeLayer();
  try {
    layer.update(world,undefined,true);
    const rigs=(layer as unknown as {rigs:{species:string;animationCache:ActorAnimationCache}[]}).rigs;
    const spies=rigs.map(rig=>vi.spyOn(rig.animationCache,'prepareOriginalOnly'));
    layer.presentAnimations();
    rigs.forEach((rig,index)=>expect(spies[index]).toHaveBeenCalledTimes(rig.species==='muffalo'?1:0));
    expect(bodies(layer).filter(mesh=>mesh.visible)).toEqual([body(layer,'muffalo')]);
    const picked:number[]=[];layer.forEachPose(id=>picked.push(id));expect(picked).toEqual([]);
    spies.forEach(spy=>spy.mockRestore());
  } finally {layer.dispose();}
});

test('compile preparation exposes every resident body/flame then restores visibility/counts unless a newer snapshot supersedes it',()=>{
  const world=animalCombatCamp();world.wildlife!.animals=[];world.piles=[];
  const layer=new WildlifeLayer();
  try {
    layer.update(world,undefined,true);
    const meshes=[...bodies(layer),...flames(layer)],geometries=meshes.map(mesh=>mesh.geometry);
    const restore=layer.prepare();
    expect(meshes.every(mesh=>mesh.visible&&mesh.geometry.instanceCount===1)).toBe(true);
    restore();expect(meshes.every(mesh=>!mesh.visible&&mesh.geometry.instanceCount===0)).toBe(true);
    const superseded=layer.prepare(),newer=structuredClone(world);newer.piles=[pile(910,'deer',{type:'ground',x:8,z:9})];
    layer.update(newer,undefined);superseded();
    expect(body(layer,'deer').visible).toBe(true);expect(body(layer,'deer').geometry.instanceCount).toBe(1);
    expect(bodies(layer).filter(mesh=>mesh.visible)).toEqual([body(layer,'deer')]);
    meshes.forEach((mesh,index)=>expect(mesh.geometry).toBe(geometries[index]));
  } finally {layer.dispose();}
});
