import {expect,test} from 'vitest';
import {harness} from './helpers/group-admission-v412.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {groupSourceChoices} from '../src/sim/group-authority.ts';
import {regularGroupFreightItem258,groupFreightUnitMass258,validLoadedGroupFreight258} from '../src/sim/group-freight-contract-258.ts';
import {groupCaravanUnitMass256} from '../src/sim/group-caravan-mass-256.ts';
import {PROSTHETIC_ITEMS_273} from '../src/sim/prosthetic-content-273.ts';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/serialization.ts';

test.each(PROSTHETIC_ITEMS_273)('%s joins real current freight loading with its original condition and survives campaign reload',item=>{
 const f=harness(),p=f.map.pawns[0]!,grams=item==='prosthetic-arm'?5000:8000;
 // Finite prepared physical piece only. No manufacture, contact, loading,
 // departure or acquisition history is granted before the actual commands.
 addMaterial(f.map,'prosthesis',1,{type:'ground',x:8,z:14},item);
 const piece=f.map.piles.find(q=>q.item===item)!;piece.damage=7;
 flushRegisteredMap(f.map);
 expect(validateWorld(f.w)).toEqual([]);
 expect(regularGroupFreightItem258(item,273)).toBe(true);
 expect(groupCaravanUnitMass256(item,true,273)).toBe(grams);
 expect(groupFreightUnitMass258(piece,273)).toBe(grams);
 for(const version of [2,258,272,274]){
  expect(regularGroupFreightItem258(item,version),String(version)).toBe(false);
  expect(groupCaravanUnitMass256(item,true,version),String(version)).toBeUndefined();
 }
 expect(regularGroupFreightItem258('unfinished-prosthetic',273)).toBe(false);
 expect(groupSourceChoices(f.map).some(row=>row.pile.id===piece.id&&row.available===1&&!row.reason)).toBe(true);
 const food=f.map.piles.find(q=>q.item==='survival-meal'&&q.owner.type==='ground'&&q.quantity>=4)!;
 expect(food).toBeDefined();
 f.command({type:'group-start',originMapId:f.w.worldMaps!.rootMapId!,memberIds:[p.id],sources:[{pileId:food.id,quantity:4},{pileId:piece.id,quantity:1}],destination:52});
 const id=f.w.worldGroups!.selectedGroupId!,state=f.w.worldGroups!.groups.find(row=>row.state.id===id)!.state;
 if(!('manifest'in state))throw Error('Expected actual current on-map preparation.');
 expect(state.manifest).toContainEqual(expect.objectContaining({pileId:piece.id,item,quantity:1,carrierId:p.id}));
 const before=serializeCampaign(f.w);
 expect(serializeCampaign(deserializeCampaign(before))).toBe(before);
 f.until(()=>f.map.piles.some(q=>q.id===piece.id&&q.owner.type==='inventory'&&q.owner.pawnId===p.id),600);
 const loaded=f.w.worldGroups!.groups.find(row=>row.state.id===id)!.state;
 if(!('manifest'in loaded))throw Error('Expected actual loading before local exit contact.');
 expect(loaded.cursor).toBeGreaterThan(loaded.manifest.findIndex(line=>line.pileId===piece.id));
 expect(validLoadedGroupFreight258(loaded,new Map(f.map.piles.map(q=>[q.id,q])),273)).toBe(true);
 expect(f.map.piles.find(q=>q.id===piece.id)).toMatchObject({item,kind:'prosthesis',quantity:1,damage:7,owner:{type:'inventory',pawnId:p.id}});
 expect(f.map.piles.filter(q=>q.item===item)).toHaveLength(1);
 expect(validateWorld(f.w)).toEqual([]);
 const raw=serializeCampaign(f.w),copy=deserializeCampaign(raw);
 expect(serializeCampaign(copy)).toBe(raw);
 expect(validateWorld(copy)).toEqual([]);
});
