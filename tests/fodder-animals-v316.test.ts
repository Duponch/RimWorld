import {expect,test,vi} from 'vitest';
import {createWorld,deserializeWorld,serializeWorld} from '../src/sim/index.ts';
import {enableWildlife,advanceWildlife} from '../src/sim/wildlife.ts';
import {animalFoods,animalMealTarget,animalPileFood,finishAnimalMeal,animalFoodPreference} from '../src/sim/wildlife-food.ts';
import {animalSpecies,ANIMAL_SPECIES_IDS,type AnimalSpeciesId} from '../src/sim/animal-species.ts';
import {adultAgeTicks,animalNutritionMax} from '../src/sim/animal-life.ts';
import {harvestable,plantGrowth} from '../src/sim/plants.ts';
import {plantNutrition} from '../src/sim/biome-flora.ts';
import {animalFeedingCamp} from './helpers/animal-feeding-v279.ts';
import {animalFeedQuantity,ANIMAL_FEED_TICKS} from '../src/sim/animal-feeding-rules.ts';
import {animalFeedingProposal,processAnimalFeeding,startAnimalFeeding} from '../src/sim/animal-feeding.ts';
import {handlingFoodAllowed,handlingFoodCollectable,handlingFeedUnits,handlingProposal,handlingStepDuration,processHandling,startHandling} from '../src/sim/animal-handling.ts';
import {blockedCells,reachableCells} from '../src/sim/pathfinding.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {refreshStock,reservedSource} from '../src/sim/materials.ts';
import {WeightedSearch} from '../src/sim/weighted-search.ts';
import {ITEM_DEFINITIONS,type ItemId} from '../src/sim/items.ts';
import type {MaterialPile,Pawn,World} from '../src/sim/types.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

function scene(species:AnimalSpeciesId='hare',size=16){
  const w=createWorld(42,size,size);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.structures=[];w.jobs=[];w.piles=[];
  w.resources=[{id:w.nextId++,kind:'berries',x:3,z:3,amount:10,growth:1,growthTick:w.tick}];
  enableWildlife(w,1);w.resources=[];
  const a=w.wildlife!.animals[0]!;Object.assign(a,{species,ageTicks:adultAgeTicks(species),x:2,z:2,food:animalSpecies(species).nutrition*.1,rest:1,state:'idle',path:[],nextDecision:w.tick});
  w.pawns.forEach(p=>{p.x=size-2;p.z=size-2;});
  refreshStock(w);return {w,a};
}
function pile(w:World,item:ItemId,x=4,z=2,quantity=75):MaterialPile{
  const p={id:w.nextId++,kind:ITEM_DEFINITIONS[item].kind,item,quantity,owner:{type:'ground' as const,x,z}};w.piles.push(p);return p;
}
const reach=(w:World,p:Pawn)=>reachableCells(w,p,blockedCells(w),new Set());

test.each(ANIMAL_SPECIES_IDS)('%s has an explicit fodder diet and prospective admission',species=>{
  const {w,a}=scene(species),hay=pile(w,'hay'),kibble=pile(w,'kibble',5);
  expect(animalPileFood(w,a,hay)).toBe(species!=='red-fox');expect(animalPileFood(w,a,kibble)).toBe(true);
  expect(animalFoods(w,a).map(f=>f.id)).toEqual(species==='red-fox'?[kibble.id]:[hay.id,kibble.id]);
  w.schemaVersion=226 as World['schemaVersion'];expect(animalPileFood(w,a,hay)).toBe(false);expect(animalPileFood(w,a,kibble)).toBe(false);
  expect(animalFoods(w,a)).toEqual([]);
});

