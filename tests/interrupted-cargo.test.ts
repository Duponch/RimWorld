import { withoutMedicalWork } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { addMaterial,refreshStock } from '../src/sim/materials';
import { expireFood } from '../src/sim/food-expiration';
import { ROT_DAYS,rotAge } from '../src/sim/food-preservation';
import { TICKS_PER_DAY,type World } from '../src/sim/types';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots';
import { PresentationChanges } from '../src/bridge/presentation-changes';
import { clearQueuedOrders } from '../src/sim/player-orders';
import { dropRetainingIdentity,groundCapacity,groundPile,nearbyGround } from '../src/sim/ground-placement';
import { furnitureDropCell } from '../src/sim/furniture-transfer';
import { foodAccount,woodAccount } from './scenarios/colony-player';
import { carrierWithHelper,exhaustedCarrier } from './scenarios/interrupted-cargo';

function checked(w:World,ticks=1):void {stepWorld(w,ticks);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}

test('exhaustion stops a crowded hauler, frees its queue, and preserves the carried material',()=>{
  const w=exhaustedCarrier(),p=w.pawns[0]!,held=w.piles.find(v=>v.owner.type==='pawn')!;
  expect(validateWorld(w)).toEqual([]);
  stepWorld(w);
  expect(p.state).toBe('sleeping');
  expect(p.haul).toBeNull();expect(p.orders).toEqual({active:null,queue:[]});
  expect(w.jobs[0]).toMatchObject({reservedBy:null,status:'pending'});
  expect(w.piles.find(v=>v.id===held.id)).toMatchObject({item:'steel',quantity:10,owner:{type:'pawn',pawnId:p.id}});
  expect(validateWorld(w)).toEqual([]);
  const resume=deserializeWorld(serializeWorld(w)),rest=p.rest;
  checked(w,100);checked(resume,100);expect(resume).toEqual(w);expect(p.rest).toBeGreaterThan(rest);expect(p.interruptedCargo).toBe(true);
  const before=serializeWorld(w);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:w.jobs[0]!.id,queue:true}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  // Waking follows the schedule even though the carried object cannot drop.
  p.rest=20.1;checked(w);expect(p.need).toBeNull();expect(p.state).toBe('idle');expect(p.interruptedCargo).toBe(true);
  const retry=p.planCooldown;checked(w);expect(p.planCooldown).toBe(retry-1);expect(p.jobId).toBeNull();
});

test('another colon physically clears a slot; retained steel drops with its identity and sleep continues',()=>{
  const w=carrierWithHelper(),p=w.pawns[0]!,helper=w.pawns[1]!,held=w.piles.find(q=>q.owner.type==='pawn')!,wood=woodAccount(w);
  checked(w);expect(p.interruptedCargo).toBe(true);
  expect(applyCommand(w,{type:'priority',pawnId:helper.id,work:'haul',value:1}).ok).toBe(true);
  const source=w.piles.find(q=>q.owner.type==='ground'&&q.owner.x===2&&q.owner.z===3)!;
  expect(applyCommand(w,{type:'order-haul',pawnId:helper.id,target:{type:'pile',pileId:source.id},queue:false}).ok).toBe(true);
  for(let i=0;i<50&&p.interruptedCargo;i++)checked(w);
  expect(p.interruptedCargo).toBeUndefined();expect(held.owner).toEqual({type:'ground',x:2,z:3});expect(held.quantity).toBe(10);expect(woodAccount(w)).toBe(wood);
  expect(p.need).toMatchObject({kind:'sleep',phase:'sleep'});expect(p.orders.queue).toEqual([]);expect(p.haul).toBeNull();
  const resumed=deserializeWorld(serializeWorld(w));checked(w,100);checked(resumed,100);expect(resumed).toEqual(w);
});

test('a meal is not eaten by an exhausted actor; its age and expiry survive passive carriage and save/load',()=>{
  const w=exhaustedCarrier(),p=w.pawns[0]!;clearQueuedOrders(w,p);p.orders.active=null;p.haul=null;
  w.piles=w.piles.filter(q=>q.owner.type!=='pawn');addMaterial(w,'food',1,{type:'pawn',pawnId:p.id},'simple-meal');const held=w.piles.at(-1)!;
  p.need={kind:'eat',phase:'choose-spot',sourcePileId:held.id,carryPileId:held.id,quantity:1,progress:0,dining:null};
  held.rot={progress:ROT_DAYS['simple-meal']*TICKS_PER_DAY-30,atTick:w.tick};refreshStock(w);
  const total=foodAccount(w),age=rotAge(held,w.tick),hunger=p.hunger;expect(validateWorld(w)).toEqual([]);checked(w);
  expect(p.need).toMatchObject({kind:'sleep'});expect(p.interruptedCargo).toBe(true);expect(p.hunger).toBeLessThan(hunger);expect(rotAge(held,w.tick)).toBe(age+1);
  const resumed=deserializeWorld(serializeWorld(w));checked(w,28);checked(resumed,28);expect(resumed).toEqual(w);expect(p.interruptedCargo).toBe(true);
  w.tick++;expireFood(w);refreshStock(w);expect(validateWorld(w)).toEqual([]);expect(p.interruptedCargo).toBeUndefined();expect(p.need).toMatchObject({kind:'sleep'});
  expect(w.piles.some(q=>q.id===held.id)).toBe(false);expect(w.spoiled['simple-meal']).toBe(1);expect(foodAccount(w)).toBe(total);
});

