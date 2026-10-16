import {initializeSnowSurface} from '../src/sim/snow-surface';
import { expect,test } from 'vitest';
import { canDesignate } from '../src/sim/engine';
import { isBuildableFloor } from '../src/sim/flooring';
import { projectProgress,researchCost,type ResearchProject } from '../src/sim/research';
import type { DesignateCommand,JobKind,World } from '../src/sim/types';
import { architectAvailabilityKey,architectToolAvailable } from '../src/ui/architect-availability';
import { placementMaterial } from '../src/ui/construction-controls';
import { toolDefinitions,type Tool } from '../src/ui/layout';
import { researchProjects } from '../src/ui/research-projects';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction';

const constructionTools=toolDefinitions.filter(tool=>tool.category!=='orders'&&tool.category!=='zones');

function complete(world:World,project:ResearchProject,at=0):void {
  world.research??={project:null,points:0};
  Object.assign(projectProgress(world.research,project),{points:researchCost(project),completedAt:at});
}
function camp(allResearch=false):World {
  const world=deconstructionCamp(0);world.research={project:null,points:0};
  if(world.roofing)world.roofing.constructed=[];
  if(allResearch)for(const project of researchProjects)complete(world,project.id);
  return world;
}
/** A fresh empty site per query. Hopper is physically adjacent to its real
 * dispenser; removing a floor starts with an existing wooden surface. */
function command(world:World,tool:Tool):DesignateCommand {
  world.structures=[];world.jobs=[];
  world.tiles[8*world.width+8]={terrain:'grass'};
  if(tool==='build-bridge'||tool==='remove-bridge')world.tiles[8*world.width+8]={terrain:'marsh',...(tool==='remove-bridge'?{bridge:true}:{})};
  if(tool==='hopper')Object.assign(fixtureBuilding(world,'nutrient-paste-dispenser',10,8),{material:'steel',power:{on:true,parentId:null}});
  if(tool==='remove-floor')world.tiles[8*world.width+8]!.floor='wood-planks';
  if(isBuildableFloor(tool))return {type:'designate',kind:'lay-floor',floor:tool,x:8,z:8,orientation:0};
  return {type:'designate',kind:tool as JobKind,x:8,z:8,orientation:0,
    ...(placementMaterial(tool,'wood')?{material:placementMaterial(tool,'wood')}:{})};
}
function engineAvailable(world:World,tool:Tool):boolean {
  return canDesignate(world,command(world,tool)).ok;
}
function freeze(value:unknown,seen=new WeakSet<object>()):void {
  if(!value||typeof value!=='object'||seen.has(value))return;
  seen.add(value);for(const child of Object.values(value))freeze(child,seen);Object.freeze(value);
}

test('V358 complete catalogue agrees with physical command research gates on admissible sites',()=>{
  expect(toolDefinitions).toHaveLength(101);
  const locked=camp(),known=camp(true),hidden:Tool[]=[];
  for(const tool of constructionTools){
    const initial=engineAvailable(locked,tool.id),completed=engineAvailable(known,tool.id);
    expect(completed,`${tool.id}: fixture must admit the unlocked command`).toBe(true);
    expect(architectToolAvailable(locked,tool.id),tool.id).toBe(initial);
    expect(architectToolAvailable(known,tool.id),tool.id).toBe(completed);
    if(!initial)hidden.push(tool.id);
  }
  expect(hidden).toHaveLength(39);expect(hidden).toContain('vent');
  expect(hidden).toEqual(constructionTools.filter(tool=>!architectToolAvailable(locked,tool.id)).map(tool=>tool.id));
});

test('V358 each completed project unlocks exactly its real construction commands, not its prerequisites',()=>{
  const locked=camp();
  for(const project of researchProjects){
    const known=camp();complete(known,project.id);
    for(const tool of constructionTools)
      expect(architectToolAvailable(known,tool.id),`${project.id} / ${tool.id}`).toBe(engineAvailable(known,tool.id));
    const changed=constructionTools.some(tool=>architectToolAvailable(known,tool.id)!==architectToolAvailable(locked,tool.id));
    expect(architectAvailabilityKey(known)!==architectAvailabilityKey(locked),project.id).toBe(changed);
  }
});

