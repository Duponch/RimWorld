import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {ANIMAL_PRODUCTS,advanceAnimalProducts,processProduct,productGrowthFactor,productKind,productProposal,productReady,startProduct} from '../src/sim/animal-products.ts';
import {animalHandlingHolding} from '../src/sim/animal-handling.ts';
import {animalSpecies,faunaBiome} from '../src/sim/animal-species.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {pawnBody} from '../src/sim/health-rules.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {blockedCells,reachableCells} from '../src/sim/pathfinding.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {TICKS_PER_DAY,type World} from '../src/sim/types.ts';
import {huntingCamp} from './scenarios/hunting.ts';

function camp(species:'muffalo'|'dromedary'='dromedary',sex:'female'|'male'='female') {
  const world=huntingCamp(),pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
  world.pawns=[pawn];world.resources=[];world.piles=[];world.jobs=[];world.structures=[];
  const biome=faunaBiome(species==='dromedary'?'arid-shrubland':'temperate-forest');
  const full=world.width*world.height*biome.animalDensity/10000;
  world.wildlife!.profile='biome-herbivores-v1';
  world.wildlife!.population={biome:biome.id,fullTargetWeight:full,targetWeight:full*biome.entries.reduce((n,e)=>n+e.commonality,0)/biome.totalCommonality,nextCheck:world.tick+100,checks:0,arrivals:0};
  pawn.x=4;pawn.z=10;pawn.path=[];pawn.hunger=100;pawn.rest=100;
  for(const key of Object.keys(pawn.priorities) as (keyof typeof pawn.priorities)[])pawn.priorities[key]=0;
  pawn.priorities.handle=1;
  pawn.skills.animals={level:20,xp:0,dailyXp:0,passion:0};
  Object.assign(animal,{species,sex,ageTicks:adultAgeTicks(species),x:5,z:10,food:animalSpecies(species).nutrition,rest:1,state:'idle',path:[],motion:undefined,nextDecision:world.tick+80});
  animal.domestic={since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+45000,lastTraining:world.tick,productFullness:1};
  refreshStock(world);
  return {world,pawn,animal};
}

function start(world:World) {
  const pawn=world.pawns[0]!;
  const proposal=productProposal(world,pawn,reachableCells(world,pawn,blockedCells(world),new Set()));
  expect(proposal).toBeDefined();startProduct(pawn,proposal!);
  return pawn.animalHandling!;
}

function gesture(world:World) {
  const pawn=world.pawns[0]!,task=pawn.animalHandling!;
  processProduct(world,pawn,task as Parameters<typeof processProduct>[2],{
    search:()=>null,move:()=>{throw Error('adjacent animal moved unexpectedly');},release:()=>true,event:()=>{},
  });
}

test('only owned female dromedaries and owned muffalo grow product; hunger bands bound growth',()=>{
  const {world,animal}=camp();
  const nutrition=animalSpecies('dromedary').nutrition;
  for(const [reserve,factor] of [[0,0],[.179,.25],[.18,.5],[.359,.5],[.36,1],[1,1]] as const){
    animal.food=reserve*nutrition;animal.domestic!.productFullness=0;
    expect(productGrowthFactor(animal)).toBeCloseTo(factor);
    advanceAnimalProducts(world);
    expect(animal.domestic!.productFullness).toBeCloseTo(factor/(2*TICKS_PER_DAY));
  }
  animal.domestic!.productFullness=1-1/(4*TICKS_PER_DAY);animal.food=nutrition;
  advanceAnimalProducts(world);expect(animal.domestic!.productFullness).toBe(1);
  animal.sex='male';delete animal.domestic!.productFullness;
  expect(productKind(animal)).toBeUndefined();advanceAnimalProducts(world);expect(animal.domestic!.productFullness).toBeUndefined();
  animal.species='muffalo';animal.ageTicks=adultAgeTicks('muffalo');expect(productKind(animal)).toBe('shear');advanceAnimalProducts(world);
  expect(animal.domestic!.productFullness).toBeCloseTo(1/(15*TICKS_PER_DAY));
  animal.species='deer';delete animal.domestic!.productFullness;
  advanceAnimalProducts(world);expect(animal.domestic!.productFullness).toBeUndefined();
  delete animal.domestic;advanceAnimalProducts(world);expect(productReady(animal)).toBe(false);
});

