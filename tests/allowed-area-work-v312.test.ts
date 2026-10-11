import { expect,test } from 'vitest';
import { allowedAreaWorkAllowed } from '../src/sim/allowed-area-state.ts';
import { planWork } from '../src/sim/work-planner.ts';
import { blockedCells,reachableCells } from '../src/sim/pathfinding.ts';
import { planCooking } from '../src/sim/cooking-planner.ts';
import { processCooking } from '../src/sim/cooking.ts';
import { processProductionOutput,type ProductionContext } from '../src/sim/production-output.ts';
import { planCookingOrder,queuedCookingReason } from '../src/sim/player-cooking.ts';
import { planHaulOrder,queuedHaulReason } from '../src/sim/player-hauling.ts';
import { newCookingBill,cookingSpot } from '../src/sim/cooking-bills.ts';
import { newCampfireFuel } from '../src/sim/fuel.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { beginUnfinished } from '../src/sim/unfinished.ts';
import { beginArtWork } from '../src/sim/art-work.ts';
import { beginGunWork } from '../src/sim/gun-work.ts';
import { beginFlakWork } from '../src/sim/flak-work.ts';
import { beginComponentWork } from '../src/sim/component-work.ts';
import { planUnfinished } from '../src/sim/tailoring-plan.ts';
import { planArtWork } from '../src/sim/art-work-plan.ts';
import { planGunWork } from '../src/sim/gun-work-plan.ts';
import { planFlakWork } from '../src/sim/flak-work-plan.ts';
import { planComponentWork } from '../src/sim/component-work-plan.ts';
import { medicalCamp } from './scenarios/health.ts';
import type { Cell,MaterialPile,Structure } from '../src/sim/types.ts';

