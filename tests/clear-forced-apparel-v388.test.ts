import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {applyClearForcedApparel,type ClearForcedApparelCommand} from '../src/sim/apparel-system.ts';
import {addMaterial,reservedSource} from '../src/sim/materials.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {secondaryContext,flushSecondaryContext} from '../src/sim/secondary-site-context.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import type {MaterialPile,World} from '../src/sim/types.ts';
import {equipmentCamp} from './scenarios/equipment.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';

function garment(w:World,item:MaterialPile['item'],owner:MaterialPile['owner'],forced=false):MaterialPile {
  addMaterial(w,'apparel',1,owner,item);const pile=w.piles.at(-1)!;if(forced)pile.apparel!.forced=true;return pile;
}
function ready(count=2){const w=equipmentCamp(count);w.piles=[];for(const p of w.pawns){p.apparelAutomation=false;p.hunger=p.rest=p.recreation.level=100;}return w;}
function until(w:World,done:()=>boolean,limit=1000){for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),`tick ${w.tick}`).toBe(true);}
const clear=(w:World,pawnId:number)=>applyCommand(w,{type:'apparel-clear-forced',pawnId});

test('clearing changes only currently worn forced flags and the due check; Auto off, other owners, identities and no-op are preserved',()=>{
  const w=ready(),p=w.pawns[0]!,other=w.pawns[1]!;p.nextApparelCheckAt=w.tick+123;
  const shirt=garment(w,'cloth-shirt',{type:'apparel',pawnId:p.id},true),pants=garment(w,'cloth-pants',{type:'apparel',pawnId:p.id},true);
  garment(w,'cloth-parka',{type:'apparel',pawnId:p.id});const otherShirt=garment(w,'cloth-shirt',{type:'apparel',pawnId:other.id},true);
  // Ordinary clothing has a physical cargo owner, not generic colonist inventory.
  garment(w,'cloth-tuque',{type:'ground',x:9,z:7});garment(w,'cloth-tuque',{type:'pawn',pawnId:p.id});p.interruptedCargo=true;
  expect(validateWorld(w)).toEqual([]);
  const expected=structuredClone(w);for(const pile of expected.piles)if(pile.id===shirt.id||pile.id===pants.id)delete pile.apparel!.forced;expected.pawns[0]!.nextApparelCheckAt=w.tick;
  const owner=shirt.owner,apparel=shirt.apparel,identities=w.piles.map(p=>p.id);
  expect(applyClearForcedApparel(w,{type:'apparel-clear-forced',pawnId:p.id})).toEqual({ok:true});expect(w).toEqual(expected);
  expect(shirt.owner).toBe(owner);expect(shirt.apparel).toBe(apparel);expect(w.piles.map(p=>p.id)).toEqual(identities);expect(otherShirt.apparel!.forced).toBe(true);
  const raw=JSON.stringify(w);expect(applyClearForcedApparel(w,{type:'apparel-clear-forced',pawnId:p.id})).toEqual({ok:true});expect(JSON.stringify(w)).toBe(raw);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);stepWorld(w,20);expect(shirt.owner).toEqual({type:'apparel',pawnId:p.id});expect(p.apparelAutomation).toBe(false);expect(p.equipmentTask).toBeUndefined();
});

