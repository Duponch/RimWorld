import { expect,test } from 'vitest';
import { feedingCamp } from './scenarios/feeding';
import { careCamp } from './scenarios/care';
import { rescueCamp } from './scenarios/rescue';
import { controlledInjury } from './scenarios/health';
import { applyCommand,stepWorld } from '../src/sim/engine';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization';
import { feedingReason,FEED_TICKS } from '../src/sim/feeding-rules';
import { reservedSource,addMaterial,refreshStock } from '../src/sim/materials';
import { rotAge } from '../src/sim/food-preservation';
import { releaseWork } from '../src/sim/work-release';
import { groundCapacity } from '../src/sim/ground-placement';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { PresentationChanges } from '../src/bridge/presentation-changes';
import type { World } from '../src/sim/types';

function valid(w:World){expect(validateWorld(w),JSON.stringify({tick:w.tick,p:w.pawns.map(p=>({id:p.id,state:p.state,feed:p.feed,need:p.need})),errors:validateWorld(w)})).toEqual([]);}
function until(w:World,f:()=>boolean,max=1000){for(let i=0;i<max&&!f();i++){stepWorld(w);valid(w);}expect(f()).toBe(true);}
function replay(w:World,n=3){const c=deserializeWorld(serializeWorld(w));stepWorld(w,n);stepWorld(c,n);expect(c).toEqual(w);valid(w);}
const food=(w:World)=>w.piles.filter(p=>p.kind==='food').reduce((n,p)=>n+p.quantity,0);

test('physical feeding reserves, splits, carries and ingests only at bedside, preserving every phase on save',()=>{
  const w=feedingCamp(),d=w.pawns[0]!,p=w.pawns[1]!,initial=food(w),xp=d.skills.medicine.xp;
  const changes=new PresentationChanges();changes.capture(w);valid(w);
  stepWorld(w);expect(d.feed?.phase).toBe('pickup');expect(reservedSource(w,w.piles[0]!.id)).toBe(1);replay(w,1);
  until(w,()=>d.feed?.phase==='deliver');expect(changes.capture(w)).toBe(true);expect(food(w)).toBe(initial);expect(p.hunger).toBeLessThan(24);
  const held=w.piles.find(p=>p.owner.type==='pawn')!,ground=w.piles.find(p=>p.owner.type==='ground')!;
  expect(held.owner).toEqual({type:'pawn',pawnId:d.id});expect(held.quantity).toBe(1);expect(held.item).toBe('simple-meal');expect(rotAge(held,w.tick)).toBe(rotAge(ground,w.tick));replay(w,2);
  until(w,()=>d.feed?.phase==='feed');expect(changes.capture(w)).toBe(true);expect(Math.abs(d.x-p.x)+Math.abs(d.z-p.z)).toBe(1);replay(w,10);
  while(d.feed!.progress<FEED_TICKS-1){stepWorld(w);valid(w);expect(food(w)).toBe(initial);expect(p.hunger).toBeLessThan(24);}
  const enc=new SnapshotEncoder(),dec=new SnapshotDecoder();const adopted=dec.adopt(structuredClone(enc.encode(w,0,6)));expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);
  stepWorld(w);valid(w);expect(p.hunger).toBeGreaterThan(99);expect(food(w)).toBe(initial-1);expect(d.skills.medicine.xp).toBe(xp);expect(p.memories.some(m=>m.kind==='ate-without-table')).toBe(false);expect(d.feed).toBeUndefined();replay(w,10);
});

