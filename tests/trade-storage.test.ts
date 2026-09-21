import { expect,test } from 'vitest';
import { withoutV90 } from './scenarios/legacy-skills';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { addMaterial,reservedSource } from '../src/sim/materials';
import { groundPile,storageCapacity } from '../src/sim/ground-placement';
import type { Command,World } from '../src/sim/types';
import { deconstructionCamp } from './scenarios/deconstruction';

function command(w:World,c:Command) {expect(applyCommand(w,c)).toMatchObject({ok:true});}
function camp() {const w=deconstructionCamp();w.stockpiles=[];return w;}
function until(w:World,done:()=>boolean) {
  for(let i=0;i<400&&!done();i++)stepWorld(w);
  expect(done(),JSON.stringify({tick:w.tick,pawn:w.pawns[0],piles:w.piles})).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}

test('new area and individual reserves allow 500 units, while existing policy and invalid-command atomicity remain intact',()=>{
  const w=camp();
  command(w,{type:'stockpile',enabled:true,x:15,z:16});
  command(w,{type:'area',action:'stockpile',from:{x:18,z:16},to:{x:19,z:16}});
  expect(w.stockpiles.map(z=>z.capacity)).toEqual([500,500,500]);
  command(w,{type:'stockpile',enabled:true,x:15,z:16,capacity:75});
  command(w,{type:'stockpile',enabled:true,x:15,z:16,priority:4});
  expect(w.stockpiles[0]!.capacity).toBe(75);
  for(const c of [
    {type:'stockpile',enabled:true,x:20,z:16,capacity:501},
    {type:'area',action:'stockpile',from:{x:20,z:16},to:{x:21,z:16},capacity:501},
  ] as Command[]) {const before=JSON.stringify(w);expect(applyCommand(w,c).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);}
  expect(validateWorld(w)).toEqual([]);
});

test('physical deliveries fill one silver reserve to 500 while wood still stops at 75, with reservations and continuation preserved',()=>{
  const w=camp(),p=w.pawns[0]!;
  command(w,{type:'priority',pawnId:p.id,work:'haul',value:1});
  command(w,{type:'stockpile',enabled:true,x:15,z:16,filters:{wood:false,food:false,silver:true}});
  command(w,{type:'stockpile',enabled:true,x:17,z:16,filters:{wood:true,food:false}});
  const silverZone=w.stockpiles[0]!,woodZone=w.stockpiles[1]!;
  addMaterial(w,'silver',490,{type:'ground',x:15,z:16},'silver');
  addMaterial(w,'silver',20,{type:'ground',x:12,z:16},'silver');
  addMaterial(w,'wood',70,{type:'ground',x:17,z:16},'wood');
  addMaterial(w,'wood',10,{type:'ground',x:16,z:15},'wood');
  const silverSource=groundPile(w,{x:12,z:16})!,woodSource=groundPile(w,{x:16,z:15})!;
  expect(storageCapacity(w,silverZone,'silver')).toBe(10);
  expect(storageCapacity(w,woodZone,'wood')).toBe(5);
  command(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:silverSource.id},queue:false});
  expect(reservedSource(w,silverSource.id)).toBe(10);expect(storageCapacity(w,silverZone,'silver')).toBe(0);
  expect(validateWorld(w)).toEqual([]);
  until(w,()=>groundPile(w,silverZone)?.quantity===500);
  expect(silverSource.quantity).toBe(10);
  command(w,{type:'order-haul',pawnId:p.id,target:{type:'pile',pileId:woodSource.id},queue:false});
  expect(reservedSource(w,woodSource.id)).toBe(5);expect(storageCapacity(w,woodZone,'wood')).toBe(0);
  until(w,()=>groundPile(w,woodZone)?.quantity===75);
  expect(woodSource.quantity).toBe(5);
  const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
  expect(serializeWorld(copy)).toBe(serializeWorld(w));
  expect(groundPile(w,silverZone)?.quantity).toBe(500);expect(groundPile(w,woodZone)?.quantity).toBe(75);
  expect(w.piles.filter(p=>p.item==='silver').reduce((n,p)=>n+p.quantity,0)).toBe(510);
  expect(w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0)).toBe(80);
});

test('V87 retains its 75-unit policies on migration and refuses an out-of-version capacity before migration',()=>{
  const w=camp();command(w,{type:'stockpile',enabled:true,x:15,z:16,capacity:75});
  const raw=withoutV90(JSON.parse(serializeWorld(w)));raw.schemaVersion=87;for(const p of raw.pawns)delete p.priorities.clean;
  const savedZone=structuredClone(raw.stockpiles[0]),migrated=deserializeWorld(JSON.stringify(raw));
  expect(migrated.stockpiles[0]).toEqual(savedZone);
  command(migrated,{type:'stockpile',enabled:true,x:15,z:16,priority:3});
  expect(migrated.stockpiles[0]!.capacity).toBe(75);
  command(migrated,{type:'stockpile',enabled:true,x:16,z:16});expect(migrated.stockpiles[1]!.capacity).toBe(500);
  raw.stockpiles[0].capacity=500;
  expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow(/Invalid storage policy/);
});
