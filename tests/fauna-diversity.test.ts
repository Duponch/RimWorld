import { expect,test } from 'vitest';
import { applyCommand,createWorld,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { ANIMAL_SPECIES,BIOME_FAUNA,animalSpecies,selectBiomeSpecies } from '../src/sim/animal-species';
import { HARE_MODEL,animalBodyModel } from '../src/sim/body-model';
import { createMedicalRecord } from '../src/sim/injury-state';
import { BLOOD_UNIT } from '../src/sim/injury-rules';
import { corpseProducts,corpseYield } from '../src/sim/corpses';
import { validCorpseShape } from '../src/sim/corpse-save';
import { enableBiomeWildlife,advanceWildlife,ANIMAL_POPULATION_CHECK_TICKS } from '../src/sim/wildlife';
import { validateWildlife } from '../src/sim/wildlife-save';
import { animalMeleeTools } from '../src/sim/wildlife-melee';
import { finishButchery } from '../src/sim/butchery';
import { productionWorkTotal } from '../src/sim/production-recipes';
import { newCookingBill } from '../src/sim/cooking-bills';
import { refreshStock } from '../src/sim/materials';
import { finishAnimalMeal } from '../src/sim/wildlife-food';
import { plantGrowth } from '../src/sim/plants';
import type { ProductionContext } from '../src/sim/production-output';
import type { AnimalSpeciesId } from '../src/sim/animal-species';
import type { MaterialPile,Structure,World } from '../src/sim/types';
import type { WildAnimal } from '../src/sim/wildlife-state';

const dead=(w:World,species:AnimalSpeciesId,x=5,z=4):MaterialPile=>{
  const id=w.nextId++,health={...createMedicalRecord(w.tick),body:species,bloodLoss:BLOOD_UNIT,death:{tick:w.tick,cause:'blood-loss' as const}};
  return {id,item:animalSpecies(species).corpseItem,kind:'corpse',quantity:1,owner:{type:'ground',x,z},corpse:{animalId:id,species,sex:'female',health},rot:{progress:0,atTick:w.tick}};
};
const quantity=(w:World,item:MaterialPile['item'])=>w.piles.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);
function until(w:World,done:()=>boolean,max=3500):void {
  for(let i=0;i<max&&!done();i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),`condition tick ${w.tick}`).toBe(true);
}

test('six adult species retain Core-derived needs, anatomy, attacks and products without changing the hare profile',()=>{
  expect(Object.keys(ANIMAL_SPECIES)).toEqual(['hare','snow-hare','deer','muffalo','gazelle','dromedary']);
  expect(animalSpecies('hare')).toMatchObject({nutrition:.2,foodPerDay:.18,moveTicks:1,walkTicks:5,healthScale:.4,rawMeat:28,rawLeather:8});
  expect(animalSpecies('snow-hare')).toMatchObject({nutrition:.2,foodPerDay:.18,healthScale:.4,meatItem:'snow-hare-meat'});
  expect(HARE_MODEL.byId.torso.hp).toBe(16);expect(animalBodyModel('deer').byId.torso.hp).toBe(36);
  expect(animalBodyModel('gazelle').byId.torso.hp).toBe(28);expect(animalBodyModel('muffalo').byId.torso.hp).toBe(70);
  expect(animalBodyModel('dromedary').byId.torso.hp).toBe(64);expect(animalBodyModel('dromedary').byId.hump).toMatchObject({hp:32,coverage:.1});
  expect(animalBodyModel('deer').byId['left-front-hoof']).toBeDefined();expect(animalBodyModel('deer').byId['left-front-paw']).toBeUndefined();
  const gazelle:WildAnimal={id:1,species:'gazelle',sex:'female',x:0,z:0,food:.7,rest:1,state:'idle',path:[],nextDecision:0};
  expect(animalMeleeTools(gazelle)).toEqual(expect.arrayContaining([expect.objectContaining({damage:5.5,cooldownCore:90}),expect.objectContaining({damage:7})]));
});

