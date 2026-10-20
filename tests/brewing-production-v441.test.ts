import {expect,test} from 'vitest';
import {miningCamp} from './scenarios/mining.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {sowingJobAllowed} from '../src/sim/farming.ts';
import {isCropKindInVersion,cropProduct} from '../src/sim/crops.ts';
import {PLANT_DEFINITIONS} from '../src/sim/plants.ts';
import {ITEM_DEFINITIONS} from '../src/sim/items.ts';
import {commercialItemMassGrams} from '../src/sim/commercial-mass.ts';
import {ROT_DAYS,isPerishable} from '../src/sim/food-preservation.ts';
import {constructionRecipe,validConstructionMaterial} from '../src/sim/construction-materials.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {PRODUCTION_RECIPES,stationAccepts} from '../src/sim/production-recipes.ts';
import {productionResearchUnlocked} from '../src/sim/machining.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {validateCooking} from '../src/sim/cooking-save.ts';
import {newFermentationState265} from '../src/sim/fermentation-state-265.ts';
import {validFermentationWorld265} from '../src/sim/fermentation-save-265.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {brewingSpeed265,validWortIngredients265} from '../src/sim/brewing-content-265.ts';
import type {Structure,World} from '../src/sim/types.ts';

const quantity=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
test('hops cultivation, food identity and physical wort/beer catalogue use their own authorities',()=>{
  expect(isCropKindInVersion('hops',264)).toBe(false);expect(isCropKindInVersion('hops',265)).toBe(true);expect(cropProduct('hops')).toBe('hops');
  expect(PLANT_DEFINITIONS.hops).toMatchObject({growDays:5,minFertility:.7,sensitivity:.7,yield:8});
  const w=miningCamp(),p=w.pawns[0]!,zone={id:w.nextId++,cells:[15*w.width+15],plant:'hops' as const,allowSow:true,allowCut:true};w.growingZones=[zone];
  p.skills.plants={level:2,xp:0,dailyXp:0,passion:0};expect(sowingJobAllowed(w,p,{kind:'sow',growingZoneId:zone.id})).toBe(false);
  p.skills.plants.level=3;expect(sowingJobAllowed(w,p,{kind:'sow',growingZoneId:zone.id})).toBe(true);
  expect(ITEM_DEFINITIONS.hops).toMatchObject({kind:'food',stackLimit:75,nutrition:5});expect(ITEM_DEFINITIONS.wort).toMatchObject({kind:'wort',stackLimit:25,nutrition:0});expect(ITEM_DEFINITIONS.beer).toMatchObject({kind:'beer',stackLimit:25,nutrition:8,maxIngest:1});
  expect(['hops','wort','beer'].map(i=>commercialItemMassGrams(i as 'hops'|'wort'|'beer',265))).toEqual([30,800,300]);
  expect(ROT_DAYS.hops).toBe(30);expect(ROT_DAYS.wort).toBe(5);expect(isPerishable('beer')).toBe(false);
});

test('fixed wooden pass-through benches require their actual ingredients and admit only the wort recipe',()=>{
  for(const [kind,wood,steel,work] of [['brewery',120,30,200],['fermenting-barrel',30,10,60]] as const){
    const s={kind,material:'wood' as const,footprint:'standard' as const,x:15,z:15,orientation:0 as const};
    expect(constructionRecipe(s)).toEqual({ingredients:[{item:'wood',quantity:wood},{item:'steel',quantity:steel}],coreWork:work*10,work});
    expect(validConstructionMaterial(kind,'wood',264)).toBe(false);expect(validConstructionMaterial(kind,'wood',265)).toBe(true);expect(validConstructionMaterial(kind,'steel',265)).toBe(false);
    expect(footprintCells(s)).toHaveLength(kind==='brewery'?3:1);
  }
  expect(PRODUCTION_RECIPES['brew-wort']).toMatchObject({station:'brewery',work:'cook',inputs:['hops'],units:25,workTicks:100,outputUnits:5});
  expect(stationAccepts({kind:'brewery'},'brew-wort')).toBe(true);expect(stationAccepts({kind:'brewery'},'simple-meal')).toBe(false);
  expect(validWortIngredients265([{item:'hops',quantity:10},{item:'hops',quantity:10},{item:'hops',quantity:5}])).toBe(true);
  expect(validWortIngredients265([{item:'rice',quantity:25}])).toBe(false);expect(validWortIngredients265([{item:'hops',quantity:24}])).toBe(false);
});

