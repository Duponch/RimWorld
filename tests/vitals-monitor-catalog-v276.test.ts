import {expect,test} from 'vitest';
import {applyCommand,canDesignate,stepWorld} from '../src/sim/engine.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {JOB_DURATION,JOB_WOOD_COST,STRUCTURE_DEFINITIONS,footprintCells} from '../src/sim/definitions.ts';
import {constructionRecipe,constructionSkillRequired,validConstructionMaterial} from '../src/sim/construction-materials.ts';
import {minifiable} from '../src/sim/furniture-rules.ts';
import {FURNITURE_TRAVEL} from '../src/sim/furniture-travel.ts';
import {isElectrical,isFlickable,isPowerTrader,newPowerState,powerDemand} from '../src/sim/power-rules.ts';
import {isPowerConnector} from '../src/sim/power-grid.ts';
import {isRainElectricalKind} from '../src/sim/rain-electric.ts';
import {breakdownEligible} from '../src/sim/breakdowns.ts';
import {structureFlammability,structureMaxHp} from '../src/sim/thing-damage-rules.ts';
import {OCCUPANCY} from '../src/sim/occupancy.ts';
import {STERILE_MATERIALS_RESEARCH_COST,VITALS_MONITOR_RESEARCH_COST,RESEARCH_SCALE,researchCost,selectResearch,researchStationUsable,projectProgress} from '../src/sim/research.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';

test('monitor designation respects research, all rotations and physical construction with exact frame continuation',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!,command={type:'designate' as const,kind:'vitals-monitor' as const,x:16,z:16};
  const before=JSON.stringify(w);expect(applyCommand(w,command).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
  w.research={points:0,project:null,smithing:{points:700_000_000,completedAt:0},machining:{points:1_000_000_000,completedAt:0},complexFurniture:{points:300_000_000,completedAt:0},microelectronics:{points:3_000_000_000,completedAt:0},multiAnalyzer:{points:4_000_000_000,completedAt:0},hospitalBed:{points:1_200_000_000,completedAt:0},vitalsMonitor:{points:VITALS_MONITOR_RESEARCH_COST,completedAt:0}};
  for(const orientation of [0,1,2,3] as const)expect(canDesignate(w,{...command,orientation}).ok).toBe(true);
  p.skills.construction.level=12;addGroundMaterial(w,'steel',50,{x:12,z:16},'steel');addGroundMaterial(w,'component',3,{x:12,z:17},'component');
  expect(applyCommand(w,{...command,orientation:2}).ok).toBe(true);expect(w.jobs[0]!.material).toBe('steel');
  for(let i=0;i<1000&&!w.jobs.some(j=>j.kind==='vitals-monitor'&&j.construction==='frame');i++)stepWorld(w);
  expect(w.jobs[0]!.construction).toBe('frame');const at=w.tick,copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<1000&&!w.structures.some(s=>s.kind==='vitals-monitor');i++)stepWorld(w);
  expect(w.structures.find(s=>s.kind==='vitals-monitor')).toMatchObject({material:'steel',orientation:2,power:{on:false,parentId:null}});
  stepWorld(copy,w.tick-at);expect(copy).toEqual(w);expect(w.piles).toEqual([]);expect(validateWorld(w)).toEqual([]);
});
import type {Orientation,Structure,World} from '../src/sim/types.ts';

