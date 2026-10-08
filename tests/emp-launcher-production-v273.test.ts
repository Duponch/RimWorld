import { expect,test } from 'vitest';
import { createMachiningFixture,prepareCompletedResearch,requireCommand,advanceUntil } from './scenarios/machining-v101.ts';
import { MICROELECTRONICS_RESEARCH_COST } from '../src/sim/research.ts';
import { GUN_REQUIREMENTS,PRODUCTION_RECIPES,productionWorkTotal,recipeProduct,isRecipeProduct,stationRecipes } from '../src/sim/production-recipes.ts';
import { productionResearchUnlocked,productionWorkerQualified,validGunIngredients } from '../src/sim/machining.ts';
import { newCookingBill,validBillSettings } from '../src/sim/cooking-bills.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { equippedWeapon } from '../src/sim/equipment-rules.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { commercialItemMassGrams } from '../src/sim/commercial-mass.ts';
import { pileFlammability } from '../src/sim/thing-damage-rules.ts';
import { equipmentInspectionView } from '../src/ui/equipment-inspection.ts';
import { itemInformation } from '../src/ui/item-information.ts';
import { weaponVisual,WEAPON_VISUALS } from '../src/render/weapon-shape.ts';
import type { Structure } from '../src/sim/types.ts';

function prepared(){
  const {world,pawn}=createMachiningFixture();prepareCompletedResearch(world);delete world.research!.gunsmithing;
  world.research!.microelectronics={points:MICROELECTRONICS_RESEARCH_COST,completedAt:world.tick};
  pawn.priorities.build=0;pawn.priorities.research=0;
  const station:Structure={id:world.nextId++,kind:'machining-table',x:15,z:8,orientation:0,footprint:'standard',material:'steel',power:newPowerState('machining-table'),bills:[]};world.structures.push(station);
  world.piles.find(p=>p.item==='steel')!.quantity=75;world.piles.find(p=>p.item==='component')!.quantity=8;
  return {world,pawn,station};
}

test('EMP machining requires Microelectronics and Crafting 4, never Gunsmithing',()=>{
  const {world,pawn,station}=prepared();
  expect(productionResearchUnlocked(world,'make-emp-launcher')).toBe(true);
  expect(productionResearchUnlocked(world,'make-revolver')).toBe(false);
  delete world.research!.microelectronics;expect(productionResearchUnlocked(world,'make-emp-launcher')).toBe(false);
  world.research!.microelectronics={points:MICROELECTRONICS_RESEARCH_COST,completedAt:world.tick};
  pawn.skills.crafting!.level=3;expect(productionWorkerQualified(pawn,'make-emp-launcher')).toBe(false);
  pawn.skills.crafting!.level=4;expect(productionWorkerQualified(pawn,'make-emp-launcher')).toBe(true);
  expect(stationRecipes(station)).toContain('make-emp-launcher');
  world.schemaVersion=207 as typeof world.schemaVersion;expect(productionResearchUnlocked(world,'make-emp-launcher')).toBe(false);
  const bill=newCookingBill(1,'make-emp-launcher');expect(validBillSettings(bill,'make-emp-launcher',207)).toBe(false);expect(validBillSettings(bill,'make-emp-launcher',208)).toBe(true);
});

test('EMP ingredients, work and counted output have separate exact identities',()=>{
  expect(GUN_REQUIREMENTS['make-emp-launcher']).toEqual({steel:75,component:8,skill:4});
  expect(PRODUCTION_RECIPES['make-emp-launcher'].workTicks).toBe(3000);expect(productionWorkTotal('make-emp-launcher')).toBe(30_000_000);
  expect(validGunIngredients('make-emp-launcher',[{item:'steel',quantity:75},{item:'component',quantity:8}])).toBe(true);
  expect(validGunIngredients('make-emp-launcher',[{item:'steel',quantity:76},{item:'component',quantity:7}])).toBe(false);
  expect(recipeProduct('make-emp-launcher',[])).toBe('emp-launcher');expect(isRecipeProduct('make-emp-launcher','emp-launcher')).toBe(true);expect(isRecipeProduct('make-emp-launcher','bolt-action-rifle')).toBe(false);
});

