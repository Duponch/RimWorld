import { withoutPawnSkills } from './scenarios/legacy-skills';
import { expect, test } from 'vitest';
import { applyCommand, createWorld, deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index';
import { addGroundMaterial, addMaterial, refreshStock, transferPile } from '../src/sim/materials';
import { ROT_DAYS, rotAge, rotRateAtTemperature, ticksUntilRot } from '../src/sim/food-preservation';
import { foodScore, pileFoodScore } from '../src/sim/food-selection';
import { TICKS_PER_DAY, type MaterialPile, type World } from '../src/sim/types';
import { SnapshotDecoder, SnapshotEncoder } from '../src/bridge/snapshots';
import { withoutPostV10Fields } from './scenarios/legacy-save';
import { foodAccount } from './scenarios/colony-player';

function field(size=16):World {
  const w=createWorld(42,size,size);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];
  w.pawns=w.pawns.slice(0,1);Object.assign(w.pawns[0]!,{x:2,z:2,hunger:100,rest:100,priorities: {basic:3,hunt:0,research:0, patient:0,bedrest:0,doctor:0,craft:2,mine:2,gather:0,build:0,haul:0,grow:0,cook:0}});
  refreshStock(w);return w;
}
function expiresIn(w:World,p:MaterialPile,ticks:number):void {
  expect(Object.hasOwn(ROT_DAYS,p.item)).toBe(true);
  p.rot={progress:ROT_DAYS[p.item as keyof typeof ROT_DAYS]*TICKS_PER_DAY-ticks,atTick:w.tick};
}
function checked(w:World,ticks=1):void {stepWorld(w,ticks);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}

test('freshness follows split cargo and weighted merges; last-tick ingestion cannot eat spoiled units',()=>{
  const w=field(),p=w.pawns[0]!;p.priorities.haul=1;
  addGroundMaterial(w,'food',30,{x:3,z:2},'berries');const source=w.piles[0]!;expiresIn(w,source,6000);
  const age=rotAge(source,w.tick);
  expect(applyCommand(w,{type:'stockpile',enabled:true,x:10,z:10,capacity:10,filters:{wood:false,food:true}}).ok).toBe(true);
  checked(w);expect(p.haul).toMatchObject({phase:'deliver',quantity:10});
  const held=w.piles.find(q=>q.owner.type==='pawn')!;
  expect(held.rot).toEqual(source.rot);expect(held.rot).not.toBe(source.rot);expect(source.quantity).toBe(20);
  const saved=serializeWorld(w),resumed=deserializeWorld(saved);checked(w,100);checked(resumed,100);expect(serializeWorld(w)).toBe(serializeWorld(resumed));
  expect(w.piles.every(q=>rotAge(q,w.tick)===age+w.tick)).toBe(true);
  expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'haul',value:0}).ok).toBe(true);
  const pile=w.piles.find(q=>q.owner.type==='ground'&&q.owner.x===10&&q.owner.z===10)!;
  expect(pile.quantity).toBe(10);
  // Fresh harvest merging into an old pile uses the actual admitted quantity.
  const oldAge=rotAge(source,w.tick);addMaterial(w,'food',6,source.owner,'berries');
  expect(rotAge(source,w.tick)).toBeCloseTo(oldAge*20/26,10);
  const before=rotAge(source,w.tick)*26+rotAge(pile,w.tick)*10;
  expect(transferPile(w,pile,source.owner)).toBe(true);expect(source.quantity).toBe(36);
  expect(rotAge(source,w.tick)*36).toBeCloseTo(before,8);
  expiresIn(w,source,3000);expect(pileFoodScore(w,source,3)).toBe(foodScore('berries',3));
  expiresIn(w,source,2999);expect(pileFoodScore(w,source,3)).toBe(foodScore('berries',3)+12);
  p.hunger=20;p.needCooldown=0;
  for(let i=0;i<200&&!(p.need?.kind==='eat'&&p.need.phase==='ingest'&&p.need.progress===49);i++)checked(w);
  expect(p.need).toMatchObject({kind:'eat',phase:'ingest',progress:49});
  const meal=w.piles.find(q=>q.owner.type==='pawn')!,remaining=w.stock.food-meal.quantity,hunger=p.hunger;
  expiresIn(w,meal,1);const prior=foodAccount(w);checked(w);
  expect(p.hunger).toBeLessThanOrEqual(hunger);expect(p.need).toBeNull();expect(w.stock.food).toBe(remaining);
  expect(w.spoiled.berries).toBe(meal.quantity);expect(foodAccount(w)).toBe(prior);
  expect(w.events.filter(e=>e.tick===w.tick&&e.message.includes('a mangé'))).toEqual([]);
});