test.each([
  ['dromedary','milk',18,40],['muffalo','muffalo-wool',120,170],
] as const)('%s requires handling labor and produces physical %s', (species,item,quantity,work)=>{
  const {world,pawn,animal}=camp(species);
  expect(validateWorld(world)).toEqual([]);
  const task=start(world);expect(task.kind).toBe(species==='dromedary'?'milk':'shear');
  const rng=world.rng,initialXp=pawn.skills.animals!.xp;
  gesture(world);expect(task.progress).toBeGreaterThan(0);
  expect(task.progress).toBeLessThan(work);expect(world.piles).toEqual([]);
  expect(animal.domestic!.productFullness).toBe(1);expect(world.rng).toBe(rng);
  expect(validateWorld(world)).toEqual([]);
  const restored=deserializeWorld(serializeWorld(world));expect(restored).toEqual(world);
  for(let i=0;i<2000&&pawn.animalHandling;i++)gesture(world);
  expect(pawn.animalHandling).toBeUndefined();
  expect(animal.domestic!.productFullness).toBe(0);
  expect(world.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0)).toBe(quantity);
  if(item==='muffalo-wool')expect(world.piles.filter(p=>p.item===item).map(p=>p.quantity).sort((a,b)=>a-b)).toEqual([20,100]);
  expect(world.piles.filter(p=>p.item===item).every(p=>p.owner.type==='ground')).toBe(true);
  expect(pawn.skills.animals!.xp).toBeGreaterThan(initialXp);
  expect(world.rng).toBe(rng);expect(validateWorld(world)).toEqual([]);
  expect(ANIMAL_PRODUCTS[species==='dromedary'?'milk':'shear'].quantity).toBe(quantity);
});

test('failed yield consumes one roll and maturity but creates no pile',()=>{
  const {world,pawn,animal}=camp();pawn.skills.animals={level:0,xp:0,dailyXp:0,passion:0};world.rng=81733;
  start(world);const before=world.rng;
  for(let i=0;i<2000&&pawn.animalHandling;i++)gesture(world);
  expect(pawn.animalHandling).toBeUndefined();expect(animal.domestic!.productFullness).toBe(0);
  expect(world.piles.filter(p=>p.item==='milk')).toEqual([]);
  expect(world.rng).not.toBe(before);
});

test('interruption releases a claim without spending maturity or yield RNG',()=>{
  const {world,pawn,animal}=camp();const task=start(world),rng=world.rng;
  gesture(world);expect(task.progress).toBeGreaterThan(0);
  animal.state='downed';gesture(world);
  expect(pawn.animalHandling).toBeUndefined();expect(animal.domestic!.productFullness).toBe(1);
  expect(world.piles).toEqual([]);expect(world.rng).toBe(rng);
  animal.state='idle';expect(productProposal(world,pawn,reachableCells(world,pawn,blockedCells(world),new Set()))).toBeDefined();
});

test('deaf and speechless handlers keep an animal still throughout physical collection',()=>{
  const {world,pawn,animal}=camp();
  pawn.health=createMedicalRecord(world.tick);
  pawn.health!.missing.push(
    {part:'left-ear',bornAt:world.tick,tended:true},
    {part:'right-ear',bornAt:world.tick,tended:true},
    {part:'tongue',bornAt:world.tick,tended:true},
  );
  expect(pawnBody(pawn).capacities).toMatchObject({hearing:0,talking:0,moving:1,manipulation:1});
  const task=start(world);task.phase='interact';pawn.state='working';pawn.moveCooldown=0;
  animal.nextDecision=world.tick;
  expect(animalHandlingHolding(world,animal.id)).toBe(true);
  const position=[animal.x,animal.z];
  for(let i=0;i<8;i++){
    stepWorld(world);
    expect(animalHandlingHolding(world,animal.id)).toBe(true);
    expect([animal.x,animal.z]).toEqual(position);
    expect(task.progress).toBeGreaterThan(0);
  }
  expect(validateWorld(world)).toEqual([]);
});

test('V120 rejects malformed fullness and product tasks, and V119 migration validates before adding zero fullness',()=>{
  const {world,pawn,animal}=camp();
  for(const value of [-.01,1.01,NaN,Infinity,'1']){
    const bad=structuredClone(world);(bad.wildlife!.animals[0]!.domestic as {productFullness:unknown}).productFullness=value;
    expect(validateWorld(bad).length).toBeGreaterThan(0);
  }
  start(world);expect(validateWorld(world)).toEqual([]);
  for(const change of [
    (w:World)=>{w.pawns[0]!.animalHandling!.progress=ANIMAL_PRODUCTS.milk.work;},
    (w:World)=>{w.pawns[0]!.animalHandling!.kind='shear';},
    (w:World)=>{w.wildlife!.animals[0]!.domestic!.productFullness=.5;},
  ]){const bad=structuredClone(world);change(bad);expect(validateWorld(bad).length).toBeGreaterThan(0);}
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  const legacy=JSON.parse(readFileSync('public/test-saves/v119/enclos.json','utf8'));
  const owned=legacy.wildlife.animals.find((a:{domestic?:unknown})=>a.domestic);
  owned.species='muffalo';owned.sex='female';
  const migrated=deserializeWorld(JSON.stringify(legacy));
  expect(migrated.wildlife!.animals.find(a=>a.id===owned.id)!.domestic!.productFullness).toBe(0);
  expect(validateWorld(migrated)).toEqual([]);
  legacy.wildlife.animals.find((a:{id:number})=>a.id===owned.id).domestic.productFullness=1;
  expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow(/Invalid version 119 save/);
  expect(pawn.animalHandling?.kind).toBe('milk');expect(animal.domestic!.productFullness).toBe(1);
});
