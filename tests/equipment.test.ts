import { expect,test } from 'vitest';
import { equipmentCamp } from './scenarios/equipment';
import { controlledInjury } from './scenarios/health';
import { fixtureBuilding } from './scenarios/deconstruction';
import { applyCommand,stepWorld } from '../src/sim/engine';
import { equippedWeapon } from '../src/sim/equipment-rules';
import { addMaterial,reservedSource } from '../src/sim/materials';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import type { World,Pawn } from '../src/sim/types';

function valid(w:World){expect(validateWorld(w),JSON.stringify({tick:w.tick,errors:validateWorld(w),p:w.pawns.map(p=>({id:p.id,state:p.state,task:p.equipmentTask}))})).toEqual([]);}
function until(w:World,f:()=>boolean,n=600){for(let i=0;i<n&&!f();i++){stepWorld(w);valid(w);}expect(f()).toBe(true);}
function replay(w:World,n=1){const c=deserializeWorld(serializeWorld(w));stepWorld(w,n);stepWorld(c,n);expect(c).toEqual(w);valid(w);}
function order(w:World,p=w.pawns[0]!,id=w.piles[0]!.id,action:'equip'|'drop'='equip'){return applyCommand(w,{type:'order-equipment',pawnId:p.id,itemId:id,action,queue:false});}
function equip(w:World,p=w.pawns[0]!){expect(order(w,p).ok).toBe(true);until(w,()=>!!equippedWeapon(w,p));}

test('equipment moves to contact, atomically swaps unique weapons and keeps queued work and cargo separate',()=>{
  const w=equipmentCamp(),p=w.pawns[0]!,q=w.pawns[1]!,gun=w.piles[0]!;gun.weapon={quality:'excellent',hitPoints:37};
  const next=w.nextId,rng=w.rng;
  expect(order(w).ok).toBe(true);expect(reservedSource(w,gun.id)).toBe(1);expect(order(w,q).ok).toBe(false);expect(gun.owner.type).toBe('ground');valid(w);replay(w,3);
  expect(gun.owner.type).toBe('ground');until(w,()=>!!equippedWeapon(w,p));expect(Math.max(Math.abs(p.x-12),Math.abs(p.z-5))).toBeLessThanOrEqual(1);
  expect(w.nextId).toBe(next);expect(w.rng).toBe(rng);expect(gun.weapon).toEqual({quality:'excellent',hitPoints:37});
  addMaterial(w,'weapon',1,{type:'ground',x:20,z:8},'revolver');const second=w.piles.at(-1)!;
  w.resources.push({id:w.nextId++,kind:'tree',x:22,z:8,amount:10});p.priorities.gather=1;
  expect(applyCommand(w,{type:'designate',kind:'chop',x:22,z:8}).ok).toBe(true);const job=w.jobs.at(-1)!;
  expect(order(w,p,second.id).ok).toBe(true);expect(equippedWeapon(w,p)?.id).toBe(gun.id);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:true}).ok).toBe(true);replay(w,3);
  until(w,()=>equippedWeapon(w,p)?.id===second.id);expect(gun.owner.type).toBe('ground');expect(gun.weapon).toEqual({quality:'excellent',hitPoints:37});
  expect(p.orders.queue.includes(job.id)||p.jobId===job.id).toBe(true);valid(w);replay(w,4);
  p.priorities.haul=1;expect(applyCommand(w,{type:'stockpile',enabled:true,x:24,z:12,filters:{wood:false,food:false,weapon:true}}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:gun.id},queue:true}).ok).toBe(true);
  expect(order(w,p,gun.id).ok).toBe(true);expect(p.orders.queue).toHaveLength(0);until(w,()=>equippedWeapon(w,p)?.id===gun.id);valid(w);
});