test('haygrass at exactly .65 is grazeable but cannot be harvested; grazing consumes actual growth',()=>{
  const {w,a}=scene();const r={id:w.nextId++,kind:'haygrass' as const,x:3,z:2,amount:18,growth:.65,growthTick:w.tick};w.resources=[r];
  expect(harvestable(w,r)).toBe(false);expect(plantNutrition(r,.65)).toBeCloseTo(.195,12);expect(animalFoods(w,a).map(f=>f.id)).toEqual([r.id]);
  r.growth=.649999;expect(animalFoods(w,a)).toEqual([]);r.growth=.65;
  a.food=.15;a.meal={kind:'plant',id:r.id,quantity:1,progress:0};
  expect(animalMealTarget(w,a)).toBe(r);finishAnimalMeal(w,a);
  expect(a.food).toBeCloseTo(.2,12);expect(w.wildlife!.eatenNutrition).toBeCloseTo(.05,12);
  expect(plantGrowth(w,r)).toBeCloseTo(.65-.05/.3,12);expect(animalFoods(w,a)).toEqual([]);expect(w.piles).toEqual([]);
  r.growth=.65;r.growthTick=w.tick;a.food=0;a.meal={kind:'plant',id:r.id,quantity:1,progress:0};finishAnimalMeal(w,a);
  expect(w.resources).toEqual([]);expect(w.wildlife!.eatenPlants).toBe(1);expect(w.piles).toEqual([]);
});

test('immature, claimed and worked haygrass supplies no free nutrition',()=>{
  const {w,a}=scene();const r={id:w.nextId++,kind:'haygrass' as const,x:3,z:2,amount:18,growth:.7,growthTick:w.tick};w.resources=[r];
  const other:WildAnimal={...structuredClone(a),id:w.nextId++,meal:{kind:'plant',id:r.id,quantity:1,progress:0}};w.wildlife!.animals.push(other);
  expect(animalFoods(w,a)).toEqual([]);delete other.meal;
  w.jobs.push({id:w.nextId++,kind:'harvest',x:r.x,z:r.z,orientation:0,footprint:'standard',status:'pending',reservedBy:w.pawns[0]!.id,progress:0,escrow:{wood:0,food:0}});
  expect(animalFoods(w,a)).toEqual([]);a.meal={kind:'plant',id:r.id,quantity:1,progress:0};finishAnimalMeal(w,a);expect(r.growth).toBe(.7);
  w.jobs[0]!.reservedBy=null;w.schemaVersion=226 as World['schemaVersion'];expect(animalMealTarget(w,a)).toBeUndefined();
});

test.each(['hay','kibble'] as const)('%s is reserved physically and never exposes the human raw-food risk',item=>{
  const {w,a}=scene(),p=pile(w,item),worker=w.pawns[0]!;
  worker.haul={sourcePileId:p.id,quantity:74,phase:'pickup',carryPileId:null,destination:{type:'aside',x:9,z:9}};
  expect(animalFoods(w,a)[0]!.quantity).toBe(1);a.meal={kind:'pile',id:p.id,quantity:1,progress:0};
  expect(reservedSource(w,p.id)).toBe(75);const before=a.food,rng=w.rng;
  a.x=0;finishAnimalMeal(w,a);expect(a.food).toBe(before);a.x=3;a.z=2;
  a.motion={from:{x:2,z:2},to:{x:3,z:2},start:w.tick,end:w.tick+1,speedFactor:3,terrainDelay:0};finishAnimalMeal(w,a);expect(p.quantity).toBe(75);
  delete a.motion;finishAnimalMeal(w,a);expect(p.quantity).toBe(74);expect(a.food).toBeCloseTo(before+.05,12);expect(w.rng).toBe(rng);expect(a.health?.foodPoisoning).toBeUndefined();
  p.owner={type:'pawn',pawnId:worker.id};expect(animalFoods(w,a)).toEqual([]);
});

