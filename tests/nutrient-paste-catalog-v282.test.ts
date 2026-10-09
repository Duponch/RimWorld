import { expect,test } from 'vitest';
import { footprintCells,footprintContains,STRUCTURE_DEFINITIONS } from '../src/sim/definitions.ts';
import { constructionRecipe,constructionSkillRequired,validConstructionMaterial } from '../src/sim/construction-materials.ts';
import { pasteSpot } from '../src/sim/nutrient-paste.ts';
import { nutrientPasteUnlocked,NUTRIENT_PASTE_RESEARCH_COST,researchCost,RESEARCH_SCALE } from '../src/sim/research.ts';
import { FURNITURE_TRAVEL } from '../src/sim/furniture-travel.ts';
import { OCCUPANCY } from '../src/sim/occupancy.ts';
import { minifiable } from '../src/sim/furniture-rules.ts';
import { empStructureSupported } from '../src/sim/emp-state.ts';
import { powerDemand,isPowerTrader,isFlickable } from '../src/sim/power-rules.ts';
import { structureMaxHp,structureFlammability,pileMaxHp } from '../src/sim/thing-damage-rules.ts';
import { STRUCTURE_SHOT_FILL } from '../src/sim/combat-content.ts';
import { ITEM_DEFINITIONS } from '../src/sim/items.ts';
import { ROT_DAYS } from '../src/sim/food-preservation.ts';
import { tradeCatalogueEntry } from '../src/sim/trade-catalogue.ts';
import { commercialItemMassGrams } from '../src/sim/commercial-mass.ts';
import { rememberIngestionAt } from '../src/sim/wellbeing.ts';
import { medicalCamp } from './scenarios/health.ts';
import type { Structure } from '../src/sim/types.ts';

test.each(['nutrient-paste-dispenser','hopper'] as const)('%s fixed recipe and physical catalogue',kind=>{
 const dispenser=kind==='nutrient-paste-dispenser';
 expect(constructionRecipe({kind,material:'steel'})).toEqual({ingredients:[{item:'steel',quantity:dispenser?125:15},...(dispenser?[{item:'component',quantity:3}]:[])],coreWork:dispenser?2200:300,work:dispenser?220:30});
 expect(constructionSkillRequired(kind)).toBe(dispenser?5:0);expect(structureMaxHp({kind})).toBe(dispenser?350:100);expect(structureFlammability({kind})).toBe(.5);
 expect(STRUCTURE_SHOT_FILL[kind]).toBe(dispenser?1:.5);expect(minifiable(kind)).toBe(false);expect(empStructureSupported(kind)).toBe(false);
 expect(validConstructionMaterial(kind,'steel',217)).toBe(true);expect(validConstructionMaterial(kind,'steel',216)).toBe(false);expect(validConstructionMaterial(kind,'wood',217)).toBe(false);
 expect(isPowerTrader(kind)).toBe(dispenser);expect(isFlickable(kind)).toBe(dispenser);expect(powerDemand({kind} as Structure)).toBe(dispenser?200:0);
});
test('four rotations keep twelve physical cells and their outside interaction',()=>{
 expect(STRUCTURE_DEFINITIONS['nutrient-paste-dispenser']).toMatchObject({width:3,depth:4,blocksMovement:true});
 for(const orientation of [0,1,2,3] as const){const s={kind:'nutrient-paste-dispenser',x:10,z:10,orientation} as Structure,cells=footprintCells(s);expect(cells).toHaveLength(12);expect(new Set(cells.map(c=>`${c.x},${c.z}`)).size).toBe(12);expect(footprintContains(s,pasteSpot(s))).toBe(false);for(let x=7;x<=13;x++)for(let z=7;z<=13;z++)expect(footprintContains(s,{x,z})).toBe(cells.some(c=>c.x===x&&c.z===z));}
 expect(OCCUPANCY.hopper).toEqual({clearItems:false,items:true,zones:false,store:false});expect(FURNITURE_TRAVEL.hopper.delay).toBe(4.2);
});
test('the adapted project and ordinary real meal use exact delivered values',()=>{
 expect(NUTRIENT_PASTE_RESEARCH_COST).toBe(400*RESEARCH_SCALE);expect(researchCost('nutrient-paste')).toBe(NUTRIENT_PASTE_RESEARCH_COST);
 const w=medicalCamp();expect(nutrientPasteUnlocked(w)).toBe(false);w.research??={points:0,project:null};w.research.nutrientPaste={points:NUTRIENT_PASTE_RESEARCH_COST,completedAt:w.tick};expect(nutrientPasteUnlocked(w)).toBe(true);
 expect(ITEM_DEFINITIONS['nutrient-paste-meal']).toMatchObject({kind:'food',nutrition:90,stackLimit:10,maxIngest:1});expect(ROT_DAYS['nutrient-paste-meal']*6000).toBe(4500);expect(commercialItemMassGrams('nutrient-paste-meal')).toBe(440);expect(tradeCatalogueEntry('nutrient-paste-meal')).toMatchObject({baseMarketValue:10,playerCanSell:false});expect(pileMaxHp({kind:'food',item:'nutrient-paste-meal'} as never)).toBe(50);
});
test('paste taste refreshes once and coexists with table and prior good taste',()=>{
 const p=medicalCamp().pawns[0]!;p.memories=[];rememberIngestionAt(p,100,{food:'fine-meal'});rememberIngestionAt(p,101,{food:'nutrient-paste-meal',atTable:false});rememberIngestionAt(p,102,{food:'nutrient-paste-meal'});
 expect(p.memories).toEqual([{kind:'ate-fine-meal',expiresAt:6100},{kind:'ate-without-table',expiresAt:6101},{kind:'ate-nutrient-paste',expiresAt:6102}]);
});