test('biome budgets retain omitted Core weight and use ecological weight instead of a density-derived head count',()=>{
  expect(BIOME_FAUNA['temperate-forest']).toMatchObject({animalDensity:3.7,totalCommonality:12.27});
  expect(BIOME_FAUNA['boreal-forest'].entries.map(e=>e.species)).toEqual(['hare','deer','muffalo']);
  expect(BIOME_FAUNA.tundra.entries.map(e=>e.species)).toEqual(['hare','snow-hare','muffalo']);
  expect(selectBiomeSpecies(BIOME_FAUNA['temperate-forest'],0)).toBe('hare');
  expect(selectBiomeSpecies(BIOME_FAUNA['temperate-forest'],.9)).toBeUndefined();
  const a=createWorld(91001,80,80);delete a.wildlife;enableBiomeWildlife(a,'temperate-forest');
  const b=createWorld(91001,80,80);delete b.wildlife;enableBiomeWildlife(b,'temperate-forest');
  expect(b.wildlife).toEqual(a.wildlife);
  const population=a.wildlife!.population!,full=80*80*3.7/10000;
  expect(population.fullTargetWeight).toBe(full);
  expect(population.targetWeight).toBe(full*2.3/12.27);
  expect(a.wildlife!.animals.every(animal=>BIOME_FAUNA['temperate-forest'].entries.some(e=>e.species===animal.species))).toBe(true);
  expect(validateWildlife(a,91,new Set())).toEqual([]);
  expect(validateWildlife(a,90,new Set())).not.toEqual([]);
});

test('renewal is a saved prospective group arrival and does not reproduce or immediately refill after a loss',()=>{
  const w=createWorld(91002,80,80);delete w.wildlife;enableBiomeWildlife(w,'temperate-forest');
  const s=w.wildlife!;s.animals=[];s.rng=1;s.population!.nextCheck=w.tick;
  advanceWildlife(w);
  expect(s.population).toMatchObject({checks:1,arrivals:1,nextCheck:w.tick+ANIMAL_POPULATION_CHECK_TICKS});
  expect(s.animals.length).toBeGreaterThan(0);expect(s.animals.every(a=>a.species==='hare')).toBe(true);
  const count=s.animals.length;advanceWildlife(w);expect(s.animals).toHaveLength(count);expect(s.population!.checks).toBe(1);
  expect(validateWildlife(w,91,new Set())).toEqual([]);
});

test('renewal defers safely when identity or saved counter space is exhausted',()=>{
  const ids=createWorld(91007,80,80);delete ids.wildlife;enableBiomeWildlife(ids,'temperate-forest');ids.wildlife!.animals=[];ids.wildlife!.population!.nextCheck=ids.tick;ids.nextId=Number.MAX_SAFE_INTEGER;
  const rng=ids.wildlife!.rng;advanceWildlife(ids);expect(ids.wildlife!.animals).toEqual([]);expect(ids.wildlife!.population).toMatchObject({checks:1,arrivals:0});expect(ids.wildlife!.rng).toBe(rng);
  const counters=createWorld(91008,80,80);delete counters.wildlife;enableBiomeWildlife(counters,'temperate-forest');counters.wildlife!.animals=[];counters.wildlife!.population!.nextCheck=counters.tick;counters.wildlife!.population!.checks=Number.MAX_SAFE_INTEGER;
  const before=structuredClone(counters.wildlife);advanceWildlife(counters);expect(counters.wildlife).toEqual(before);
});

test('species capacity applies different physical grazing pressure to the same growing plant',()=>{
  const graze=(species:'hare'|'deer',food:number)=>{
    const w=createWorld(91006,32,32);delete w.wildlife;enableBiomeWildlife(w,'temperate-forest');
    const animal=w.wildlife!.animals[0]!;Object.assign(animal,{species,food,state:'eating',path:[],meal:{kind:'plant',id:w.nextId,quantity:1,progress:49}});
    const plant={id:w.nextId++,kind:'wild-plant' as const,species:'grass' as const,x:animal.x,z:animal.z,amount:1,growth:1,growthTick:w.tick};w.resources=[plant];
    finishAnimalMeal(w,animal);return {w,animal,plant};
  };
  const hare=graze('hare',.1);expect(hare.w.resources).toHaveLength(1);expect(plantGrowth(hare.w,hare.plant)).toBeCloseTo(.8);expect(hare.animal.food).toBeCloseTo(.2);
  const deer=graze('deer',.2);expect(deer.w.resources).toEqual([]);expect(deer.animal.food).toBeCloseTo(.7);expect(deer.w.wildlife!.eatenPlants).toBe(1);
});

