import {describe,it,expect} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {createShipChunk256,validShipChunkStructure256} from '../src/sim/ship-chunk-256.ts';
import {shipChunkRefund256,shipChunkNextRandom256,planShipChunkKill256} from '../src/sim/ship-chunk-leavings-256.ts';
import {footprintCells,footprintContains} from '../src/sim/definitions.ts';
import {constructionRecipe} from '../src/sim/construction-materials.ts';
import {designateDeconstruction,deconstructionDuration} from '../src/sim/deconstruction-rules.ts';
import {finishDeconstruction} from '../src/sim/deconstruction.ts';
import {damageStructure,damagePile} from '../src/sim/thing-damage.ts';
import {structureMaxHp,structureFlammability,pileMaxHp} from '../src/sim/thing-damage-rules.ts';
import {roadPropCanClaim256,roadPropCanRepair256,roadPropCanDeconstruct256} from '../src/sim/local-road-prop-ownership-256.ts';
import {validLocalRoadPropPackedBuilding256} from '../src/sim/local-road-props-save-256.ts';
import {commercialItemMassGrams} from '../src/sim/commercial-mass.ts';
import {validatePileRecordShape} from '../src/sim/material-record-save.ts';
import {validStorageItems} from '../src/sim/storage-filters.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {materialAllowedForPlayer256,setMaterialForbidden256} from '../src/sim/material-permission-256.ts';
import {newCookingBill,validBillSettings,cookingSpot} from '../src/sim/cooking-bills.ts';
import {finishSmelting} from '../src/sim/smelting.ts';
import {smeltingIngredientAllowed} from '../src/sim/smelting-rules.ts';
import {PRODUCTION_RECIPES,productionWorkTotal,isRecipeProduct,STONE_INPUTS} from '../src/sim/production-recipes.ts';
import {newBuildingFuel} from '../src/sim/fuel.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {advancePower,reconcilePower} from '../src/sim/power.ts';
import {shipChunkParts256,slagSteelChunkParts256} from '../src/render/ship-chunk-parts-256.ts';
import type {ProductionContext} from '../src/sim/production-output.ts';
import type {Structure,World} from '../src/sim/types.ts';

/** Existing true prepared deconstructionCamp, not a generator875, seed parity,
 * walking timeline or new colony. All tested commits act on these originals. */
function prepared(){
 const w=deconstructionCamp();w.schemaVersion=256;const s=createShipChunk256(w.nextId++,{x:16,z:16});w.structures.push(s);
 const p=w.pawns[0]!;p.x=15;p.z=16;p.path=[];return {w,s,p};
}
const snapshot=(w:World)=>JSON.stringify(w);
function sealed(w:World){w.tiles=w.tiles.map(()=>({terrain:'rock'}));}
function workFixture(){
 const w=deconstructionCamp();w.schemaVersion=256;const p=w.pawns[0]!;p.jobId=null;p.haul=null;p.need=null;p.path=[];p.state='working';
 const fuel=newBuildingFuel('wood-generator');fuel.ticks=600;
 const generator:Structure={id:w.nextId++,kind:'wood-generator',x:6,z:6,orientation:0,footprint:'standard',fuel,power:newPowerState('wood-generator')};
 const bill=newCookingBill(w.nextId++,'smelt-slag',256);bill.mode='until';bill.target=30;
 const station:Structure={id:w.nextId++,kind:'electric-smelter',x:10,z:6,material:'steel',orientation:0,footprint:'standard',power:newPowerState('electric-smelter'),bills:[bill]};
 w.structures.push(generator,station);reconcilePower(w);advancePower(w);expect(station.power!.on).toBe(true);
 const spot=cookingSpot(station);p.x=spot.x;p.z=spot.z;
 addMaterial(w,'chunk',1,{type:'ground',...spot},'slag-steel-chunk');const source=w.piles.find(i=>i.item==='slag-steel-chunk')!;
 p.cooking={recipe:'smelt-slag',stationId:station.id,billId:bill.id,spot,actionCell:spot,phase:'work',ingredients:[{pileId:source.id,item:'slag-steel-chunk',quantity:1,stage:'placed',cell:spot}],progress:400000,productId:null,storageId:null};
 const unexpected=()=>{throw Error('Completion must not invent a route, movement, release or work cadence');};
 const context:ProductionContext={search:unexpected,move:unexpected,release:unexpected,workRate:unexpected,event:message=>w.events.push({tick:w.tick,type:'job',message})};
 return {w,p,bill,station,source,context};
}

