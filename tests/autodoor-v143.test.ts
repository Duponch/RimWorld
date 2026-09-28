import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {constructionMaterials,constructionRecipe,constructionSkillRequired,validConstructionMaterial} from '../src/sim/construction-materials.ts';
import {doorOpenTicks,doorOpenness,newDoorState} from '../src/sim/door-rules.ts';
import {updateDoors} from '../src/sim/doors.ts';
import {startTravel} from '../src/sim/movement.ts';
import {blockedCells,canStep,cellIndex} from '../src/sim/pathfinding.ts';
import {advancePower,reconcilePower} from '../src/sim/power.ts';
import {isFlickable,powerDemand,powerWatts} from '../src/sim/power-rules.ts';
import {AUTODOORS_RESEARCH_COST,selectResearch} from '../src/sim/research.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {newBreakdownCalendar} from '../src/sim/breakdowns.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {fixturePower} from './scenarios/power.ts';
import type {ConstructionMaterial} from '../src/sim/building-materials.ts';
import type {Structure,World} from '../src/sim/types.ts';

function unlock(w:World):void {
  w.research??={project:null,points:0};
  w.research.autodoors={points:AUTODOORS_RESEARCH_COST,completedAt:w.tick};
}

function autodoor(w:World,material:ConstructionMaterial='steel',x=16,z=16):Structure {
  unlock(w);
  const s:Structure={id:w.nextId++,kind:'autodoor',material,x,z,orientation:0,footprint:'standard',power:{on:false,parentId:null},door:newDoorState(w.tick)};
  s.door!.duration=doorOpenTicks(s);
  w.structures.push(s);
  return s;
}

function tickDoors(w:World,n=1):void {
  for(let i=0;i<n;i++){w.tick++;updateDoors(w);}
}

function until(w:World,done:()=>boolean,limit=3000):void {
  for(let i=0;i<limit&&!done();i++){
    for(const p of w.pawns){p.hunger=100;p.rest=100;p.recreation.level=100;}
    stepWorld(w);
    if(i%100===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);
  }
  expect(done(),`tick ${w.tick}; ${JSON.stringify({jobs:w.jobs,pawns:w.pawns,structures:w.structures})}`).toBe(true);
}

test('Autodoors research unlocks plans without retroactive construction or Electricity node',()=>{
  const w=deconstructionCamp();
  expect(AUTODOORS_RESEARCH_COST).toBe(600_000_000);
  expect(applyCommand(w,{type:'designate',kind:'autodoor',material:'steel',x:17,z:16}).ok).toBe(false);
  expect(selectResearch(w,'autodoors')).toMatchObject({ok:true});
  expect(w.research?.autodoors).toEqual({points:0});
  expect(w.jobs.some(j=>j.kind==='autodoor')).toBe(false);
  w.research!.project=null;
  w.research!.autodoors={points:AUTODOORS_RESEARCH_COST,completedAt:w.tick};
  expect(applyCommand(w,{type:'designate',kind:'autodoor',material:'steel',x:17,z:16}).ok).toBe(true);
  expect(w.jobs.find(j=>j.kind==='autodoor')).toMatchObject({material:'steel',status:'pending'});
  expect(validateWorld(w)).toEqual([]);
});

test('all seven stuff recipes retain 40 fixed steel and two components; steel totals 65',()=>{
  const expected:[ConstructionMaterial,number][]=[
    ['wood',770],['steel',1100],['granite-blocks',6740],['limestone-blocks',6740],
    ['marble-blocks',6190],['sandstone-blocks',5640],['slate-blocks',6740],
  ];
  expect(constructionMaterials('autodoor')).toEqual(expected.map(([material])=>material));
  expect(constructionSkillRequired('autodoor')).toBe(6);
  for(const [material,coreWork] of expected){
    const recipe=constructionRecipe({kind:'autodoor',material});
    const ingredients=material==='steel'
      ?[{item:'steel',quantity:65},{item:'component',quantity:2}]
      :[{item:material,quantity:25},{item:'steel',quantity:40},{item:'component',quantity:2}];
    expect(recipe).toEqual({ingredients,coreWork,work:Math.ceil(coreWork/10)});
    expect(validConstructionMaterial('autodoor',material,141)).toBe(false);
    expect(validConstructionMaterial('autodoor',material,143)).toBe(true);
  }
  expect(validConstructionMaterial('autodoor','cloth',143)).toBe(false);
});

