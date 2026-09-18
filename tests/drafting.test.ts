import { withoutShootingSkills,withMigratedShootingSkills } from './scenarios/legacy-skills';
import { startTravel } from '../src/sim/movement';
import { expect,test } from 'vitest';
import { equipmentCamp } from './scenarios/equipment';
import { medicalCarrier,controlledInjury } from './scenarios/health';
import { rescueCamp } from './scenarios/rescue';
import { fixtureBuilding } from './scenarios/deconstruction';
import { exhaustedCarrier } from './scenarios/interrupted-cargo';
import { newDoorState,doorOpenness } from '../src/sim/door-rules';
import { applyCommand,stepWorld } from '../src/sim/engine';
import { addMaterial,refreshStock,reservedSource } from '../src/sim/materials';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { PresentationChanges } from '../src/bridge/presentation-changes';
import { AUTO_UNDRAFT_TICKS } from '../src/sim/drafting-rules';
import type { Cell,World,Command } from '../src/sim/types';

const valid=(w:World)=>expect(validateWorld(w),JSON.stringify({tick:w.tick,p:w.pawns.map(p=>({id:p.id,state:p.state,path:p.path,draft:p.draft,need:p.need,cd:p.moveCooldown}))})).toEqual([]);
function command(w:World,c:Command){expect(applyCommand(w,c)).toMatchObject({ok:true});valid(w);}
const draft=(w:World,enabled=true,ids=w.pawns.map(p=>p.id))=>command(w,{type:'draft',pawnIds:ids,enabled});
const move=(w:World,target:Cell,queue=false,ids=w.pawns.map(p=>p.id))=>command(w,{type:'draft-move',pawnIds:ids,target,queue});
function until(w:World,done:()=>boolean,max=800){for(let i=0;i<max&&!done();i++){stepWorld(w);valid(w);}expect(done()).toBe(true);}
function replay(w:World,ticks=3){const copy=deserializeWorld(serializeWorld(w));stepWorld(copy,ticks);stepWorld(w,ticks);expect(copy).toEqual(w);valid(w);}

test('mobilisation stops civil reservations, wakes sleepers, preserves captured diagonals, queues and resumes civilian work',()=>{
  const w=equipmentCamp(1),p=w.pawns[0]!,gun=w.piles[0]!;
  command(w,{type:'order-equipment',pawnId:p.id,itemId:gun.id,action:'equip',queue:false});stepWorld(w);expect(p.motion).toBeDefined();
  const edge=structuredClone(p.motion),hunger=p.hunger,rest=p.rest;
  draft(w);expect(p.equipmentTask).toBeUndefined();expect(reservedSource(w,gun.id)).toBe(0);expect(p.motion).toEqual(edge);
  move(w,{x:13,z:15});move(w,{x:6,z:14},true);expect(p.draft!.queue).toHaveLength(1);replay(w);
  until(w,()=>p.x===6&&p.z===14&&p.moveCooldown===0);expect(p.hunger).toBeLessThan(hunger);expect(p.rest).toBeLessThan(rest);expect(gun.owner.type).toBe('ground');
  expect(p.motion!.end-p.motion!.start).toBeGreaterThan(0);expect(p.draft!.queue).toEqual([]);replay(w);
  command(w,{type:'draft-stop',pawnIds:[p.id]});expect(p.draft!.target).toBeNull();draft(w,false);
  const bed=fixtureBuilding(w,'bed',p.x,p.z);p.bedId=bed.id;p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:p.x,z:p.z}};p.state='sleeping';
  draft(w);expect(p.need).toBeNull();until(w,()=>p.x!==bed.x||p.z!==bed.z);replay(w);
  draft(w,false);command(w,{type:'order-equipment',pawnId:p.id,itemId:gun.id,action:'equip',queue:false});until(w,()=>gun.owner.type==='equipment');
});

test('group destinations are distinct and atomic, transit stays shared and queued targets reserve on activation',()=>{
  const w=equipmentCamp(3);draft(w);move(w,{x:16,z:16});
  expect(new Set(w.pawns.map(p=>JSON.stringify(p.draft!.target))).size).toBe(3);
  move(w,{x:20,z:16},true);replay(w);
  until(w,()=>w.pawns.every(p=>!p.draft!.queue.length&&p.x===p.draft!.target!.x&&p.z===p.draft!.target!.z&&p.moveCooldown===0));
  const saved=serializeWorld(w);
  expect(applyCommand(w,{type:'draft-move',pawnIds:[w.pawns[0]!.id,999999],target:{x:8,z:8},queue:false}).ok).toBe(false);expect(serializeWorld(w)).toBe(saved);
  expect(applyCommand(w,{type:'draft-move',pawnIds:w.pawns.map(p=>p.id),target:{x:-1,z:2},queue:false}).ok).toBe(false);expect(serializeWorld(w)).toBe(saved);
  for(let i=0;i<32;i++)move(w,{x:10,z:10},true,[w.pawns[0]!.id]);const full=serializeWorld(w);
  expect(applyCommand(w,{type:'draft-move',pawnIds:[w.pawns[0]!.id],target:{x:10,z:10},queue:true}).ok).toBe(false);expect(serializeWorld(w)).toBe(full);
  command(w,{type:'draft-stop',pawnIds:w.pawns.map(p=>p.id)});replay(w);
});

