import { expect,test } from 'vitest';
import { JOB_DURATION,JOB_WOOD_COST,STRUCTURE_DEFINITIONS,footprintCells,footprintContains } from '../src/sim/definitions.ts';
import { constructionRecipe,constructionSkillRequired,validConstructionMaterial } from '../src/sim/construction-materials.ts';
import { minifiable } from '../src/sim/furniture-rules.ts';
import { FURNITURE_TRAVEL } from '../src/sim/furniture-travel.ts';
import { OCCUPANCY } from '../src/sim/occupancy.ts';
import { isElectrical,isFlickable,isPowerTrader,newPowerState,powerDemand,powerWatts } from '../src/sim/power-rules.ts';
import { isPowerConnector } from '../src/sim/power-grid.ts';
import { breakdownEligible,canBreakdownNow } from '../src/sim/breakdowns.ts';
import { empStructureSupported } from '../src/sim/emp-state.ts';
import { isRainElectricalKind } from '../src/sim/rain-electric.ts';
import { structureFlammability,structureLeavesResources,structureMaxHp } from '../src/sim/thing-damage-rules.ts';
import { structureRoomMarketValue } from '../src/sim/room-market-value.ts';
import { STRUCTURE_SHOT_FILL } from '../src/sim/combat-content.ts';
import { validOrbitalTransport } from '../src/sim/orbital-save.ts';
import { orbitalConsoleSpot } from '../src/sim/orbital-rules.ts';
import { orbitalCamp } from './helpers/orbital-v281.ts';

test.each(['orbital-beacon','comms-console'] as const)('%s uses fixed Core ingredients, work, skill and HP',kind=>{
  const beacon=kind==='orbital-beacon';
  expect(constructionRecipe({kind,material:'steel'})).toEqual({ingredients:[{item:'steel',quantity:beacon?40:120},{item:'component',quantity:beacon?1:4}],work:beacon?80:220,coreWork:beacon?800:2200});
  expect(JOB_DURATION[kind]).toBe(beacon?80:220);expect(JOB_WOOD_COST[kind]).toBe(0);expect(constructionSkillRequired(kind)).toBe(beacon?0:5);
  expect(validConstructionMaterial(kind,'steel',216)).toBe(true);expect(validConstructionMaterial(kind,'steel',215)).toBe(false);
  for(const material of [undefined,'wood','gold','granite-blocks'])expect(validConstructionMaterial(kind,material)).toBe(false);
  expect(structureMaxHp({kind})).toBe(beacon?75:250);expect(structureFlammability({kind})).toBe(beacon?.5:.6);
  expect(structureLeavesResources({kind})).toBe(!beacon);expect(STRUCTURE_SHOT_FILL[kind]).toBe(beacon?.15:.5);
  const {world}=orbitalCamp(),s=world.structures.find(s=>s.kind===kind)!;
  expect(structureRoomMarketValue(s)).toBe(beacon?110.88:365);
});

test('the six console cells rotate around their anchor and contact stays outside its footprint',()=>{
  expect(STRUCTURE_DEFINITIONS['comms-console']).toMatchObject({width:3,depth:2,blocksMovement:false});
  for(const orientation of [0,1,2,3] as const){
    const {world,consoleId}=orbitalCamp(),s=world.structures.find(s=>s.id===consoleId)!;s.orientation=orientation;
    const cells=footprintCells(s),spot=orbitalConsoleSpot(s);expect(cells).toHaveLength(6);
    expect(new Set(cells.map(c=>c.z*world.width+c.x)).size).toBe(6);expect(footprintContains(s,spot)).toBe(false);
    for(let z=s.z-3;z<=s.z+3;z++)for(let x=s.x-3;x<=s.x+3;x++)expect(footprintContains(s,{x,z})).toBe(cells.some(c=>c.x===x&&c.z===z));
    expect(footprintCells({...s,kind:'deconstruct',deconstruction:{kind:s.kind}})).toEqual(cells);
    expect(validOrbitalTransport(world,216)).toBe(true);
  }
  expect(footprintCells({kind:'orbital-beacon',x:1,z:1,orientation:0})).toEqual([{x:1,z:1}]);
});

test('the beacon remains a movable stock surface; console is fixed and both use physical navigation costs',()=>{
  expect(minifiable('orbital-beacon')).toBe(true);expect(minifiable('comms-console')).toBe(false);
  expect(OCCUPANCY['orbital-beacon']).toEqual({clearItems:false,items:true,zones:true,store:true});
  expect(OCCUPANCY['comms-console']).toEqual({clearItems:false,items:true,zones:false,store:false});
  expect(FURNITURE_TRAVEL['orbital-beacon']).toEqual({delay:1.4,stand:false,repeat:false});
  expect(FURNITURE_TRAVEL['comms-console']).toEqual({delay:5,stand:false,repeat:true});
});

test('both consumers switch and break; only console short-circuits in rain and neither receives EMP',()=>{
  const {world}=orbitalCamp();
  for(const kind of ['orbital-beacon','comms-console'] as const){
    for(const predicate of [isElectrical,isFlickable,isPowerTrader,isPowerConnector])expect(predicate(kind)).toBe(true);
    const s=world.structures.find(s=>s.kind===kind)!;expect(powerDemand(s)).toBe(kind==='orbital-beacon'?40:200);
    expect(powerWatts(s,world)).toBe(-powerDemand(s));expect(breakdownEligible(s)).toBe(true);expect(canBreakdownNow(s)).toBe(true);
    s.power!.switchOn=false;expect(powerWatts(s,world)).toBe(0);expect(canBreakdownNow(s)).toBe(false);
    s.power=newPowerState(kind);expect(s.power).toEqual({on:false,parentId:null});expect(powerWatts(s,world)).toBe(0);
    expect(empStructureSupported(kind)).toBe(false);expect(isRainElectricalKind(kind)).toBe(kind==='comms-console');
  }
});

test('the common boundary rejects orbital devices without completed Microelectronics and packed consoles',()=>{
  const {world}=orbitalCamp();expect(validOrbitalTransport(world,216)).toBe(true);
  delete world.research!.microelectronics;expect(validOrbitalTransport(world,216)).toBe(false);
  const packed=orbitalCamp(),console=packed.world.structures.find(s=>s.id===packed.consoleId)!;
  packed.world.structures=packed.world.structures.filter(s=>s!==console);console.power={on:false,parentId:null};
  packed.world.packed.push({building:console,owner:{type:'ground',x:8,z:8}});expect(validOrbitalTransport(packed.world,216)).toBe(false);
});
