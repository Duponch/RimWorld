import { readProjectProgress, researchCost, RESEARCH_SCALE } from '../src/sim/research';
import { describe, expect, test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import { queryJobStatus } from '../src/sim/diagnostics';
import { actionProgress } from '../src/render/action-feedback';
import { ANIMAL_FEED_TICKS } from '../src/sim/animal-feeding-rules';
import { BURIAL_TICKS } from '../src/sim/burial';
import { SURGERY_WORK } from '../src/sim/surgery-rules';
import { REFUEL_WORK_TICKS } from '../src/sim/fuel';
import { TURRET_RELOAD_WORK_TICKS } from '../src/sim/mini-turret-reload';
import { specificWorkActivity } from '../src/ui/work-activity';

describe('V348 confirmed work phase reports', () => {
  test.each(['working', 'moving'] as const)('identifies research in %s with the real global project progress', state => {
    const world = createWorld(348,32,32), pawn = world.pawns[0]!;
    world.research={project:'biofuel-refining',points:0,biofuelRefining:{points:123*RESEARCH_SCALE}};
    pawn.state = state; pawn.jobId = null;
    pawn.research = {stationId: 1,spot:{x:pawn.x,z:pawn.z},worked:100};
    const before = structuredClone(world);
    expect(specificWorkActivity(world,pawn)).toBe(state === 'working' ? 'Recherche · Raffinage de biocarburant' : 'Rejoint son bureau de recherche');
    if(state==='working')expect(actionProgress(world,pawn)).toMatchObject({kind:'research',completed:123*RESEARCH_SCALE,total:researchCost('biofuel-refining'),fraction:123/700});
    else expect(actionProgress(world,pawn)).toBeUndefined();
    expect(world).toEqual(before);
  });
  test.each(['drill','scan'] as const)('identifies the real %s installation task', kind => {
    const world=createWorld(348,32,32),pawn=world.pawns[0]!;
    pawn.state='working';pawn.jobId=null;pawn.deepWork={structureId:1,spot:{x:pawn.x,z:pawn.z},kind};
    expect(specificWorkActivity(world,pawn)).toBe(kind==='drill'?'Forage profond':'Recherche de gisements souterrains');
    expect(actionProgress(world,pawn)).toBeUndefined();
  });
  test.each([0.1,1])('shows the clearing phase independently of wall assembly at growth %s', growth => {
    const world=createWorld(348,32,32),pawn=world.pawns[0]!;
    const plant={id:world.nextId++,kind:'tree' as const,species:'oak' as const,x:4,z:5,amount:46,growth,growthTick:world.tick};
    world.resources=[plant];
    const job={id:world.nextId++,kind:'wall' as const,x:4,z:5,orientation:0 as const,footprint:'standard' as const,status:'active' as const,reservedBy:pawn.id,progress:0,escrow:{wood:0,food:0},construction:'blueprint' as const,clearance:{resourceId:plant.id,progress:41,workRemainder:5000}};
    world.jobs=[job];pawn.jobId=job.id;pawn.state='working';
    const before=structuredClone(world);
    expect(specificWorkActivity(world,pawn)).toContain(growth===1?'abattage':'coupe');
    expect(specificWorkActivity(world,pawn)).toContain('(41 %)');
    expect(queryJobStatus(world,job)).toMatchObject({code:'clearing'});
    expect(queryJobStatus(world,job).reason).toContain('(41 %)');
    expect(actionProgress(world,pawn)).toMatchObject({kind:'clearing',completed:41.5,total:100});
    expect(world).toEqual(before);
    pawn.state='moving';expect(specificWorkActivity(world,pawn)).toContain('pour dégager');
    expect(queryJobStatus(world,job).reason).toContain('rejoint la plante');
    expect(actionProgress(world,pawn)).toBeUndefined();
  });
  test('does not attribute a foreign clearing claim to a selected pawn',()=>{
    const world=createWorld(348,32,32),pawn=world.pawns[0]!;
    pawn.state='working';pawn.jobId=1;
    world.jobs=[{id:1,kind:'wall',x:4,z:5,orientation:0,footprint:'standard',status:'active',reservedBy:world.pawns[1]!.id,progress:0,escrow:{wood:0,food:0},construction:'blueprint',clearance:{resourceId:2,progress:41}}];
    expect(specificWorkActivity(world,pawn)).toBeUndefined();
    expect(actionProgress(world,pawn)).toBeUndefined();
  });
});

describe('V348 finite service counters',()=>{
  test.each([
    ['surgery',{surgery:{phase:'work',progress:125}},SURGERY_WORK],
    ['burial',{burial:{phase:'bury',progress:12}},BURIAL_TICKS],
    ['feeding',{animalFeed:{phase:'feed',progress:12}},ANIMAL_FEED_TICKS],
    ['equipment',{equipmentTask:{action:'wear',progress:12,duration:35}},35],
    ['equipment',{equipmentTask:{action:'remove',progress:12,duration:25}},25],
    ['equipment',{equipmentTask:{action:'drop',progress:1}},3],
    ['service',{haul:{phase:'deliver',destination:{type:'fuel'},serviceProgress:1}},REFUEL_WORK_TICKS],
    ['service',{haul:{phase:'deliver',destination:{type:'turret'},serviceProgress:1}},TURRET_RELOAD_WORK_TICKS],
  ] as const)('uses the existing %s counter (%#)',(kind,task,total)=>{
    // Pure presentation fragments: these are not serialized scenario fixtures.
    const world=createWorld(348,32,32),pawn=world.pawns[0]!;
    pawn.state='working';pawn.jobId=null;Object.assign(pawn,task);
    const before=structuredClone(world);
    expect(actionProgress(world,pawn)).toMatchObject({kind,total});
    expect(world).toEqual(before);
    pawn.state='moving';expect(actionProgress(world,pawn)).toBeUndefined();
  });
  test('does not invent a progress bar for instant equipment pickup or travel',()=>{
    const world=createWorld(348,32,32),pawn=world.pawns[0]!;
    pawn.state='working';pawn.jobId=null;pawn.equipmentTask={itemId:1,action:'equip',progress:0};
    expect(actionProgress(world,pawn)).toBeUndefined();
    delete pawn.equipmentTask;
    pawn.haul={phase:'deliver',sourcePileId:1,carryPileId:2,quantity:1,destination:{type:'fuel',structureId:3}};
    expect(actionProgress(world,pawn)).toBeUndefined();
  });
});

test('research HUD never initializes a missing historical progress record',()=>{
  const world=createWorld(348,32,32),pawn=world.pawns[0]!;
  world.research={project:'ground-scanner',points:0};
  pawn.state='working';pawn.jobId=null;pawn.research={stationId:1,spot:{x:pawn.x,z:pawn.z},worked:100};
  const before=structuredClone(world);
  expect(readProjectProgress(world.research!,'ground-scanner')).toBeUndefined();
  expect(actionProgress(world,pawn)).toMatchObject({kind:'research',completed:0,total:researchCost('ground-scanner')});
  expect(world).toEqual(before);
});

test('multi-cell clearing diagnostic uses the claimed plant, not another obstruction',()=>{
  const world=createWorld(348,32,32),pawn=world.pawns[0]!;
  const grass={id:world.nextId++,kind:'wild-plant' as const,species:'grass' as const,x:4,z:5,amount:0,growth:1,growthTick:world.tick};
  const oak={id:world.nextId++,kind:'tree' as const,species:'oak' as const,x:4,z:6,amount:46,growth:.1,growthTick:world.tick};
  world.resources=[grass,oak];
  const job={id:world.nextId++,kind:'bed' as const,x:4,z:5,orientation:0 as const,footprint:'standard' as const,status:'active' as const,reservedBy:pawn.id,progress:0,escrow:{wood:0,food:0},construction:'blueprint' as const,clearance:{resourceId:oak.id,progress:41}};
  world.jobs=[job];pawn.state='working';pawn.jobId=job.id;
  expect(queryJobStatus(world,job).reason).toContain('(41 %)');
  expect(actionProgress(world,pawn)).toMatchObject({kind:'clearing',completed:41,total:100});
});

test.each([['peg-leg',1500],['wooden-hand',1500],['wooden-foot',1000]] as const)('implant %s uses its actual surgery work threshold', (implant,total)=>{
  const world=createWorld(348,32,32),pawn=world.pawns[0]!;
  pawn.state='working';pawn.jobId=null;pawn.surgery={patientId:2,part:'left-foot',implant,bedId:3,spot:{x:pawn.x,z:pawn.z},phase:'work',progress:750,workCore:100};
  expect(actionProgress(world,pawn)).toMatchObject({kind:'surgery',completed:750,total,fraction:750/total});
});