test('drop has a saved delay, cancellation never duplicates, permission and shared haul reservations revalidate',()=>{
  const w=equipmentCamp(),p=w.pawns[0]!,gun=w.piles[0]!;equip(w);
  expect(order(w,p,gun.id,'drop').ok).toBe(true);stepWorld(w);expect(p.equipmentTask?.progress).toBe(1);replay(w);expect(equippedWeapon(w,p)).toBe(gun);
  expect(applyCommand(w,{type:'clear-orders',pawnId:p.id}).ok).toBe(true);stepWorld(w);expect(equippedWeapon(w,p)).toBe(gun);
  expect(order(w,p,gun.id,'drop').ok).toBe(true);stepWorld(w,2);expect(equippedWeapon(w,p)).toBe(gun);stepWorld(w);expect(gun.owner.type).toBe('ground');expect(gun.weapon!.forbidden).toBe(true);expect(p.droppedWeaponId).toBeUndefined();valid(w);
  expect(order(w).ok).toBe(true);expect(gun.weapon!.forbidden).toBeUndefined();expect(applyCommand(w,{type:'weapon-permission',itemId:gun.id,allowed:false}).ok).toBe(true);expect(p.equipmentTask).toBeUndefined();valid(w);
  expect(applyCommand(w,{type:'weapon-permission',itemId:gun.id,allowed:true}).ok).toBe(true);
  p.priorities.haul=1;expect(applyCommand(w,{type:'stockpile',x:24,z:6,enabled:true,filters:{wood:false,food:false,weapon:true}}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:gun.id},queue:false}).ok).toBe(true);expect(order(w,w.pawns[1]!).ok).toBe(false);
  until(w,()=>p.haul?.phase==='deliver');expect(gun.owner).toEqual({type:'pawn',pawnId:p.id});replay(w,2);
  until(w,()=>!p.haul);expect(w.piles).toHaveLength(1);expect(gun.owner).toEqual({type:'ground',x:24,z:6});valid(w);
});

test('incapacity drops and remembers the primary, bed retains it, saturated ground conserves it and death never recovers it',()=>{
  const w=equipmentCamp(1),p=w.pawns[0]!,gun=w.piles[0]!;equip(w);
  controlledInjury(w,p,'left-leg',30000);controlledInjury(w,p,'right-leg',30000);
  expect(p.state).toBe('downed');expect(gun.owner.type).toBe('ground');expect(p.droppedWeaponId).toBe(gun.id);valid(w);replay(w);
  // Recovery is a separate decision, with physical access, after the disability ends.
  p.health!.injuries=[];p.health!.missing=[];until(w,()=>!!equippedWeapon(w,p));expect(p.droppedWeaponId).toBeUndefined();valid(w);
  controlledInjury(w,p,'left-shoulder',30000);controlledInjury(w,p,'right-shoulder',30000);expect(gun.owner.type).toBe('ground');expect(p.droppedWeaponId).toBeUndefined();valid(w);
  const b=equipmentCamp(1),s=b.pawns[0]!,bed=fixtureBuilding(b,'bed',s.x,s.z);equip(b);Object.assign(s,{x:bed.x,z:bed.z,bedId:bed.id,motion:undefined,moveCooldown:0,state:'sleeping',need:{kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:bed.x,z:bed.z}}});
  controlledInjury(b,s,'left-leg',30000);controlledInjury(b,s,'right-leg',30000);expect(equippedWeapon(b,s)).toBeDefined();valid(b);
  controlledInjury(b,s,'heart',15000);expect(s.state).toBe('dead');expect(equippedWeapon(b,s)).toBeUndefined();valid(b);
  const full=equipmentCamp(1),a=full.pawns[0]!;equip(full);for(let z=0;z<full.height;z++)for(let x=0;x<full.width;x++)addMaterial(full,'wood',75,{type:'ground',x,z},'wood');
  controlledInjury(full,a,'left-leg',30000);controlledInjury(full,a,'right-leg',30000);expect(a.equipmentDropPending).toBe(true);expect(equippedWeapon(full,a)).toBeDefined();valid(full);replay(full,2);
  const free=full.piles.find(i=>i.owner.type==='ground'&&i.owner.x===a.x&&i.owner.z===a.z)!;full.piles.splice(full.piles.indexOf(free),1);stepWorld(full,20);expect(a.equipmentDropPending).toBeUndefined();expect(equippedWeapon(full,a)).toBeUndefined();valid(full);
});

