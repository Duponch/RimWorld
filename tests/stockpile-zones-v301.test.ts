import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { queryArea } from '../src/sim/designation.ts';
import { growingZoneAt } from '../src/sim/farming.ts';
import { stockpileZoneCells,stockpileZoneId } from '../src/sim/stockpile-zones.ts';
import { storageAccepts } from '../src/sim/storage-filters.ts';
import { storageConditionKey } from '../src/sim/storage-condition.ts';
import { storageCapacity } from '../src/sim/ground-placement.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { ITEM_DEFINITIONS } from '../src/sim/items.ts';
import { TICKS_PER_DAY,type Command,type MaterialPile,type World } from '../src/sim/types.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';

function camp():World {const w=deconstructionCamp(1);w.tick=2000;w.stockpiles=[];w.growingZones=[];return w;}
function command(w:World,c:Command):void {expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});}
function stockpile(w:World,x=4,to=7,z=4):number {
  command(w,{type:'area',action:'stockpile',from:{x,z},to:{x:to,z},filters:{wood:true,food:false},priority:2});
  return stockpileZoneId(w.stockpiles.find(cell=>cell.x===x&&cell.z===z)!);
}

test('one policy command edits all zone cells immediately, preserves cell IDs and copies input settings',()=>{
  const w=camp(),id=stockpile(w),ids=w.stockpiles.map(cell=>cell.id),selected=w.stockpiles[2]!;
  const settings={filters:{wood:false,food:true},items:{rice:true},priority:5,quality:{min:'normal' as const,max:'legendary' as const},hitPoints:{min:25,max:100},allowFresh:false,allowRotten:true};
  command(w,{type:'stockpile-policy',stockpileId:selected.id,settings});
  expect(w.stockpiles.map(cell=>cell.id)).toEqual(ids);
  expect(stockpileZoneCells(w,selected.id)).toHaveLength(4);
  for(const cell of w.stockpiles){expect(stockpileZoneId(cell)).toBe(id);expect(cell).toMatchObject(settings);}
  settings.items.rice=false;settings.hitPoints.min=90;
  expect(w.stockpiles.every(cell=>cell.items?.rice===true&&cell.hitPoints?.min===25)).toBe(true);
  w.stockpiles[0]!.items!.rice=false;expect(w.stockpiles[1]!.items!.rice).toBe(true);
});

test('expansion inherits the target policy, automatic rectangle selection expands one encountered zone, unrelated zones remain distinct',()=>{
  const w=camp(),id=stockpile(w,4,5),first=w.stockpiles[0]!;
  command(w,{type:'stockpile-policy',stockpileId:first.id,settings:{priority:5,items:{wood:true},allowFresh:false}});
  command(w,{type:'area',action:'stockpile',from:{x:4,z:4},to:{x:7,z:4},priority:1});
  expect(w.stockpiles).toHaveLength(4);
  expect(w.stockpiles.every(cell=>stockpileZoneId(cell)===id&&cell.priority===5&&cell.items?.wood===true&&cell.allowFresh===false)).toBe(true);
  stockpile(w,8,9);expect(stockpileZoneId(w.stockpiles.find(cell=>cell.x===8)!)).not.toBe(id);
  command(w,{type:'area',action:'stockpile',targetZoneId:id,from:{x:7,z:4},to:{x:7,z:5},priority:1});
  expect(w.stockpiles.find(cell=>cell.x===7&&cell.z===5)?.priority).toBe(5);
  expect(queryArea(w,{type:'area',action:'stockpile',targetZoneId:id,from:{x:20,z:20},to:{x:21,z:20}})).toMatchObject({ok:true,cells:[]});
});

test('shrink preserves logical identity after the anchor is removed and removes detached fragments as Core does',()=>{
  const w=camp(),id=stockpile(w);
  command(w,{type:'area',action:'remove-stockpile',targetZoneId:id,from:{x:4,z:4},to:{x:4,z:4}});
  expect(w.stockpiles.map(cell=>cell.x)).toEqual([5,6,7]);
  expect(w.stockpiles.every(cell=>cell.zoneId===id)).toBe(true);
  command(w,{type:'area',action:'remove-stockpile',targetZoneId:id,from:{x:6,z:4},to:{x:6,z:4}});
  expect(w.stockpiles.map(cell=>cell.x)).toEqual([5]);expect(w.stockpiles[0]!.zoneId).toBe(id);
  command(w,{type:'delete-zone',kind:'stockpile',zoneId:id});expect(w.stockpiles).toEqual([]);
});