test('an unlocked steel autodoor consumes 65 steel and two components through a real chantier',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!;
  unlock(w);p.skills.construction.level=10;
  addGroundMaterial(w,'steel',65,{x:12,z:16},'steel');
  addGroundMaterial(w,'component',2,{x:12,z:17},'component');
  const order=applyCommand(w,{type:'designate',kind:'autodoor',material:'steel',x:17,z:16});
  expect(order,order.reason).toMatchObject({ok:true});
  expect(w.jobs.find(j=>j.kind==='autodoor')).toMatchObject({material:'steel'});
  until(w,()=>w.structures.some(s=>s.kind==='autodoor'&&s.x===17&&s.z===16));
  const built=w.structures.find(s=>s.kind==='autodoor')!;
  expect(built.power).toEqual({on:false,parentId:null});
  expect(built.door).toBeDefined();
  expect(w.piles.filter(stack=>stack.item==='steel'||stack.item==='component').reduce((n,stack)=>n+stack.quantity,0)).toBe(0);
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('a connected autodoor consumes 50 W and a network outage restores manual speed, including stone',()=>{
  for(const material of ['wood','steel','granite-blocks'] as const){
    const w=deconstructionCamp(),source=fixturePower(w,'wood-generator',12,16),s=autodoor(w,material);
    w.tick=2000;
    reconcilePower(w);
    expect(s.power!.parentId).toBe(source.id);
    expect(powerDemand(s)).toBe(50);
    expect(isFlickable(s.kind)).toBe(false);
    const manual=doorOpenTicks(s);
    s.power!.on=true;
    expect(powerWatts(s)).toBe(-50);
    expect(doorOpenTicks(s)).toBe(manual/4);
    source.fuel!.ticks=0;
    for(let i=0;i<20&&s.power!.on;i++){w.tick++;advancePower(w);}
    expect(s.power!.on).toBe(false);
    expect(s.power!.parentId).toBe(source.id);
    expect(doorOpenTicks(s)).toBe(manual);
    expect(validateWorld(w)).toEqual([]);
  }
});

test('powered wood and steel preopen on the preceding edge; stone and unpowered steel wait at the threshold',()=>{
  for(const [material,powered,preopens] of [
    ['wood',true,true],['steel',true,true],['granite-blocks',true,false],['steel',false,false],
  ] as const){
    const w=deconstructionCamp(),s=autodoor(w,material),p=w.pawns[0]!;
    p.x=14;p.z=16;p.path=[{x:15,z:16},{x:16,z:16}];
    if(powered){const source=fixturePower(w,'wood-generator',11,16);reconcilePower(w);expect(s.power!.parentId).toBe(source.id);s.power!.on=true;s.door!.duration=doorOpenTicks(s);}
    expect(startTravel(w,p,{x:15,z:16})).toBe(true);
    expect(s.door!.open).toBe(preopens);
    tickDoors(w,4);
    expect(startTravel(w,p,{x:16,z:16})).toBe(preopens);
    if(!preopens){
      expect(s.door!.open).toBe(true);
      tickDoors(w,Math.ceil(doorOpenTicks(s)));
      expect(startTravel(w,p,{x:16,z:16})).toBe(true);
    }
  }
});

test('a partly opened powered segment saves exactly and a cutoff rebases its fraction',()=>{
  const w=deconstructionCamp(),source=fixturePower(w,'wood-generator',12,16),s=autodoor(w,'granite-blocks');
  w.tick=100;reconcilePower(w);expect(s.power!.parentId).toBe(source.id);
  s.power!.on=true;
  s.door={...newDoorState(w.tick),open:true,changedAt:w.tick-1,from:0,closeAt:w.tick+12,lastTouch:w.tick-1,duration:doorOpenTicks(s)};
  expect(doorOpenness(s,w.tick)).toBeCloseTo(.4);
  expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));
  expect(resumed).toEqual(w);
  for(const copy of [w,resumed]){
    const door=copy.structures.find(item=>item.kind==='autodoor')!;
    door.power!.on=false;
    updateDoors(copy);
    expect(doorOpenness(door,copy.tick)).toBeCloseTo(.4);
    expect(door.door!.duration).toBe(10);
    tickDoors(copy,3);
  }
  expect(resumed).toEqual(w);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('unpowered passage still waits physically; forbid and solid corners apply to autodoors',()=>{
  const w=deconstructionCamp(),s=autodoor(w,'steel'),p=w.pawns[0]!;
  p.x=15;p.z=16;p.path=[];
  expect(applyCommand(w,{type:'door-policy',structureId:s.id,setting:'forbidden',value:true}).ok).toBe(true);
  expect(blockedCells(w)[cellIndex(w,16,16)]).toBe(1);
  expect(startTravel(w,p,s)).toBe(false);
  expect(applyCommand(w,{type:'door-policy',structureId:s.id,setting:'forbidden',value:false}).ok).toBe(true);
  expect(startTravel(w,p,s)).toBe(false);
  expect(s.door!.open).toBe(true);
  tickDoors(w,5);
  expect(startTravel(w,p,s)).toBe(true);
  expect(p.motion?.from).toEqual({x:15,z:16});
  expect(canStep(w,{x:15,z:16},{x:16,z:15},blockedCells(w),new Set())).toBe(false);
  expect(validateWorld(w)).toEqual([]);
});

test('strict 141 to current migration grants no research or door, and rejects future fields',()=>{
  const old=deconstructionCamp();
  delete old.breakdown;
  (old as {schemaVersion:number}).schemaVersion=141;
  const before=structuredClone(old),rng=old.rng,nextId=old.nextId;
  const migrated=deserializeWorld(JSON.stringify(old));
  expect(migrated).toEqual({...before,schemaVersion:144,breakdown:newBreakdownCalendar(old.seed,old.tick)});
  expect(migrated.research?.autodoors).toBeUndefined();
  expect(migrated.structures.some(s=>s.kind==='autodoor')).toBe(false);
  expect(migrated.rng).toBe(rng);expect(migrated.nextId).toBe(nextId);

  const futureResearch=structuredClone(old);
  futureResearch.research??={project:null,points:0};
  futureResearch.research.autodoors={points:0};
  expect(()=>deserializeWorld(JSON.stringify(futureResearch))).toThrow(/Invalid version 141 save/);

  const futureDoor=structuredClone(old);
  const s:Structure={id:futureDoor.nextId++,kind:'autodoor',material:'steel',x:16,z:16,orientation:0,footprint:'standard',power:{on:false,parentId:null},door:{...newDoorState(futureDoor.tick),duration:4.5}};
  futureDoor.structures.push(s);
  expect(()=>deserializeWorld(JSON.stringify(futureDoor))).toThrow(/Invalid version 141 save/);
});