test('corpse identity selects its body coverage, meat and leather and is rejected by pre-V91 schemas',()=>{
  const w=createWorld(91003,16,16);w.tick=2000;const hare=dead(w,'hare'),camel=dead(w,'dromedary');
  expect(corpseYield(hare).meat).toBeCloseTo(31.0857142857,9);
  expect(corpseProducts(hare)).toMatchObject({meat:{item:'hare-meat'},leather:{item:'light-leather'}});
  expect(corpseYield(camel).meat).toBeCloseTo(294,9);expect(corpseYield(camel).leather).toBeCloseTo(84,9);
  expect(corpseProducts(camel)).toMatchObject({meat:{item:'dromedary-meat'},leather:{item:'camelhide'}});
  expect(validCorpseShape(camel as unknown as Record<string,unknown>,91)).toBe(true);
  expect(validCorpseShape(camel as unknown as Record<string,unknown>,90)).toBe(false);
  const forged=structuredClone(camel) as any;forged.corpse.health.body='muffalo';expect(validCorpseShape(forged,91)).toBe(false);
});

test('large butchery preflights and splits every physical output below its stack limit',()=>{
  const w=createWorld(91004,16,16);w.tick=2000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.jobs=[];w.piles=[];w.structures=[];w.stockpiles=[];delete w.wildlife;
  w.pawns=w.pawns.slice(0,1);const pawn=w.pawns[0]!;Object.assign(pawn,{x:8,z:7,hunger:100,rest:100,state:'working'});
  pawn.skills.cooking={level:8,xp:0,dailyXp:0,passion:1};
  const corpse=dead(w,'dromedary',8,8);w.piles.push(corpse);
  const bill=newCookingBill(w.nextId++,'butcher-creature'),station:Structure={id:w.nextId++,kind:'butcher-spot',x:8,z:8,orientation:0,footprint:'standard',bills:[bill]};w.structures.push(station);
  pawn.cooking={recipe:'butcher-creature',stationId:station.id,billId:bill.id,spot:{x:8,z:7},actionCell:{x:8,z:8},phase:'work',ingredients:[{pileId:corpse.id,item:'dromedary-corpse',quantity:1,stage:'placed',cell:{x:8,z:8}}],progress:productionWorkTotal('butcher-creature'),workTicks:45,productId:null,storageId:null};
  const aged:MaterialPile={id:w.nextId++,item:'dromedary-meat',kind:'food',quantity:10,owner:{type:'ground',x:8,z:7},rot:{progress:1000,atTick:w.tick}};w.piles.push(aged);
  const context={event:()=>{},release:()=>{throw new Error('unexpected release');},move:()=>{},workRate:()=>1,search:()=>null} as unknown as ProductionContext;
  const saturated=structuredClone(w);
  for(let z=0;z<saturated.height;z++)for(let x=0;x<saturated.width;x++)if((x!==8||z!==8)&&!saturated.piles.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z))saturated.piles.push({id:saturated.nextId++,item:'wood',kind:'wood',quantity:75,owner:{type:'ground',x,z}});
  const before=structuredClone(saturated);
  expect(finishButchery(saturated,saturated.pawns[0]!,saturated.structures[0]!.bills![0]!,context)).toBe(false);
  expect(saturated).toEqual(before);
  expect(finishButchery(w,pawn,bill,context)).toBe(true);
  const meat=w.piles.filter(p=>p.item==='dromedary-meat'),leather=w.piles.filter(p=>p.item==='camelhide');
  expect(meat.reduce((n,p)=>n+p.quantity,0)).toBe(w.butchery!.meat+10);expect(leather.reduce((n,p)=>n+p.quantity,0)).toBe(w.butchery!.leather);
  expect(meat.length).toBeGreaterThan(1);expect([...meat,...leather].every(p=>p.quantity<=75)).toBe(true);
  expect(meat.filter(p=>p.owner.type==='pawn')).toHaveLength(1);expect(w.piles.some(p=>p.id===corpse.id)).toBe(false);
  expect(w.piles.find(p=>p.id===aged.id)).toMatchObject({quantity:75,rot:{atTick:w.tick}});expect(w.piles.find(p=>p.id===aged.id)!.rot!.progress).toBeCloseTo(1000*10/75);
});