test('targeted deletion leaves neighbouring zones and physical contents alone; invalid commands are atomic',()=>{
  const w=camp(),id=stockpile(w,4,5);stockpile(w,6,7);
  const pile:MaterialPile={id:w.nextId++,kind:'wood',item:'wood',quantity:30,owner:{type:'ground',x:4,z:4}};w.piles.push(pile);refreshStock(w);
  const owner=structuredClone(pile),next=w.nextId;
  command(w,{type:'delete-zone',kind:'stockpile',zoneId:id});expect(w.stockpiles.map(cell=>cell.x)).toEqual([6,7]);expect(pile).toEqual(owner);expect(w.nextId).toBe(next);
  for(const c of [{type:'delete-zone',kind:'stockpile',zoneId:id},{type:'stockpile-policy',stockpileId:w.stockpiles[0]!.id,settings:{priority:6}},{type:'stockpile-policy',stockpileId:w.stockpiles[0]!.id,settings:{allowFresh:'yes'}},...['corpse','chemfuel'].map(key=>({type:'stockpile-policy',stockpileId:w.stockpiles[0]!.id,settings:{filters:{wood:false,food:false,[key]:'yes'}}}))] as unknown as Command[]){
    const before=structuredClone(w);expect(applyCommand(w,c).ok).toBe(false);expect(w).toEqual(before);
  }
});

test('growing expansion/shrink uses the same identity and policy; hydroponic membership cannot be edited as a ground zone',()=>{
  const w=camp();command(w,{type:'area',action:'growing',from:{x:4,z:8},to:{x:5,z:8}});const zone=w.growingZones[0]!;
  command(w,{type:'growing-policy',zoneId:zone.id,plant:'cotton',allowSow:false,allowCut:true});
  command(w,{type:'area',action:'growing',targetZoneId:zone.id,from:{x:5,z:8},to:{x:7,z:8}});
  expect(w.growingZones).toHaveLength(1);expect(w.growingZones[0]).toMatchObject({id:zone.id,plant:'cotton',allowSow:false,cells:[260,261,262,263]});
  command(w,{type:'area',action:'remove-growing',targetZoneId:zone.id,from:{x:6,z:8},to:{x:6,z:8}});expect(w.growingZones[0]!.cells).toEqual([260,261]);
  w.growingZones[0]!.basinId=999;
  for(const action of ['growing','remove-growing'] as const)expect(queryArea(w,{type:'area',action,targetZoneId:zone.id,from:{x:4,z:8},to:{x:5,z:8}}).ok).toBe(false);
});

test('growing creation and north expansion refresh a warm farming index and keep canonical save order',()=>{
  const w=camp(),first=8*w.width+4,north=first-w.width;
  expect(growingZoneAt(w,first)).toBeUndefined();
  const beforeCreation=w.growingZones;
  command(w,{type:'area',action:'growing',from:{x:4,z:8},to:{x:5,z:8}});
  expect(w.growingZones).not.toBe(beforeCreation);
  const zone=growingZoneAt(w,first)!;expect(zone).toBeDefined();
  expect(growingZoneAt(w,north)).toBeUndefined();
  const beforeExpansion=w.growingZones;
  command(w,{type:'area',action:'growing',targetZoneId:zone.id,from:{x:4,z:7},to:{x:4,z:7}});
  expect(w.growingZones).not.toBe(beforeExpansion);
  expect(growingZoneAt(w,north)?.id).toBe(zone.id);
  expect(growingZoneAt(w,first)).toBe(w.growingZones[0]);
  expect(w.growingZones[0]!.cells).toEqual([north,first,first+1]);
  const beforeRefusal=serializeWorld(w);
  expect(applyCommand(w,{type:'stockpile',x:4,z:7,enabled:true}).ok).toBe(false);
  expect(serializeWorld(w)).toBe(beforeRefusal);
  expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(resumed);expect(resumed).toEqual(w);
});

