import {expect,test} from 'vitest';
import {JOB_DURATION,JOB_WOOD_COST,STRUCTURE_DEFINITIONS,footprintCells,footprintContains} from '../src/sim/definitions.ts';
import {constructionRecipe,constructionSkillRequired,validConstructionMaterial} from '../src/sim/construction-materials.ts';
import {furnitureDuration,minifiable} from '../src/sim/furniture-rules.ts';
import {FURNITURE_TRAVEL} from '../src/sim/furniture-travel.ts';
import {isElectrical,isFlickable,isPowerTrader,newPowerState,powerDemand,powerWatts} from '../src/sim/power-rules.ts';
import {isPowerConnector} from '../src/sim/power-grid.ts';
import {breakdownEligible,canBreakdownNow} from '../src/sim/breakdowns.ts';
import {empStructureSupported} from '../src/sim/emp-state.ts';
import {structureFlammability,structureLeavesResources,structureMaxHp} from '../src/sim/thing-damage-rules.ts';
import {structureBeauty} from '../src/sim/room-beauty.ts';
import {structureRoomMarketValue} from '../src/sim/room-market-value.ts';
import {OCCUPANCY} from '../src/sim/occupancy.ts';
import {DEEP_DRILLING_RESEARCH_COST,GROUND_SCANNER_RESEARCH_COST,RESEARCH_SCALE,deepDrillingUnlocked,groundScannerUnlocked,needsHighTechBench,projectProgress,researchCost,researchPrerequisite,researchStationUsable,selectResearch} from '../src/sim/research.ts';
import {validDeepResearchTransport,validateResearch} from '../src/sim/research-save.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import type {Job,Structure,World} from '../src/sim/types.ts';

function researched(){
  const w=deconstructionCamp(0);w.schemaVersion=215 as World['schemaVersion'];
  w.research={project:null,points:0,microelectronics:{points:3_000_000_000,completedAt:0},deepDrilling:{points:DEEP_DRILLING_RESEARCH_COST,completedAt:0},groundScanner:{points:GROUND_SCANNER_RESEARCH_COST,completedAt:0}};
  return w;
}

test.each(['deep-drill','ground-scanner'] as const)('%s Core construction recipe, skill, fixed HP and future gate agree',kind=>{
  const drill=kind==='deep-drill';
  expect(constructionRecipe({kind,material:'steel'})).toEqual({ingredients:drill?[{item:'steel',quantity:100},{item:'component',quantity:2}]:[{item:'steel',quantity:150},{item:'component',quantity:4},{item:'advanced-component',quantity:1}],work:drill?1000:1200,coreWork:drill?10000:12000});
  expect(JOB_DURATION[kind]).toBe(drill?1000:1200);expect(JOB_WOOD_COST[kind]).toBe(0);expect(constructionSkillRequired(kind)).toBe(drill?4:8);
  expect(validConstructionMaterial(kind,'steel',215)).toBe(true);expect(validConstructionMaterial(kind,'steel',214)).toBe(false);
  for(const material of [undefined,'wood','silver','granite-blocks'])expect(validConstructionMaterial(kind,material,215)).toBe(false);
  expect(structureMaxHp({kind,material:'steel'})).toBe(drill?300:200);expect(structureFlammability({kind,material:'steel'})).toBe(.5);
  expect(structureLeavesResources({kind})).toBe(drill);expect(structureBeauty({kind,material:'steel',x:0,z:0})).toBe(drill?-25:-8);
  const w=researched(),s:Structure=fixtureBuilding(w,kind,12,12);s.material='steel';expect(structureRoomMarketValue(s)).toBe(drill?290:655);
});

test('scanner occupies all nine centered cells for every rotation and derived job, while drill stays one cell',()=>{
  for(const orientation of [0,1,2,3] as const){
    const scanner={kind:'ground-scanner' as const,x:12,z:12,orientation,footprint:'standard' as const},cells=footprintCells(scanner);
    expect(STRUCTURE_DEFINITIONS['ground-scanner']).toMatchObject({width:3,depth:3,blocksMovement:false});
    expect(cells.length).toBe(9);expect(new Set(cells.map(c=>c.z*32+c.x)).size).toBe(9);
    for(let z=10;z<=14;z++)for(let x=10;x<=14;x++)expect(footprintContains(scanner,{x,z})).toBe(Math.abs(x-12)<=1&&Math.abs(z-12)<=1);
    expect(footprintCells({...scanner,kind:'fix-breakdown',fixBreakdown:{kind:'ground-scanner'}})).toEqual(cells);
    expect(footprintCells({...scanner,kind:'deconstruct',deconstruction:{kind:'ground-scanner'}})).toEqual(cells);
    expect(footprintCells({...scanner,kind:'deep-drill'})).toEqual([{x:12,z:12}]);
  }
});

test('drill can be moved with its Core uninstall work; scanner is fixed and old furniture timing is literal',()=>{
  const w=researched(),drill=fixtureBuilding(w,'deep-drill',12,12),bench=fixtureBuilding(w,'research-bench',18,12);
  const job=(s:Structure):Job=>({id:w.nextId++,kind:'uninstall',furniture:{structureId:s.id,kind:s.kind},x:s.x,z:s.z,orientation:s.orientation,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}});
  expect(minifiable('deep-drill')).toBe(true);expect(minifiable('ground-scanner')).toBe(false);
  expect(furnitureDuration(w,job(drill))).toBe(Math.ceil(1800/17));expect(furnitureDuration(w,job(bench))).toBe(Math.ceil(200/17));
  for(const kind of ['deep-drill','ground-scanner'] as const){
    expect(FURNITURE_TRAVEL[kind]).toEqual({delay:5,stand:false,repeat:true});
    expect(OCCUPANCY[kind]).toEqual({clearItems:false,items:true,zones:false,store:false});
  }
});