function kitchen(){
  const w=medicalCamp(1),p=w.pawns[0]!;w.resources=[];w.structures=[];w.jobs=[];w.piles=[];w.tiles=w.tiles.map(()=>({terrain:'soil'}));p.x=10;p.z=12;p.priorities.cook=1;
  const bill=newCookingBill(w.nextId++),station:Structure={id:w.nextId++,kind:'campfire',x:10,z:10,orientation:0,footprint:'standard',fuel:newCampfireFuel(),bills:[bill]};w.structures.push(station);
  const id=w.nextId++;w.allowedAreas=[{id,label:'Cuisine',color:1,cells:Array.from({length:w.width*w.height},(_,i)=>i).filter(i=>i!==11*w.width+9)}];p.allowedAreaId=id;
  addGroundMaterial(w,'food',20,{x:9,z:11},'rice');addGroundMaterial(w,'food',20,{x:13,z:12},'rice');refreshStock(w);
  return {w,p,station,bill,outside:w.piles[0]!,inside:w.piles[1]!};
}
test('automatic production and direct cooking choose an inside source before ranking and pair budgets',()=>{
  const {w,p,station,inside,outside}=kitchen(),budget={remaining:8,pairs:32768};
  const proposal=planCooking(w,p,reachableCells(w,p,blockedCells(w),new Set()),budget)!;
  expect(proposal.task!.ingredients.every(i=>i.pileId===inside.id)).toBe(true);expect(proposal.task!.ingredients.some(i=>i.pileId===outside.id)).toBe(false);
  planWork(w,p,()=>blockedCells(w),new Set(),{remaining:8,pairs:32768});expect(p.cooking!.ingredients[0]!.pileId).toBe(inside.id);
  p.cooking=null;p.path=[];w.allowedAreas![0]!.cells=w.allowedAreas![0]!.cells.filter(i=>i!==station.z*w.width+station.x);
  expect(planCookingOrder(w,p,station.id).reason).toContain('Hors zone autorisée');
});
test('station target may be worked from an exterior contact, but staging may not be deposited outside',()=>{
  const {w,p,station}=kitchen();w.piles=[];const spot=cookingSpot(station),cell={x:station.x+1,z:station.z-1};
  addGroundMaterial(w,'food',10,cell,'rice');const pile=w.piles[0]!;p.x=spot.x;p.z=spot.z;
  w.allowedAreas![0]!.cells=[station.z*w.width+station.x,cell.z*w.width+cell.x].sort((a,b)=>a-b);
  p.cooking={stationId:station.id,billId:station.bills![0]!.id,spot,actionCell:{...cell},phase:'work',ingredients:[{pileId:pile.id,item:'rice',quantity:10,stage:'placed',cell}],progress:0,productId:null,storageId:null};
  expect(allowedAreaWorkAllowed(w,p)).toBe(true);
  p.cooking.ingredients[0]!.stage='held';pile.owner={type:'pawn',pawnId:p.id};expect(allowedAreaWorkAllowed(w,p)).toBe(true);
  const quantity=pile.quantity,rng=w.rng;w.allowedAreas![0]!.cells=[station.z*w.width+station.x];let released=0;
  processCooking(w,p,{search:()=>null,move:()=>{throw Error('No move on refusal');},release:()=>{released++;return true;},event:()=>{},workRate:()=>1});
  expect(released).toBe(1);expect(pile.quantity).toBe(quantity);expect(pile.owner).toEqual({type:'pawn',pawnId:p.id});expect(w.rng).toBe(rng);
});
test('haul source and destination are admitted before winner; carried transit remains valid',()=>{
  const {w,p,inside,outside}=kitchen();w.structures=[];p.priorities.cook=0;p.priorities.haul=1;
  const exterior={id:w.nextId++,x:9,z:11,filters:{wood:false,food:true},priority:4,capacity:75},interior={id:w.nextId++,x:14,z:12,filters:{wood:false,food:true},priority:3,capacity:75};w.stockpiles=[exterior,interior];
  const order=planHaulOrder(w,p,{type:'pile',pileId:inside.id});expect(order.task!.destination).toEqual({type:'stockpile',stockpileId:interior.id});
  expect(planHaulOrder(w,p,{type:'pile',pileId:outside.id}).reason).toContain('Hors zone autorisée');
  p.haul=order.task!;p.haul.phase='deliver';p.haul.carryPileId=inside.id;inside.owner={type:'pawn',pawnId:p.id};p.x=9;p.z=11;
  expect(allowedAreaWorkAllowed(w,p)).toBe(true);w.allowedAreas![0]!.cells=w.allowedAreas![0]!.cells.filter(i=>i!==interior.z*w.width+interior.x);expect(allowedAreaWorkAllowed(w,p)).toBe(false);
});
test('runtime queue zone refusal remains separate from actorless structural reason',()=>{
  const {w,p,station}=kitchen(),proposal=planCookingOrder(w,p,station.id),order=proposal.order;
  if(!order||!('cooking' in order))throw Error('Expected cooking order');p.orders.queue.push(order);
  const baseline=queuedCookingReason(w,order);w.allowedAreas![0]!.cells=w.allowedAreas![0]!.cells.filter(i=>i!==station.z*w.width+station.x);
  expect(queuedCookingReason(w,order)).toBe(baseline);expect(queuedCookingReason(w,order,p)).toContain('Hors zone autorisée');
  p.orders.queue=[];w.structures=[];p.priorities.haul=1;const source=w.piles.find(q=>q.owner.type==='ground'&&q.owner.x===13)!;
  w.stockpiles=[{id:w.nextId++,x:14,z:12,priority:3,capacity:75,filters:{wood:false,food:true}}];const task=planHaulOrder(w,p,{type:'pile',pileId:source.id}).task!;
  expect(queuedHaulReason(w,task)).toBeUndefined();w.allowedAreas![0]!.cells=w.allowedAreas![0]!.cells.filter(i=>i!==12*w.width+14);
  expect(queuedHaulReason(w,task)).toBeUndefined();expect(queuedHaulReason(w,task,p)).toContain('Hors zone autorisée');
});
test('output skips an exterior higher-priority depot and physically deposits in the interior one',()=>{
  const {w,p,station}=kitchen();w.piles=[];const target={id:w.nextId++,x:11,z:11,priority:3,capacity:75,filters:{wood:false,food:true}},old={id:w.nextId++,x:9,z:11,priority:4,capacity:75,filters:{wood:false,food:true}};w.stockpiles=[old,target];
  const product:MaterialPile={id:w.nextId++,item:'simple-meal',kind:'food',quantity:1,owner:{type:'pawn',pawnId:p.id}};w.piles=[product];p.x=11;p.z=12;p.planCooldown=0;
  p.cooking={stationId:station.id,billId:station.bills![0]!.id,spot:cookingSpot(station),actionCell:{x:old.x,z:old.z},phase:'output',ingredients:[],progress:0,productId:product.id,storageId:old.id};
  const ctx:ProductionContext={search:()=>reachableCells(w,p,blockedCells(w),new Set()),move:()=>{},release:()=>true,event:()=>{},workRate:()=>1};
  processProductionOutput(w,p,ctx,'stockpile');expect(p.cooking!.storageId).toBe(target.id);
  processProductionOutput(w,p,ctx,'stockpile');expect(product.owner).toEqual({type:'ground',x:target.x,z:target.z});expect(p.cooking).toBeNull();
});
const workpieces=[
  {recipe:'shirt',kind:'tailor-bench',item:'unfinished-shirt',field:'unfinished',parts:[45],material:'cloth',units:45,begin:beginUnfinished,plan:planUnfinished},
  {recipe:'small-sculpture',kind:'art-bench',item:'unfinished-sculpture',field:'artWork',parts:[50],material:'wood',begin:beginArtWork,plan:planArtWork},
  {recipe:'make-revolver',kind:'machining-table',item:'unfinished-gun',field:'gunWork',parts:[{item:'steel',quantity:30},{item:'component',quantity:2}],begin:beginGunWork,plan:planGunWork},
  {recipe:'make-flak-vest',kind:'machining-table',item:'unfinished-flak-vest',field:'flakWork',parts:[{item:'cloth',quantity:60},{item:'steel',quantity:30},{item:'component',quantity:1}],begin:beginFlakWork,plan:planFlakWork},
  {recipe:'make-component',kind:'fabrication-bench',item:'unfinished-component',field:'componentWork',parts:[12],begin:beginComponentWork,plan:planComponentWork},
  {recipe:'make-advanced-component',kind:'fabrication-bench',item:'unfinished-component',field:'componentWork',parts:[{item:'component',quantity:1},{item:'steel',quantity:20},{item:'plasteel',quantity:10},{item:'gold',quantity:3}],begin:beginComponentWork,plan:planComponentWork},
] as const;
test.each(workpieces)('$recipe resumption admits inside workpieces and refuses exterior staging before incorporation',row=>{
  const {w,p,station}=kitchen();w.piles=[];station.kind=row.kind;delete station.fuel;
  const bill=newCookingBill(station.bills![0]!.id,row.recipe);station.bills=[bill];const spot=cookingSpot(station),cell={x:spot.x-1,z:spot.z};
  const record={recipe:row.recipe,authorId:p.id,progress:0,parts:structuredClone(row.parts),...('material' in row?{material:row.material}:{}),...('units' in row?{units:row.units}:{})};
  const pile={id:w.nextId++,item:row.item,kind:'unfinished',quantity:1,owner:{type:'ground',...cell},[row.field]:record} as MaterialPile;w.piles=[pile];p.priorities.craft=1;p.priorities.art=1;
  const reach=reachableCells(w,p,blockedCells(w),new Set());expect(row.plan(w,p,station,bill,reach,{pairs:100}).plan).toBeDefined();
  p.cooking={recipe:row.recipe,stationId:station.id,billId:bill.id,spot,actionCell:{...cell},phase:'work',ingredients:[{pileId:pile.id,item:row.item,quantity:1,stage:'placed',cell}],progress:0,productId:null,storageId:null};
  expect(row.begin(w,p)).toBe(pile);
  w.allowedAreas![0]!.cells=w.allowedAreas![0]!.cells.filter(i=>i!==cell.z*w.width+cell.x);
  expect(row.plan(w,p,station,bill,reachableCells(w,p,blockedCells(w),new Set()),{pairs:100}).plan).toBeUndefined();
  const before=JSON.stringify(w.piles),rng=w.rng,nextId=w.nextId;expect(row.begin(w,p)).toBeNull();expect(JSON.stringify(w.piles)).toBe(before);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
});
