import {expect,test} from 'vitest';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld,addGroundMaterial} from '../src/sim/index.ts';
import {constructionRecipe,validConstructionMaterial,constructionSkillRequired} from '../src/sim/construction-materials.ts';
import {footprintCells,footprintContains,STRUCTURE_DEFINITIONS} from '../src/sim/definitions.ts';
import {groundOccupancyAllows,storageOccupancyAllows} from '../src/sim/occupancy.ts';
import {minifiable} from '../src/sim/furniture-rules.ts';
import {powerDemand,isElectrical,isFlickable} from '../src/sim/power-rules.ts';
import {structureMaxHp} from '../src/sim/thing-damage-rules.ts';
import {lightSources} from '../src/sim/light-sources.ts';
import {blockedCells,cellIndex} from '../src/sim/pathfinding.ts';
import {RoomTopologyCache} from '../src/sim/room-topology.ts';
import {cookingSpot} from '../src/sim/cooking-bills.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {ITEM_DEFINITIONS} from '../src/sim/items.ts';
import type {Structure} from '../src/sim/types.ts';

test.each([0,1,2,3] as const)('solid six-cell crematorium has an external service edge, item surface and no storage zone, orientation %i',orientation=>{
  const w=deconstructionCamp(),s:Structure={...fixtureBuilding(w,'electric-crematorium',16,16,orientation),material:'granite-blocks',power:{on:true,parentId:null},bills:[]};w.structures=[s];
  expect(STRUCTURE_DEFINITIONS[s.kind].blocksMovement).toBe(true);const cells=footprintCells(s);expect(cells).toHaveLength(6);
  const blocked=blockedCells(w),rooms=new RoomTopologyCache().read(w);
  for(const c of cells){expect(footprintContains(s,c)).toBe(true);expect(groundOccupancyAllows(w,c)).toBe(true);expect(storageOccupancyAllows(w,c)).toBe(false);expect(blocked[cellIndex(w,c.x,c.z)]).toBe(1);expect(rooms.at(c.x,c.z)?.kind).toBe('solid');}
  expect(footprintContains(s,cookingSpot(s))).toBe(false);expect(minifiable(s.kind)).toBe(false);
  expect(isElectrical(s.kind)&&isFlickable(s.kind)).toBe(true);expect(powerDemand(s)).toBe(250);expect(structureMaxHp(s)).toBe(510);
  expect(lightSources(w)).toEqual([{cell:s.z*w.width+s.x,radius:6,red:217,green:112,blue:33}]);s.power!.on=false;expect(lightSources(w)).toEqual([]);
  expect(applyCommand(w,{type:'designate',kind:'uninstall',x:s.x,z:s.z}).ok).toBe(false);
  expect(applyCommand(w,{type:'install',structureId:s.id,x:23,z:23,orientation:0}).ok).toBe(false);
});

test('only five real stone materials are accepted prospectively, with stone work factor and fixed machinery ingredients',()=>{
  for(const material of ['granite-blocks','limestone-blocks','marble-blocks','sandstone-blocks','slate-blocks'] as const){expect(validConstructionMaterial('electric-crematorium',material)).toBe(true);expect(validConstructionMaterial('electric-crematorium',material,224)).toBe(false);expect(constructionRecipe({kind:'electric-crematorium',material}).ingredients).toEqual([{item:material,quantity:150},{item:'steel',quantity:20},{item:'component',quantity:2}]);}
  for(const material of ['wood','steel','cloth','light-leather',undefined])expect(validConstructionMaterial('electric-crematorium',material)).toBe(false);
  expect(constructionRecipe({kind:'electric-crematorium',material:'granite-blocks'})).toMatchObject({coreWork:27140,work:2714});expect(constructionSkillRequired('electric-crematorium')).toBe(4);
});

test('construction consumes physical ingredients, keeps an unfinished checkpoint exact and creates a bill-capable powered machine',()=>{
  const w=deconstructionCamp(2);for(const [item,amount] of [['granite-blocks',150],['steel',20],['component',2]] as const)addGroundMaterial(w,ITEM_DEFINITIONS[item].kind,amount,{x:12,z:16},item);
  expect(applyCommand(w,{type:'designate',kind:'electric-crematorium',material:'granite-blocks',x:17,z:18}).ok).toBe(true);
  const job=w.jobs[0]!;for(let n=0;n<1000&&job.progress===0;n++)stepWorld(w);expect(job.progress).toBeGreaterThan(0);expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w));for(let n=0;n<5000&&w.jobs.some(j=>j.id===job.id);n++)stepWorld(w);
  stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
  expect(w.structures).toHaveLength(1);expect(w.structures[0]).toMatchObject({kind:'electric-crematorium',material:'granite-blocks',bills:[],power:{on:false,parentId:null}});
  expect(w.piles.filter(p=>['granite-blocks','steel','component'].includes(p.item))).toHaveLength(0);
});
