import { expect, test } from 'vitest';
import { applyCommand, createWorld, stepWorld } from '../src/sim/engine';
import { constructionRecipe, validConstructionMaterial } from '../src/sim/construction-materials';
import { initialRecreation } from '../src/sim/recreation-rules';
import { isChessCell, recreationSiteValid } from '../src/sim/recreation-space';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization';
import { damageStructure } from '../src/sim/thing-damage';
import { createMedicalRecord } from '../src/sim/injury-state';
import { reconcilePawnHealth } from '../src/sim/health';
import { pawnBody } from '../src/sim/health-rules';
import { queryPawnStatus } from '../src/sim/diagnostics';
import { addGroundMaterial, refreshStock } from '../src/sim/materials';
import { COMPLEX_FURNITURE_RESEARCH_COST } from '../src/sim/research';
import { withoutFutureHelmetPolicy } from './scenarios/legacy-skills';

const game = () => {
  const w=createWorld(122,32,32);
  w.research={project:null,points:0,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:0}};
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.jobs=[];w.structures=[];
  w.tick=2000;
  w.pawns=w.pawns.slice(0,2);
  for(const [index,p] of w.pawns.entries()) {
    p.x=12+index;p.z=15;p.path=[];p.state='idle';p.hunger=100;p.rest=100;
    p.schedule.fill('recreation');p.priorities={...p.priorities,build:0,haul:0,research:0};
    p.recreation=initialRecreation(10);
    for(const kind of ['solitary','dexterity'] as const){p.recreation.tolerance[kind]=80;p.recreation.bored[kind]=true;}
  }
  const table={id:w.nextId++,kind:'chess-table' as const,x:16,z:15,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,quality:'normal' as const};
  const seats=[{id:w.nextId++,kind:'stool' as const,x:15,z:15,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,quality:'normal' as const},
    {id:w.nextId++,kind:'stool' as const,x:17,z:15,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,quality:'normal' as const}];
  w.structures.push(table,...seats);
  return {w,table,seats};
};

test('Core chess recipe uses physical hard material and complex furniture',()=>{
  expect(constructionRecipe({kind:'chess-table',material:'wood'}).ingredients).toEqual([{item:'wood',quantity:70}]);
  expect(constructionRecipe({kind:'chess-table',material:'wood'}).coreWork).toBe(5600);
  expect(validConstructionMaterial('chess-table','cloth',122)).toBe(false);
  expect(validConstructionMaterial('chess-table','legacy',122)).toBe(false);
  expect(validConstructionMaterial('chess-table','wood',121)).toBe(false);
  expect(isChessCell({x:16,z:15},{x:17,z:15})).toBe(true);
  expect(isChessCell({x:16,z:15},{x:17,z:16})).toBe(false);
});

test('a colon delivers real wood and completes a chess-table construction job',()=>{
  const {w}=game(),builder=w.pawns[0]!;
  w.pawns=w.pawns.slice(0,1);
  builder.schedule.fill('work');builder.priorities.build=1;builder.priorities.haul=1;
  builder.recreation.level=80;
  addGroundMaterial(w,'wood',70,{x:12,z:14},'wood');refreshStock(w);
  expect(applyCommand(w,{type:'designate',kind:'chess-table',x:19,z:15,material:'wood'}).ok).toBe(true);
  for(let i=0;i<1800&&!w.structures.some(s=>s.kind==='chess-table'&&s.x===19&&s.z===15);i++)stepWorld(w);
  expect(w.structures.some(s=>s.kind==='chess-table'&&s.x===19&&s.z===15&&s.material==='wood')).toBe(true);
  expect(w.jobs.some(j=>j.kind==='chess-table'&&j.x===19&&j.z===15)).toBe(false);
  expect(validateWorld(w)).toEqual([]);
});

