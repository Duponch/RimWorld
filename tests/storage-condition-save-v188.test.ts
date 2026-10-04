import { expect,test } from 'vitest';
import { withoutMiningSkill,withoutPredatorDefaults } from './scenarios/legacy-skills.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { newApparelState } from '../src/sim/apparel-rules.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { SCHEMA_VERSION,type Command,type Pawn,type World } from '../src/sim/types.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';

function camp():World {
  const w=deconstructionCamp(1),p=w.pawns[0]!;w.stockpiles=[];w.growingZones=[];w.tick=2000;
  p.x=3;p.z=4;p.apparelAutomation=false;p.recreation.level=100;p.schedule.fill('work');
  for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  p.priorities.haul=1;refreshStock(w);return w;
}
function command(w:World,c:Command):void {expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});}
function valid(w:World):void {expect(validateWorld(w),JSON.stringify({tick:w.tick,errors:validateWorld(w)})).toEqual([]);}
function until(w:World,done:()=>boolean,max=800):void {for(let i=0;i<max&&!done();i++)stepWorld(w);valid(w);expect(done()).toBe(true);}
function prepared() {
  const w=camp(),p=w.pawns[0]!;
  command(w,{type:'stockpile',enabled:true,x:20,z:4,filters:{wood:false,food:false,apparel:true},priority:4,capacity:1,
    quality:{min:'normal',max:'legendary'},hitPoints:{min:70,max:100}});
  const zone=w.stockpiles[0]!,item={id:w.nextId++,item:'cloth-shirt' as const,kind:'apparel' as const,quantity:1,
    owner:{type:'ground' as const,x:5,z:4},apparel:{...newApparelState('cloth-shirt'),quality:'normal' as const,hitPoints:80}};
  w.piles.push(item);refreshStock(w);valid(w);return {w,p,zone,item};
}

test('strict schema 175 rejects future quality and PV fields before a neutral 176 migration',()=>{
  const old=withoutPredatorDefaults(withoutMiningSkill(camp()));command(old,{type:'stockpile',enabled:true,x:15,z:10,filters:{wood:true,food:true},priority:2});
  old.schemaVersion=175 as World['schemaVersion'];const before=structuredClone(old);
  const resumed=deserializeWorld(JSON.stringify(old));expect(resumed).toEqual({...before,schemaVersion:SCHEMA_VERSION});
  expect(old).toEqual(before);expect(resumed.stockpiles[0]!.quality).toBeUndefined();expect(resumed.stockpiles[0]!.hitPoints).toBeUndefined();
  for(const change of [
    (w:World)=>{w.stockpiles[0]!.quality={min:'awful',max:'legendary'};},
    (w:World)=>{w.stockpiles[0]!.hitPoints={min:0,max:100};},
    (w:World)=>{Object.assign(w.stockpiles[0]!,{quality:[]});},
  ]){const corrupt=structuredClone(old);change(corrupt);expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow();}
});

test('malformed ranges and refused cell/rectangle commands are atomic; clearing the criteria restores legacy admission without changing an item',()=>{
  const {w,p,zone,item}=prepared();command(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:item.id},queue:false});
  until(w,()=>p.haul?.phase==='deliver');const itemState=structuredClone(item.apparel);
  const badSettings=[
    {quality:{min:'normal'}},{quality:{min:'normal',max:'invented'}},{quality:{min:'excellent',max:'poor'}},
    {quality:{min:'normal',max:'legendary',future:true}},{quality:['normal','legendary']},
    {hitPoints:{min:-1,max:100}},{hitPoints:{min:0,max:101}},{hitPoints:{min:90,max:80}},
    {hitPoints:{min:NaN,max:100}},{hitPoints:{min:0,max:Infinity}},{hitPoints:{min:0}},
    {hitPoints:{min:0,max:100,future:true}},{hitPoints:[0,100]},
  ];
  for(const settings of badSettings) {
    for(const c of [
      {type:'stockpile',enabled:true,x:zone.x,z:zone.z,...settings},
      {type:'area',action:'stockpile',from:{x:12,z:10},to:{x:14,z:10},...settings},
    ]){const before=serializeWorld(w);expect(applyCommand(w,c as unknown as Command).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
    const corrupt=structuredClone(w);Object.assign(corrupt.stockpiles[0]!,settings);expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow();
  }
  command(w,{type:'stockpile',enabled:true,x:zone.x,z:zone.z,quality:undefined,hitPoints:undefined});
  expect(Object.hasOwn(zone,'quality')).toBe(false);expect(Object.hasOwn(zone,'hitPoints')).toBe(false);
  expect(item.apparel).toEqual(itemState);valid(w);
  until(w,()=>item.owner.type==='ground'&&item.owner.x===zone.x&&item.owner.z===zone.z&&!p.haul);
  expect(item.apparel).toEqual(itemState);expect(w.piles).toHaveLength(1);
});

