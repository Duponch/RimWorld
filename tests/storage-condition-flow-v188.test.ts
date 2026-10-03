import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { newApparelState } from '../src/sim/apparel-rules.ts';
import { mayImproveStorage } from '../src/sim/idle-logistics.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import type { WeaponQuality } from '../src/sim/equipment-rules.ts';
import type { PackedFurniture } from '../src/sim/furniture-rules.ts';
import type { Cell,Command,MaterialPile,Pawn,StockpileCell,StorageSettings,World } from '../src/sim/types.ts';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction.ts';

function camp():World {
  const w=deconstructionCamp(1),p=w.pawns[0]!;w.tick=2000;w.stockpiles=[];w.packed=[];w.growingZones=[];
  p.x=3;p.z=4;p.recreation.level=100;p.apparelAutomation=false;p.schedule.fill('work');
  for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
  p.priorities.haul=1;refreshStock(w);return w;
}
function command(w:World,c:Command):void {expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});}
function valid(w:World):void {
  const errors=validateWorld(w);expect(errors,JSON.stringify({tick:w.tick,errors,p:w.pawns.map(p=>({id:p.id,xy:[p.x,p.z],haul:p.haul,cooking:p.cooking}))})).toEqual([]);
}
function until(w:World,done:()=>boolean,max=1600):void {
  for(let i=0;i<max&&!done();i++)stepWorld(w);
  valid(w);expect(done(),JSON.stringify({tick:w.tick,p:w.pawns.map(p=>({xy:[p.x,p.z],haul:p.haul,cooking:p.cooking})),piles:w.piles,packed:w.packed})).toBe(true);
}
function replay(w:World,ticks=3):void {
  valid(w);const resumed=deserializeWorld(serializeWorld(w));stepWorld(resumed,ticks);stepWorld(w,ticks);expect(resumed).toEqual(w);valid(w);
}
function zone(w:World,x:number,z:number,settings:StorageSettings):StockpileCell {
  command(w,{type:'stockpile',enabled:true,x,z,filters:{wood:false,food:false,apparel:true},capacity:1,...settings});
  return w.stockpiles.find(q=>q.x===x&&q.z===z)!;
}
function shirt(w:World,cell:Cell,quality:WeaponQuality,hp:number):MaterialPile {
  const p:MaterialPile={id:w.nextId++,item:'cloth-shirt',kind:'apparel',quantity:1,owner:{type:'ground',x:cell.x,z:cell.z},apparel:{...newApparelState('cloth-shirt'),quality,hitPoints:hp}};
  w.piles.push(p);refreshStock(w);return p;
}
const at=(pile:MaterialPile,cell:Cell)=>pile.owner.type==='ground'&&pile.owner.x===cell.x&&pile.owner.z===cell.z;
const packedAt=(pack:PackedFurniture,cell:Cell)=>pack.owner.type==='ground'&&pack.owner.x===cell.x&&pack.owner.z===cell.z;
function parcel(w:World,cell:Cell,quality:WeaponQuality,damage?:number):PackedFurniture {
  const building=fixtureBuilding(w,'bed',cell.x,cell.z);w.structures.pop();Object.assign(building,{quality,...damage?{damage}:{}});
  const pack:PackedFurniture={building,owner:{type:'ground',x:cell.x,z:cell.z}};w.packed.push(pack);return pack;
}

test('same item instances sort by their current quality and PV; a refused source can leave for lower priority without a false ItemId cache',()=>{
  const w=camp(),p=w.pawns[0]!;
  const source=zone(w,4,4,{priority:4,quality:{min:'normal',max:'legendary'},hitPoints:{min:70,max:100}});
  const low=zone(w,13,4,{priority:1,quality:{min:'awful',max:'poor'},hitPoints:{min:0,max:69}});
  const high=zone(w,15,4,{priority:4,quality:{min:'normal',max:'legendary'},hitPoints:{min:70,max:100}});
  const poor=shirt(w,source,'poor',45),good=shirt(w,{x:5,z:6},'normal',100),ids=[poor.id,good.id],next=w.nextId;
  const states=[structuredClone(poor.apparel),structuredClone(good.apparel)];
  expect(mayImproveStorage(w)).toBe(true);until(w,()=>p.haul?.phase==='deliver');
  const held=w.piles.find(q=>q.id===p.haul!.carryPileId)!;expect(held.owner).toEqual({type:'pawn',pawnId:p.id});
  expect(at(held,held.id===poor.id?low:high)).toBe(false);replay(w);
  until(w,()=>at(poor,low)&&at(good,high)&&!p.haul);expect(w.nextId).toBe(next);
  expect(w.piles.map(q=>q.id).sort((a,b)=>a-b)).toEqual(ids.sort((a,b)=>a-b));
  expect([poor.apparel,good.apparel]).toEqual(states);expect(w.piles.reduce((n,q)=>n+q.quantity,0)).toBe(2);
  expect(mayImproveStorage(w)).toBe(false);replay(w,25);expect(at(poor,low)&&at(good,high)).toBe(true);
});