test('a closed physical pen limits fodder and haygrass candidates without supplying food',()=>{
  const {w,a}=scene('deer'),marker={id:w.nextId++,kind:'pen-marker' as const,x:4,z:4,orientation:0 as const,footprint:'standard' as const};w.structures.push(marker);
  for(let z=1;z<=8;z++)for(let x=1;x<=8;x++)if(x===1||x===8||z===1||z===8)w.structures.push({id:w.nextId++,kind:'fence',x,z,orientation:0,footprint:'standard',material:'wood'});
  a.domestic={since:w.tick,care:'none',tameness:5,nextDecay:w.tick+45000,penMarkerId:marker.id};
  const inside=pile(w,'hay',4,3),outside=pile(w,'kibble',10,3);
  w.resources=[{id:w.nextId++,kind:'haygrass',x:11,z:4,amount:18,growth:1,growthTick:w.tick}];
  expect(animalFoods(w,a).map(f=>f.id)).toEqual([inside.id]);a.meal={kind:'pile',id:outside.id,quantity:1,progress:0};expect(animalMealTarget(w,a)).toBeUndefined();
  w.piles=[];expect(animalFoods(w,a)).toEqual([]);const food=a.food;finishAnimalMeal(w,a);expect(a.food).toBe(food);
});

test('animal food bonuses compete with source Manhattan distance, including shared contact cells',()=>{
  expect(animalFoodPreference('hay')).toBe(7);expect(animalFoodPreference('kibble')).toBe(100);
  for(const [distance,item,selected] of [[6,'hay',true],[12,'hay',false],[12,'kibble',true]] as const){
    const {w,a}=scene(),rice=pile(w,'rice',3),fodder=pile(w,item,distance);advanceWildlife(w);
    expect(a.meal?.id).toBe(selected?fodder.id:rice.id);
  }
  const {w,a}=scene(),rice=pile(w,'rice',3),kibble=pile(w,'kibble',3,3);advanceWildlife(w);
  expect(a.meal?.id).toBe(kibble.id);expect(a.meal?.id).not.toBe(rice.id);
  const large=scene('hare',128),near=pile(large.w,'rice',3);pile(large.w,'kibble',110);advanceWildlife(large.w);expect(large.a.meal?.id).toBe(near.id);
});

test('an unreachable preferred food resumes one frontier for fallback, predator food and exit',()=>{
  for(const species of ['hare','red-fox'] as const){
    const {w,a}=scene(species),fallback=pile(w,species==='red-fox'?'hare-meat':'rice',3),kibble=pile(w,'kibble',12);
    for(let z=0;z<w.height;z++)w.tiles[z*w.width+8]={terrain:'rock'};
    const advances=vi.spyOn(WeightedSearch.prototype,'advance'),finishes=vi.spyOn(WeightedSearch.prototype,'finish');
    try {advanceWildlife(w);expect(a.meal?.id).toBe(fallback.id);expect(a.meal?.id).not.toBe(kibble.id);expect(new Set(advances.mock.contexts).size).toBe(1);expect(finishes).toHaveBeenCalledTimes(1);}
    finally {advances.mockRestore();finishes.mockRestore();}
  }
  const {w,a}=scene();pile(w,'kibble',12);for(let z=0;z<w.height;z++)w.tiles[z*w.width+8]={terrain:'rock'};
  a.food=0;advanceWildlife(w);expect(a.meal).toBeUndefined();expect(a.exiting).toBeDefined();expect(w.wildlife!.eatenNutrition).toBe(0);
});

test('an active physical kibble meal reloads without consuming food or RNG early',()=>{
  const {w,a}=scene(),p=pile(w,'kibble',3);refreshStock(w);advanceWildlife(w);
  const copy=deserializeWorld(serializeWorld(w));expect(serializeWorld(copy)).toBe(serializeWorld(w));
  for(let i=0;i<65;i++){w.tick++;copy.tick++;advanceWildlife(w);advanceWildlife(copy);}
  refreshStock(w);refreshStock(copy);
  expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(w.wildlife!.eatenItems).toBeGreaterThan(0);expect(p.quantity).toBeLessThan(75);expect(a.health?.foodPoisoning).toBeUndefined();
});