test('actual pickup checkpoints resume exactly and saves reject a now forbidden carried-instance reservation',()=>{
  const {w,p,zone,item}=prepared();command(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:item.id},queue:false});
  const approach=deserializeWorld(serializeWorld(w));stepWorld(w,2);stepWorld(approach,2);expect(approach).toEqual(w);
  until(w,()=>p.haul?.phase==='deliver');expect(item.owner).toEqual({type:'pawn',pawnId:p.id});
  const snapshot=serializeWorld(w),resumed=deserializeWorld(snapshot),identity=structuredClone(item.apparel);
  for(const change of [
    (bad:World)=>{bad.stockpiles[0]!.quality={min:'excellent',max:'legendary'};},
    (bad:World)=>{bad.stockpiles[0]!.hitPoints={min:90,max:100};},
    (bad:World)=>{bad.piles.find(q=>q.id===item.id)!.apparel!.quality='poor';},
    (bad:World)=>{bad.piles.find(q=>q.id===item.id)!.apparel!.hitPoints=60;},
  ]){const bad=structuredClone(w);change(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();expect(serializeWorld(w)).toBe(snapshot);}
  until(w,()=>item.owner.type==='ground'&&item.owner.x===zone.x&&item.owner.z===zone.z&&!p.haul);
  stepWorld(resumed,w.tick-resumed.tick);expect(resumed).toEqual(w);expect(item.apparel).toEqual(identity);expect(item.quantity).toBe(1);
});

test('same-tick storage ranges cross deltas and malformed or historical future fields trigger an atomic resync',()=>{
  const {w,zone}=prepared(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const initial=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(initial.status).toBe('applied');
  if(initial.status!=='applied')throw Error('initial checkpoint rejected');const frozen=structuredClone(initial.world),tick=w.tick;
  command(w,{type:'stockpile',enabled:true,x:zone.x,z:zone.z,quality:{min:'good',max:'masterwork'},hitPoints:{min:40,max:85}});
  expect(w.tick).toBe(tick);const delta=structuredClone(encoder.encode(w,0,6));expect(delta.kind).toBe('delta');
  for(const change of [
    (bad:World)=>{Object.assign(bad.stockpiles[0]!.quality!,{max:'invented'});},
    (bad:World)=>{bad.stockpiles[0]!.quality={min:'legendary',max:'poor'};},
    (bad:World)=>{bad.stockpiles[0]!.hitPoints={min:0,max:101};},
    (bad:World)=>{Object.assign(bad.stockpiles[0]!.hitPoints!,{min:NaN});},
    (bad:World)=>{Object.assign(bad.stockpiles[0]!.hitPoints!,{future:true});},
  ]){const invalid=structuredClone(delta);change(invalid.world as World);expect(decoder.adopt(invalid).status).toBe('resync');expect(initial.world).toEqual(frozen);}
  const adopted=decoder.adopt(delta);expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);
  expect(initial.world).toEqual(frozen);
  const checkpoint=structuredClone(encoder.encode(w,0,6,true)),old=structuredClone(checkpoint),freshDecoder=new SnapshotDecoder();
  old.world.schemaVersion=175 as World['schemaVersion'];expect(freshDecoder.adopt(old).status).toBe('resync');
  expect(freshDecoder.adopt(checkpoint).status).toBe('applied');
});
