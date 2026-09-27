import {expect,test} from 'vitest';
import {penRegion} from '../src/sim/animal-pens.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {startLeading} from '../src/sim/animal-leading.ts';
import {penParts} from '../src/render/pen-parts.ts';
import {RopeLayer} from '../src/render/RopeLayer.ts';
import {advanceWildlife} from '../src/sim/wildlife.ts';
import {animalFoods} from '../src/sim/wildlife-food.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {faunaBiome} from '../src/sim/animal-species.ts';
import {animalNavigation} from '../src/sim/wildlife-navigation.ts';
import {reconcileDomesticWork} from '../src/sim/domestic-reconcile.ts';
import {validateWorld,deserializeWorld,serializeWorld} from '../src/sim/serialization.ts';
import {huntingCamp} from './scenarios/hunting.ts';
import type {Structure,World} from '../src/sim/types.ts';

function penCamp(){
  const world=huntingCamp(),pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[];world.jobs=[];world.piles=[];world.pawns=[pawn];world.structures=[];
  pawn.x=2;pawn.z=7;pawn.path=[];pawn.hunger=100;pawn.rest=100;
  for(const work of Object.keys(pawn.priorities) as (keyof typeof pawn.priorities)[])pawn.priorities[work]=0;
  pawn.priorities.handle=1;
  animal.species='deer';animal.x=3;animal.z=7;animal.path=[];animal.motion=undefined;animal.food=1.2;animal.rest=1;animal.state='idle';animal.nextDecision=world.tick+100;
  const biome=faunaBiome('temperate-forest'),full=world.width*world.height*biome.animalDensity/10000;
  world.wildlife!.profile='biome-herbivores-v1';
  world.wildlife!.population={biome:'temperate-forest',fullTargetWeight:full,targetWeight:full*biome.entries.reduce((n,e)=>n+e.commonality,0)/biome.totalCommonality,nextCheck:world.tick+122,checks:0,arrivals:0};
  animal.domestic={since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+45000,lastTraining:world.tick};
  const add=(kind:Structure['kind'],x:number,z:number):Structure=>{
    const s:Structure={id:world.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'wood'};
    if(kind==='fence-gate')s.door=newDoorState(world.tick);
    if(kind==='pen-marker')s.pen={accepted:['deer','gazelle','muffalo','dromedary']};
    world.structures.push(s);return s;
  };
  for(let x=5;x<=9;x++){add('fence',x,5);add('fence',x,9);}
  for(let z=6;z<=8;z++){add(z===7?'fence-gate':'fence',5,z);add('fence',9,z);}
  const marker=add('pen-marker',7,7);
  refreshStock(world);
  return {world,pawn,animal,marker};
}

test('a handler physically leads an owned deer through a gate, then the gate closes',()=>{
  const {world,pawn,animal,marker}=penCamp();
  expect(penRegion(world,marker.id)).toMatchObject({closed:true,accessible:true});
  expect(validateWorld(world)).toEqual([]);
  let checkpoint:World|undefined;
  for(let i=0;i<1000;i++){
    if(checkpoint)stepWorld(checkpoint);
    stepWorld(world);
    if(!checkpoint&&pawn.animalHandling?.kind==='lead'&&pawn.animalHandling.phase==='lead')checkpoint=deserializeWorld(serializeWorld(world));
    if(penRegion(world,marker.id)?.cells.has(animal.z*world.width+animal.x)&&!pawn.animalHandling)break;
  }
  expect(checkpoint).toBeDefined();
  expect(animal.domestic?.penMarkerId).toBe(marker.id);
  expect(penRegion(world,marker.id)?.cells.has(animal.z*world.width+animal.x),JSON.stringify({tick:world.tick,pawn:{x:pawn.x,z:pawn.z,state:pawn.state,path:pawn.path,handling:pawn.animalHandling},animal:{x:animal.x,z:animal.z,state:animal.state,path:animal.path,motion:animal.motion,nextDecision:animal.nextDecision},gate:world.structures.find(s=>s.kind==='fence-gate')?.door})).toBe(true);
  expect(animal.x).toBeGreaterThanOrEqual(6);
  expect(pawn.animalHandling).toBeUndefined();
  expect(checkpoint).toEqual(world);
  for(let i=0;i<50;i++){stepWorld(world);stepWorld(checkpoint!);}
  expect(world.structures.find(s=>s.kind==='fence-gate')?.door?.open).toBe(false);
  expect(checkpoint).toEqual(world);
  expect(validateWorld(world)).toEqual([]);
});