test('fresh/rotten boundaries and condition-cache classes use anchored thermal age, while ordinary nonfood is unaffected',()=>{
  const zone={filters:{wood:true,food:true,corpse:true},allowFresh:false,allowRotten:true};
  const corpse:MaterialPile={id:2,kind:'corpse',item:'hare-corpse',quantity:1,owner:{type:'ground',x:0,z:0},rot:{progress:0,atTick:100,rate:.5}};
  const boundary=100+5*TICKS_PER_DAY;
  expect(storageAccepts(zone,corpse,boundary-1)).toBe(false);expect(storageAccepts(zone,corpse,boundary)).toBe(true);
  expect(storageConditionKey(corpse,boundary-1,true)).not.toBe(storageConditionKey(corpse,boundary,true));
  expect(storageAccepts({...zone,allowRotten:false},corpse,boundary)).toBe(false);
  expect(storageAccepts(zone,{...corpse,kind:'food',item:'rice'},boundary)).toBe(false);
  expect(storageAccepts(zone,{...corpse,kind:'wood',item:'wood',rot:undefined},boundary)).toBe(true);
  expect(storageAccepts({filters:{wood:false,food:false,'mech-corpse':true},allowFresh:false,allowRotten:false},{...corpse,kind:'mech-corpse',item:'scyther-corpse',rot:undefined},boundary)).toBe(true);
});

test('capacity is a per-cell physical stack bound, not a zone-wide number',()=>{
  const w=camp();stockpile(w,4,5);const a=w.stockpiles[0]!,b=w.stockpiles[1]!;
  expect(a.capacity).toBe(ITEM_DEFINITIONS.silver.stackLimit);expect(storageCapacity(w,a,'wood')).toBe(ITEM_DEFINITIONS.wood.stackLimit);
  w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:ITEM_DEFINITIONS.wood.stackLimit,owner:{type:'ground',x:a.x,z:a.z}});
  expect(storageCapacity(w,a,'wood')).toBe(0);expect(storageCapacity(w,b,'wood')).toBe(ITEM_DEFINITIONS.wood.stackLimit);
});

test('whole-zone edits release actual carried claims without losing cargo and resume deterministically',()=>{
  const w=camp(),p=w.pawns[0]!;p.x=3;p.z=4;p.priorities.haul=1;p.apparelAutomation=false;
  const id=stockpile(w,7,8),destination=w.stockpiles[1]!;
  const pile:MaterialPile={id:w.nextId++,kind:'wood',item:'wood',quantity:10,owner:{type:'ground',x:3,z:5}};w.piles.push(pile);refreshStock(w);
  command(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:pile.id},queue:false});
  for(let i=0;i<120&&p.haul?.phase!=='deliver';i++)stepWorld(w);
  expect(p.haul?.phase).toBe('deliver');
  const carried=w.piles.find(item=>item.id===p.haul?.carryPileId)!;
  expect(carried.owner).toEqual({type:'pawn',pawnId:p.id});expect(carried.quantity).toBe(10);
  const woodBefore=w.piles.filter(item=>item.kind==='wood').reduce((sum,item)=>sum+item.quantity,0);
  // Force selection through another member than the actual destination.
  expect(stockpileZoneId(destination)).toBe(id);
  command(w,{type:'stockpile-policy',stockpileId:destination.id,settings:{filters:{wood:false,food:true}}});
  expect(p.haul).toBeNull();expect(carried.quantity).toBe(10);expect(carried.owner.type).toBe('ground');expect(w.piles.filter(item=>item.id===carried.id)).toHaveLength(1);
  expect(w.piles.filter(item=>item.kind==='wood').reduce((sum,item)=>sum+item.quantity,0)).toBe(woodBefore);
  expect(validateWorld(w)).toEqual([]);const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,3);stepWorld(resumed,3);expect(resumed).toEqual(w);
});