test('two players use distinct adjacent seats; only active play gives joy and intellectual XP, and survives replay',()=>{
  const {w,table}=game();
  let traveling=false,active=false;
  for(let i=0;i<90;i++){
    const joy=w.pawns.map(p=>p.recreation.level),xp=w.pawns.map(p=>p.skills.intellectual?.xp??0);
    stepWorld(w);
    expect(validateWorld(w)).toEqual([]);
    for(const [index,p] of w.pawns.entries())if(p.recreation.task?.activity==='chess'){
      const task=p.recreation.task;
      expect(recreationSiteValid(w,task)).toBe(true);
      if(task.phase==='travel'){traveling=true;expect(p.recreation.level).toBeLessThanOrEqual(joy[index]!);expect(p.skills.intellectual?.xp??0).toBe(xp[index]);}
      else {active=true;expect(p.recreation.level).toBeGreaterThan(joy[index]!);expect(p.skills.intellectual!.xp).toBeGreaterThan(xp[index]!);}
    }
    if(active&&w.pawns.every(p=>p.recreation.task?.activity==='chess'&&p.recreation.task.phase==='active'))break;
  }
  expect(traveling).toBe(true);expect(active).toBe(true);
  expect(new Set(w.pawns.map(p=>p.recreation.task!.seatId)).size).toBe(2);
  expect(w.pawns.every(p=>p.recreation.task!.buildingId===table.id)).toBe(true);
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,15);stepWorld(resumed,15);expect(resumed).toEqual(w);
  const duplicate=JSON.parse(serializeWorld(w));
  duplicate.pawns[1].recreation.task.seatId=duplicate.pawns[0].recreation.task.seatId;
  duplicate.pawns[1].recreation.task.target=duplicate.pawns[0].recreation.task.target;
  expect(()=>deserializeWorld(JSON.stringify(duplicate))).toThrow(/chess seat|reservation/i);
});

test('seat destruction releases chess before a save and V121 migration adds no retroactive play',()=>{
  const {w,seats}=game();
  for(let i=0;i<90&&!w.pawns.some(p=>p.recreation.task?.phase==='active');i++)stepWorld(w);
  const player=w.pawns.find(p=>p.recreation.task?.activity==='chess'&&p.recreation.task.phase==='active')!;
  const seat=seats.find(s=>s.id===player.recreation.task!.seatId)!;
  expect(damageStructure(w,seat,10000)).toBe(true);
  expect(player.recreation.task).toBeNull();expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);

  const old=JSON.parse(serializeWorld(w));old.schemaVersion=121;
  delete old.breakdown;
  delete old.fluIncidents;
  withoutFutureHelmetPolicy(old);
  for(const p of old.pawns){delete p.recreation.tolerance.cerebral;delete p.recreation.bored.cerebral;delete p.recreation.tolerance.social;delete p.recreation.bored.social;p.recreation.task=null;p.state='idle';p.path=[];p.moveCooldown=0;delete p.motion;delete p.transitExit;}
  for(const p of old.pawns)delete p.age;
  for(const departure of old.visitors?.departed??[])delete departure.pawn.age;
  old.structures=old.structures.filter((s:{kind:string})=>s.kind!=='chess-table');
  expect(()=>deserializeWorld(JSON.stringify({...old,structures:w.structures}))).toThrow(/version 121/i);
  const migrated=deserializeWorld(JSON.stringify(old));
  expect(migrated.schemaVersion).toBe(w.schemaVersion);
  expect(migrated.pawns.every(p=>p.recreation.tolerance.cerebral===0&&p.recreation.bored.cerebral===false&&p.recreation.tolerance.social===0&&p.recreation.bored.social===false&&p.recreation.task===null)).toBe(true);
});

test('chess needs manipulation, stops on loss of both hands, and reports the real activity',()=>{
  const {w}=game(),p=w.pawns[0]!;
  for(let i=0;i<90&&p.recreation.task?.phase!=='active';i++)stepWorld(w);
  expect(p.recreation.task?.activity).toBe('chess');
  expect(queryPawnStatus(w,p).reason).toContain('échecs');
  p.health=createMedicalRecord(w.tick);
  p.health.missing=[{part:'left-hand',bornAt:0,tended:true},{part:'right-hand',bornAt:0,tended:true}];
  expect(pawnBody(p).capacities.manipulation).toBe(0);
  const joy=p.recreation.level,xp=p.skills.intellectual?.xp??0;
  reconcilePawnHealth(w,p);
  expect(p.recreation.task).toBeNull();
  expect(validateWorld(w)).toEqual([]);
  stepWorld(w,30);
  expect(p.recreation.task).toBeNull();
  expect(p.recreation.level).toBeLessThanOrEqual(joy);
  expect(p.skills.intellectual?.xp??0).toBe(xp);
});
