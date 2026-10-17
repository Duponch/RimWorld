import {expect,test} from 'vitest';
import {generateWorld,emptyGeographicLandscape256} from '../src/sim/generation.ts';
import {startingPawn} from '../src/sim/starting-pawns.ts';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {applyEquipment} from '../src/sim/equipment.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {APPAREL,newApparelState,conflictsWith} from '../src/sim/apparel-rules.ts';
import {validApparelShape} from '../src/sim/apparel-save.ts';
import {commercialItemMassGrams} from '../src/sim/commercial-mass.ts';
import {pileMaxHp,pileFlammability} from '../src/sim/thing-damage-rules.ts';
import {BURN_APPAREL_INPUTS} from '../src/sim/burn-apparel-content.ts';
import {createDefaultApparelPolicyRegistry} from '../src/sim/apparel-policy.ts';
import {validStorageItems} from '../src/sim/storage-filters.ts';
import {serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {apparelAppearance} from '../src/render/character-apparel.ts';
import type {MaterialPile} from '../src/sim/types.ts';
function fixture(){
 const w=generateWorld(82011,32,32,'temperate-crashlanded-v1');
 w.resources=[];w.piles=[];w.structures=[];w.tiles=w.tiles.map(()=>({terrain:'soil'}));
 const p=startingPawn(w.nextId++,'Porteur préparé',12,12,0,65,w.seed,0,256);p.apparelAutomation=false;w.pawns.push(p);
 return {w,p};
}
function garment(item:'flak-pants'|'plasteel-flak-helmet'|'cloth-pants'|'flak-helmet'):MaterialPile{return {id:1,item,kind:'apparel',quantity:1,owner:{type:'ground',x:1,z:1},apparel:newApparelState(item)};}
test('the actual two fixed starter garments resolve distinct materials, layers, HP and physical masses',()=>{
 expect(APPAREL['plasteel-flak-helmet'].hitPoints).toBe(335);expect(APPAREL['flak-helmet'].hitPoints).toBe(120);
 expect(APPAREL['plasteel-flak-helmet'].ratings.sharp).toBeCloseTo(.798,6);expect(APPAREL['plasteel-flak-helmet'].ratings.blunt).toBeCloseTo(.385,6);
 expect(APPAREL['flak-pants'].coverage.layers).toEqual(['skin','middle']);expect(APPAREL['flak-pants'].moveOffset).toBe(-.12);
 expect(commercialItemMassGrams('flak-pants',256)).toBe(4000);expect(commercialItemMassGrams('plasteel-flak-helmet',256)).toBe(1200);
 expect(conflictsWith(garment('flak-pants'),garment('cloth-pants'))).toBe(true);expect(conflictsWith(garment('flak-pants'),garment('plasteel-flak-helmet'))).toBe(false);
});
test('future items, storage permissions, masses and apparel states remain unavailable before256',()=>{
 for(const item of ['flak-pants','plasteel-flak-helmet'] as const){
  expect(validApparelShape(garment(item) as unknown as Record<string,unknown>,255)).toBe(false);expect(validApparelShape(garment(item) as unknown as Record<string,unknown>,256)).toBe(true);
  expect(validStorageItems({[item]:false},255)).toBe(false);expect(validStorageItems({[item]:true},256)).toBe(true);expect(commercialItemMassGrams(item,255)).toBeUndefined();expect(pileMaxHp(garment(item),255)).toBe(0);
 }
 const old=createDefaultApparelPolicyRegistry();expect(old.apparelPolicies.every(p=>!p.allowedItems.includes('flak-pants')&&!p.allowedItems.includes('plasteel-flak-helmet'))).toBe(true);
 const fresh=emptyGeographicLandscape256(17,32,32);expect(fresh.apparelPolicies).toBeDefined();expect(fresh.apparelPolicies!.every(p=>p.allowedItems.includes('flak-pants')&&p.allowedItems.includes('plasteel-flak-helmet'))).toBe(true);
});
test('burnability follows the actual fixed Stuff, without changing the historical steel helmet',()=>{
 expect(BURN_APPAREL_INPUTS).toContain('flak-pants');expect(BURN_APPAREL_INPUTS).not.toContain('plasteel-flak-helmet');expect(BURN_APPAREL_INPUTS).not.toContain('flak-helmet');
 expect(pileFlammability(garment('plasteel-flak-helmet'))).toBe(0);expect(pileFlammability(garment('flak-pants'))).toBe(.6);
});
test('physical contact wears the same pants and Plasteel helmet, active work and final owners survive exact saves',()=>{
 const {w,p}=fixture();addGroundMaterial(w,'apparel',1,{x:13,z:12},'flak-pants');addGroundMaterial(w,'apparel',1,{x:12,z:13},'plasteel-flak-helmet');
 const pants=w.piles.find(q=>q.item==='flak-pants')!,helmet=w.piles.find(q=>q.item==='plasteel-flak-helmet')!;
 expect(applyEquipment(w,{type:'order-equipment',pawnId:p.id,itemId:pants.id,action:'wear',queue:false})).toEqual({ok:true});
 stepWorld(w);const during=serializeWorld(w),resumed=deserializeWorld(during);expect(serializeWorld(resumed)).toBe(during);expect(resumed.pawns[0]!.equipmentTask?.itemId).toBe(pants.id);
 for(let i=0;i<100&&pants.owner.type!=='apparel';i++)stepWorld(w);expect(pants.owner).toEqual({type:'apparel',pawnId:p.id});expect(pants.apparel?.forced).toBe(true);
 expect(applyEquipment(w,{type:'order-equipment',pawnId:p.id,itemId:helmet.id,action:'wear',queue:false})).toEqual({ok:true});
 for(let i=0;i<100&&helmet.owner.type!=='apparel';i++)stepWorld(w);expect(helmet.owner).toEqual({type:'apparel',pawnId:p.id});expect(w.piles.find(q=>q.id===pants.id)).toBe(pants);
 const look=apparelAppearance([pants,helmet]);expect(look).toMatchObject({pants:8,helmet:true,plasteelHelmet:true});const final=serializeWorld(w);expect(serializeWorld(deserializeWorld(final))).toBe(final);
});
test('removal deposits the same physical item, with no new pile, material grant or automatic policy change',()=>{
 const {w,p}=fixture();addGroundMaterial(w,'apparel',1,{x:13,z:12},'plasteel-flak-helmet');const pile=w.piles[0]!;
 expect(applyEquipment(w,{type:'order-equipment',pawnId:p.id,itemId:pile.id,action:'wear',queue:false}).ok).toBe(true);
 for(let i=0;i<100&&pile.owner.type!=='apparel';i++)stepWorld(w);expect(pile.owner.type).toBe('apparel');const nextId=w.nextId,policies=JSON.stringify(w.apparelPolicies);
 expect(applyEquipment(w,{type:'order-equipment',pawnId:p.id,itemId:pile.id,action:'remove',queue:false}).ok).toBe(true);
 for(let i=0;i<100&&pile.owner.type!=='ground';i++)stepWorld(w);expect(pile.owner.type).toBe('ground');expect(pile.apparel?.forbidden).toBe(true);expect(pile.apparel?.forced).toBeUndefined();expect(w.piles).toHaveLength(1);expect(w.piles[0]).toBe(pile);expect(w.nextId).toBe(nextId);expect(JSON.stringify(w.apparelPolicies)).toBe(policies);
});