test('schema 52 strictly separates ownership, metadata, old saves and snapshot continuation',()=>{
  const w=equipmentCamp();valid(w);const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();expect(decoder.adopt(encoder.encode(w,0,1))).toMatchObject({status:'applied',world:w});
  equip(w);expect(decoder.adopt(encoder.encode(w,0,1))).toMatchObject({status:'applied',world:w});replay(w,3);
  const invalid=(mutate:(a:World)=>void)=>{const a=structuredClone(w);mutate(a);expect(()=>deserializeWorld(JSON.stringify(a))).toThrow();};
  invalid(a=>{a.piles[0]!.weapon!.quality='invalid' as any;});invalid(a=>{a.piles[0]!.weapon!.hitPoints=101;});invalid(a=>{a.piles[0]!.quantity=2;});
  invalid(a=>{a.piles.push({...structuredClone(a.piles[0]!),id:a.nextId++});});invalid(a=>{a.pawns[0]!.equipmentTask={itemId:a.piles[0]!.id,action:'drop',progress:3};});
  invalid(a=>{a.piles[0]!.owner={type:'equipment',pawnId:999999};});invalid(a=>{(a as any).schemaVersion=51;});
  invalid(a=>{expect(applyCommand(a,{type:'designate',kind:'wall',x:20,z:20}).ok).toBe(true);a.piles[0]!.owner={type:'job',jobId:a.jobs.at(-1)!.id};});
  const old=equipmentCamp();old.piles=[];(old as any).schemaVersion=51;expect(deserializeWorld(JSON.stringify(old))).toEqual({...old,schemaVersion:52});
  (old.pawns[0] as any).equipmentDropPending=true;expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/version 51/);
});

test('loss of access or targets is atomic; automatic storage respects forbidden weapons and a lost bed drops retained equipment',()=>{
  const w=equipmentCamp(1),p=w.pawns[0]!,gun=w.piles[0]!;
  for(const [x,z] of [[11,5],[13,5],[12,4],[12,6]])w.tiles[z!*32+x!]={terrain:'rock'};
  const before=serializeWorld(w);expect(order(w).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  for(const [x,z] of [[11,5],[13,5],[12,4],[12,6]])w.tiles[z!*32+x!]={terrain:'grass'};
  expect(order(w).ok).toBe(true);w.piles=[];stepWorld(w);expect(p.equipmentTask).toBeUndefined();valid(w);
  w.piles=[gun];gun.weapon!.forbidden=true;p.priorities.haul=1;
  expect(applyCommand(w,{type:'stockpile',enabled:true,x:20,z:6,filters:{wood:false,food:false,weapon:true}}).ok).toBe(true);
  stepWorld(w,30);expect(p.haul).toBeNull();expect(gun.owner.type).toBe('ground');
  expect(applyCommand(w,{type:'weapon-permission',itemId:gun.id,allowed:true}).ok).toBe(true);
  until(w,()=>p.haul?.phase==='pickup');expect(applyCommand(w,{type:'weapon-permission',itemId:gun.id,allowed:false}).ok).toBe(true);expect(p.haul).toBeNull();expect(reservedSource(w,gun.id)).toBe(0);
  expect(applyCommand(w,{type:'weapon-permission',itemId:gun.id,allowed:true}).ok).toBe(true);
  until(w,()=>p.haul?.phase==='deliver');until(w,()=>!p.haul);expect(gun.owner).toEqual({type:'ground',x:20,z:6});
  p.priorities.haul=0;equip(w);const bed=fixtureBuilding(w,'bed',p.x,p.z);p.bedId=bed.id;p.state='sleeping';p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:p.x,z:p.z}};
  controlledInjury(w,p,'left-leg',30000);controlledInjury(w,p,'right-leg',30000);expect(equippedWeapon(w,p)).toBeDefined();
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:null}).ok).toBe(true);expect(equippedWeapon(w,p)).toBeUndefined();valid(w);replay(w);
});
