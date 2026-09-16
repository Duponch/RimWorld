import { SCHEMA_VERSION } from '../src/sim/types';
import { withoutPawnSkills, withMigratedSkills } from './scenarios/legacy-skills';
import { expect, test } from 'vitest';
import { createWorld, applyCommand, addGroundMaterial, refreshStock, stepWorld, validateWorld, serializeWorld, deserializeWorld } from '../src/sim/index';
import { advancePriorityWork } from '../src/sim/priority-work';
import { PRIORITY_WORK_TICKS } from '../src/sim/priority-work-state';
import { blockedCells } from '../src/sim/pathfinding';
import { newCookingBill } from '../src/sim/cooking-bills';

import type { Command, World } from '../src/sim/types';

function camp():World {
  const w=createWorld(42,32,32);w.tick=2000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.jobs=[];w.structures=[];w.piles=[];w.stockpiles=[];w.pawns=w.pawns.slice(0,1);
  const p=w.pawns[0]!;Object.assign(p,{x:8,z:10,hunger:100,rest:100});p.schedule.fill('anything');p.priorities={ patient:0,bedrest:0,doctor:0,craft:2,mine:2,build:1,haul:0,grow:0,gather:0,cook:1};refreshStock(w);return w;
}
function command(w:World,c:Command){expect(applyCommand(w,c)).toMatchObject({ok:true});expect(validateWorld(w)).toEqual([]);}
function tick(w:World){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
function until(w:World,done:()=>boolean,max=1000){for(let i=0;i<max&&!done();i++)tick(w);expect(done()).toBe(true);}
function kitchen(w:World) {
  const bill=newCookingBill(w.nextId++);bill.target=3;bill.destination='drop';
  const s={id:w.nextId++,kind:'campfire' as const,x:14,z:8,orientation:0 as const,footprint:'standard' as const,bills:[bill],fuel:{ticks:0,burned:0,autoRefuel:false}};w.structures.push(s);
  addGroundMaterial(w,'wood',10,{x:8,z:8},'wood');addGroundMaterial(w,'food',30,{x:10,z:8},'rice');return s;
}

test('one clicked bed is cleared, supplied over several trips and built; no nearby expansion, stable family, queue ordering and exact replay',()=>{
  const w=camp(),p=w.pawns[0]!;w.resources.push({id:w.nextId++,kind:'tree',x:15,z:8,amount:12});
  for(const x of [14,20])command(w,{type:'designate',kind:'bed',x,z:8,orientation:1});
  const [bed,neighbour]=w.jobs;addGroundMaterial(w,'wood',67,{x:8,z:8},'wood');
  command(w,{type:'order-job',pawnId:p.id,jobId:bed!.id,queue:false});
  expect(p.priorityWork).toEqual({cell:{x:14,z:8},work:'build',startedAt:2000});
  command(w,{type:'priority',pawnId:p.id,work:'build',value:0});
  const replay=deserializeWorld(serializeWorld(w)),phases=new Set<string>();
  for(let i=0;i<1000&&!w.structures.some(s=>s.x===bed!.x&&s.z===bed!.z);i++) {
    phases.add(p.haul?`haul-${p.haul.destination.type}`:w.jobs.find(j=>j.id===p.jobId)?.clearance?'cutting':p.jobId?'building':'between');
    tick(w);stepWorld(replay);expect(w).toEqual(replay);
  }
  expect(w.structures.map(s=>[s.x,s.z])).toEqual([[bed!.x,bed!.z]]);expect(phases).toEqual(new Set(['cutting','between','haul-aside','haul-job','building']));
  expect(w.jobs[0]!.id).toBe(neighbour!.id);expect(w.jobs[0]!.escrow.wood).toBe(0);
  expect(w.stock.wood+45).toBe(79);tick(w);expect(p.priorityWork).toBeUndefined();
  // Assignment family is retained: a hauler supplies but never gains building.
  const h=camp(),a=h.pawns[0]!;a.priorities.build=0;a.priorities.haul=1;addGroundMaterial(h,'wood',57,{x:8,z:8},'wood');
  command(h,{type:'designate',kind:'bed',x:14,z:8});command(h,{type:'order-haul',pawnId:a.id,target:{type:'job',jobId:h.jobs[0]!.id},queue:false});
  command(h,{type:'priority',pawnId:a.id,work:'haul',value:0});until(h,()=>a.priorityWork===undefined);
  expect(h.structures).toEqual([]);expect(h.jobs[0]!.escrow.wood).toBe(45);expect(h.stock.wood).toBe(12);
});

test('prioritized cooking refuels then follows bill count, survives disabled assignment, and returns to physical eating; cancellation and collapse release cargo',()=>{
  const w=camp(),p=w.pawns[0]!,s=kitchen(w);p.hunger=25;p.schedule.fill('sleep');
  command(w,{type:'order-cook',pawnId:p.id,structureId:s.id,queue:false});command(w,{type:'priority',pawnId:p.id,work:'cook',value:0});
  const replay=deserializeWorld(serializeWorld(w));let count=0;
  for(let i=0;i<1500&&p.priorityWork;i++) {
    tick(w);stepWorld(replay);expect(w).toEqual(replay);
    if(w.events.some(e=>e.tick===w.tick&&e.message.includes('a cuisiné')))count++;
    if(p.priorityWork)expect(p.need).toBeNull();
  }
  expect(count).toBe(3);expect(s.bills[0]!.target).toBe(0);expect(w.piles.filter(p=>p.item==='rice')).toEqual([]);
  until(w,()=>p.need?.kind==='eat');expect(p.need?.kind).toBe('eat');expect(p.hunger).toBeLessThan(25);until(w,()=>p.hunger>30);
  for(const emergency of [false,true]) {
    const c=camp(),a=c.pawns[0]!,station=kitchen(c);command(c,{type:'order-cook',pawnId:a.id,structureId:station.id,queue:false});
    until(c,()=>a.haul?.phase==='deliver');const held=c.piles.find(p=>p.owner.type==='pawn')!;
    if(emergency){a.rest=0;a.collapsePending=true;until(c,()=>a.need?.kind==='sleep');}
    else command(c,{type:'clear-orders',pawnId:a.id});
    expect(a.priorityWork).toBeUndefined();expect(a.orders).toEqual({active:null,queue:[]});expect(c.piles.find(p=>p.id===held.id)?.owner.type).toBe('ground');expect(c.stock.wood).toBe(10);
  }
});

test('priority decisions share budgets, disappear on lost access or timeout without cancelling active work, and validate strict V22 migration',()=>{
  const w=camp(),p=w.pawns[0]!,s=kitchen(w);command(w,{type:'order-cook',pawnId:p.id,structureId:s.id,queue:false});
  const accepted=serializeWorld(w);expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:999999,queue:false}).ok).toBe(false);expect(serializeWorld(w)).toBe(accepted);
  until(w,()=>!p.haul);expect(p.priorityWork?.work).toBe('cook');
  const before=serializeWorld(w);expect(advancePriorityWork(w,p,()=>blockedCells(w),{remaining:0,pairs:20})).toBe(true);expect(serializeWorld(w)).toBe(before);
  const pairs={remaining:8,pairs:0};expect(advancePriorityWork(w,p,()=>blockedCells(w),pairs)).toBe(true);expect(serializeWorld(w)).toBe(before);
  const lost=deserializeWorld(before);for(let z=0;z<32;z++)lost.structures.push({id:lost.nextId++,kind:'wall',x:12,z,orientation:0,footprint:'standard'});
  tick(lost);expect(lost.pawns[0]!.priorityWork).toBeUndefined();expect(lost.stock.food).toBe(30);
  tick(w);expect(p.cooking).not.toBeNull();p.priorityWork!.startedAt=w.tick-PRIORITY_WORK_TICKS+1;
  tick(w);expect(p.priorityWork).toBeUndefined();expect(p.orders.active).toBe('cook');expect(p.cooking).not.toBeNull();
  const raw=JSON.parse(accepted);for(const priority of [null,[],{cell:{x:1,z:1},work:'gather',startedAt:2000},{cell:{x:-1,z:1},work:'cook',startedAt:2000},{cell:{x:1,z:1},work:'cook',startedAt:2001},{cell:{x:1,z:1},work:'cook',startedAt:2000,radius:12}]) {
    const invalid=structuredClone(raw);invalid.pawns[0].priorityWork=priority;expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/priority work/);
  }
  (raw.schemaVersion=22,withoutPawnSkills(raw));for(const a of raw.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete raw.deconstructed;delete raw.packed;expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow(/version 22/);delete raw.pawns[0].priorityWork;
  const migrated=deserializeWorld(JSON.stringify(raw));expect(migrated).toEqual(withMigratedSkills({...raw,pawns:raw.pawns.map((p:any)=>({...p,priorities: { patient:0,bedrest:0,doctor:0,craft:2,...p.priorities,mine:2}})),schemaVersion:SCHEMA_VERSION,packed:[],deconstructed:{count:0,lostWood:0,fuelTicks:0}}));expect(migrated.pawns[0]!.priorityWork).toBeUndefined();
});
