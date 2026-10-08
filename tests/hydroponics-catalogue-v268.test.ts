import { expect,test } from 'vitest';
import { footprintCells,footprintContains,JOB_DURATION,STRUCTURE_DEFINITIONS } from '../src/sim/definitions.ts';
import { constructionRecipe,constructionSkillRequired,validConstructionMaterial } from '../src/sim/construction-materials.ts';
import { occupancyOf } from '../src/sim/occupancy.ts';
import { isElectrical,isPowerTrader,isFlickable,powerDemand,newPowerState } from '../src/sim/power-rules.ts';
import { isPowerConnector } from '../src/sim/power-grid.ts';
import { structureMaxHp,structureFlammability,structureLeavesResources } from '../src/sim/thing-damage-rules.ts';
import { HYDROPONICS_RESEARCH_COST,RESEARCH_SCALE,hydroponicsUnlocked,projectProgress,researchCost,researchPrerequisite,selectResearch } from '../src/sim/research.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';
import type { Orientation,Structure } from '../src/sim/types.ts';

test('hydroponics uses the pinned Core construction, damage and power catalogue',()=>{
  const basin:Structure={id:1,kind:'hydroponics-basin',x:5,z:5,orientation:0,footprint:'standard',material:'steel',power:newPowerState('hydroponics-basin')};
  expect(STRUCTURE_DEFINITIONS[basin.kind]).toMatchObject({width:1,depth:4,blocksMovement:false});
  expect(constructionRecipe(basin)).toEqual({ingredients:[{item:'steel',quantity:100},{item:'component',quantity:1}],work:280,coreWork:2800});
  expect(JOB_DURATION[basin.kind]).toBe(280);expect(constructionSkillRequired(basin.kind)).toBe(4);
  expect(structureMaxHp(basin)).toBe(180);expect(structureFlammability(basin)).toBe(.5);expect(structureLeavesResources(basin)).toBe(true);
  expect(powerDemand(basin)).toBe(70);
  for(const guard of [isElectrical,isPowerTrader,isFlickable,isPowerConnector])expect(guard(basin.kind)).toBe(true);
  expect(occupancyOf(basin.kind)).toEqual({clearItems:true,items:false,zones:false,store:false});
});

test('each basin orientation has exactly four cells and point queries match those cells',()=>{
  const directions=[[0,1],[1,0],[0,-1],[-1,0]] as const;
  for(const orientation of [0,1,2,3] as Orientation[]){
    const b:Structure={id:1,kind:'hydroponics-basin',x:5,z:5,orientation,footprint:'standard',material:'steel'};
    const [dx,dz]=directions[orientation]!,expected=[0,1,2,3].map(a=>({x:5+dx*a,z:5+dz*a}));
    expect(footprintCells(b)).toEqual(expected);
    for(let z=1;z<10;z++)for(let x=1;x<10;x++)expect(footprintContains(b,{x,z})).toBe(expected.some(c=>c.x===x&&c.z===z));
  }
});

test('hydroponics material and research are prospective and have no invented electrical prerequisite',()=>{
  expect(validConstructionMaterial('hydroponics-basin','steel',203)).toBe(true);
  for(const material of [undefined,'wood','granite-blocks','cloth'])expect(validConstructionMaterial('hydroponics-basin',material,203)).toBe(false);
  expect(validConstructionMaterial('hydroponics-basin','steel',202)).toBe(false);
  const w=deconstructionCamp(0,24);delete w.research;
  expect(researchPrerequisite(w,'hydroponics')).toBeUndefined();
  expect(HYDROPONICS_RESEARCH_COST).toBe(700*RESEARCH_SCALE);expect(researchCost('hydroponics')).toBe(HYDROPONICS_RESEARCH_COST);
  expect(selectResearch(w,'hydroponics').ok).toBe(true);
  expect(projectProgress(w.research!,'hydroponics')).toEqual({points:0});expect(hydroponicsUnlocked(w)).toBe(false);
});