test('a recovered brewery physically gathers 25 hops, makes five wort and hauls them into a real barrel without Brewing research',()=>{
  const w=miningCamp(),p=w.pawns[0]!;w.structures=[];w.jobs=[];w.packed=[];w.stockpiles=[];
  // miningCamp prepares tick2000 without playing the intervening time. Adopt
  // prospective exposure there, as in the existing deterioration fixtures.
  w.deterioration!.lastTick=w.tick;
  if(w.fires)w.fires.clockCore=w.tick*10;
  for(const key of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[key]=0;
  p.priorities.cook=1;p.priorities.haul=2;p.skills.cooking={level:8,xp:0,dailyXp:0,passion:0};p.schedule=p.schedule.map(()=>'work');p.recreation.level=100;p.motion=null;p.moveCooldown=0;
  const bench:Structure={id:w.nextId++,kind:'brewery',material:'wood',x:15,z:12,orientation:0,footprint:'standard',bills:[{...newCookingBill(w.nextId++,'brew-wort'),destination:'drop'}]};
  const barrel:Structure={id:w.nextId++,kind:'fermenting-barrel',material:'wood',x:17,z:14,orientation:0,footprint:'standard',fermentation:newFermentationState265()};
  w.structures.push(bench,barrel);w.research??={project:null,points:0};delete w.research.brewing;
  addGroundMaterial(w,'food',25,{x:8,z:12},'hops');
  expect(productionResearchUnlocked(w,'brew-wort')).toBe(true);expect(brewingSpeed265(p)).toBeCloseTo(.88);
  let heldHops=false,placedHops=false,heldWort=false,barrelDelivery=false,worked=false;
  for(let i=0;i<1600&&barrel.fermentation!.wort!==5;i++){
    stepWorld(w);
    heldHops ||=w.piles.some(i=>i.item==='hops'&&i.owner.type==='pawn');
    placedHops ||=!!p.cooking?.ingredients.some(i=>i.item==='hops'&&i.stage==='placed');
    worked ||=!!p.cooking&&p.cooking.phase==='work'&&p.cooking.progress>0;
    heldWort ||=w.piles.some(i=>i.item==='wort'&&i.owner.type==='pawn');
    barrelDelivery ||=p.haul?.destination.type==='fermenting-barrel';
    if(p.cooking)expect(validateCooking(w,w.schemaVersion,new Set())).toEqual([]);
  }
  expect({heldHops,placedHops,worked,heldWort,barrelDelivery}).toEqual({heldHops:true,placedHops:true,worked:true,heldWort:true,barrelDelivery:true});
  expect(quantity(w,'hops')).toBe(0);expect(quantity(w,'wort')).toBe(0);expect(barrel.fermentation!.wort).toBe(5);expect(bench.bills![0]!.target).toBe(0);expect(validFermentationWorld265(w)).toBe(true);
  // Explicit prepared mature checkpoint, covering real extraction and ordinary
  // ground output without spending six simulated days in this short test.
  barrel.fermentation!.progress=1;
  for(let i=0;i<400&&quantity(w,'beer')!==5;i++)stepWorld(w);
  expect(quantity(w,'beer')).toBe(5);expect(barrel.fermentation!.wort).toBe(0);expect(w.piles.filter(i=>i.item==='beer').every(i=>i.owner.type==='ground')).toBe(true);
});
