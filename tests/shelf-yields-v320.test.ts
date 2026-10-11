import {expect,test} from 'vitest';
import {huntingCamp} from './scenarios/hunting.ts';
import {deepDrillingCamp} from './helpers/deep-drilling-v280.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {animalSpecies} from '../src/sim/animal-species.ts';
import {ANIMAL_PRODUCTS,processProduct,type ProductTask} from '../src/sim/animal-products.ts';
import {deepWorkSpot} from '../src/sim/deep-drilling-rules.ts';
import {processDeepWork} from '../src/sim/deep-drilling.ts';
import {gatherResource} from '../src/sim/gathering.ts';
import {harvestRoll} from '../src/sim/plants.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {groundPilesAt,planGroundPlacement} from '../src/sim/ground-placement.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import type {NeedContext} from '../src/sim/needs.ts';
import type {Cell,Resource,Structure,World} from '../src/sim/types.ts';

const context:NeedContext={search:()=>null,move:()=>{throw Error('Expected executable contact');},release:()=>true,event:()=>{}};
function shelf(w:World,cell:Cell):Structure {
  const s:Structure={id:w.nextId++,kind:'small-shelf',...cell,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage([w.nextId++])};
  w.structures.push(s);return s;
}
function shearCamp(level=0){
  const w=huntingCamp(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;
  w.pawns=[p];w.piles=[];w.stockpiles=[];w.resources=[];w.jobs=[];w.structures=[];w.packed=[];
  p.priorities.handle=1;p.skills.animals={level,xp:0,dailyXp:0,passion:0};p.path=[];p.motion=null;p.moveCooldown=0;
  Object.assign(a,{species:'muffalo',sex:'female',ageTicks:adultAgeTicks('muffalo'),x:p.x+1,z:p.z,
    food:animalSpecies('muffalo').nutrition,rest:1,state:'idle',path:[],motion:undefined});
  a.domestic={since:w.tick,care:'herbal',tameness:5,nextDecay:w.tick+45000,lastTraining:w.tick,productFullness:1};
  const s=shelf(w,{x:p.x,z:p.z-1});
  // Keep the worker on ordinary floor; the first admissible yield cell is the shelf.
  addMaterial(w,'steel',1,{type:'ground',x:p.x,z:p.z},'steel');
  const task:ProductTask={animalId:a.id,kind:'shear',sourcePileId:0,carryPileId:null,quantity:0,phase:'interact',step:0,progress:ANIMAL_PRODUCTS.shear.work};
  p.animalHandling=task;return {w,p,a,s,task};
}

test('one shelf cell needing two wool identities refuses before the yield draw and retains animal maturity',()=>{
  const {w,p,a,s,task}=shearCamp();
  expect(planGroundPlacement(w,120,p,'muffalo-wool')).toEqual([{cell:{x:s.x,z:s.z},quantity:120}]);
  // One allocatable ID is enough for one cell, but not for its two real stacks.
  w.nextId=Number.MAX_SAFE_INTEGER-1;
  const before=structuredClone({rng:w.rng,nextId:w.nextId,piles:w.piles,maturity:a.domestic!.productFullness,skill:p.skills.animals});
  expect(()=>processProduct(w,p,task,context)).not.toThrow();
  expect({rng:w.rng,nextId:w.nextId,piles:w.piles,maturity:a.domestic!.productFullness,skill:p.skills.animals}).toEqual(before);
  expect(p.animalHandling).toBe(task);expect(task.progress).toBeLessThan(ANIMAL_PRODUCTS.shear.work);
  expect(groundPilesAt(w,s)).toEqual([]);
});

test('a wool residual and one new shelf stack can complete with exactly one allocatable ID',()=>{
  const {w,p,a,s,task}=shearCamp(20);addMaterial(w,'textile',20,{type:'ground',x:s.x,z:s.z},'muffalo-wool');
  const retained=groundPilesAt(w,s)[0]!.id,rng=w.rng;w.nextId=Number.MAX_SAFE_INTEGER-1;
  processProduct(w,p,task,context);
  expect(groundPilesAt(w,s).map(q=>[q.id,q.quantity])).toEqual([[retained,100],[Number.MAX_SAFE_INTEGER-1,40]]);
  expect(w.nextId).toBe(Number.MAX_SAFE_INTEGER);expect(w.rng).toBe(rng);
  expect(a.domestic!.productFullness).toBe(0);expect(p.animalHandling).toBeUndefined();
});

test('a historical tree producing multiple shelf stacks keeps its resource and preview RNG when identities are exhausted',()=>{
  const {w,p,s}=shearCamp(20);delete p.animalHandling;p.skills.plants={level:20,xp:0,dailyXp:0,passion:0};
  const tree:Resource={id:w.nextId++,kind:'tree',x:p.x,z:p.z,amount:120,growth:1,growthTick:w.tick};w.resources=[tree];
  const roll=harvestRoll(w,tree,p);expect(roll.quantity).toBeGreaterThan(75);
  expect(planGroundPlacement(w,roll.quantity,tree,'wood')).toEqual([{cell:{x:s.x,z:s.z},quantity:roll.quantity}]);
  w.nextId=Number.MAX_SAFE_INTEGER-1;const before=structuredClone(w);
  expect(gatherResource(w,tree,'chop',undefined,p)).toBeNull();expect(w).toEqual(before);
});

test('a permitted drill yield that needs two shelf stacks retains reserve, progress, RNG and XP before refusal',()=>{
  const fixture=deepDrillingCamp(),w=fixture.world,p=w.pawns.find(q=>q.id===fixture.minerId)!,d=w.structures.find(q=>q.id===fixture.drillId)!;
  const spot=deepWorkSpot(d),s=shelf(w,{x:spot.x,z:spot.z-1});
  Object.assign(p,{x:spot.x,z:spot.z,path:[],motion:null,moveCooldown:0,state:'working'});
  p.deepWork={structureId:d.id,kind:'drill',spot};d.deepDrill={progress:10000,yieldPct:2,rng:123};
  const admissible=(c:Cell)=>(c.x!==d.x||c.z!==d.z)&&(c.x!==spot.x||c.z!==spot.z);
  expect(planGroundPlacement(w,90,spot,'steel',admissible)).toEqual([{cell:{x:s.x,z:s.z},quantity:90}]);
  w.nextId=Number.MAX_SAFE_INTEGER-1;
  const before=structuredClone({state:d.deepDrill,reserve:w.deepResources,skill:p.skills.mining,rng:w.rng,piles:w.piles,nextId:w.nextId});
  expect(()=>processDeepWork(w,p,context)).not.toThrow();
  expect({state:d.deepDrill,reserve:w.deepResources,skill:p.skills.mining,rng:w.rng,piles:w.piles,nextId:w.nextId}).toEqual(before);
});
