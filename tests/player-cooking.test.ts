import { SCHEMA_VERSION } from '../src/sim/types';
import { withoutPawnSkills, withMigratedSkills } from './scenarios/legacy-skills';
import { expect, test } from 'vitest';
import { addGroundMaterial, applyCommand, createWorld, deserializeWorld, refreshStock, serializeWorld, stepWorld, validateWorld } from '../src/sim/index';
import { queryOrderOptions } from '../src/sim/player-orders';
import { isCookingOrder } from '../src/sim/order-types';
import { reservedSource } from '../src/sim/materials';
import { groundCapacity } from '../src/sim/ground-placement';
import { cookingCellReserved, newCookingBill } from '../src/sim/cooking-bills';
import { ROT_DAYS, rotAge } from '../src/sim/food-preservation';
import { TICKS_PER_DAY, type Command, type World } from '../src/sim/types';

function camp():World {
  const w=createWorld(42,32,32);w.tick=2000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.jobs=[];w.piles=[];w.stockpiles=[];w.structures=[];w.pawns=w.pawns.slice(0,2);
  w.pawns.forEach((p,i)=>{Object.assign(p,{x:8+i,z:10,hunger:100,rest:100});p.schedule.fill('anything');p.priorities={ doctor:0,craft:2,mine:2,haul:0,build:0,gather:0,grow:0,cook:0};});refreshStock(w);return w;
}
function fire(w:World,x=15) {const b=newCookingBill(w.nextId++);b.destination='drop';const s={id:w.nextId++,kind:'campfire' as const,x,z:8,orientation:0 as const,footprint:'standard' as const,bills:[b],fuel:{ticks:6000,burned:0,autoRefuel:false}};w.structures.push(s);return s;}
function accept(w:World,c:Command){expect(applyCommand(w,c)).toMatchObject({ok:true});expect(validateWorld(w)).toEqual([]);}
function reject(w:World,c:Command){const before=serializeWorld(w);expect(applyCommand(w,c).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
function tick(w:World){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
function until(w:World,predicate:()=>boolean,max=400){for(let i=0;i<max&&!predicate();i++)tick(w);expect(predicate()).toBe(true);}
function woodJob(w:World){w.resources.push({id:w.nextId++,kind:'tree',x:10,z:12,amount:12});accept(w,{type:'designate',kind:'chop',x:10,z:12});return w.jobs.at(-1)!;}

test('queued cooking reserves mixed ingredients and staging, follows bill order, survives every phase with disabled work and produces exactly one meal',()=>{
  const w=camp(),[p,q]=w.pawns,s=fire(w),job=woodJob(w);p!.priorities={ doctor:0,craft:2,mine:2,haul:0,build:0,gather:1,grow:0,cook:1};
  const insufficient=newCookingBill(w.nextId++);insufficient.filters.berries=false;s.bills.unshift(insufficient);
  addGroundMaterial(w,'food',6,{x:8,z:8},'rice');addGroundMaterial(w,'food',4,{x:11,z:8},'berries');
  const raw=serializeWorld(w);expect(queryOrderOptions(w,p!.id,s).find(o=>o.cookStationId)?.enabled).toBe(true);expect(serializeWorld(w)).toBe(raw);
  accept(w,{type:'order-job',pawnId:p!.id,jobId:job.id,queue:false});accept(w,{type:'order-cook',pawnId:p!.id,structureId:s.id,queue:true});
  const order=p!.orders.queue[0]!;expect(isCookingOrder(order)).toBe(true);if(!isCookingOrder(order))throw new Error('Missing recipe');
  expect(order.cooking.billId).toBe(s.bills[1]!.id);expect(order.cooking.ingredients.map(i=>i.quantity).sort()).toEqual([4,6]);
  for(const pile of w.piles)expect(reservedSource(w,pile.id)).toBe(pile.quantity);
  const staging=order.cooking.ingredients[0]!.cell;expect(cookingCellReserved(w,staging)).toBe(true);expect(groundCapacity(w,staging,'wood')).toBe(0);
  reject(w,{type:'designate',kind:'wall',...order.cooking.spot});q!.priorities.cook=1;reject(w,{type:'order-cook',pawnId:q!.id,structureId:s.id,queue:false});q!.priorities.cook=0;
  for(const work of ['cook','gather'] as const)accept(w,{type:'priority',pawnId:p!.id,work,value:0});
  const copy=deserializeWorld(serializeWorld(w)),phases=new Set<string>();
  for(let i=0;i<400&&(p!.orders.active!==null||p!.orders.queue.length);i++) {if(p!.cooking&&!phases.has(p!.cooking.phase)){expect(deserializeWorld(serializeWorld(w))).toEqual(w);phases.add(p!.cooking.phase);}tick(w);stepWorld(copy);expect(copy).toEqual(w);}
  expect(phases).toEqual(new Set(['gather','work','output']));expect(p!.orders).toEqual({active:null,queue:[]});expect(w.stock).toEqual({wood:12,food:1});expect(s.bills.map(b=>b.target)).toEqual([1,0]);expect(w.piles.find(p=>p.item==='simple-meal')?.owner.type).toBe('ground');
  expect(w.events.filter(e=>e.message.includes('a cuisiné'))).toHaveLength(1);
});

test('manual recipe respects suspension/radius, refuels first without hauling, rejects corrupt queues and preserves ingredients when recipes or food disappear',()=>{
  const w=camp(),p=w.pawns[0]!,s=fire(w);w.pawns=w.pawns.slice(0,1);p.priorities={ doctor:0,craft:2,mine:2,haul:0,build:0,gather:1,grow:0,cook:1};
  const command:Command={type:'order-cook',pawnId:p.id,structureId:s.id,queue:false};
  addGroundMaterial(w,'food',10,{x:8,z:8},'rice');s.bills[0]!.suspended=true;reject(w,command);s.bills[0]!.suspended=false;s.bills[0]!.radius=1;reject(w,command);s.bills[0]!.radius=999;
  s.fuel.ticks=0;reject(w,command);addGroundMaterial(w,'wood',10,{x:9,z:8},'wood');accept(w,command);expect(p.haul?.destination).toMatchObject({type:'fuel',forCooking:true,forced:true});
  accept(w,{type:'priority',pawnId:p.id,work:'cook',value:0});until(w,()=>p.orders.active===null);expect(w.piles.some(p=>p.item==='simple-meal')).toBe(false);expect(s.bills[0]!.target).toBe(1);expect(s.fuel.ticks).toBeGreaterThan(0);
  accept(w,{type:'priority',pawnId:p.id,work:'cook',value:1});const job=woodJob(w);accept(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false});accept(w,{...command,queue:true});
  const raw=JSON.parse(serializeWorld(w));
  for(const mutate of [(s:any)=>s.schemaVersion=19,(s:any)=>s.pawns[0].orders.queue[0].cooking.ingredients[0].quantity=9,(s:any)=>s.pawns[0].orders.queue[0].cooking.ingredients[0].stage='held',(s:any)=>s.pawns[0].orders.queue[0].cooking.progress=1,(s:any)=>s.pawns[0].orders.queue[0].cooking.ingredients.push({...s.pawns[0].orders.queue[0].cooking.ingredients[0]})]){const invalid=structuredClone(raw);mutate(invalid);expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow();}
  const expiry=deserializeWorld(serializeWorld(w));expiry.piles.find(p=>p.item==='rice')!.rot={progress:ROT_DAYS.rice*TICKS_PER_DAY-1,atTick:expiry.tick};tick(expiry);expect(expiry.pawns[0]!.orders.queue).toEqual([]);expect(expiry.spoiled.rice).toBe(10);
  const blocked=deserializeWorld(serializeWorld(w));for(let z=0;z<32;z++)blocked.structures.push({id:blocked.nextId++,kind:'wall',x:13,z,orientation:0,footprint:'standard'});
  until(blocked,()=>!blocked.pawns[0]!.orders.queue.length);expect(blocked.stock.food).toBe(10);expect(blocked.events.some(e=>e.message.includes('Accès perdu à la cuisine'))).toBe(true);
  accept(w,{type:'bill-update',structureId:s.id,billId:s.bills[0]!.id,settings:{...s.bills[0]!,suspended:true}});expect(p.orders.queue).toEqual([]);expect(w.stock.food).toBe(10);
  accept(w,{type:'bill-update',structureId:s.id,billId:s.bills[0]!.id,settings:{...s.bills[0]!,suspended:false}});accept(w,command);until(w,()=>p.cooking?.ingredients.some(i=>i.stage==='held')??false);
  const held=w.piles.find(p=>p.owner.type==='pawn')!,age=rotAge(held,w.tick);accept(w,{type:'bill-remove',structureId:s.id,billId:s.bills[0]!.id});expect(w.piles.find(p=>p.id===held.id)?.owner.type).toBe('ground');expect(rotAge(w.piles.find(p=>p.id===held.id)!,w.tick)).toBe(age);expect(w.stock.food).toBe(10);expect(p.orders.active).toBeNull();
  const legacy=JSON.parse(serializeWorld(camp()));(legacy.schemaVersion=19,withoutPawnSkills(legacy));for(const a of legacy.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete legacy.deconstructed;delete legacy.packed;expect(deserializeWorld(JSON.stringify(legacy))).toEqual(withMigratedSkills({...legacy,pawns:legacy.pawns.map((p:any)=>({...p,priorities: { doctor: 0,craft:2,...p.priorities,mine:2}})),schemaVersion:SCHEMA_VERSION,packed:[],deconstructed:{count:0,lostWood:0,fuelTicks:0}}));
});

test('forced sowing clearance uses growing assignment, survives regenerated intents and cancels a carried stack conservatively when the zone changes',()=>{
  const w=camp(),p=w.pawns[0]!;w.pawns=w.pawns.slice(0,1);p.priorities={ doctor:0,craft:2,mine:2,haul:0,build:0,gather:1,grow:1,cook:0};
  addGroundMaterial(w,'food',12,{x:14,z:12},'rice');accept(w,{type:'area',action:'growing',from:{x:14,z:12},to:{x:14,z:12}});
  p.planCooldown=20;until(w,()=>w.jobs.some(j=>j.kind==='sow'));const sow=w.jobs.find(j=>j.kind==='sow')!,job=woodJob(w);
  accept(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false});const c:Command={type:'order-haul',pawnId:p.id,target:{type:'clear-sow',jobId:sow.id},queue:true};accept(w,c);
  const order=p.orders.queue[0]!;expect(typeof order!=='number'&&!isCookingOrder(order)&&order.destination).toMatchObject({type:'aside',growingZoneId:w.growingZones[0]!.id,sowCell:{x:14,z:12}});
  w.jobs=w.jobs.filter(j=>j.id!==sow.id);expect(validateWorld(w)).toEqual([]);const copy=deserializeWorld(serializeWorld(w));
  accept(w,{type:'priority',pawnId:p.id,work:'grow',value:0});accept(copy,{type:'priority',pawnId:p.id,work:'grow',value:0});
  for(let i=0;i<250&&p.haul?.phase!=='deliver';i++){tick(w);stepWorld(copy);expect(w).toEqual(copy);}
  expect(p.haul?.phase).toBe('deliver');const held=w.piles.find(p=>p.owner.type==='pawn')!,age=rotAge(held,w.tick);
  accept(w,{type:'growing-policy',zoneId:w.growingZones[0]!.id,allowSow:false,allowCut:true});expect(p.haul).toBeNull();expect(w.stock.food).toBe(12);expect(w.piles.find(p=>p.id===held.id)?.owner.type).toBe('ground');expect(rotAge(w.piles.find(p=>p.id===held.id)!,w.tick)).toBe(age);
  accept(copy,{type:'priority',pawnId:p.id,work:'gather',value:0});until(copy,()=>copy.pawns[0]!.orders.active===null);expect(copy.piles.filter(p=>p.owner.type==='ground'&&p.owner.x===14&&p.owner.z===12).reduce((n,p)=>n+p.quantity,0)).toBe(2);
  accept(copy,{type:'priority',pawnId:p.id,work:'grow',value:1});until(copy,()=>copy.resources.some(r=>r.kind==='rice'&&r.x===14&&r.z===12));expect(copy.stock.food).toBe(12);
});