test('a closed pen limits real food candidates, and a held open gate restores reachability',()=>{
  const {world,animal,marker}=penCamp();
  animal.x=7;animal.z=7;animal.domestic!.penMarkerId=marker.id;animal.food=0;
  addMaterial(world,'food',4,{type:'ground',x:8,z:7},'berries');
  addMaterial(world,'food',4,{type:'ground',x:4,z:7},'rice');
  expect(animalFoods(world,animal).map(f=>[f.x,f.z])).toEqual([[8,7]]);
  const gate=world.structures.find(s=>s.kind==='fence-gate')!;
  gate.door!.holdOpen=true;gate.door!.open=true;
  world.tick++;
  expect(penRegion(world,marker.id)?.closed).toBe(false);
  expect(animalFoods(world,animal).map(f=>[f.x,f.z])).toEqual([[8,7],[4,7]]);
});

test('hare crosses fence while penned livestock remains blocked',()=>{
  const {world}=penCamp();
  expect(animalNavigation(world).step({x:4,z:6},{x:5,z:6})).toBe(false);
  expect(animalNavigation(world,false,true).step({x:4,z:6},{x:5,z:6})).toBe(true);
  expect(animalNavigation(world,false,true).step({x:4,z:7},{x:5,z:7})).toBe(false);
});

test('removing a marker releases an active rope and clears the saved assignment',()=>{
  const {world,pawn,animal,marker}=penCamp();
  for(let i=0;i<30&&!pawn.animalHandling;i++)stepWorld(world);
  expect(pawn.animalHandling?.kind).toBe('lead');
  world.structures=world.structures.filter(s=>s!==marker);
  reconcileDomesticWork(world);
  expect(pawn.animalHandling).toBeUndefined();
  expect(animal.domestic?.penMarkerId).toBeUndefined();
  expect(animal.path).toEqual([]);
  expect(validateWorld(world)).toEqual([]);
});

test('an animal keeps walking while a distant handler is only approaching',()=>{
  const {world,pawn,animal,marker}=penCamp();
  animal.path=[{x:4,z:7}];animal.nextDecision=world.tick;
  startLeading(world,pawn,{task:{animalId:animal.id,kind:'lead',markerId:marker.id,phase:'approach',sourcePileId:0,carryPileId:null,quantity:0,step:0,progress:0},path:[{x:2,z:6}],target:animal});
  expect(animal.path).toEqual([{x:4,z:7}]);
  advanceWildlife(world);
  expect(animal.x).toBe(4);
});

test('opening a pen gate while leading immediately releases the task before saving',()=>{
  const {world,pawn,marker}=penCamp();
  const gate=world.structures.find(s=>s.kind==='fence-gate')!;
  for(let i=0;i<1000&&!(pawn.animalHandling?.kind==='lead'&&gate.door?.open);i++)stepWorld(world);
  expect(pawn.animalHandling?.kind).toBe('lead');
  expect(gate.door?.open).toBe(true);
  expect(applyCommand(world,{type:'door-policy',structureId:gate.id,setting:'holdOpen',value:true}).ok).toBe(true);
  expect(penRegion(world,marker.id)?.closed).toBe(false);
  expect(pawn.animalHandling).toBeUndefined();
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
});