test('200W and 700W are real switchable consumers; only Core scanner can break and neither gains EMP authority',()=>{
  const w=researched();
  for(const kind of ['deep-drill','ground-scanner'] as const){
    for(const predicate of [isElectrical,isPowerTrader,isFlickable,isPowerConnector])expect(predicate(kind)).toBe(true);
    const s:Structure=fixtureBuilding(w,kind,12,12);s.power=newPowerState(kind);expect(s.power).toEqual({on:false,parentId:null});
    expect(powerDemand(s)).toBe(kind==='deep-drill'?200:700);expect(powerWatts(s,w)).toBe(0);
    s.power.on=true;expect(powerWatts(s,w)).toBe(kind==='deep-drill'?-200:-700);
    expect(breakdownEligible(s)).toBe(kind==='ground-scanner');expect(canBreakdownNow(s)).toBe(kind==='ground-scanner');
    s.power.switchOn=false;expect(powerWatts(s,w)).toBe(0);expect(canBreakdownNow(s)).toBe(false);
    delete s.power.switchOn;s.breakdown={brokenAt:w.tick};expect(powerWatts(s,w)).toBe(0);
    expect(empStructureSupported(kind)).toBe(false);
  }
});

test('two 1000-point research projects have ordered prerequisites and prospective atomic selection',()=>{
  const w=deconstructionCamp(0);w.schemaVersion=214 as World['schemaVersion'];const before=structuredClone(w);
  for(const project of ['deep-drilling','ground-scanner'] as const){expect(researchCost(project)).toBe(1000*RESEARCH_SCALE);expect(selectResearch(w,project).ok).toBe(false);expect(w).toEqual(before);}
  w.schemaVersion=215 as World['schemaVersion'];expect(researchPrerequisite(w,'deep-drilling')).toBe('Microélectronique');expect(selectResearch(w,'deep-drilling').ok).toBe(false);
  w.research={project:null,points:0,microelectronics:{points:3_000_000_000,completedAt:0}};
  expect(selectResearch(w,'deep-drilling').ok).toBe(true);expect(projectProgress(w.research,'deep-drilling')).toEqual({points:0});expect(deepDrillingUnlocked(w)).toBe(false);
  expect(selectResearch(w,'ground-scanner').ok).toBe(false);
  w.research.deepDrilling={points:DEEP_DRILLING_RESEARCH_COST,completedAt:w.tick};expect(selectResearch(w,'ground-scanner').ok).toBe(true);
  expect(projectProgress(w.research,'ground-scanner')).toEqual({points:0});expect(deepDrillingUnlocked(w)).toBe(true);expect(groundScannerUnlocked(w)).toBe(false);
});

test('both projects work only on an actually powered advanced desk without requiring an analyzer',()=>{
  const w=researched(),advanced:Structure=fixtureBuilding(w,'hi-tech-research-bench',12,12),simple=fixtureBuilding(w,'research-bench',20,20);
  advanced.power={on:true,parentId:null};
  for(const project of ['deep-drilling','ground-scanner'] as const){
    expect(needsHighTechBench(project)).toBe(true);expect(researchStationUsable(w,simple,project)).toBe(false);
    expect(researchStationUsable(w,advanced,project)).toBe(true);
    advanced.power.on=false;expect(researchStationUsable(w,advanced,project)).toBe(false);advanced.power.on=true;
  }
});

test('shared research guard refuses missing prerequisites, forged progress, future content and packed scanners',()=>{
  const clean=researched();expect(validDeepResearchTransport(clean,215)).toBe(true);expect(validateResearch(clean,215)).toEqual([]);
  for(const mutate of [(w:World)=>{delete w.research!.microelectronics;},
    (w:World)=>{delete w.research!.deepDrilling;},
    (w:World)=>{w.research!.deepDrilling!.points--;},
    (w:World)=>{w.research!.groundScanner!.completedAt=w.tick+1;},
    (w:World)=>{w.schemaVersion=214 as World['schemaVersion'];},
    (w:World)=>{const s=fixtureBuilding(w,'ground-scanner',12,12);w.structures=w.structures.filter(b=>b!==s);w.packed.push({building:s,owner:{type:'ground',x:12,z:12}});}]){
    const w=researched();mutate(w);expect(validDeepResearchTransport(w,w.schemaVersion)).toBe(false);expect(validateResearch(w,w.schemaVersion).length).toBeGreaterThan(0);
  }
  const locked=researched();delete locked.research!.groundScanner;fixtureBuilding(locked,'ground-scanner',12,12);expect(validDeepResearchTransport(locked,215)).toBe(false);
  const missing=researched();delete missing.research!.deepDrilling;delete missing.research!.groundScanner;fixtureBuilding(missing,'deep-drill',12,12);expect(validDeepResearchTransport(missing,215)).toBe(false);
});