test('recipe expiry releases remote, placed, held and output references; blocked drops preserve surviving cargo across save/load',()=>{
  for(const phase of ['source','held','work','output','blocked'] as const) {
    const w=field(32),p=w.pawns[0]!;p.priorities.cook=1;
    const station={id:w.nextId++,kind:'campfire' as const,x:24,z:24,orientation:0 as const,footprint:'standard' as const,fuel:{ticks:12000,burned:0,autoRefuel:false},bills:[] as import('../src/sim/cooking-types').CookingBill[]};
    w.structures.push(station);expect(applyCommand(w,{type:'bill-add',structureId:station.id}).ok).toBe(true);
    const bill=station.bills[0]!,spot={x:24,z:23};
    p.cooking={stationId:station.id,billId:bill.id,spot,actionCell:{x:24,z:24},phase:'gather',ingredients:[],progress:0,productId:null,storageId:null};p.state='working';
    if(phase==='output') {
      addMaterial(w,'food',1,{type:'pawn',pawnId:p.id},'simple-meal');const product=w.piles[0]!;
      p.cooking.phase='output';p.cooking.productId=product.id;bill.target=0;expiresIn(w,product,1);
    } else {
      addGroundMaterial(w,'food',6,{x:23,z:23},'berries');const berries=w.piles[0]!;
      const carrying=phase==='held'||phase==='blocked';
      addMaterial(w,'food',4,carrying?{type:'pawn',pawnId:p.id}:{type:'ground',...spot},'rice');const rice=w.piles[1]!;
      p.cooking.ingredients=[{pileId:berries.id,item:'berries',quantity:6,stage:phase==='work'?'placed':'source',cell:{x:23,z:23}},
        {pileId:rice.id,item:'rice',quantity:4,stage:carrying?'held':'placed',cell:spot}];
      if(phase==='work'){Object.assign(p,spot);p.cooking.phase='work';p.cooking.progress=59;}
      if(phase==='blocked')for(let z=0;z<32;z++)for(let x=0;x<32;x++)if(Math.abs(x-p.x)+Math.abs(z-p.z)<=12)addGroundMaterial(w,'wood',75,{x,z});
      expiresIn(w,phase==='held'?rice:berries,1);
    }
    expect(validateWorld(w),phase).toEqual([]);const total=foodAccount(w);checked(w);
    expect(foodAccount(w),phase).toBe(total);expect(bill.target,phase).toBe(phase==='output'?0:1);
    if(phase==='blocked') {
      expect(p.cooking).toMatchObject({phase:'interrupted',progress:0,ingredients:[{item:'rice',stage:'held',quantity:4}]});
      const recovered=deserializeWorld(serializeWorld(w));checked(recovered,10);checked(w,10);expect(recovered).toEqual(w);
      const cargo=w.piles.find(q=>q.owner.type==='pawn')!,cargoAge=rotAge(cargo,w.tick);
      w.piles=w.piles.filter(q=>!(q.owner.type==='ground'&&q.owner.x===3&&q.owner.z===2));refreshStock(w);
      checked(w);expect(p.cooking).toBeNull();expect(cargo.owner).toEqual({type:'ground',x:3,z:2});expect(rotAge(cargo,w.tick)).toBe(cargoAge+1);
    } else expect(p.cooking,phase).toBeNull();
    expect(w.events.filter(e=>e.message.includes('a cuisiné')),phase).toEqual([]);
  }
  // A carried haul can expire too, without leaving its destination reserved.
  const w=field(),p=w.pawns[0]!;p.priorities.haul=1;
  addGroundMaterial(w,'food',9,{x:3,z:2},'rice');applyCommand(w,{type:'stockpile',enabled:true,x:12,z:12});checked(w);
  expect(p.haul?.phase).toBe('deliver');expiresIn(w,w.piles[0]!,1);checked(w);
  expect(p.haul).toBeNull();expect(w.piles).toEqual([]);expect(w.spoiled.rice).toBe(9);
});

