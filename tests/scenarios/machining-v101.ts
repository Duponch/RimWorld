import { applyCommand, createWorld, stepWorld } from '../../src/sim/index.ts';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials.ts';
import { newPowerState } from '../../src/sim/power-rules.ts';
import { newBuildingFuel } from '../../src/sim/fuel.ts';
import { MACHINING_RESEARCH_COST, SMITHING_RESEARCH_COST, GUNSMITHING_RESEARCH_COST } from '../../src/sim/research.ts';
import type { Command, Pawn, Structure, World } from '../../src/sim/types.ts';

export interface MachiningFixture { world:World; pawn:Pawn; generator:Structure; researchBench:Structure }

/** Prepared test site, not a natural progression: Forge is known, a research
 * bench and fueled generator already exist, and exactly 240 steel/10 components
 * are on the ground for one machining table plus two guns. */
export function createMachiningFixture():MachiningFixture {
  const world=createWorld(42,32,32);
  world.tick=2000;world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[];world.jobs=[];world.structures=[];world.piles=[];world.stockpiles=[];
  world.pawns=world.pawns.slice(0,1);if(world.wildlife)world.wildlife.animals=[];
  delete world.arrivals;delete world.raids;
  const pawn=world.pawns[0]!;pawn.x=8;pawn.z=11;pawn.hunger=100;pawn.rest=100;pawn.schedule.fill('anything');
  for(const work of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[work]=0;
  pawn.priorities.build=1;pawn.priorities.craft=1;pawn.priorities.research=1;pawn.priorities.basic=3;
  pawn.skills.construction.level=8;
  pawn.skills.crafting={level:10,xp:0,dailyXp:0,passion:1};
  pawn.skills.intellectual={level:10,xp:0,dailyXp:0,passion:1};
  world.research={project:null,points:0,smithing:{points:SMITHING_RESEARCH_COST,completedAt:1000},machining:{points:MACHINING_RESEARCH_COST-100_000}};
  const researchBench:Structure={id:world.nextId++,kind:'research-bench',x:6,z:8,orientation:0,footprint:'standard',material:'wood'};
  const generator:Structure={id:world.nextId++,kind:'wood-generator',x:12,z:8,orientation:0,footprint:'standard',material:'steel',power:newPowerState('wood-generator'),fuel:{...newBuildingFuel('wood-generator'),ticks:45_000,autoRefuel:false}};
  world.structures.push(researchBench,generator);
  addGroundMaterial(world,'steel',240,{x:5,z:13},'steel');
  addGroundMaterial(world,'component',10,{x:7,z:13},'component');
  addGroundMaterial(world,'food',40,{x:7,z:15},'rice');
  refreshStock(world);
  return {world,pawn,generator,researchBench};
}

export function requireCommand(world:World,command:Command):void {
  const result=applyCommand(world,command);
  if(!result.ok)throw new Error(`${JSON.stringify(command)}: ${result.reason}`);
}

export function advanceUntil(world:World,condition:()=>boolean,limit=4000,onTick?:(step:number)=>void):number {
  for(let step=0;step<limit;step++){
    if(condition())return step;
    stepWorld(world);onTick?.(step);
  }
  if(condition())return limit;
  throw new Error(`Condition not reached after ${limit} ticks at world tick ${world.tick}; pawn ${JSON.stringify(world.pawns.map(p=>({x:p.x,z:p.z,state:p.state,jobId:p.jobId,cooking:p.cooking,haul:p.haul,need:p.need})))}`);
}

export function prepareGunsmithingBoundary(world:World):void {
  if(!world.research?.machining?.completedAt)throw new Error('Machining research must complete first.');
  world.research.gunsmithing={points:GUNSMITHING_RESEARCH_COST-100_000};
}

/** Shortcut only for tests focused on physical fabrication, applied before any
 * tick or command. The research boundary has its own exercised scenario. */
export function prepareCompletedResearch(world:World):void {
  if(!world.research)throw new Error('Missing prepared research state.');
  world.research.project=null;
  world.research.machining={points:MACHINING_RESEARCH_COST,completedAt:world.tick};
  world.research.gunsmithing={points:GUNSMITHING_RESEARCH_COST,completedAt:world.tick};
}