test('a driven dromedary chain survives work save, splits products, cooks ten meat and feeds the butcher',()=>{
  let w=createWorld(91005,16,16);w.tick=2000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.jobs=[];w.piles=[];w.structures=[];w.stockpiles=[];delete w.wildlife;
  w.pawns=w.pawns.slice(0,1);let pawn=w.pawns[0]!;Object.assign(pawn,{x:3,z:4,hunger:100,rest:100});pawn.schedule.fill('work');
  for(const key of Object.keys(pawn.priorities))pawn.priorities[key as keyof typeof pawn.priorities]=0;
  pawn.priorities.cook=1;pawn.skills.cooking={level:8,xp:0,dailyXp:0,passion:1};
  const corpse=dead(w,'dromedary',5,4),corpseId=corpse.id;w.piles.push(corpse);
  expect(applyCommand(w,{type:'designate',kind:'butcher-spot',x:8,z:8}).ok).toBe(true);
  const spot=w.structures.find(s=>s.kind==='butcher-spot')!;expect(applyCommand(w,{type:'bill-add',structureId:spot.id}).ok).toBe(true);refreshStock(w);
  until(w,()=>pawn.cooking?.ingredients.some(i=>i.stage==='held')===true);
  expect(w.piles.find(p=>p.id===corpseId)).toMatchObject({owner:{type:'pawn',pawnId:pawn.id},corpse:{species:'dromedary'}});
  until(w,()=>pawn.cooking?.phase==='work'&&pawn.cooking.progress>0);
  const saved=serializeWorld(w);w=deserializeWorld(saved);pawn=w.pawns[0]!;expect(serializeWorld(w)).toBe(saved);
  until(w,()=>w.butchery?.completed===1&&!pawn.cooking);
  const producedMeat=quantity(w,'dromedary-meat'),producedLeather=quantity(w,'camelhide');
  expect(producedMeat).toBe(w.butchery!.meat);expect(producedLeather).toBe(w.butchery!.leather);
  expect(w.piles.filter(p=>p.item==='dromedary-meat').length).toBeGreaterThan(1);
  expect(w.piles.filter(p=>p.item==='dromedary-meat'||p.item==='camelhide').every(p=>p.quantity<=75)).toBe(true);
  const fire:Structure={id:w.nextId++,kind:'campfire',x:11,z:8,orientation:0,footprint:'standard',fuel:{ticks:12000,burned:0,autoRefuel:false},bills:[]};w.structures.push(fire);
  expect(applyCommand(w,{type:'bill-add',structureId:fire.id}).ok).toBe(true);const meal=fire.bills![0]!;
  const filters=Object.fromEntries(Object.keys(meal.filters).map(id=>[id,id==='dromedary-meat'])) as typeof meal.filters;
  expect(applyCommand(w,{type:'bill-update',structureId:fire.id,billId:meal.id,settings:{...meal,filters,destination:'drop'}}).ok).toBe(true);
  until(w,()=>quantity(w,'simple-meal')===1&&!pawn.cooking);
  expect(quantity(w,'dromedary-meat')).toBe(producedMeat-10);expect(quantity(w,'camelhide')).toBe(producedLeather);
  const remainingMeat=quantity(w,'dromedary-meat');pawn.hunger=20;until(w,()=>pawn.hunger>50);
  expect(quantity(w,'simple-meal')).toBe(0);expect(quantity(w,'dromedary-meat')).toBe(remainingMeat);expect(validateWorld(w)).toEqual([]);
});
