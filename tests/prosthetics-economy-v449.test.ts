import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {PROSTHETIC_ITEMS_273} from '../src/sim/prosthetic-content-273.ts';
import {commercialItemMassGrams,commercialPawnMass} from '../src/sim/commercial-mass.ts';
import {pileMaxHp,pileFlammability} from '../src/sim/thing-damage-rules.ts';
import {damagePile} from '../src/sim/thing-damage.ts';
import {pileMarketValue,settlementTradeUnitPrice} from '../src/sim/trade-prices.ts';
import {tradeCatalogueEntry} from '../src/sim/trade-catalogue.ts';
import {colonyWealth} from '../src/sim/colony-wealth.ts';
import {deteriorationExposure} from '../src/sim/deterioration-rules.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import {validShelfSettings} from '../src/sim/shelf-save.ts';
import {storageAccepts,validStorageItems} from '../src/sim/storage-filters.ts';
import {validStorageSettings} from '../src/sim/designation.ts';

test.each(PROSTHETIC_ITEMS_273)('%s carries exact mass, condition, non-quality price and physical destruction through save',item=>{
 const w=deconstructionCamp(),p=w.pawns[0]!;addMaterial(w,'prosthesis',1,{type:'ground',x:5,z:5},item);const q=w.piles[0]!,id=q.id;
 expect(validateWorld(w)).toEqual([]);expect(q.weapon).toBeUndefined();expect(q.apparel).toBeUndefined();expect(pileMaxHp(q)).toBe(50);expect(pileMaxHp(q,272)).toBe(0);expect(pileFlammability(q)).toBe(.7);
 expect(commercialItemMassGrams(item,273)).toBe(item==='prosthetic-arm'?5000:8000);expect(commercialItemMassGrams(item,272)).toBeUndefined();
 expect(tradeCatalogueEntry(item)).toMatchObject({baseMarketValue:258,maxHitPoints:50,hasQuality:false,sellPriceFactor:1});expect(pileMarketValue(q)).toBe(260);expect(colonyWealth(w).items).toBe(260);
 const fullPrice=settlementTradeUnitPrice(q,'sell',0)!;expect(damagePile(w,q,25,'bullet')).toBe(true);expect(q.damage).toBe(25);expect(pileMarketValue(q)).toBeCloseTo(25.8,9);expect(settlementTradeUnitPrice(q,'sell',0)).toBeLessThan(fullPrice);
 const saved=serializeWorld(w),copy=deserializeWorld(saved);expect(serializeWorld(copy)).toBe(saved);expect(copy.piles.find(p=>p.id===id)).toMatchObject({damage:25,item,kind:'prosthesis'});
 q.owner={type:'inventory',pawnId:p.id};expect(commercialPawnMass(p,[q],273)?.grams).toBe(item==='prosthetic-arm'?5000:8000);expect(commercialPawnMass(p,[q],272)).toBeNull();
 expect(damagePile(w,q,25,'bullet')).toBe(true);expect(w.piles.some(p=>p.id===id)).toBe(false);expect(validateWorld(w)).toEqual([]);
});

test('new and historical storage permissions remain prospective; the same real piece is accepted only by an enabled category',()=>{
 const w=deconstructionCamp();addMaterial(w,'prosthesis',1,{type:'ground',x:5,z:5},'prosthetic-leg');const q=w.piles[0]!,filters={wood:false,food:false,prosthesis:true};
 expect(validStorageSettings({filters},273)).toBe(true);expect(validStorageSettings({filters},272)).toBe(false);expect(validStorageSettings({filters:{...filters,prosthesis:false}},272)).toBe(false);
 const shelf=newShelfStorage([1],273),old=newShelfStorage([1],272);expect(shelf.settings.filters.prosthesis).toBe(true);expect(Object.hasOwn(old.settings.filters,'prosthesis')).toBe(false);expect(validShelfSettings(shelf.settings,273)).toBe(true);expect(validShelfSettings(shelf.settings,272)).toBe(false);
 expect(validStorageItems({'prosthetic-leg':false},272)).toBe(false);expect(validStorageItems({'prosthetic-leg':true},273)).toBe(true);
 expect(applyCommand(w,{type:'stockpile',enabled:true,x:7,z:7,filters}).ok).toBe(true);const zone=w.stockpiles[0]!;expect(storageAccepts(zone,q,w.tick)).toBe(true);zone.filters.prosthesis=false;expect(storageAccepts(zone,q,w.tick)).toBe(false);expect(validateWorld(w)).toEqual([]);
});

test('deterioration joins the existing rare exposure cadence and unfinished receipts retain only their finite input value',()=>{
 const w=deconstructionCamp();addMaterial(w,'prosthesis',1,{type:'ground',x:5,z:5},'prosthetic-arm');const q=w.piles[0]!;
 const e=deteriorationExposure(w,q);expect(e.baseRate).toBe(2);expect(e.rate).toBeGreaterThan(0);expect(e.status).toBe('outside');
 q.owner={type:'pawn',pawnId:w.pawns[0]!.id};expect(deteriorationExposure(w,q)).toMatchObject({status:'not-ground',baseRate:2,rate:0});
 w.piles=[{id:w.nextId++,item:'unfinished-prosthetic',kind:'unfinished',quantity:1,owner:{type:'ground',x:5,z:5},prostheticWork273:{recipe:'make-prosthetic-arm',authorId:w.pawns[0]!.id,progress:1,parts:[{item:'steel',quantity:40},{item:'component',quantity:4}]}}];
 expect(colonyWealth(w).items).toBe(204);w.piles[0]!.prostheticWork273!.progress=14_999_999;expect(colonyWealth(w).items).toBe(204);expect(commercialItemMassGrams('unfinished-prosthetic',273)).toBe(23400);expect(commercialItemMassGrams('unfinished-prosthetic',272)).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});