test('V358 selecting a project and accumulating its entire cost never unlocks it without completion',()=>{
  const world=camp(),key=architectAvailabilityKey(world),initial=toolDefinitions.map(tool=>architectToolAvailable(world,tool.id));
  for(const project of researchProjects){
    world.research!.project=project.id;
    Object.assign(projectProgress(world.research!,project.id),{points:researchCost(project.id)});
    expect(architectAvailabilityKey(world),project.id).toBe(key);
    expect(toolDefinitions.map(tool=>architectToolAvailable(world,tool.id)),project.id).toEqual(initial);
  }
});

test('V358 zero completion dates are real unlocks and date changes do not churn the catalogue key',()=>{
  const world=camp(),before=architectAvailabilityKey(world);complete(world,'complex-clothing',0);
  expect(architectToolAvailable(world,'tailor-bench')).toBe(true);
  expect(architectAvailabilityKey(world)).not.toBe(before);
  const key=architectAvailabilityKey(world);world.research!.completedAt=12345;
  expect(architectAvailabilityKey(world)).toBe(key);
  world.research!.project=null;world.research!.points++;
  expect(architectAvailabilityKey(world)).toBe(key);
});

test('V358 historical format boundaries agree with command and canonical-material admission',()=>{
  const world=camp(true);
  // Before and at every current construction-format boundary; these worlds
  // test pure admission, not adoption of impossible future records in a save.
  const epochs=[1,39,40,41,42,72,73,74,75,83,84,85,86,87,88,89,90,100,101,103,104,118,119,121,122,123,142,143,176,177,186,187,188,189,190,192,193,202,203,205,206,210,211,214,215,216,217,218,220,221,222,223,224,225,226,228,229,231,232,236,246,247,248,249];
  for(const schemaVersion of epochs){
    Object.assign(world,{schemaVersion});
    for(const tool of constructionTools)
      expect(architectToolAvailable(world,tool.id),`${schemaVersion} / ${tool.id}`).toBe(engineAvailable(world,tool.id));
  }
  const latest=architectAvailabilityKey(world);Object.assign(world,{schemaVersion:235});
  expect(architectAvailabilityKey(world)).not.toBe(latest);
});

test('V358 preserved adaptations and all order/zone tools remain available without research',()=>{
  const world=camp();
  for(const id of ['snow-clear','remove-snow-clear'] as const)expect(architectToolAvailable(world,id)).toBe(false);
  initializeSnowSurface(world);
  for(const id of ['bed','table','table-square','table-long','stool','stonecutter','research-bench','chemfuel-generator','electric-crematorium','electric-smelter'] as const)
    expect(architectToolAvailable(world,id),id).toBe(true);
  for(const tool of toolDefinitions.filter(tool=>tool.category==='orders'||tool.category==='zones'))
    expect(architectToolAvailable(world,tool.id),tool.id).toBe(true);
  for(const id of ['install','replant-tree','allowed-expand','allowed-shrink'] as const)
    expect(architectToolAvailable(world,id),id).toBe(true);
  expect(architectToolAvailable(world,'burned-wood' as Tool)).toBe(false);
});

test('V358 availability ignores terrain, stock, skills, roofs and physical neighbours',()=>{
  const world=camp(true),key=architectAvailabilityKey(world),initial=toolDefinitions.map(tool=>architectToolAvailable(world,tool.id));
  world.tiles=world.tiles.map(()=>({terrain:'water'}));world.piles=[];world.pawns=[];
  if(world.roofing)world.roofing.constructed=world.tiles.map((_,index)=>index);
  fixtureBuilding(world,'wall',8,8);
  expect(canDesignate(world,{type:'designate',kind:'ground-scanner',x:8,z:8,orientation:0,material:'steel'}).ok).toBe(false);
  expect(architectAvailabilityKey(world)).toBe(key);
  expect(toolDefinitions.map(tool=>architectToolAvailable(world,tool.id))).toEqual(initial);
});

test('V358 reads absent and frozen research without initializing any progress or other world state',()=>{
  for(const present of [false,true]){
    const world=camp();if(!present)delete world.research;
    const before=JSON.stringify(world);freeze(world);
    const key=architectAvailabilityKey(world);
    for(const tool of toolDefinitions)architectToolAvailable(world,tool.id);
    expect(architectAvailabilityKey(world)).toBe(key);expect(JSON.stringify(world)).toBe(before);
  }
});
