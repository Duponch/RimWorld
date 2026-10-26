import {expect,test} from 'vitest';
import {applyCommand} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {groupCaravanUnitMass256,groupCaravanPileMass256} from '../src/sim/group-caravan-mass-256.ts';
import {captureGroupMass} from '../src/sim/group-capture.ts';
import {groupSourceChoices,groupFormationAuthority} from '../src/sim/group-authority.ts';
import {previewGroupLoading} from '../src/sim/group-loading.ts';
import {regularGroupFreight258,regularGroupFreightItem258,validLoadedGroupFreight258} from '../src/sim/group-freight-contract-258.ts';
import {damagePile} from '../src/sim/thing-damage.ts';
import {purchaseNovelScenario482} from './scenarios/novel-v482.ts';
import {harness,preparing} from './helpers/group-admission-v412.ts';
import type {MaterialPile,World} from '../src/sim/types.ts';

/** The book is acquired by the real paid orbital route. Planet adoption is a
 * real command; the existing group harness supplies only runtime/step helpers.
 * No Pawn ailments, needs, experience or owned-book state is manufactured. */
function freightColony(){
 const f=purchaseNovelScenario482(),w=f.world,book=w.piles.find(p=>p.id===f.ids.bookId)!;
 expect(damagePile(w,book,7,'bullet')).toBe(true);
 const adoption=applyCommand(w,{type:'planet-adopt'});expect(adoption.ok,adoption.reason).toBe(true);
 if(!w.planet||w.planet.revision===3)throw Error('This bounded fixture uses its actual legacy globe adoption.');
 const h=harness(w),food=w.piles.find(p=>p.item==='survival-meal'&&p.owner.type==='ground'&&p.quantity>=2)!;
 if(!food)throw Error('Prepared finite travel food absent.');
 return {...f,h,book,metadata:structuredClone(book.book),destination:w.planet.civilianTile,sources:[{pileId:food.id,quantity:2},{pileId:book.id,quantity:1}]};
}
function loaded(){
 const f=freightColony(),{h}=f;
 h.command({type:'group-start',originMapId:0,memberIds:[f.ids.readerId],sources:f.sources,destination:f.destination});
 const groupId=h.w.worldGroups!.selectedGroupId!;
 h.until(()=>{const state=h.w.worldGroups!.groups.find(r=>r.state.id===groupId)?.state;return !!state&&'manifest'in state&&state.manifest.some(l=>l.item==='novel'&&l.carriedPileId===f.ids.bookId);},700);
 const g=preparing(h,groupId);expect(g.cursor).toBe(g.manifest.length);
 return {...f,groupId,g};
}
function exact(w:World){expect(validateWorld(w)).toEqual([]);const encoded=serializeWorld(w);const copy=deserializeWorld(encoded);expect(serializeWorld(copy)).toBe(encoded);return copy;}

test('the purchased original has500g mass and regular freight only in295, with malformed books refused',()=>{
 const f=freightColony(),p=f.book,reader=f.world.pawns.find(p=>p.id===f.ids.readerId)!;
 expect(groupCaravanUnitMass256('novel',false,295)).toBe(500);expect(groupCaravanUnitMass256('novel',true,295)).toBe(500);
 expect(groupCaravanPileMass256(p,true,295)).toBe(500);expect(regularGroupFreight258(p,295)).toBe(true);expect(regularGroupFreightItem258('novel',295)).toBe(true);
 const inventory={...p,owner:{type:'inventory' as const,pawnId:reader.id}};expect(captureGroupMass([reader],[inventory],true,295)?.grams).toBe(500);
 for(const version of [294,296]){expect(groupCaravanUnitMass256('novel',true,version)).toBeUndefined();expect(groupCaravanPileMass256(p,true,version)).toBeUndefined();expect(regularGroupFreight258(p,version)).toBe(false);expect(regularGroupFreightItem258('novel',version)).toBe(false);expect(captureGroupMass([reader],[inventory],true,version)).toBeUndefined();}
 for(const patch of [{quantity:2},{book:undefined},{book:{...p.book,revision:2}},{damage:60},{damage:-1},{kind:'wood'},{owner:{type:'equipment',pawnId:reader.id}}]){
  const bad={...inventory,...patch} as unknown as MaterialPile;expect(groupCaravanPileMass256(bad,true,295)).toBeUndefined();expect(regularGroupFreight258(bad,295)).toBe(false);expect(captureGroupMass([reader],[bad],true,295)).toBeUndefined();
 }
 expect(p.damage).toBe(7);expect(p.book).toEqual(f.metadata);
});

