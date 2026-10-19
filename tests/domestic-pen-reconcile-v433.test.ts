import {expect,test} from 'vitest';
import {applyCommand,createWorld} from '../src/sim/engine.ts';
import {reconcileDomesticWork} from '../src/sim/domestic-reconcile.ts';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256.ts';
import {adultAgeTicks,animalNutritionMax} from '../src/sim/animal-life.ts';
import {TAMENESS_DECAY} from '../src/sim/animal-handling.ts';
import {leadingProposal,startLeading} from '../src/sim/animal-leading.ts';
import {productProposal,startProduct} from '../src/sim/animal-products.ts';
import {penRegion,invalidateAnimalPens} from '../src/sim/animal-pens.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {blockedCells,reachableCells} from '../src/sim/pathfinding.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import type {Structure} from '../src/sim/types.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

/** Small prepared physical pen and prospective owners, with real task
 * proposals. No earned animal, product, taming or simulated history is claimed. */
function fixture(task:'shear'|'lead'='shear'){
  const world=createWorld(432,16,16),handler=world.pawns[0]!;
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[];world.jobs=[];world.structures=[];world.piles=[];world.stockpiles=[];world.growingZones=[];
  refreshStock(world);Object.assign(handler,{x:4,z:7});handler.priorities.handle=1;
  handler.skills.animals={level:10,xp:0,dailyXp:0,passion:0};
  const structure=(kind:'fence'|'fence-gate'|'pen-marker',x:number,z:number):Structure=>{
    const s:Structure={id:world.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'wood'};
    if(kind==='fence-gate')s.door=newDoorState(world.tick);
    if(kind==='pen-marker')s.pen={accepted:['muffalo','deer']};
    world.structures.push(s);return s;
  };
  for(let z=3;z<=11;z++)for(let x=8;x<=12;x++)if(x===8||x===12||z===3||z===11)structure(x===8&&z===7?'fence-gate':'fence',x,z);
  const marker=structure('pen-marker',10,7);
  const animal=(species:'muffalo'|'deer',x:number,z:number):WildAnimal=>{
    const a:WildAnimal={id:world.nextId++,species,sex:'female',x,z,ageTicks:adultAgeTicks(species)+6000,
      food:0,rest:1,state:'idle',path:[],nextDecision:world.tick+1};
    attachGeneratedAnimalGrowth256(a,world.tick*10,world.schemaVersion);a.food=Math.fround(animalNutritionMax(a)*.8);
    a.domestic={since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+TAMENESS_DECAY,penMarkerId:marker.id,...species==='muffalo'?{productFullness:1}:{}};
    return a;
  };
  const target=animal('muffalo',5,7),other=animal('deer',10,9);
  world.wildlife={profile:'temperate-hares-v1',rng:432,animals:[target,other],eatenPlants:0,eatenItems:0,eatenNutrition:0};
  invalidateAnimalPens(world);expect(penRegion(world,marker.id)).toMatchObject({closed:true,accessible:true});
  expect(validateWorld(world)).toEqual([]);
  const reach=reachableCells(world,handler,blockedCells(world),new Set());
  if(task==='shear'){
    const proposal=productProposal(world,handler,reach);expect(proposal?.task.animalId).toBe(target.id);expect(proposal?.task.kind).toBe('shear');startProduct(handler,proposal!);
  }else{
    const proposal=leadingProposal(world,handler,reach);expect(proposal?.task.animalId).toBe(target.id);startLeading(world,handler,proposal!);
  }
  expect(validateWorld(world)).toEqual([]);
  return {world,handler,marker,target,other};
}

test('a same-tick pen filter change releases only the excluded assignment, while real shearing work stays owned',()=>{
  const f=fixture(),task=f.handler.animalHandling,rng=f.world.rng,faunaRng=f.world.wildlife!.rng,nextId=f.world.nextId;
  expect(applyCommand(f.world,{type:'pen-species',markerId:f.marker.id,species:'muffalo',accepted:false}).ok).toBe(true);
  expect(f.target.domestic?.penMarkerId).toBeUndefined();expect(f.other.domestic?.penMarkerId).toBe(f.marker.id);
  expect(f.handler.animalHandling).toBe(task);expect(f.target.domestic?.productFullness).toBe(1);
  expect(f.world.tick).toBe(0);expect(f.world.rng).toBe(rng);expect(f.world.wildlife!.rng).toBe(faunaRng);expect(f.world.nextId).toBe(nextId);
  expect(applyCommand(f.world,{type:'pen-species',markerId:f.marker.id,species:'muffalo',accepted:true}).ok).toBe(true);
  // Explicit prepared reassignment, still at the same tick, must read the
  // current filter; no previous-pass marker/species verdict can remain cached.
  f.target.domestic!.penMarkerId=f.marker.id;reconcileDomesticWork(f.world);
  expect(f.target.domestic!.penMarkerId).toBe(f.marker.id);expect(f.handler.animalHandling).toBe(task);
  expect(validateWorld(f.world)).toEqual([]);
});

test('removing a physical marker cancels its real leading reservation and keeps both original animals and goods',()=>{
  const f=fixture('lead'),people=f.world.pawns.map(p=>p.id),ids=f.world.wildlife!.animals.map(a=>a.id),piles=JSON.stringify(f.world.piles),rng=f.world.rng,nextId=f.world.nextId;
  reconcileDomesticWork(f.world);expect(f.handler.animalHandling?.kind).toBe('lead');
  f.world.structures=f.world.structures.filter(s=>s!==f.marker);reconcileDomesticWork(f.world);
  expect(f.handler.animalHandling).toBeUndefined();expect(f.target.domestic?.penMarkerId).toBeUndefined();expect(f.other.domestic?.penMarkerId).toBeUndefined();
  expect(f.world.wildlife!.animals.map(a=>a.id)).toEqual(ids);expect(f.world.pawns.map(p=>p.id)).toEqual(people);
  expect(JSON.stringify(f.world.piles)).toBe(piles);expect(f.target.domestic?.productFullness).toBe(1);expect(f.world.rng).toBe(rng);expect(f.world.nextId).toBe(nextId);
  expect(validateWorld(f.world)).toEqual([]);
});

test('the same identity on an ordinary stool cannot keep a pen assignment or a leading reservation',()=>{
  const f=fixture('lead');reconcileDomesticWork(f.world);
  f.marker.kind='stool';delete f.marker.pen;f.marker.quality='normal';
  reconcileDomesticWork(f.world);
  expect(f.target.domestic?.penMarkerId).toBeUndefined();expect(f.other.domestic?.penMarkerId).toBeUndefined();expect(f.handler.animalHandling).toBeUndefined();
  expect(f.world.structures.find(s=>s.id===f.marker.id)).toBe(f.marker);expect(f.target.domestic?.productFullness).toBe(1);
  expect(validateWorld(f.world)).toEqual([]);
});

test('unchanged pen authority preserves the legitimate physical product task and exact save through repeated passes',()=>{
  const f=fixture(),task=f.handler.animalHandling,before=serializeCampaign(f.world);
  reconcileDomesticWork(f.world);reconcileDomesticWork(f.world);
  expect(f.handler.animalHandling).toBe(task);expect(serializeCampaign(f.world)).toBe(before);
  expect(serializeCampaign(deserializeCampaign(before))).toBe(before);
});