test('saturated ground retains cargo through tactical movement, interruption and undraft without duplicating a resource',()=>{
  const clear=medicalCarrier(),actor=clear.pawns[0]!;clear.piles=clear.piles.filter(i=>i.owner.type==='pawn');refreshStock(clear);
  const flying=clear.piles[0]!,identity=structuredClone(flying);expect(startTravel(clear,actor,{x:3,z:3})).toBe(true);valid(clear);
  const edge=structuredClone(actor.motion);draft(clear,true,[actor.id]);expect(flying.owner).toEqual({type:'pawn',pawnId:actor.id});expect(actor.motion).toEqual(edge);
  replay(clear,1);expect(flying).toEqual(identity);command(clear,{type:'draft-stop',pawnIds:[actor.id]});draft(clear,false,[actor.id]);replay(clear,1);expect(flying.owner.type).toBe('pawn');
  until(clear,()=>actor.moveCooldown===0);expect(flying.owner.type).toBe('ground');expect(flying.owner).toEqual({type:'ground',x:actor.x,z:actor.z});
  const w=medicalCarrier(),p=w.pawns[0]!;const held=w.piles.find(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)!;expect(held).toBeDefined();
  const occupied=new Set(w.piles.filter(i=>i.owner.type==='ground').map(i=>i.owner.type==='ground'?i.owner.z*w.width+i.owner.x:-1));
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(!occupied.has(z*w.width+x))addMaterial(w,'wood',75,{type:'ground',x,z},'wood');
  refreshStock(w);const total=w.piles.reduce((n,i)=>n+i.quantity,0),id=held.id;draft(w,true,[p.id]);expect(p.interruptedCargo).toBe(true);expect(p.haul).toBeNull();
  move(w,{x:p.x+2,z:p.z},false,[p.id]);stepWorld(w);replay(w,1);draft(w,false,[p.id]);replay(w,1);draft(w,true,[p.id]);
  expect(w.piles.reduce((n,i)=>n+i.quantity,0)).toBe(total);expect(w.piles.find(i=>i.id===id)!.owner).toEqual({type:'pawn',pawnId:p.id});
  const remove=w.piles.find(i=>i.owner.type==='ground'&&i.owner.x===p.x&&i.owner.z===p.z)!;w.piles.splice(w.piles.indexOf(remove),1);refreshStock(w);
  until(w,()=>!p.interruptedCargo);expect(w.piles.find(i=>i.id===id)!.owner.type).toBe('ground');valid(w);
});