test('actual formation preview and contact loading keep one purchased book, its receipt and exact saved owner',()=>{
 const f=freightColony(),w=f.world,reader=w.pawns.find(p=>p.id===f.ids.readerId)!,before=serializeWorld(w);
 expect(groupSourceChoices(w).find(c=>c.pile.id===f.book.id)?.available).toBe(1);
 const preview=previewGroupLoading(w,[reader.id],f.sources,groupFormationAuthority(w));expect(preview.kind).toBe('ready');expect(serializeWorld(w)).toBe(before);
 const bad=structuredClone(w),badBook=bad.piles.find(p=>p.id===f.book.id)!;badBook.book=undefined;
 expect(previewGroupLoading(bad,[reader.id],[{pileId:badBook.id,quantity:1}],groupFormationAuthority(bad)).kind).toBe('refused');expect(groupSourceChoices(bad).some(c=>c.pile.id===badBook.id)).toBe(false);
 const actual=loaded(),g=actual.g,source=actual.h.map.piles.find(p=>p.id===actual.ids.bookId)!;
 expect(source).toBe(actual.book);expect(source).toMatchObject({quantity:1,damage:7,book:actual.metadata,owner:{type:'inventory',pawnId:actual.ids.readerId}});
 expect(g.manifest.find(l=>l.item==='novel')).toMatchObject({pileId:source.id,carriedPileId:source.id,quantity:1});
 const piles=new Map(actual.h.map.piles.map(p=>[p.id,p]));expect(validLoadedGroupFreight258(g,piles,295)).toBe(true);
 const invalid=new Map(piles);invalid.set(source.id,{...source,book:undefined});expect(validLoadedGroupFreight258(g,invalid,295)).toBe(false);
 expect(actual.h.map.piles.filter(p=>p.item==='novel')).toHaveLength(1);exact(actual.h.w);
});

test('cancelling a real loaded formation and unloading return the same damaged book to the local floor after reload',()=>{
 const f=loaded(),w=f.h.w,id=f.ids.bookId;f.h.command({type:'group-cancel',groupId:f.groupId});
 expect(w.piles.find(p=>p.id===id)).toBe(f.book);expect(f.book.owner).toEqual({type:'inventory',pawnId:f.ids.readerId});
 const copy=exact(w),replayed=harness(copy);const bad=structuredClone(w);bad.piles.find(p=>p.id===id)!.quantity=2;
 const badBefore=JSON.stringify(bad),refused=applyCommand(bad,{type:'group-unload',originMapId:0,memberIds:[f.ids.readerId]});expect(refused.ok).toBe(false);expect(JSON.stringify(bad)).toBe(badBefore);
 for(const h of [f.h,replayed]){h.command({type:'group-unload',originMapId:0,memberIds:[f.ids.readerId]});h.until(()=>!h.w.worldGroups!.groups.length,180);}
 const returned=w.piles.find(p=>p.id===id)!;expect(returned).toBe(f.book);expect(returned).toMatchObject({quantity:1,damage:7,book:f.metadata,owner:{type:'ground'}});
 expect(copy.piles.find(p=>p.id===id)).toEqual(returned);expect(serializeWorld(copy)).toBe(serializeWorld(w));exact(w);exact(copy);
 // This is the real local loading/cancel/unload path used for possessions;
 // no off-map journey or distant map entry is claimed by this short test.
});
