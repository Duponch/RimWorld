import {expect,test} from 'vitest';
import {captureFoodReadability} from '../src/sim/food-readability.ts';
import {queryPawnStatus} from '../src/sim/diagnostics.ts';
import {applyCommand,serializeWorld,deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {nutritionOf} from '../src/sim/items.ts';
import {ROT_DAYS} from '../src/sim/food-preservation.ts';
import type {MaterialPile,Pawn} from '../src/sim/types.ts';
import {equipmentCamp} from './scenarios/equipment.ts';
function camp(count=2){const w=equipmentCamp(count);w.piles=[];for(const p of w.pawns){p.foodPolicyId=2;p.hunger=23;p.state='hungry';}return w;}
function pile(w:ReturnType<typeof camp>,item:MaterialPile['item'],quantity=1,owner?:MaterialPile['owner']){addMaterial(w,'food',quantity,owner??{type:'ground',x:6+w.piles.length%8,z:6+Math.floor(w.piles.length/8)},item);return w.piles.at(-1)!;}

test('one fresh map stock is not allocated repeatedly; expired, job, inventory and other hands cannot hide an incompatible diet',()=>{
 const w=camp(),[a,b]=w.pawns;b!.foodPolicyId=1;const berries=pile(w,'berries',75),expired=pile(w,'simple-meal',10);expired.rot={progress:ROT_DAYS['simple-meal']*6000,atTick:w.tick};
 // Ownership matrix is a presentation input, not a played construction/inventory transfer.
 pile(w,'survival-meal',2,{type:'inventory',pawnId:a!.id});w.piles.push({id:w.nextId++,kind:'food',item:'simple-meal',quantity:1,owner:{type:'job',jobId:w.nextId++}});const held=pile(w,'simple-meal',1,{type:'pawn',pawnId:b!.id});pile(w,'hay',75);
 const before=JSON.stringify(w),r=captureFoodReadability(w);expect(JSON.stringify(w)).toBe(before);expect(r.blockedPawnIds).toEqual([a!.id]);expect(r.byPawn.get(a!.id)).toMatchObject({status:'blocked',freshPileCount:1});expect(r.byPawn.get(b!.id)).toMatchObject({status:'matched',freshPileCount:2});
 expect(r.freshNutrition).toBe((nutritionOf(berries)+nutritionOf(held))/100);expect(r.freshPileCount).toBe(2);expect(r.survivalMeals).toBe(0);
 const own=pile(w,'pemmican',16,{type:'pawn',pawnId:a!.id}),next=captureFoodReadability(w);expect(next.byPawn.get(a!.id)!.status).toBe('matched');expect(next.freshNutrition-r.freshNutrition).toBeCloseTo(nutritionOf(own)/100);
 w.piles=w.piles.filter(p=>p===expired);expect(captureFoodReadability(w).byPawn.get(a!.id)!.status).toBe('empty');expect(queryPawnStatus(w,a!).code).toBe('hungry');
});

test('every meal phase remains engaged after a diet change, while patients, crises and local travel have an explicit unevaluated scope',()=>{
 const w=camp(1),p=w.pawns[0]!;pile(w,'berries',75);const before=w.foodPolicies.map(p=>[...p.allowed]);
 for(const phase of ['pickup','collect','choose-spot','travel','ingest'] as const){
  p.need={kind:'eat',forced:true,phase,sourcePileId:1,carryPileId:null,quantity:1,progress:0,dining:null};const r=captureFoodReadability(w);expect(r.engagedPawnIds).toEqual([p.id]);expect(r.blockedPawnIds).toEqual([]);expect(queryPawnStatus(w,p,r).code).toBe(phase);
 }
 p.need=null;
 const projections:Partial<Pawn>[]=[{state:'downed'},{state:'resting'},{medicalSleep:true},{need:{kind:'sleep',medical:'patient',phase:'travel',bedId:null,target:{x:p.x,z:p.z}}},{mental:{crisis:{kind:'food-binge'}} as Pawn['mental']}];
 for(const patch of projections){const view={...w,pawns:[{...p,...patch}]};const r=captureFoodReadability(view);expect(r.excludedPawnIds).toEqual([p.id]);expect(r.evaluatedPawnIds).toEqual([]);expect(r.blockedPawnIds).toEqual([]);}
 const traveller={...w,group:{memberIds:[p.id]}} as typeof w;expect(captureFoodReadability(traveller).excludedPawnIds).toEqual([p.id]);
 for(const patch of [{prisoner:{}},{visitor:{}},{raid:{}},{podRescue:{}},{state:'dead'}]){const view={...w,pawns:[{...p,...patch}]} as typeof w;expect(captureFoodReadability(view).byPawn.has(p.id)).toBe(false);}
 expect(w.foodPolicies.map(p=>[...p.allowed])).toEqual(before);
});

test('an allowed paste dispenser is explicitly unassessed, irrespective of fuel, power or ingredients, without planning production',()=>{
 const w=camp(1),p=w.pawns[0]!;pile(w,'berries',75);w.structures.push({id:w.nextId++,kind:'nutrient-paste-dispenser',x:8,z:8,orientation:0,footprint:'standard'});
 const before=JSON.stringify(w),r=captureFoodReadability(w);expect(r.pasteUncheckedPawnIds).toEqual([p.id]);expect(r.blockedPawnIds).toEqual([]);expect(queryPawnStatus(w,p,r).code).toBe('food-source-unchecked');expect(JSON.stringify(w)).toBe(before);
 w.foodPolicies=w.foodPolicies.map(policy=>policy.id===p.foodPolicyId?{...policy,allowed:policy.allowed.filter(item=>item!=='nutrient-paste-meal')}:policy);expect(captureFoodReadability(w).blockedPawnIds).toEqual([p.id]);
 w.foodPolicies=w.foodPolicies.map(policy=>policy.id===p.foodPolicyId?{...policy,allowed:['nutrient-paste-meal']}:policy);w.piles=[];expect(captureFoodReadability(w).byPawn.get(p.id)!.status).toBe('paste-unchecked');w.structures=[];expect(captureFoodReadability(w).byPawn.get(p.id)!.status).toBe('empty');
});

test('anticipatory reading and real same-tick policy and pile changes are recaptured without a tick cache and preserve exact save/snapshot continuation',()=>{
 const w=camp(1),p=w.pawns[0]!;p.hunger=95;p.state='idle';pile(w,'berries',75);const before=captureFoodReadability(w);expect(before.blockedPawnIds).toEqual([p.id]);expect(before.pasteUncheckedPawnIds).toEqual([]);expect(before.byPawn.get(p.id)!.status).toBe('blocked');
 const e=new SnapshotEncoder(),d=new SnapshotDecoder();expect(validateWorld(w)).toEqual([]);expect(d.adopt(structuredClone(e.encode(w,0,0))).status).toBe('applied');const tick=w.tick;
 expect(applyCommand(w,{type:'food-policy-update',policyId:p.foodPolicyId,name:'Baies autorisées',allowed:['berries']}).ok).toBe(true);expect(w.tick).toBe(tick);const next=captureFoodReadability(w);expect(next.byPawn.get(p.id)!.status).toBe('matched');expect(before.byPawn.get(p.id)!.status).toBe('blocked');
 const delta=structuredClone(e.encode(w,0,0));expect(delta.kind).toBe('delta');const adopted=d.adopt(delta);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Expected same-tick diet adoption');expect(captureFoodReadability(adopted.world).byPawn.get(p.id)!.status).toBe('matched');
 expect(deserializeWorld(serializeWorld(w))).toEqual(w);w.piles=[];expect(captureFoodReadability(w).byPawn.get(p.id)!.status).toBe('empty');pile(w,'berries',1);expect(captureFoodReadability(w).byPawn.get(p.id)!.status).toBe('matched');
});

test('the shared capture reads no grid and diagnostics for multiple people reuse it without rescanning piles or claiming access',()=>{
 const w=camp(),p=w.pawns[0]!;pile(w,'berries',75);const tiles=w.tiles;Object.defineProperty(w,'tiles',{configurable:true,get(){throw Error('No grid scan permitted');}});const r=captureFoodReadability(w);Object.defineProperty(w,'tiles',{configurable:true,enumerable:true,writable:true,value:tiles});
 const piles=w.piles;Object.defineProperty(w,'piles',{configurable:true,get(){throw Error('No per-person pile scan permitted');}});
 for(const person of w.pawns){const d=queryPawnStatus(w,person,r);expect(d.code).toBe('food-policy-blocked');expect(d.reason).toContain('piles fraîches');expect(d.reason).toContain('accès et réservations non évalués');}
 Object.defineProperty(w,'piles',{configurable:true,enumerable:true,writable:true,value:piles});expect(queryPawnStatus(w,p).code).toBe('food-policy-blocked');
});
