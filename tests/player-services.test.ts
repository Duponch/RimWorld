import { expect, test } from 'vitest';
import { addGroundMaterial, applyCommand, createWorld, deserializeWorld, refreshStock, serializeWorld, stepWorld, validateWorld } from '../src/sim/index';
import { queryOrderOptions } from '../src/sim/player-orders';
import { availableCookingStations } from '../src/sim/cooking-planner';
import { CAMPFIRE_CAPACITY, WOOD_BURN_TICKS } from '../src/sim/fuel';
import { reservedSource } from '../src/sim/materials';
import type { Command, World } from '../src/sim/types';

function camp():World {
  const w=createWorld(42,32,32);w.tick=2000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.jobs=[];w.structures=[];w.stockpiles=[];w.pawns=w.pawns.slice(0,2);
  w.pawns.forEach((p,i)=>{p.x=8;p.z=10+i;p.hunger=100;p.rest=100;p.schedule.fill('anything');p.priorities={craft:2,mine:2,haul:1,build:0,grow:0,gather:0,cook:0};});refreshStock(w);return w;
}
function tick(w:World,n=1) {for(let i=0;i<n;i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}}
function rejected(w:World,c:Command) {const before=serializeWorld(w);expect(applyCommand(w,c).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
function fire(w:World,x=18) {const s={id:w.nextId++,kind:'campfire' as const,x,z:8,orientation:0 as const,footprint:'standard' as const,bills:[],fuel:{ticks:9000,burned:0,autoRefuel:false}};w.structures.push(s);return s;}
const woodMass=(w:World)=>w.piles.reduce((n,p)=>n+(p.item==='wood'?p.quantity:0),0)+w.structures.reduce((n,s)=>n+((s.fuel?.ticks??0)+(s.fuel?.burned??0))/WOOD_BURN_TICKS,0);

test('forced refuel bypasses automation, reserves its station while queued, travels and works, persists every phase and conserves fuel on interruption',()=>{
  const w=camp(),[p,q]=w.pawns,s=fire(w);addGroundMaterial(w,'wood',30,{x:8,z:8},'wood');const source=w.piles[0]!;
  expect(applyCommand(w,{type:'stockpile',x:12,z:8,enabled:true,filters:{wood:true,food:false},priority:2,capacity:10}).ok).toBe(true);
  const fuel:Command={type:'order-haul',pawnId:p!.id,target:{type:'fuel',structureId:s.id},queue:true};
  const before=serializeWorld(w);expect(queryOrderOptions(w,p!.id,s).find(o=>o.haulTarget?.type==='fuel')?.enabled).toBe(true);expect(serializeWorld(w)).toBe(before);
  expect(applyCommand(w,{type:'order-haul',pawnId:p!.id,target:{type:'pile',pileId:source.id},queue:false}).ok).toBe(true);
  expect(applyCommand(w,fuel).ok).toBe(true);expect(reservedSource(w,source.id)).toBe(15);
  rejected(w,{...fuel,pawnId:q!.id});rejected(w,fuel);
  q!.priorities.cook=1;expect(applyCommand(w,{type:'bill-add',structureId:s.id}).ok).toBe(true);
  expect(availableCookingStations(w,q!)).toEqual([]);
  const raw=JSON.parse(serializeWorld(w));const old={...raw,schemaVersion:18};expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/version 18/);
  for(const mutate of [(s:any)=>s.pawns[0].orders.queue[0].destination.forced=false,(s:any)=>s.pawns[0].orders.queue[0].destination.structureId=999999,(s:any)=>s.pawns[1].orders.queue.push(structuredClone(s.pawns[0].orders.queue[0]))]) {
    const invalid=structuredClone(raw);mutate(invalid);expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow();
  }
  q!.priorities={craft:2,mine:2,haul:0,build:0,gather:0,grow:0,cook:0};
  expect(applyCommand(w,{type:'priority',pawnId:p!.id,work:'haul',value:0}).ok).toBe(true);
  const mass=woodMass(w),replay=deserializeWorld(serializeWorld(w)),phases=new Set<string>();
  for(let i=0;i<250&&(p!.haul||p!.orders.queue.length);i++) {
    if(p!.haul?.destination.type==='fuel') {
      phases.add(p!.haul.serviceProgress?'service':p!.haul.phase);
      if(p!.haul.serviceProgress===1) {
        const state=deserializeWorld(serializeWorld(w));expect(state).toEqual(w);
        const command={type:'refuel-policy' as const,structureId:s.id,enabled:false};expect(applyCommand(w,command).ok).toBe(true);applyCommand(replay,command);
        expect(p!.orders.active).toBe('haul');
      }
    }
    tick(w);stepWorld(replay);expect(w).toEqual(replay);
  }
  expect(phases).toEqual(new Set(['pickup','deliver','service']));expect(p!.orders).toEqual({active:null,queue:[]});expect(w.stock.wood).toBe(25);expect(woodMass(w)).toBe(mass);expect(s.fuel.ticks).toBe(CAMPFIRE_CAPACITY-(w.tick-2000));
  const c=camp(),actor=c.pawns[0]!,f=fire(c);c.pawns=c.pawns.slice(0,1);addGroundMaterial(c,'wood',10,{x:8,z:8},'wood');
  const cmd:Command={type:'order-haul',pawnId:actor.id,target:{type:'fuel',structureId:f.id},queue:false};expect(applyCommand(c,cmd).ok).toBe(true);
  for(let i=0;i<80&&actor.haul?.phase!=='deliver';i++)tick(c);
  expect(actor.haul?.phase).toBe('deliver');const held=c.piles.find(p=>p.owner.type==='pawn')!,massBefore=woodMass(c);
  expect(applyCommand(c,{type:'clear-orders',pawnId:actor.id}).ok).toBe(true);expect(c.piles.find(p=>p.id===held.id)?.owner.type).toBe('ground');expect(woodMass(c)).toBe(massBefore);expect(validateWorld(c)).toEqual([]);
  const full=camp(),fullFire=fire(full);fullFire.fuel.ticks=CAMPFIRE_CAPACITY;addGroundMaterial(full,'wood',10,{x:8,z:8},'wood');rejected(full,{type:'order-haul',pawnId:full.pawns[0]!.id,target:{type:'fuel',structureId:fullFire.id},queue:false});
  const legacy=JSON.parse(serializeWorld(camp()));legacy.schemaVersion=18;for(const a of legacy.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete legacy.deconstructed;delete legacy.packed;expect(deserializeWorld(JSON.stringify(legacy))).toEqual({...legacy,pawns:legacy.pawns.map((p:any)=>({...p,priorities:{craft:2,...p.priorities,mine:2}})),schemaVersion:42,packed:[],deconstructed:{count:0,lostWood:0,fuelTicks:0}});
});

test('forced plant and pile clearing respects rotated footprints, queue cancellation, physical output, parent lifetime and construction assignment without ordinary hauling',()=>{
  const w=camp(),p=w.pawns[0]!;w.pawns=w.pawns.slice(0,1);p.priorities={craft:2,mine:2,haul:0,build:1,grow:0,gather:0,cook:0};
  for(const x of [15,21]) {w.resources.push({id:w.nextId++,kind:'tree',amount:12,x:x+1,z:8});expect(applyCommand(w,{type:'designate',kind:'bed',x,z:8,orientation:1}).ok).toBe(true);}
  const [a,b]=w.jobs;
  expect(queryOrderOptions(w,p.id,{x:16,z:8})[0]).toMatchObject({enabled:true,label:'Couper la plante qui gêne le chantier'});
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:a!.id,queue:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:b!.id,queue:true}).ok).toBe(true);expect(b!.clearance?.progress).toBe(0);
  const replay=deserializeWorld(serializeWorld(w));tick(w,35);for(let i=0;i<35;i++)stepWorld(replay);expect(w).toEqual(replay);
  expect(applyCommand(w,{type:'clear-orders',pawnId:p.id}).ok).toBe(true);expect(a!.clearance).toBeUndefined();expect(b!.clearance).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:a!.id,queue:false}).ok).toBe(true);applyCommand(w,{type:'priority',pawnId:p.id,work:'build',value:0});
  for(let i=0;i<200&&p.orders.active!==null;i++)tick(w);
  expect(w.resources).toHaveLength(1);expect(w.stock.wood).toBe(12);expect(a!.construction).toBe('blueprint');expect(a!.escrow.wood).toBe(0);
  applyCommand(w,{type:'priority',pawnId:p.id,work:'build',value:1});
  const clear:Command={type:'order-haul',pawnId:p.id,target:{type:'clear',jobId:a!.id},queue:false};
  expect(applyCommand(w,clear).ok).toBe(true);expect(p.haul?.destination).toMatchObject({type:'aside',constructionId:a!.id,forConstruction:true});
  applyCommand(w,{type:'priority',pawnId:p.id,work:'build',value:0});for(let i=0;i<150&&p.orders.active!==null;i++)tick(w);expect(applyCommand(w,{type:'clear-orders',pawnId:p.id}).ok).toBe(true);expect(p.haul).toBeNull();expect(w.stock.wood).toBe(12);expect(w.piles.filter(p=>p.owner.type==='ground'&&p.owner.x===16&&p.owner.z===8).reduce((n,p)=>n+p.quantity,0)).toBe(2);
  applyCommand(w,{type:'priority',pawnId:p.id,work:'build',value:1});expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:b!.id,queue:false}).ok).toBe(true);
  expect(applyCommand(w,{...clear,queue:true}).ok).toBe(true);expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const raw=JSON.parse(serializeWorld(w));raw.schemaVersion=18;for(const a of raw.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete raw.deconstructed;delete raw.packed;expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow(/version 18/);
  expect(applyCommand(w,{type:'cancel',x:a!.x,z:a!.z}).ok).toBe(true);expect(p.orders.queue).toEqual([]);expect(w.stock.wood).toBe(12);expect(validateWorld(w)).toEqual([]);
});