test('changing quality or PV while a garment is carried releases the forbidden destination and physically delivers the same object elsewhere',()=>{
  for(const criterion of ['quality','hitPoints'] as const) {
    const w=camp(),p=w.pawns[0]!,target=zone(w,20,4,{priority:4}),fallback=zone(w,16,9,{priority:1});
    const item=shirt(w,{x:5,z:4},'normal',80),id=item.id,state=structuredClone(item.apparel),next=w.nextId;
    command(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:id},queue:false});
    until(w,()=>p.haul?.phase==='deliver');expect(item.owner).toEqual({type:'pawn',pawnId:p.id});replay(w);
    const change=criterion==='quality'?{quality:{min:'excellent' as const,max:'legendary' as const}}:{hitPoints:{min:90,max:100}};
    command(w,{type:'stockpile',enabled:true,x:target.x,z:target.z,...change});
    expect(at(item,target)).toBe(false);expect(w.piles.find(q=>q.id===id)).toBe(item);expect(item.apparel).toEqual(state);
    expect(p.haul?.destination).not.toEqual({type:'stockpile',stockpileId:target.id});replay(w);
    until(w,()=>at(item,fallback)&&!p.haul);expect(item.id).toBe(id);expect(item.apparel).toEqual(state);expect(w.nextId).toBe(next);
    expect(w.piles).toHaveLength(1);expect(item.quantity).toBe(1);replay(w,10);
  }
});

test('tailoring selects storage from the final quality once; invalidating its output reservation conserves finished cargo, matter and draw',()=>{
  const w=camp(),p=w.pawns[0]!;p.priorities.haul=0;p.priorities.craft=1;p.skills.crafting={level:8,xp:0,dailyXp:0,passion:0};
  addGroundMaterial(w,'textile',60,{x:2,z:4},'cloth');
  command(w,{type:'designate',kind:'crafting-spot',x:8,z:8});const bench=w.structures[0]!;
  command(w,{type:'bill-add',structureId:bench.id});const bill=bench.bills![0]!;
  command(w,{type:'bill-update',structureId:bench.id,billId:bill.id,settings:{...bill,destination:'stockpile'}});
  const refused=zone(w,18,8,{priority:4,quality:{min:'legendary',max:'legendary'}}),target=zone(w,16,12,{priority:3});
  until(w,()=>p.cooking?.phase==='output',4000);
  const product=w.piles.find(q=>q.id===p.cooking!.productId)!,id=product.id,apparel=structuredClone(product.apparel),rng=w.rng;
  expect(product.owner).toEqual({type:'pawn',pawnId:p.id});expect(product.apparel!.quality).not.toBe('legendary');
  expect(w.piles.some(q=>q.item==='cloth'||q.unfinished)).toBe(false);expect(w.tailoring!.completed).toBe(1);expect(bill.target).toBe(0);
  until(w,()=>p.cooking?.storageId===target.id);expect(p.cooking!.storageId).not.toBe(refused.id);replay(w);
  command(w,{type:'stockpile',enabled:true,x:target.x,z:target.z,quality:{min:'legendary',max:'legendary'}});
  expect(p.cooking?.storageId).toBeNull();expect(product.owner).toEqual({type:'pawn',pawnId:p.id});expect(product.apparel).toEqual(apparel);
  const replacement=zone(w,20,13,{priority:2,quality:{min:product.apparel!.quality,max:product.apparel!.quality},hitPoints:{min:100,max:100}});
  replay(w);until(w,()=>at(product,replacement)&&!p.cooking);
  expect(product.id).toBe(id);expect(product.apparel).toEqual(apparel);expect(w.rng).toBe(rng);
  expect(w.tailoring!.completed).toBe(1);expect(w.piles.filter(q=>q.kind==='apparel')).toHaveLength(1);
  expect(w.piles.filter(q=>q.item==='cloth').reduce((n,q)=>n+q.quantity,0)).toBe(0);replay(w);
});

test('packed beds sort using the inner building state and keep identity, quality and damage through actual hauling and reinstallation',()=>{
  const w=camp(),p=w.pawns[0]!,filters={wood:false,food:false,furniture:true};
  const source=zone(w,4,4,{filters,priority:4,quality:{min:'normal',max:'legendary'},hitPoints:{min:70,max:100}});
  const low=zone(w,13,4,{filters,priority:1,quality:{min:'awful',max:'poor'},hitPoints:{min:0,max:69}});
  const high=zone(w,15,4,{filters,priority:3,quality:{min:'normal',max:'legendary'},hitPoints:{min:70,max:100}});
  const poor=parcel(w,source,'poor',70),good=parcel(w,{x:5,z:6},'good',10),original=structuredClone(good.building),ids=[poor.building.id,good.building.id];
  until(w,()=>p.haul?.whole===true&&p.haul.phase==='deliver');
  expect(w.packed.find(q=>q.building.id===p.haul!.carryPileId)!.owner).toEqual({type:'pawn',pawnId:p.id});replay(w);
  until(w,()=>packedAt(poor,low)&&packedAt(good,high)&&!p.haul);
  expect(w.packed.map(q=>q.building.id).sort((a,b)=>a-b)).toEqual(ids.sort((a,b)=>a-b));expect(good.building).toEqual(original);expect(w.piles).toEqual([]);
  p.priorities.build=1;command(w,{type:'install',structureId:good.building.id,x:21,z:12,orientation:1});replay(w);
  until(w,()=>w.structures.some(q=>q.id===good.building.id));
  const installed=w.structures.find(q=>q.id===good.building.id)!;
  expect(installed).toBe(good.building);expect(installed).toMatchObject({quality:original.quality,damage:original.damage,x:21,z:12,orientation:1});
  expect(w.packed).toHaveLength(1);expect(w.packed[0]).toBe(poor);replay(w,10);
});