test('a transported patient is released on the captured edge; incapacitation cancels draft but manipulation alone does not',()=>{
  const w=rescueCamp(),p=w.pawns[0]!,patient=w.pawns[1]!;until(w,()=>p.rescue?.phase==='carry'&&p.moveCooldown>0);
  const edge=structuredClone(patient.motion);draft(w,true,[p.id]);expect(p.rescue).toBeUndefined();expect(patient.motion).toEqual(edge);expect(patient.need).toBeNull();replay(w,5);
  controlledInjury(w,p,'left-shoulder',30000);controlledInjury(w,p,'right-shoulder',30000);expect(p.draft).toBeDefined();move(w,{x:10,z:10},false,[p.id]);replay(w);
  controlledInjury(w,p,'left-leg',30000);controlledInjury(w,p,'right-leg',30000);expect(p.draft).toBeUndefined();expect(p.path).toEqual([]);valid(w);
  const before=serializeWorld(w);expect(applyCommand(w,{type:'draft',pawnIds:[patient.id],enabled:true}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
});

test('needs persist, exhaustion physically sleeps, idle auto-undraft is saved, and blocked routes release intentions',()=>{
  const w=equipmentCamp(1),p=w.pawns[0]!;draft(w);p.hunger=15;p.rest=0;p.collapsePending=true;stepWorld(w);valid(w);expect(p.state).toBe('sleeping');expect(p.draft).toBeDefined();expect(p.rest).toBeGreaterThan(0);replay(w);
  command(w,{type:'draft-stop',pawnIds:[p.id]});p.rest=100;p.hunger=100;const start=w.tick;stepWorld(w,AUTO_UNDRAFT_TICKS-1);expect(p.draft).toBeDefined();replay(w,1);expect(p.draft).toBeUndefined();expect(w.tick-start).toBe(AUTO_UNDRAFT_TICKS);
  draft(w);move(w,{x:20,z:20});stepWorld(w,5);const captured=structuredClone(p.motion);
  // Close a distant area without editing any active edge.
  for(let z=16;z<=24;z++)for(let x=16;x<=24;x++)if(x===16||x===24||z===16||z===24)w.tiles[z*w.width+x]={terrain:'rock'};
  expect(p.motion).toEqual(captured);until(w,()=>p.draft!.target===null);expect(p.state).toBe('idle');replay(w);
});

test('V53 strict migration, malformed mode rejection, continuation and discrete bridge phases',()=>{
  const w=equipmentCamp(1),old=structuredClone(w);(old as any).schemaVersion=52;withoutShootingSkills(old);expect(deserializeWorld(JSON.stringify(old))).toEqual(withMigratedShootingSkills(w));
  (old.pawns[0] as any).draft={lastActiveTick:old.tick,target:null,queue:[]};expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/version 52/);
  draft(w);move(w,{x:15,z:14});stepWorld(w);valid(w);
  const observer=new PresentationChanges();expect(observer.capture(w)).toBe(true);const enc=new SnapshotEncoder(),dec=new SnapshotDecoder();dec.adopt(enc.encode(w,0,1));
  move(w,{x:20,z:15},true);expect(observer.capture(w)).toBe(true);expect(dec.adopt(enc.encode(w,0,1))).toMatchObject({status:'applied',world:w});replay(w,5);
  for(const mutate of [(a:World)=>{a.pawns[0]!.draft!.lastActiveTick=a.tick+1;}, (a:World)=>{a.pawns[0]!.draft!.queue=[{x:-1,z:0}];},(a:World)=>{a.pawns[0]!.draft!.target=null;},(a:World)=>{a.pawns[0]!.draft!.queue=null as any;}]){
    const bad=structuredClone(w);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
});

test('door waiting, diagonal distance and furniture crossing use the shared physical movement contract',()=>{
  const w=equipmentCamp(1),p=w.pawns[0]!;p.x=3;p.z=5;
  for(let z=0;z<32;z++)if(z!==5)fixtureBuilding(w,'wall',8,z);
  const door={...fixtureBuilding(w,'door',8,5),material:'wood' as const,door:newDoorState(w.tick)};w.structures[w.structures.length-1]=door;
  fixtureBuilding(w,'table',10,5);draft(w);move(w,{x:15,z:6});
  until(w,()=>p.x===7&&p.z===5&&p.moveCooldown===0);stepWorld(w);expect(p.x).toBe(7);expect(doorOpenness(door,w.tick)).toBeLessThan(1);replay(w);
  until(w,()=>p.x===8&&p.moveCooldown>0);expect(door.door.open).toBe(true);const edge=structuredClone(p.motion);
  move(w,{x:6,z:6});expect(p.motion).toEqual(edge);replay(w);until(w,()=>p.x===6&&p.z===6&&p.moveCooldown===0);
  move(w,{x:7,z:7});until(w,()=>p.x===7&&p.z===7&&p.moveCooldown>0);expect(p.motion!.end-p.motion!.start).toBeCloseTo(3*Math.SQRT2/(p.motion!.speedFactor??1),8);replay(w);
});

test('meal, medicine and whole furniture keep distinct identity and content during a full-floor tactical interruption',()=>{
  for(const kind of ['meal','medicine','furniture'] as const){
    const w=exhaustedCarrier(),p=w.pawns[0]!;p.rest=90;p.restZeroTicks=0;p.collapsePending=false;
    w.piles=w.piles.filter(i=>i.owner.type!=='pawn');
    if(kind==='furniture'){
      const b={id:w.nextId++,kind:'bed' as const,material:'granite-blocks' as const,x:6,z:6,orientation:0 as const,footprint:'standard' as const};w.packed.push({building:b,owner:{type:'pawn',pawnId:p.id}});p.bedId=b.id;
      Object.assign(w.stockpiles[0]!,{x:15,z:15,filters:{wood:false,food:false,furniture:true}});w.piles=w.piles.filter(i=>i.owner.type!=='ground'||i.owner.x!==15||i.owner.z!==15);
      p.haul={sourcePileId:b.id,carryPileId:b.id,quantity:1,whole:true,phase:'deliver',pickupCell:{x:2,z:2},destination:{type:'stockpile',stockpileId:w.stockpiles[0]!.id}};
    }else{
      addMaterial(w,kind==='meal'?'food':'medicine',1,{type:'pawn',pawnId:p.id},kind==='meal'?'simple-meal':'medicine');const held=w.piles.at(-1)!;
      if(kind==='meal'){p.haul=null;p.orders.active=null;p.need={kind:'eat',phase:'choose-spot',sourcePileId:held.id,carryPileId:held.id,quantity:1,progress:0,dining:null};}
      else {Object.assign(w.stockpiles[0]!,{x:15,z:15,filters:{wood:false,food:false,medicine:true}});w.piles=w.piles.filter(i=>i.owner.type!=='ground'||i.owner.x!==15||i.owner.z!==15);p.haul={sourcePileId:held.id,carryPileId:held.id,quantity:1,phase:'deliver',pickupCell:{x:2,z:2},destination:{type:'stockpile',stockpileId:w.stockpiles[0]!.id}};}
    }
    refreshStock(w);valid(w);const cargo=structuredClone(kind==='furniture'?w.packed[0]:w.piles.find(i=>i.owner.type==='pawn'));
    draft(w);expect(p.interruptedCargo).toBe(true);expect(p.orders.queue).toEqual([]);move(w,{x:4,z:4});replay(w,4);
    expect(kind==='furniture'?w.packed[0]:w.piles.find(i=>i.owner.type==='pawn')).toEqual(cargo);
  }
});
