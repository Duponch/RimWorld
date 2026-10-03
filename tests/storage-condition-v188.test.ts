import { expect,test } from 'vitest';
import { storageAccepts } from '../src/sim/storage-filters.ts';
import { storageConditionAccepts,storageConditionKey,validStorageConditions,type StorageConditions } from '../src/sim/storage-condition.ts';
import { newApparelState } from '../src/sim/apparel-rules.ts';
import { newWeaponState } from '../src/sim/equipment-rules.ts';
import type { MaterialPile,Structure } from '../src/sim/types.ts';

const shirt=():MaterialPile=>({id:1,kind:'apparel',item:'flak-vest',quantity:1,owner:{type:'ground',x:1,z:1},apparel:newApparelState('flak-vest')});
const bed=():Structure=>({id:2,kind:'bed',x:2,z:2,orientation:0,footprint:'standard',material:'steel',quality:'normal'});

test('absent conditions preserve historical category/list rules and version compatibility',()=>{
  const zone={filters:{wood:true,food:false,apparel:true}};
  expect(validStorageConditions(zone,175)).toBe(true);
  expect(validStorageConditions(zone,176)).toBe(true);
  expect(storageAccepts(zone,shirt())).toBe(true);
  expect(storageAccepts({...zone,items:{}},shirt())).toBe(false);
  expect(storageAccepts({...zone,filters:{wood:true,food:false}},shirt())).toBe(false);
});

test('strict ranges reject future fields, malformed objects and reversed endpoints',()=>{
  const valid:StorageConditions={quality:{min:'poor',max:'excellent'},hitPoints:{min:0,max:100}};
  expect(validStorageConditions(valid)).toBe(true);
  expect(validStorageConditions(valid,175)).toBe(false);
  for(const value of [null,[],{quality:null},{quality:{min:'normal'}},{quality:{min:'good',max:'poor'}},
    {quality:{min:'normal',max:'excellent',extra:true}},{quality:{min:'unknown',max:'legendary'}},
    {hitPoints:{min:NaN,max:100}},{hitPoints:{min:.5,max:100}},{hitPoints:{min:0,max:101}},
    {hitPoints:{min:60,max:50}},{hitPoints:{min:0,max:100,extra:0}}])expect(validStorageConditions(value)).toBe(false);
});

test('actual apparel requires the intersection of quality, HP, category and item permissions',()=>{
  const p=shirt();p.apparel!.quality='good';p.apparel!.hitPoints=100;
  const zone={filters:{wood:false,food:false,apparel:true},items:{'flak-vest':true},
    quality:{min:'good',max:'excellent'} as NonNullable<StorageConditions['quality']>,hitPoints:{min:50,max:80}};
  expect(storageAccepts(zone,p)).toBe(true);
  expect(storageAccepts({...zone,hitPoints:{min:51,max:80}},p)).toBe(false);
  expect(storageAccepts({...zone,quality:{min:'excellent',max:'legendary'}},p)).toBe(false);
  expect(storageAccepts({...zone,items:{'flak-vest':false}},p)).toBe(false);
  // Prospective product admission cannot invent its not-yet-rolled quality/HP.
  expect(storageAccepts({...zone,hitPoints:{min:90,max:100}},'flak-vest')).toBe(true);
});

test('HP centieth rounding preserves Core single-precision ties to even',()=>{
  const p=shirt();p.apparel!.hitPoints=85; // 42.5% -> even 42.
  expect(storageConditionAccepts({hitPoints:{min:42,max:42}},p)).toBe(true);
  expect(storageConditionAccepts({hitPoints:{min:43,max:100}},p)).toBe(false);
  p.apparel!.hitPoints=87; // 43.5% -> even 44.
  expect(storageConditionAccepts({hitPoints:{min:44,max:44}},p)).toBe(true);
  expect(storageConditionAccepts({hitPoints:{min:0,max:43}},p)).toBe(false);
});

test('quality is ignored only when absent, while zero-max-HP items ignore the HP range',()=>{
  const wood:MaterialPile={id:3,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',x:0,z:0},damage:75};
  const steel:MaterialPile={id:4,kind:'steel',item:'steel',quantity:1,owner:{type:'ground',x:0,z:0}};
  const zone:StorageConditions={quality:{min:'legendary',max:'legendary'},hitPoints:{min:50,max:50}};
  expect(storageConditionAccepts(zone,wood)).toBe(true);
  expect(storageConditionAccepts({...zone,hitPoints:{min:51,max:100}},wood)).toBe(false);
  expect(storageConditionAccepts({...zone,hitPoints:{min:0,max:0}},steel)).toBe(true);
  const p=shirt();expect(storageConditionAccepts(zone,p)).toBe(false);
});

test('weapon hit points use the weapon state instead of generic pile damage',()=>{
  const p:MaterialPile={id:5,kind:'weapon',item:'revolver',quantity:1,owner:{type:'ground',x:0,z:0},weapon:newWeaponState(),damage:99};
  p.weapon!.quality='excellent';p.weapon!.hitPoints=60;
  expect(storageConditionAccepts({quality:{min:'good',max:'legendary'},hitPoints:{min:60,max:60}},p)).toBe(true);
  expect(storageConditionAccepts({hitPoints:{min:61,max:100}},p)).toBe(false);
});

test('packed furniture conditions use actual material-dependent max HP and present quality',()=>{
  const s=bed();s.quality='excellent';s.damage=70;
  expect(storageConditionAccepts({quality:{min:'excellent',max:'legendary'},hitPoints:{min:50,max:50}},s)).toBe(true);
  expect(storageConditionAccepts({quality:{min:'legendary',max:'legendary'}},s)).toBe(false);
  delete s.quality;
  expect(storageConditionAccepts({quality:{min:'legendary',max:'legendary'},hitPoints:{min:50,max:50}},s)).toBe(true);
  s.material='wood';s.damage=45; // Max 91, rounded remaining fraction 51%.
  expect(storageConditionAccepts({hitPoints:{min:51,max:51}},s)).toBe(true);
});

test('cache equivalence uses condition state, never identity, quantity or owner',()=>{
  const a=shirt(),b=shirt();a.apparel!.hitPoints=85;b.apparel!.hitPoints=84;
  b.id=99;b.owner={type:'apparel',pawnId:8};
  expect(storageConditionKey(a)).toBe(storageConditionKey(b));
  b.apparel!.hitPoints=86;expect(storageConditionKey(a)).not.toBe(storageConditionKey(b));
  b.apparel!.hitPoints=85;b.apparel!.quality='good';expect(storageConditionKey(a)).not.toBe(storageConditionKey(b));
  const s=bed();expect(storageConditionKey(s)).not.toBe(storageConditionKey(a));
});