test('four, fourteen and forty days; stable snapshots, expiry batches, migration and corrupt-age rejection',()=>{
  expect([-20,0,2,5,10,45].map(rotRateAtTemperature)).toEqual([0,0,.2,.5,1,1]);
  const w=field();w.pawns=[];
  for(const [x,item] of ['simple-meal','berries','rice','survival-meal','legacy-portion'].entries())addGroundMaterial(w,'food',3,{x,z:1},item as MaterialPile['item']);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const checkpoint=structuredClone(encoder.encode(w,0,1,true));decoder.adopt(checkpoint);
  const clocks=w.piles.map(p=>p.rot&&{...p.rot});checked(w,23999);expect(w.piles.map(p=>p.rot)).toEqual(clocks);
  const saved=serializeWorld(w);const resumed=deserializeWorld(saved);checked(w);checked(resumed);expect(resumed).toEqual(w);
  expect(w.spoiled).toEqual({berries:0,rice:0,'simple-meal':3});expect(w.piles).toHaveLength(4);
  const adopted=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);
  expect(checkpoint.world.piles).toHaveLength(5); // Adoption did not rewrite a former frame.
  checked(w,60000);expect(w.spoiled.berries).toBe(3);checked(w,100000);checked(w,56000);
  expect(w.tick).toBe(240000);expect(w.spoiled.rice).toBe(3);expect(w.piles.map(p=>p.item)).toEqual(['survival-meal','legacy-portion']);expect(foodAccount(w)).toBe(15);
  const old=withoutPostV10Fields(JSON.parse(saved));(old.schemaVersion=10,withoutPawnSkills(old));for(const a of old.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete old.deconstructed;delete old.packed;
  const migrated=deserializeWorld(JSON.stringify(old));expect(migrated.tick).toBe(23999);
  expect(migrated.piles.filter(p=>p.rot).every(p=>rotAge(p,migrated.tick)===0)).toBe(true);
  expect(migrated.piles.map(p=>[p.id,p.item,p.quantity,p.owner])).toEqual(old.piles.map((p:MaterialPile)=>[p.id,p.item,p.quantity,p.owner]));
  for(const rot of [undefined,null,{}, {progress:-1,atTick:0},{progress:0,atTick:24000},{progress:24000,atTick:23999},{progress:1,atTick:0},{progress:NaN,atTick:0},{progress:0,atTick:0,extra:1}]) {
    const bad=JSON.parse(saved);bad.piles[0].rot=rot;expect(validateWorld(bad).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  const invalid=JSON.parse(saved);invalid.spoiled.rice=-1;expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/spoilage/);
  const mass=field(32);mass.pawns=[];for(let z=0;z<16;z++)for(let x=0;x<16;x++)addGroundMaterial(mass,'food',10,{x,z},'simple-meal');
  mass.piles.forEach(p=>expiresIn(mass,p,1));checked(mass);expect(mass.piles).toEqual([]);expect(mass.spoiled['simple-meal']).toBe(2560);expect(mass.events.filter(e=>e.tick===mass.tick)).toHaveLength(1);
  expect(ticksUntilRot(migrated.piles[0]!,migrated.tick)).toBe(24000);
});