test.each(['hay','kibble'] as const)('medical %s uses the real held ration, nearest-even quantity and item cap',item=>{
  const f=animalFeedingCamp(),w=f.world,d=w.pawns.find(p=>p.id===f.doctorId)!,a=w.wildlife!.animals.find(a=>a.id===f.animalId)!;
  w.piles=[];const source=pile(w,item,3,8,ITEM_DEFINITIONS[item].stackLimit),initial=source.quantity;
  expect(ITEM_DEFINITIONS[item].maxIngest).toBe(item==='hay'?200:75);
  const before=a.food,proposal=animalFeedingProposal(w,d,reach(w,d))!;expect(proposal).toBeDefined();expect(proposal.task.quantity).toBe(animalFeedQuantity(a,source,initial));startAnimalFeeding(d,proposal);
  const ctx={search:()=>reach(w,d),move:()=>{},release:()=>releaseWork(w,d),event:()=>{}};
  d.x=3;d.z=8;d.path=[];d.moveCooldown=0;d.motion=null;processAnimalFeeding(w,d,ctx);
  expect(source.quantity).toBe(initial-proposal.task.quantity);expect(a.food).toBe(before);
  const held=w.piles.find(p=>p.id===d.animalFeed!.carryPileId)!;expect(held.item).toBe(item);expect(held.owner).toEqual({type:'pawn',pawnId:d.id});
  d.x=proposal.task.spot.x;d.z=proposal.task.spot.z;const rng=w.rng;
  for(let i=0;i<ANIMAL_FEED_TICKS;i++)processAnimalFeeding(w,d,ctx);
  expect(d.animalFeed).toBeUndefined();expect(w.piles.some(p=>p.id===held.id)).toBe(false);expect(a.food).toBeCloseTo(Math.min(animalNutritionMax(a),before+proposal.task.quantity*.05),12);
  expect(w.wildlife!.eatenItems).toBe(proposal.task.quantity);expect(w.rng).toBe(rng);expect(a.health!.foodPoisoning).toBeUndefined();
});

test('handling collects Kibble but excludes Hay from the Core map collection group',()=>{
  const {w,a}=scene(),p=w.pawns[0]!;p.x=2;p.z=3;p.priorities.handle=1;p.skills.animals={level:8,xp:0,dailyXp:0,passion:0};a.taming={designated:true};a.food=0;
  pile(w,'hay',2,3);expect(handlingFoodAllowed(w,'hay')).toBe(true);expect(handlingFoodCollectable(w,'hay')).toBe(false);expect(handlingProposal(w,p,reach(w,p))).toBeUndefined();
  const source=pile(w,'kibble',2,3),proposal=handlingProposal(w,p,reach(w,p))!;expect(proposal?.task.sourcePileId).toBe(source.id);startHandling(p,proposal);
  const ctx={search:()=>null,candidates:()=>null,blocked:()=>new Uint8Array(w.width*w.height),move:()=>{},release:()=>releaseWork(w,p),event:()=>{}};
  processHandling(w,p,ctx);expect(p.animalHandling!.phase).toBe('approach');const carried=w.piles.find(i=>i.id===p.animalHandling!.carryPileId)!;
  expect(carried.quantity).toBe(handlingFeedUnits(a.species)*2);p.animalHandling!.step=2;p.animalHandling!.progress=handlingStepDuration(p.animalHandling!,a.species)-1;
  const rng=w.rng;processHandling(w,p,ctx);expect(a.food).toBeCloseTo(handlingFeedUnits(a.species)*.05,12);expect(carried.quantity).toBe(handlingFeedUnits(a.species));expect(w.rng).toBe(rng);
  w.schemaVersion=226 as World['schemaVersion'];expect(handlingFoodAllowed(w,'hay')).toBe(false);expect(handlingFoodCollectable(w,'kibble')).toBe(false);
});