test('whole furniture retains its material, identity and bed owner while the delivery reservation is freed',()=>{
  const w=exhaustedCarrier(),p=w.pawns[0]!;w.piles=w.piles.filter(q=>q.owner.type!=='pawn'&&!(q.owner.type==='ground'&&q.owner.x===15&&q.owner.z===15));
  const zone=w.stockpiles[0]!;Object.assign(zone,{x:15,z:15,filters:{wood:false,food:false,furniture:true}});
  const b={id:w.nextId++,kind:'bed' as const,x:6,z:6,orientation:0 as const,footprint:'standard' as const,material:'granite-blocks' as const};
  w.packed.push({building:b,owner:{type:'pawn',pawnId:p.id}});p.bedId=b.id;
  p.haul={sourcePileId:b.id,carryPileId:b.id,quantity:1,whole:true,phase:'deliver',pickupCell:{x:2,z:2},destination:{type:'stockpile',stockpileId:zone.id}};refreshStock(w);
  expect(validateWorld(w)).toEqual([]);checked(w);expect(p.interruptedCargo).toBe(true);expect(p.haul).toBeNull();expect(p.bedId).toBe(b.id);expect(w.packed[0]!.building).toEqual(b);
  const saved=serializeWorld(w),resumed=deserializeWorld(saved);checked(w,40);checked(resumed,40);expect(resumed).toEqual(w);expect(w.packed[0]!.owner).toEqual({type:'pawn',pawnId:p.id});
});

test('interrupted production frees station and staged ingredients without finishing the bill or losing its held ingredient',()=>{
  const w=exhaustedCarrier(),p=w.pawns[0]!;clearQueuedOrders(w,p);p.orders.active='cook';p.haul=null;
  w.piles=w.piles.filter(q=>q.owner.type!=='pawn'&&!(q.owner.type==='ground'&&q.owner.x===15&&q.owner.z===15));
  const station={id:w.nextId++,kind:'campfire' as const,x:15,z:15,orientation:0 as const,footprint:'standard' as const,fuel:{ticks:12000,burned:0,autoRefuel:false},bills:[] as import('../src/sim/cooking-types').CookingBill[]};w.structures.push(station);
  expect(applyCommand(w,{type:'bill-add',structureId:station.id}).ok).toBe(true);
  // The staging cell is far beyond the carrier's drop radius.
  w.piles=w.piles.filter(q=>!(q.owner.type==='ground'&&q.owner.x===15&&(q.owner.z===14||q.owner.z===13)));
  addMaterial(w,'food',6,{type:'ground',x:15,z:14},'berries');const placed=w.piles.at(-1)!;
  addMaterial(w,'food',4,{type:'pawn',pawnId:p.id},'rice');const held=w.piles.at(-1)!;
  p.cooking={stationId:station.id,billId:station.bills[0]!.id,spot:{x:15,z:14},actionCell:{x:15,z:15},phase:'gather',ingredients:[{pileId:placed.id,item:'berries',quantity:6,stage:'placed',cell:{x:15,z:14}},{pileId:held.id,item:'rice',quantity:4,stage:'held',cell:{x:15,z:13}}],progress:0,productId:null,storageId:null};refreshStock(w);
  const food=foodAccount(w);expect(validateWorld(w),JSON.stringify(validateWorld(w))).toEqual([]);checked(w);expect(p.cooking).toBeNull();expect(p.interruptedCargo).toBe(true);expect(station.bills[0]!.target).toBe(1);
  expect(held.owner).toEqual({type:'pawn',pawnId:p.id});expect(placed.owner).toEqual({type:'ground',x:15,z:14});expect(foodAccount(w)).toBe(food);expect(p.orders.active).toBeNull();
});