test('invalid commands and inadmissible local people refuse before changing flags or cadence; downed metadata remains editable',()=>{
  const w=ready(1),p=w.pawns[0]!;garment(w,'cloth-shirt',{type:'apparel',pawnId:p.id},true);
  for(const command of [{type:'apparel-clear-forced',pawnId:0},{type:'apparel-clear-forced',pawnId:1.5},{type:'apparel-clear-forced',pawnId:Number.MAX_SAFE_INTEGER},{type:'apparel-clear-forced',pawnId:p.id,automatic:true}]){
    const before=JSON.stringify(w);expect(applyCommand(w,command as ClearForcedApparelCommand).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
  }
  for(const patch of [{state:'dead'},{prisoner:{}},{visitor:{}},{faction:'outlaws'}]){
    const copy=structuredClone(w);Object.assign(copy.pawns[0]!,patch);const before=JSON.stringify(copy);expect(applyClearForcedApparel(copy,{type:'apparel-clear-forced',pawnId:p.id}).ok).toBe(false);expect(JSON.stringify(copy)).toBe(before);
  }
  const old=structuredClone(w);(old as {schemaVersion:number}).schemaVersion=89;const before=JSON.stringify(old);expect(applyClearForcedApparel(old,{type:'apparel-clear-forced',pawnId:p.id}).ok).toBe(false);expect(JSON.stringify(old)).toBe(before);
  p.state='downed';expect(applyClearForcedApparel(w,{type:'apparel-clear-forced',pawnId:p.id}).ok).toBe(true);expect(p.state).toBe('downed');
});

test('policy takes over only through ordinary timed removal and stored replacement, with exact replay after clear and during retirement',()=>{
  const w=ready(1),p=w.pawns[0]!,shirt=garment(w,'cloth-shirt',{type:'apparel',pawnId:p.id},true);shirt.apparel!.hitPoints=20;
  const replacement=garment(w,'light-leather-shirt',{type:'ground',x:p.x+1,z:p.z});
  expect(applyCommand(w,{type:'stockpile',x:p.x+1,z:p.z,enabled:true,filters:{wood:false,food:false,apparel:true}}).ok).toBe(true);
  expect(applyCommand(w,{type:'apparel-policy-assign',pawnId:p.id,policyId:2,automatic:true}).ok).toBe(true);stepWorld(w);
  expect(shirt.owner).toEqual({type:'apparel',pawnId:p.id});expect(p.equipmentTask).toBeUndefined();
  const owner=structuredClone(shirt.owner),state=structuredClone(shirt.apparel),rng=w.rng,id=w.nextId;
  expect(clear(w,p.id).ok).toBe(true);expect(shirt.owner).toEqual(owner);expect(shirt.apparel).toEqual({...state,forced:undefined});expect(p.apparelAutomation).toBe(true);expect(w.rng).toBe(rng);expect(w.nextId).toBe(id);
  let copy=deserializeWorld(serializeWorld(w));
  until(w,()=>p.equipmentTask?.automatic===true&&p.equipmentTask.action==='remove'&&p.equipmentTask.progress>=2);
  stepWorld(copy,w.tick-copy.tick);expect(serializeWorld(copy)).toBe(serializeWorld(w));const running=structuredClone(p.equipmentTask);expect(clear(w,p.id).ok).toBe(true);expect(p.equipmentTask).toEqual(running);copy=deserializeWorld(serializeWorld(w));
  until(w,()=>replacement.owner.type==='apparel');stepWorld(copy,w.tick-copy.tick);expect(serializeWorld(copy)).toBe(serializeWorld(w));
  expect(shirt.owner.type).toBe('ground');expect(shirt.apparel!.forbidden).toBe(true);expect(replacement.owner).toEqual({type:'apparel',pawnId:p.id});expect(replacement.apparel!.forced).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});

test('manual wear already travelling retains its task, reservation and edge, then becomes forced at actual completion',()=>{
  const w=ready(1),p=w.pawns[0]!,old=garment(w,'cloth-shirt',{type:'apparel',pawnId:p.id},true),incoming=garment(w,'cloth-parka',{type:'ground',x:p.x+9,z:p.z});
  expect(applyCommand(w,{type:'order-equipment',pawnId:p.id,itemId:incoming.id,action:'wear',queue:false}).ok).toBe(true);until(w,()=>!!p.motion&&p.motion.end>w.tick);
  const task=structuredClone(p.equipmentTask),motion=structuredClone(p.motion),orders=structuredClone(p.orders),path=structuredClone(p.path),reservation=reservedSource(w,incoming.id);
  expect(clear(w,p.id).ok).toBe(true);expect(p.equipmentTask).toEqual(task);expect(p.motion).toEqual(motion);expect(p.orders).toEqual(orders);expect(p.path).toEqual(path);expect(reservedSource(w,incoming.id)).toBe(reservation);
  expect(old.apparel!.forced).toBeUndefined();expect(incoming.apparel!.forced).toBeUndefined();expect(incoming.owner.type).toBe('ground');
  const copy=deserializeWorld(serializeWorld(w));until(w,()=>incoming.owner.type==='apparel');stepWorld(copy,w.tick-copy.tick);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(incoming.apparel!.forced).toBe(true);expect(old.owner).toEqual({type:'apparel',pawnId:p.id});expect(validateWorld(w)).toEqual([]);
});

test('selected secondary map is the only target, same-tick incremental snapshot carries the clear, and off-map id refuses',()=>{
  const {w}=preparedCassandraExpedition(),local=secondaryContext(w)!,homePawn=w.pawns[0]!,pawn=local.pawns[0]!;
  const home=garment(w,'cloth-tuque',{type:'apparel',pawnId:homePawn.id},true),piece=garment(local,'cloth-tuque',{type:'apparel',pawnId:pawn.id},true);flushSecondaryContext(w);
  expect(applyCommand(w,{type:'secondary-view',site:'secondary'}).ok).toBe(true);
  const e=new SnapshotEncoder(),d=new SnapshotDecoder();expect(d.adopt(structuredClone(e.encode(campaignPresentation(w),0,0))).status).toBe('applied');
  const homeBefore=JSON.stringify({pawns:w.pawns,piles:w.piles,tiles:w.tiles});expect(clear(w,homePawn.id).ok).toBe(false);expect(home.apparel!.forced).toBe(true);
  expect(clear(w,pawn.id).ok).toBe(true);expect(piece.apparel!.forced).toBeUndefined();expect(JSON.stringify({pawns:w.pawns,piles:w.piles,tiles:w.tiles})).toBe(homeBefore);
  const delta=structuredClone(e.encode(campaignPresentation(w),0,0));expect(delta.kind).toBe('delta');const result=d.adopt(delta);expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Expected same-tick clear adoption');
  expect(result.world.piles.find(p=>p.id===piece.id)!.apparel!.forced).toBeUndefined();expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(validateWorld(w)).toEqual([]);
});