test('patient diet, hunger threshold and medical eligibility govern choice; accepted food is not retroactively forbidden',()=>{
  const w=feedingCamp(),d=w.pawns[0]!,p=w.pawns[1]!;d.foodPolicyId=4;p.foodPolicyId=4;
  expect(applyCommand(w,{type:'order-feed',pawnId:d.id,patientId:p.id,queue:false}).ok).toBe(false);
  p.foodPolicyId=2;p.hunger=26.01;expect(feedingReason(w,d,p)).toBeDefined();p.hunger=26;
  expect(applyCommand(w,{type:'medical-policy',pawnId:p.id,enabled:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-feed',pawnId:d.id,patientId:p.id,queue:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'food-policy-assign',pawnId:p.id,policyId:4}).ok).toBe(true);
  expect(applyCommand(w,{type:'priority',pawnId:d.id,work:'doctor',value:0}).ok).toBe(true);expect(d.orders.active).toBe('feed');
  until(w,()=>p.hunger>90);expect(d.skills.medicine.xp).toBe(0);valid(w);
  // A mobile injured adult resting voluntarily also qualifies; a healthy sleeper does not.
  const mobile=careCamp(),doctor=mobile.pawns[0]!,patient=mobile.pawns[1]!;doctor.priorities.doctor=0;
  until(mobile,()=>patient.state==='resting');patient.hunger=24;doctor.priorities.doctor=1;
  addMaterial(mobile,'food',2,{type:'ground',x:doctor.x+1,z:doctor.z},'survival-meal');
  expect(applyCommand(mobile,{type:'order-feed',pawnId:doctor.id,patientId:patient.id,queue:false}).ok).toBe(true);until(mobile,()=>patient.hunger>90);expect(patient.state).toBe('resting');
  releaseWork(mobile,doctor);delete patient.health;expect(feedingReason(mobile,doctor,patient)).toBeDefined();
});

test('interruptions, spoilage and unreachable food release claims without nutrition or lost cargo',()=>{
  for(const cause of ['cancel','priority','death','hands','bedside','spoil'] as const){
    const w=feedingCamp(),d=w.pawns[0]!,p=w.pawns[1]!;until(w,()=>d.feed?.phase==='deliver');const total=food(w),held=w.piles.find(p=>p.owner.type==='pawn')!;
    if(cause==='cancel'){expect(applyCommand(w,{type:'clear-orders',pawnId:d.id}).ok).toBe(true);d.priorities.doctor=0;}
    if(cause==='priority')expect(applyCommand(w,{type:'priority',pawnId:d.id,work:'doctor',value:0}).ok).toBe(true);
    if(cause==='death')controlledInjury(w,p,'heart',15000,'cut');
    if(cause==='hands'){controlledInjury(w,d,'left-shoulder',30000);controlledInjury(w,d,'right-shoulder',30000);}
    if(cause==='bedside'){const spot=d.feed!.spot;w.tiles[spot.z*w.width+spot.x]={terrain:'rock',stone:'granite'};}
    if(cause==='spoil')held.rot={progress:24000,atTick:w.tick};
    stepWorld(w);valid(w);expect(p.hunger).toBeLessThan(24);expect(d.feed).toBeUndefined();expect(food(w)).toBe(total-(cause==='spoil'?1:0));replay(w,2);
  }
  const w=feedingCamp(),d=w.pawns[0]!,p=w.pawns[1]!,source=w.piles[0]!;
  if(source.owner.type==='ground'){const {x,z}=source.owner;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(dx||dz)w.tiles[(z+dz)*w.width+x+dx]={terrain:'rock',stone:'granite'};}
  expect(applyCommand(w,{type:'order-feed',pawnId:d.id,patientId:p.id,queue:false}).ok).toBe(false);expect(reservedSource(w,source.id)).toBe(0);
});

test('shared doctors and sources cannot double reserve; malformed phases and V47 claims are rejected',()=>{
  const w=feedingCamp(2,64),d=w.pawns[0]!,p=w.pawns[1]!,other=w.pawns[2]!;w.piles.splice(1);w.piles[0]!.quantity=1;refreshStock(w);
  expect(applyCommand(w,{type:'order-feed',pawnId:d.id,patientId:p.id,queue:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-feed',pawnId:other.id,patientId:p.id,queue:false}).ok).toBe(false);
  expect(applyCommand(w,{type:'order-feed',pawnId:other.id,patientId:w.pawns[3]!.id,queue:false}).ok).toBe(false);
  controlledInjury(w,p,'left-arm',5000,'cut');expect(applyCommand(w,{type:'order-tend',pawnId:other.id,patientId:p.id,queue:false}).ok).toBe(false);
  for(const mutate of [(v:World)=>v.pawns[0]!.feed!.quantity=2,(v:World)=>v.pawns[0]!.feed!.spot.x++,(v:World)=>v.pawns[0]!.feed!.progress=1,(v:World)=>v.pawns[0]!.feed!.patientId=d.id,(v:World)=>v.schemaVersion=47 as World['schemaVersion']]){const bad=structuredClone(w);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
  until(w,()=>d.feed?.phase==='deliver');
  for(const phase of [['deliver'],{toString:()=> 'deliver'},null,0]){
    const bad=structuredClone(w);(bad.pawns[0]!.feed as unknown as Record<string,unknown>).phase=phase;
    expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  replay(w,2);const old=feedingCamp();old.schemaVersion=47 as World['schemaVersion'];const migrated=deserializeWorld(JSON.stringify(old));expect(migrated).toEqual({...old,schemaVersion:51});
});

test('raw food conserves a partial serving; involuntary cancellation can retain undroppable cargo without a stale patient claim',()=>{
  const w=feedingCamp(),d=w.pawns[0]!,p=w.pawns[1]!;w.piles=[];addMaterial(w,'food',75,{type:'ground',x:5,z:3},'rice');
  expect(applyCommand(w,{type:'order-feed',pawnId:d.id,patientId:p.id,queue:false}).ok).toBe(true);
  until(w,()=>d.feed?.phase==='feed');const held=w.piles.find(q=>q.owner.type==='pawn')!;expect(held.quantity).toBe(15);const original=food(w);
  // Fill the map without removing the committed food. No cancellation may
  // create ground space by discarding units or leave a stale bedside service.
  w.piles=w.piles.filter(q=>q.owner.type!=='ground');
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(groundCapacity(w,{x,z},'wood')>=75)addMaterial(w,'wood',75,{type:'ground',x,z},'wood');
  refreshStock(w);valid(w);const before=serializeWorld(w);
  expect(applyCommand(w,{type:'clear-orders',pawnId:d.id}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  controlledInjury(w,p,'heart',15000,'cut');stepWorld(w);valid(w);expect(d.feed).toBeUndefined();expect(d.interruptedCargo).toBe(true);expect(held.owner).toEqual({type:'pawn',pawnId:d.id});expect(held.quantity).toBe(15);expect(original).toBe(75);replay(w,5);
  w.piles=w.piles.filter(q=>q.owner.type!=='ground'||q.owner.x!==d.x||q.owner.z!==d.z);refreshStock(w);
  until(w,()=>!d.interruptedCargo);expect(held.owner.type).toBe('ground');expect(held.quantity).toBe(15);
  const meal=feedingCamp(),recipient=meal.pawns[1]!;meal.piles=[];addMaterial(meal,'food',75,{type:'ground',x:5,z:3},'rice');
  until(meal,()=>recipient.hunger>90);expect(food(meal)).toBe(60);expect(meal.pawns[0]!.skills.medicine.xp).toBe(0);
  expect(recipient.memories.some(m=>m.kind==='ate-raw-food')).toBe(true);expect(recipient.memories.some(m=>m.kind==='ate-without-table')).toBe(false);replay(meal,10);
});

test('five-day clinic rescues, tends and repeatedly feeds through player work commands, with an exact meal ledger',()=>{
  const w=rescueCamp(),d=w.pawns[0]!,p=w.pawns[1]!;p.hunger=24;
  for(let i=0;i<4;i++)addMaterial(w,'food',10,{type:'ground',x:3+i,z:2},'survival-meal');
  expect(applyCommand(w,{type:'priority',pawnId:d.id,work:'doctor',value:1}).ok).toBe(true);
  let meals=0,assisted=0,minimum=100,lastTick=w.tick;const start=w.tick;
  for(let t=0;t<30000;t++){
    stepWorld(w);for(const e of w.events)if(e.tick>lastTick&&e.message.includes('a mangé une portion')){meals++;if(e.message.includes('avec l’aide'))assisted++;}
    lastTick=w.tick;if(assisted)minimum=Math.min(minimum,p.hunger);
    if(t%600===0)valid(w);
    if(t===10000||t===20000){const copy=deserializeWorld(serializeWorld(w));stepWorld(copy,5);const control=structuredClone(w);stepWorld(control,5);expect(copy).toEqual(control);}
  }
  valid(w);expect(w.tick-start).toBe(30000);expect(assisted).toBeGreaterThanOrEqual(7);expect(minimum).toBeGreaterThan(0);expect(food(w)+meals).toBe(40);expect(w.spoiled['simple-meal']).toBe(0);expect(p.state).toBe('downed');expect(p.need).toMatchObject({kind:'sleep',phase:'sleep'});expect(p.health!.missing.every(m=>m.tended)).toBe(true);expect(d.skills.medicine.xp).toBe(500000);
},30000);