test('one handler physically gathers two animals and resumes both ropes exactly',()=>{
  const {world,pawn,animal,marker}=penCamp();
  const second=structuredClone(animal);second.id=world.nextId++;second.x=3;second.z=8;
  world.wildlife!.animals.push(second);
  let checkpoint:World|undefined;
  for(let i=0;i<2500;i++){
    if(checkpoint)stepWorld(checkpoint);
    stepWorld(world);
    const task=pawn.animalHandling;
    if(!checkpoint&&task?.kind==='lead'&&task.ropees?.length===2&&task.phase==='lead'){
      expect(validateWorld(world)).toEqual([]);
      checkpoint=deserializeWorld(serializeWorld(world));
    }
    const inside=penRegion(world,marker.id)?.cells;
    if(inside?.has(animal.z*world.width+animal.x)&&inside?.has(second.z*world.width+second.x)&&!task)break;
  }
  expect(checkpoint).toBeDefined();
  const inside=penRegion(world,marker.id)!.cells;
  expect(inside.has(animal.z*world.width+animal.x)).toBe(true);
  expect(inside.has(second.z*world.width+second.x)).toBe(true);
  expect(pawn.animalHandling).toBeUndefined();
  expect(checkpoint).toEqual(world);
  expect(validateWorld(world)).toEqual([]);
});

test('at a pen corner each rail ends at the post instead of passing through it',()=>{
  const {world}=penCamp();
  const rails=penParts(world).filter(part=>part.y===.34&&Math.abs(part.x-5)<.5&&Math.abs(part.z-5)<.5);
  expect(rails).toHaveLength(2);
  expect(rails.some(part=>part.x===5.24&&part.sx===.48)).toBe(true);
  expect(rails.some(part=>part.z===5.24&&part.sz===.48)).toBe(true);
  expect(rails.every(part=>part.x>=5&&part.z>=5)).toBe(true);
});

test('version 134 rejects future rope members, then migrates a single rope without recruiting retroactively',()=>{
  const {world,pawn}=penCamp();
  for(let i=0;i<60&&pawn.animalHandling?.phase!=='lead';i++)stepWorld(world);
  expect(pawn.animalHandling?.kind).toBe('lead');
  const legacy=structuredClone(world);(legacy as unknown as {schemaVersion:number}).schemaVersion=134;
  expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow('Invalid version 134 save');
  if(legacy.pawns[0]?.animalHandling?.kind==='lead')delete legacy.pawns[0].animalHandling.ropees;
  const migrated=deserializeWorld(JSON.stringify(legacy));
  expect(migrated.schemaVersion).toBe(135);
  expect(migrated.pawns[0]?.animalHandling?.ropees).toBeUndefined();
  expect(migrated.wildlife?.animals).toEqual(world.wildlife?.animals);
  expect(validateWorld(migrated)).toEqual([]);
});

test('visible cords share one resident instanced draw and hold their upload between motion edges',()=>{
  const {world,pawn,animal,marker}=penCamp();
  const second=structuredClone(animal);second.id=world.nextId++;second.z=8;
  world.wildlife!.animals.push(second);
  pawn.animalHandling={animalId:animal.id,kind:'lead',markerId:marker.id,phase:'lead',ropees:[animal.id,second.id],sourcePileId:0,carryPileId:null,quantity:0,step:0,progress:0};
  pawn.state='working';animal.domestic!.penMarkerId=marker.id;second.domestic!.penMarkerId=marker.id;
  const layer=new RopeLayer();
  try{
    layer.adopt(world);layer.present();
    expect(layer.stats.activeRopes).toBe(2);
    expect(layer.mesh.geometry.instanceCount).toBe(2);
    expect(layer.mesh.visible).toBe(true);
    const uploads=layer.stats.uploads;
    layer.present();expect(layer.stats.uploads).toBe(uploads);
    layer.setDetailVisible(false);expect(layer.mesh.visible).toBe(false);
  }finally{layer.dispose();}
});