test('real staged EMP work resumes, consumes once, finishes and equips the same quality-bearing weapon',()=>{
  const {world,pawn,station}=prepared();
  const initialSteel=world.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0),initialComponents=world.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0);
  requireCommand(world,{type:'bill-add',structureId:station.id,recipe:'make-emp-launcher'});
  const bill=station.bills![0]!;requireCommand(world,{type:'bill-update',structureId:station.id,billId:bill.id,settings:{...bill,destination:'drop'}});
  advanceUntil(world,()=>world.piles.some(p=>p.gunWork?.recipe==='make-emp-launcher'&&p.gunWork.progress>100_000),1800);
  const work=world.piles.find(p=>p.gunWork?.recipe==='make-emp-launcher')!;
  expect(work.gunWork!.parts.reduce((n,p)=>n+(p.item==='steel'?p.quantity:0),0)).toBe(75);
  expect(work.gunWork!.parts.reduce((n,p)=>n+(p.item==='component'?p.quantity:0),0)).toBe(8);
  expect(validateWorld(world)).toEqual([]);const resumed=deserializeWorld(serializeWorld(world));
  advanceUntil(world,()=>world.piles.some(p=>p.item==='emp-launcher'&&p.owner.type==='ground'),8000);
  stepWorld(resumed,world.tick-resumed.tick);expect(resumed).toEqual(world);
  expect(world.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(initialSteel-75);
  expect(world.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0)).toBe(initialComponents-8);
  expect(world.piles.filter(p=>p.item==='unfinished-gun')).toEqual([]);
  const weapon=world.piles.find(p=>p.item==='emp-launcher')!,state=structuredClone(weapon.weapon);
  expect(state?.hitPoints).toBe(100);expect(pawn.skills.crafting!.xp).toBeGreaterThan(0);
  requireCommand(world,{type:'order-equipment',pawnId:pawn.id,itemId:weapon.id,action:'equip',queue:false});
  const equipResume=deserializeWorld(serializeWorld(world));
  advanceUntil(world,()=>equippedWeapon(world,pawn)?.id===weapon.id,600);stepWorld(equipResume,world.tick-equipResume.tick);expect(equipResume).toEqual(world);
  expect(weapon.weapon).toEqual(state);expect(equipmentInspectionView(world,pawn).primary).toContain('Lanceur EMP');expect(validateWorld(world)).toEqual([]);
  requireCommand(world,{type:'order-equipment',pawnId:pawn.id,itemId:weapon.id,action:'drop',queue:false});advanceUntil(world,()=>weapon.owner.type==='ground',100);
  expect(weapon.weapon).toMatchObject(state!);expect(world.piles.filter(p=>p.item==='emp-launcher')).toHaveLength(1);expect(validateWorld(world)).toEqual([]);
});

test('EMP presentation and physical properties are distinct while keeping shared weapon ownership',()=>{
  const {world,pawn}=prepared(),visual=weaponVisual('emp-launcher')!;
  expect(visual.parts).not.toEqual(weaponVisual('bolt-action-rifle')!.parts);
  expect(new Set(WEAPON_VISUALS.map(v=>v.cargo)).size).toBe(WEAPON_VISUALS.length);expect(new Set(WEAPON_VISUALS.map(v=>v.dye)).size).toBe(WEAPON_VISUALS.length);
  expect(commercialItemMassGrams('emp-launcher')).toBe(3400);expect(pileFlammability({kind:'weapon',item:'emp-launcher'})).toBe(.5);
  const weapon={id:world.nextId++,kind:'weapon' as const,item:'emp-launcher' as const,quantity:1,owner:{type:'equipment' as const,pawnId:pawn.id},weapon:{quality:'excellent' as const,hitPoints:73}};world.piles.push(weapon);
  expect(equipmentInspectionView(world,pawn).primary).toContain('73/100 PV');
  const info=itemInformation(weapon);expect(info.title).toBe('Lanceur EMP');expect(info.rows.some(row=>row.value==='Impulsion EMP')).toBe(true);
});
