import { withoutPawnSkills } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { newCookingBill,countedProducts } from '../src/sim/cooking-bills';
import { groundCapacity,storageCapacity } from '../src/sim/ground-placement';
import { addGroundMaterial } from '../src/sim/materials';
import { STONE_INPUTS,blockFor } from '../src/sim/production-recipes';
import { queryOrderOptions } from '../src/sim/player-orders';
import { canStandAt,furnitureDelay,navigationCosts } from '../src/sim/furniture-travel';
import { stonecuttingCamp } from './scenarios/stonecutting';
import type { World } from '../src/sim/types';

function until(w:World,predicate:()=>boolean,max=1200):void {
  for(let i=0;i<max&&!predicate();i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(predicate(),JSON.stringify({tick:w.tick,pawns:w.pawns,piles:w.piles})).toBe(true);
}
const amount=(w:World)=>w.piles.reduce((n,p)=>n+(p.kind==='chunk'?20*p.quantity:p.kind==='blocks'?p.quantity:0),0);
function replay(w:World):void {const restored=deserializeWorld(serializeWorld(w)),control=structuredClone(w);stepWorld(restored,35);stepWorld(control,35);expect(restored).toEqual(control);expect(validateWorld(restored)).toEqual([]);}

test('cinq roches : collecte réelle, staging hors de la place, reprises et livraison fractionnée de vingt blocs',()=>{
  for(const item of STONE_INPUTS) {
    const w=stonecuttingCamp(),p=w.pawns[0]!,s=w.structures[0]!;
    addGroundMaterial(w,'chunk',1,{x:10,z:5},item);
    addGroundMaterial(w,'chunk',1,{x:2,z:3},'legacy-chunk');
    expect(applyCommand(w,{type:'bill-add',structureId:s.id}).ok).toBe(true);
    const bill=s.bills![0]!;
    for(const [x,capacity] of [[7,7],[8,13]] as const)expect(applyCommand(w,{type:'stockpile',x,z:3,enabled:true,filters:{wood:false,food:false,blocks:true},capacity}).ok).toBe(true);
    until(w,()=>p.cooking?.ingredients.some(i=>i.stage==='held')===true);replay(w);
    expect(w.piles.find(q=>q.item===item)?.owner).toEqual({type:'pawn',pawnId:p.id});
    expect(amount(w)).toBe(40);expect(w.piles.some(q=>q.kind==='blocks')).toBe(false);
    until(w,()=>p.cooking?.phase==='work'&&p.cooking.progress>=800000);replay(w);
    expect(p.cooking!.ingredients[0]!.cell).not.toEqual(p.cooking!.spot);
    expect(p.cooking!.ingredients[0]!.cell).toEqual({x:s.x,z:s.z});
    until(w,()=>p.cooking?.phase==='output');replay(w);
    expect(bill.target).toBe(0);expect(w.piles.find(q=>q.kind==='blocks')).toMatchObject({item:blockFor(item),quantity:20,owner:{type:'pawn',pawnId:p.id}});
    until(w,()=>p.cooking?.storageId!==null&&p.cooking?.storageId!==undefined);
    expect(p.cooking!.storageQuantity).toBe(7);expect(storageCapacity(w,w.stockpiles[0]!,blockFor(item))).toBe(0);replay(w);
    until(w,()=>w.piles.some(q=>q.kind==='blocks'&&q.owner.type==='ground'));replay(w);
    expect(amount(w)).toBe(40);expect(w.piles.find(q=>q.owner.type==='pawn')?.quantity).toBe(13);
    until(w,()=>!p.cooking);
    expect(w.piles.filter(q=>q.kind==='blocks').map(q=>q.quantity).sort((a,b)=>a-b)).toEqual([7,13]);expect(amount(w)).toBe(40);
    expect(countedProducts(w,bill)).toBe(20);expect(w.piles.find(q=>q.item==='legacy-chunk')?.quantity).toBe(1);
    expect(canStandAt(w,{x:7,z:3})).toBe(true);expect(furnitureDelay(w,{x:6,z:3},{x:7,z:3})).toBe(1.4);expect(furnitureDelay(w,{x:7,z:3},{x:8,z:3})).toBe(1.4);expect(navigationCosts(w).costs?.get(3*w.width+7)).toBe(467);
  }
});

test('ordres réservés, métier désactivé, annulation conservatrice, factures et meuble entier',()=>{
  const w=stonecuttingCamp(2),[p,other]=w.pawns,[s,t]=w.structures;
  addGroundMaterial(w,'chunk',1,{x:5,z:6},'granite-chunk');
  for(const station of [s!,t!])expect(applyCommand(w,{type:'bill-add',structureId:station.id}).ok).toBe(true);
  const bill=s!.bills![0]!;
  expect(queryOrderOptions(w,p!.id,{x:s!.x-1,z:s!.z}).some(o=>o.cookStationId===s!.id&&o.enabled)).toBe(true);
  expect(applyCommand(w,{type:'order-cook',pawnId:p!.id,structureId:s!.id,queue:true}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-cook',pawnId:other!.id,structureId:t!.id,queue:true}).ok).toBe(false);
  expect(applyCommand(w,{type:'priority',pawnId:p!.id,work:'craft',value:0}).ok).toBe(true);replay(w);
  until(w,()=>p!.cooking?.ingredients.some(i=>i.stage==='held')===true);
  expect(applyCommand(w,{type:'bill-update',structureId:s!.id,billId:bill.id,settings:{...bill,filters:{rice:true,berries:true}}}).ok).toBe(false);
  expect(applyCommand(w,{type:'clear-orders',pawnId:p!.id}).ok).toBe(true);expect(amount(w)).toBe(20);expect(p!.cooking).toBeNull();
  expect(applyCommand(w,{type:'priority',pawnId:other!.id,work:'craft',value:0}).ok).toBe(true);
  bill.suspended=true;
  expect(applyCommand(w,{type:'designate',kind:'uninstall',x:s!.x,z:s!.z}).ok).toBe(true);
  expect(applyCommand(w,{type:'priority',pawnId:p!.id,work:'build',value:1}).ok).toBe(true);
  until(w,()=>w.packed.some(q=>q.building.id===s!.id));replay(w);
  expect(w.packed[0]!.building.bills).toEqual([bill]);
  const saved=JSON.parse(serializeWorld(w));saved.packed[0].building.bills[0].recipe='simple-meal';expect(()=>deserializeWorld(JSON.stringify(saved))).toThrow();
  const legacy=JSON.parse(serializeWorld(stonecuttingCamp()));(legacy.schemaVersion=31,withoutPawnSkills(legacy));for(const a of legacy.pawns)delete a.priorities.craft;for(const b of legacy.structures)delete b.bills;
  const migrated=deserializeWorld(JSON.stringify(legacy));expect(migrated.structures[0]!.bills).toEqual([]);expect(migrated.pawns[0]!.priorities.craft).toBe(2);
  for(const bad of [()=>{legacy.pawns[0].priorities.craft=2;},()=>{delete legacy.pawns[0].priorities.craft;legacy.structures[0].bills=[];}]){bad();expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow(/version 31/);}
});

test('filtres, rayon et seuil comptent les blocs ; sol saturé conserve le produit puis reprend',()=>{
  const ranked=stonecuttingCamp(),artisan=ranked.pawns[0]!,bench=ranked.structures[0]!;
  bench.bills=[newCookingBill(ranked.nextId++,'stone-blocks')];addGroundMaterial(ranked,'chunk',1,{x:7,z:3},'slate-chunk');
  for(const [x,z,priority] of [[4,3,1],[17,3,3],[13,10,4]])expect(applyCommand(ranked,{type:'stockpile',x:x!,z:z!,enabled:true,priority,filters:{wood:false,food:false,blocks:true}}).ok).toBe(true);
  for(const [x,z] of [[12,10],[14,10],[13,9],[13,11]])ranked.structures.push({id:ranked.nextId++,kind:'wall',x:x!,z:z!,orientation:0,footprint:'standard'});
  until(ranked,()=>artisan.cooking?.storageId!==null&&artisan.cooking?.storageId!==undefined);
  expect(ranked.stockpiles.find(s=>s.id===artisan.cooking!.storageId)?.priority).toBe(3);replay(ranked);
  until(ranked,()=>!artisan.cooking);expect(ranked.piles.find(q=>q.kind==='blocks')?.owner).toEqual({type:'ground',x:17,z:3});
  const w=stonecuttingCamp(),p=w.pawns[0]!,s=w.structures[0]!,bill=newCookingBill(w.nextId++,'stone-blocks');s.bills=[bill];
  bill.radius=1;addGroundMaterial(w,'chunk',1,{x:10,z:5},'marble-chunk');stepWorld(w,30);expect(p.cooking).toBeNull();
  bill.radius=999;bill.filters['marble-chunk']=false;stepWorld(w,30);expect(p.cooking).toBeNull();bill.filters['marble-chunk']=true;
  until(w,()=>p.cooking?.phase==='output');
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(groundCapacity(w,{x,z},'wood')===75)addGroundMaterial(w,'wood',75,{x,z},'wood');
  stepWorld(w,30);expect(p.cooking?.phase).toBe('output');expect(amount(w)).toBe(20);expect(validateWorld(w)).toEqual([]);replay(w);
  const free=w.piles.find(q=>q.owner.type==='ground'&&q.owner.x===p.x&&q.owner.z===p.z)!;w.piles.splice(w.piles.indexOf(free),1);
  until(w,()=>p.cooking===null);expect(amount(w)).toBe(20);
  bill.mode='until';bill.target=20;bill.filters['marble-chunk']=false;
  const product=w.piles.find(q=>q.kind==='blocks')!;expect(product.owner.type).toBe('ground');
  if(product.owner.type==='ground')expect(applyCommand(w,{type:'stockpile',x:product.owner.x,z:product.owner.z,enabled:true,filters:{wood:false,food:false,blocks:true}}).ok).toBe(true);
  expect(countedProducts(w,bill)).toBe(20); // Core any-stone counter ignores ingredient filter.
});