test('Core monitor recipe, footprint, construction skill and fixed physical stats agree',()=>{
  expect(JOB_DURATION['vitals-monitor']).toBe(600);expect(JOB_WOOD_COST['vitals-monitor']).toBe(0);
  expect(constructionRecipe({kind:'vitals-monitor',material:'steel'})).toEqual({ingredients:[{item:'steel',quantity:50},{item:'component',quantity:3}],work:600,coreWork:6000});
  expect(constructionSkillRequired('vitals-monitor')).toBe(8);expect(STRUCTURE_DEFINITIONS['vitals-monitor'].blocksMovement).toBe(false);
  for(const orientation of [0,1,2,3] as Orientation[])expect(footprintCells({kind:'vitals-monitor',x:8,z:8,orientation,footprint:'standard'})).toEqual([{x:8,z:8}]);
  expect(validConstructionMaterial('vitals-monitor','steel',211)).toBe(true);
  for(const material of [undefined,'wood','silver','granite-blocks'])expect(validConstructionMaterial('vitals-monitor',material,211)).toBe(false);
  expect(validConstructionMaterial('vitals-monitor','steel',210)).toBe(false);
  expect(structureMaxHp({kind:'vitals-monitor',material:'steel'})).toBe(100);expect(structureFlammability({kind:'vitals-monitor',material:'steel'})).toBe(.7);
});

test('monitor is a switchable rain-sensitive 80W consumer and a minifiable pass-through object',()=>{
  const kind='vitals-monitor';for(const predicate of [isElectrical,isPowerTrader,isFlickable,isPowerConnector,isRainElectricalKind,minifiable])expect(predicate(kind)).toBe(true);
  const w=deconstructionCamp(0),s:Structure=fixtureBuilding(w,kind,8,8);Object.assign(s,{material:'steel',power:newPowerState(kind)});
  expect(powerDemand(s)).toBe(80);expect(s.power).toEqual({on:false,parentId:null});expect(breakdownEligible(s)).toBe(false);
  expect(FURNITURE_TRAVEL[kind]).toEqual({delay:.5,stand:false,repeat:true});
  expect(OCCUPANCY[kind]).toEqual({clearItems:false,items:true,zones:false,store:false});
});

test('two prospective research projects preserve their own costs and fail without changing old worlds',()=>{
  expect(researchCost('sterile-materials')).toBe(600*RESEARCH_SCALE);expect(researchCost('vitals-monitor')).toBe(2500*RESEARCH_SCALE);
  expect(STERILE_MATERIALS_RESEARCH_COST).toBe(600_000_000);expect(VITALS_MONITOR_RESEARCH_COST).toBe(2_500_000_000);
  const w=deconstructionCamp(0);w.schemaVersion=210 as World['schemaVersion'];const old=structuredClone(w);
  expect(selectResearch(w,'sterile-materials').ok).toBe(false);expect(selectResearch(w,'vitals-monitor').ok).toBe(false);expect(w).toEqual(old);
  w.schemaVersion=211 as World['schemaVersion'];expect(selectResearch(w,'sterile-materials').ok).toBe(true);
  expect(projectProgress(w.research!,'sterile-materials')).toEqual({points:0});expect(w.research?.vitalsMonitor).toBeUndefined();
});

test('monitor selection and work require the real advanced bench and linked powered analyzer',()=>{
  const w=deconstructionCamp(0);w.research={project:null,points:0,hospitalBed:{points:1_200_000_000,completedAt:0},multiAnalyzer:{points:4_000_000_000,completedAt:0}};
  const before=structuredClone(w);expect(selectResearch(w,'vitals-monitor').ok).toBe(false);expect(w).toEqual(before);
  const bench:Structure=fixtureBuilding(w,'hi-tech-research-bench',12,12),analyzer:Structure=fixtureBuilding(w,'multi-analyzer',16,12);
  Object.assign(bench,{material:'steel',power:{on:true,parentId:null}});Object.assign(analyzer,{material:'steel',power:{on:true,parentId:null}});
  expect(researchStationUsable(w,bench,'vitals-monitor',analyzer.id)).toBe(true);expect(selectResearch(w,'vitals-monitor').ok).toBe(true);
  analyzer.power!.on=false;expect(researchStationUsable(w,bench,'vitals-monitor',analyzer.id)).toBe(false);
  analyzer.power!.on=true;Object.assign(analyzer,{x:27,z:27});expect(researchStationUsable(w,bench,'vitals-monitor',analyzer.id)).toBe(false);
  const simple=fixtureBuilding(w,'research-bench',4,4);expect(researchStationUsable(w,simple,'vitals-monitor')).toBe(false);
});