describe('ShipChunk and actual steel slag physical transactions',()=>{
 it('has its real2×2 footprint, fixed recipe,300HP and no claim/minify/repair authority',()=>{
  const {w,s}=prepared();expect(footprintCells(s)).toEqual([{x:16,z:16},{x:17,z:16},{x:16,z:17},{x:17,z:17}]);
  expect(footprintContains(s,{x:17,z:17})).toBe(true);expect(footprintContains(s,{x:15,z:16})).toBe(false);
  expect(constructionRecipe(s).ingredients).toEqual([{item:'component',quantity:11},{item:'steel',quantity:40}]);expect(constructionRecipe(s).coreWork).toBe(12000);
  expect(structureMaxHp(s)).toBe(300);expect(structureFlammability(s)).toBe(0);expect(roadPropCanClaim256(w,s)).toBe(false);expect(roadPropCanRepair256(w,s)).toBe(false);expect(roadPropCanDeconstruct256(w,s)).toBe(true);
  expect(validShipChunkStructure256(s,256,w)).toBe(true);expect(validShipChunkStructure256(s,255,w)).toBe(false);expect(validLocalRoadPropPackedBuilding256(s,256)).toBe(false);
  for(const bad of [{...s,material:'steel'},{...s,quality:'normal'},{...s,factionId:1},{...s,x:w.width-1}])expect(validShipChunkStructure256(bad,256,w)).toBe(false);
 });
 it('deconstructs the same damaged original after two staged cost draws, with no HP discount',()=>{
  const {w,s,p}=prepared();s.damage=299;const rng=w.rng,a=shipChunkRefund256(11,rng),b=shipChunkRefund256(40,a.rng);expect(a.quantity===5||a.quantity===6).toBe(true);expect(b.quantity).toBe(20);
  designateDeconstruction(w,s);const j=w.jobs[0]!;j.reservedBy=p.id;p.jobId=j.id;expect(deconstructionDuration(j)).toBe(177);
  let expectedRng=b.rng;for(let i=0;i<4;i++)expectedRng=shipChunkNextRandom256(expectedRng).rng;
  expect(finishDeconstruction(w,p,j)).toBe(true);expect(w.structures.includes(s)).toBe(false);expect(w.jobs).not.toContain(j);expect(w.rng).toBe(expectedRng);
  expect(w.piles.filter(q=>q.item==='component').reduce((n,q)=>n+q.quantity,0)).toBe(a.quantity);expect(w.piles.filter(q=>q.item==='steel').reduce((n,q)=>n+q.quantity,0)).toBe(20);expect(w.piles.some(q=>q.item==='slag-steel-chunk')).toBe(false);
 });
 it('retains the original/job/namespace/streams on failed deconstruction Near',()=>{
  const {w,s,p}=prepared();designateDeconstruction(w,s);const j=w.jobs[0]!;j.reservedBy=p.id;p.jobId=j.id;sealed(w);const before=snapshot(w);
  expect(finishDeconstruction(w,p,j)).toBe(false);expect(snapshot(w)).toBe(before);expect(w.structures[0]).toBe(s);expect(w.jobs[0]).toBe(j);
 });
 it('preflights KillFinalize without mutation, then commits two real forbidden scories and one component outside Home',()=>{
  const {w,s}=prepared();delete w.home;const before=snapshot(w),plan=planShipChunkKill256({...w,structures:[]},s,s,w.rng);expect(plan).not.toBeNull();expect(snapshot(w)).toBe(before);
  expect(damageStructure(w,s,300,'bullet')).toBe(true);expect(w.structures).not.toContain(s);expect(w.piles.filter(q=>q.item==='slag-steel-chunk')).toHaveLength(2);expect(w.piles.filter(q=>q.item==='component').reduce((n,q)=>n+q.quantity,0)).toBe(1);expect(w.piles.some(q=>q.item==='steel')).toBe(false);
  for(const q of w.piles){expect(q.quantity).toBe(1);expect(materialAllowedForPlayer256(q)).toBe(false);expect(validatePileRecordShape(q as unknown as Record<string,unknown>,w,256)).toEqual([]);}
  const ids=[...w.piles.map(q=>q.id),...(w.filth?.items.map(f=>f.id)??[])];expect(new Set(ids).size).toBe(ids.length);
 });
 it('leaves products usable only when their actual chosen rectangle cells are Home',()=>{
  const {w,s}=prepared();w.home=footprintCells(s).map(c=>c.z*w.width+c.x);expect(damageStructure(w,s,300,'bullet')).toBe(true);expect(w.piles).toHaveLength(3);for(const q of w.piles)expect(materialAllowedForPlayer256(q)).toBe(true);
 });
 it('rejects fatal Near atomically, then admits nonfatal damage without premature products',()=>{
  const {w,s}=prepared();sealed(w);const before=snapshot(w);expect(damageStructure(w,s,300,'bullet')).toBe(false);expect(snapshot(w)).toBe(before);expect(w.structures[0]).toBe(s);
  expect(damageStructure(w,s,299,'bullet')).toBe(true);expect(s.damage).toBe(299);expect(w.piles).toEqual([]);
 });
 it('keeps slag distinct from StoneChunks, with8kg/300HP/stack1 and strict255 item/filter refusal',()=>{
  const {w}=prepared();addMaterial(w,'chunk',1,{type:'ground',x:4,z:4},'slag-steel-chunk');const q=w.piles[0]!;
  expect(commercialItemMassGrams(q.item,256)).toBe(8000);expect(commercialItemMassGrams(q.item,255)).toBeUndefined();expect(pileMaxHp(q,256)).toBe(300);expect(pileMaxHp(q,255)).toBe(0);expect((STONE_INPUTS as readonly string[]).includes(q.item)).toBe(false);
  expect(validatePileRecordShape(q as unknown as Record<string,unknown>,w,256)).toEqual([]);expect(validatePileRecordShape(q as unknown as Record<string,unknown>,w,255).length).toBeGreaterThan(0);expect(validStorageItems({[q.item]:false},255)).toBe(false);
  expect(damagePile(w,q,299,'bullet')).toBe(true);expect(q.damage).toBe(299);expect(w.piles[0]).toBe(q);expect(damagePile(w,q,1,'bullet')).toBe(true);expect(w.piles).not.toContain(q);expect(w.destroyed!.items!['slag-steel-chunk']).toBe(1);
 });
 it('has a400Core recipe with true stock targets, no weapon quality filter and no plasteel product',()=>{
  const bill=newCookingBill(1,'smelt-slag',256);bill.mode='until';expect(PRODUCTION_RECIPES['smelt-slag'].workTicks).toBe(40);expect(productionWorkTotal('smelt-slag')).toBe(400000);expect(bill.filters['slag-steel-chunk']).toBe(true);expect(bill.smeltFilter).toBeUndefined();expect(validBillSettings(bill,'smelt-slag',256)).toBe(true);expect(validBillSettings(bill,'smelt-slag',255)).toBe(false);expect(isRecipeProduct('smelt-slag','steel')).toBe(true);expect(isRecipeProduct('smelt-slag','plasteel')).toBe(false);
 });
 it('consumes the actual staged slag only at the powered station contact and emits15Steel without weapon RNG',()=>{
  const {w,p,bill,source,context}=workFixture(),before=snapshot(w),rng=w.rng,next=w.nextId;p.x++;const remote=snapshot(w);expect(finishSmelting(w,p,bill,context)).toBe(false);expect(snapshot(w)).toBe(remote);p.x--;
  setMaterialForbidden256(source,true);expect(smeltingIngredientAllowed(bill,source)).toBe(false);expect(finishSmelting(w,p,bill,context)).toBe(false);expect(w.piles).toContain(source);setMaterialForbidden256(source,false);
  expect(snapshot(w)).toBe(before);expect(finishSmelting(w,p,bill,context)).toBe(true);expect(w.piles).not.toContain(source);const product=w.piles.find(q=>q.id===p.cooking!.productId)!;expect(product.id).toBe(next);expect(product.item).toBe('steel');expect(product.quantity).toBe(15);expect(product.owner).toEqual({type:'pawn',pawnId:p.id});expect(p.cooking!.phase).toBe('output');expect(w.rng).toBe(rng);expect(bill.target).toBe(30);expect(p.cooking!.ingredients).toEqual([]);
 });
 it('bakes original resident metal forms with actual building target identity',()=>{
  const {w,s}=prepared(),shape=shipChunkParts256(w),slag=slagSteelChunkParts256(2,3);expect(shape).toHaveLength(6);expect(shape.every(part=>part.targetId===s.id)).toBe(true);expect(slag).toHaveLength(3);expect(slag.every(part=>part.shape!=='rounded-rock')).toBe(true);
 });
});