test('schema 43 is checked before migration; passive ownership cannot hide illegal work, movement, duplicate objects or missing cargo',()=>{
  const initial=exhaustedCarrier(),legacy=JSON.parse(serializeWorld(initial));legacy.schemaVersion=43;withoutMedicalWork(legacy);
  const expected={...initial,pawns:initial.pawns.map(p=>({...p,skills:{...p.skills,shooting:{level:8,xp:0,dailyXp:0,passion:0},medicine:{level:8,xp:0,dailyXp:0,passion:0}},priorities:{...p.priorities,doctor:1,patient:1,bedrest:3}}))};
  for(const p of expected.pawns)delete p.medicalCare;
  expect(deserializeWorld(JSON.stringify(legacy))).toEqual(expected);
  legacy.pawns[0].interruptedCargo=true;expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow(/version 43/);
  checked(initial);const saved=serializeWorld(initial);expect(deserializeWorld(saved)).toEqual(initial);
  for(const mutate of [(w:World)=>{w.pawns[0]!.interruptedCargo=false as true;},(w:World)=>{w.pawns[0]!.interruptedCargo=null as unknown as true;},(w:World)=>{w.piles=w.piles.filter(q=>q.owner.type!=='pawn');refreshStock(w);},(w:World)=>{w.pawns[0]!.state='working';},(w:World)=>{w.pawns[0]!.path=[{x:3,z:2}];},(w:World)=>{w.pawns[0]!.orders.active='haul';},(w:World)=>{addMaterial(w,'food',1,{type:'pawn',pawnId:w.pawns[0]!.id},'survival-meal');refreshStock(w);},(w:World)=>{delete w.pawns[0]!.interruptedCargo;}]) {
    const bad=JSON.parse(saved);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),phases=new PresentationChanges();
  const first=decoder.adopt(structuredClone(encoder.encode(initial,0,1,true)));expect(first).toBeTruthy();expect(phases.capture(initial)).toBe(true);expect(phases.capture(structuredClone(initial))).toBe(false);
  // Marker-only changes must publish even when pose and ownership stay stable.
  const presentation=structuredClone(initial);delete presentation.pawns[0]!.interruptedCargo;expect(phases.capture(presentation)).toBe(true);
  checked(initial,20);const adoption=decoder.adopt(structuredClone(encoder.encode(initial,0,6)));expect(adoption.status).toBe('applied');if(adoption.status==='applied')expect(adoption.world).toEqual(initial);
});

test('exhaustion during a captured edge waits for its physical arrival, then stops before another edge or delivery',()=>{
  const w=exhaustedCarrier(),p=w.pawns[0]!;p.rest=50;p.collapsePending=false;p.restZeroTicks=0;
  for(let i=0;i<100&&p.moveCooldown===0;i++)checked(w);
  expect(p.moveCooldown).toBeGreaterThan(0);const edge=structuredClone(p.motion)!;p.rest=0;p.collapsePending=true;p.restZeroTicks=200;
  const resumed=deserializeWorld(serializeWorld(w));
  while(w.tick<Math.ceil(edge.end)){
    checked(w);checked(resumed);expect(resumed).toEqual(w);
    if(w.tick<edge.end){expect(p.motion).toEqual(edge);expect(p.state).toBe('moving');expect(p.interruptedCargo).toBeUndefined();}
  }
  expect(p.need).toMatchObject({kind:'sleep',phase:'sleep',target:{x:p.x,z:p.z}});expect(p.interruptedCargo).toBe(true);expect(p.motion).toEqual(edge);expect(p.haul).toBeNull();
});

test('indexed emergency drops preserve the original candidate order through occupied, incompatible and wall-separated cells',()=>{
  const w=exhaustedCarrier(),p=w.pawns[0]!,held=w.piles.find(q=>q.owner.type==='pawn')!;
  for(let variant=0;variant<32;variant++){
    const v=structuredClone(w),carrier=v.pawns[0]!,cargo=v.piles.find(q=>q.id===held.id)!;
    v.piles=v.piles.filter(q=>q.owner.type!=='ground'||(q.owner.x*7+q.owner.z*11+variant)%13!==0);
    for(let z=0;z<16;z++)if(z!==variant%16)v.tiles[z*16+7]={terrain:'rock',stone:'granite'};
    const oracle=nearbyGround(v,carrier).find(c=>!groundPile(v,c)&&groundCapacity(v,c,cargo.item,carrier.id)>=cargo.quantity);
    const free=(c:{x:number;z:number})=>!groundPile(v,c)&&groundCapacity(v,c,'wood',carrier.id)===75;
    const furnitureOracle=free(carrier)?{x:carrier.x,z:carrier.z}:nearbyGround(v,carrier).find(free);
    expect(furnitureDropCell(v,carrier,carrier.id)).toEqual(furnitureOracle);
    expect(dropRetainingIdentity(v,cargo,carrier)).toBe(!!oracle);expect(cargo.owner).toEqual(oracle?{type:'ground',...oracle}:{type:'pawn',pawnId:p.id});
    // A second decision sees the just-mutated owner; no stale occupancy index.
    expect(furnitureDropCell(v,carrier,carrier.id)).toEqual(free(carrier)?{x:carrier.x,z:carrier.z}:nearbyGround(v,carrier).find(free));
  }
});
