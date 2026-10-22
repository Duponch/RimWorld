import {expect,test} from 'vitest';
import {registryCamp} from './helpers/world-maps-v255.ts';
import {generateForeignWorldFactions256,completeWorldFactionRegistry256} from '../src/sim/world-faction-generation.ts';
import {defaultWorldGenerationSettings} from '../src/sim/world-generation-settings.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {planetTiles} from '../src/sim/planet-geography-256.ts';
import {tradeRequestContent284} from '../src/sim/trade-request-content-284.ts';
import {validateTradeRequests284,validTradeRequestHistorical284,type TradeRequestsValidationContext284} from '../src/sim/trade-request-save-284.ts';
import {prepareTradeRewardCleanup284,tradeRewardManifest284,tradeRequestOwnedThings284} from '../src/sim/trade-request-holder-284.ts';
import {validatePileRecordShape} from '../src/sim/material-record-save.ts';
import {ITEM_DEFINITIONS,type ItemId} from '../src/sim/items.ts';
import {newWeaponState} from '../src/sim/equipment-rules.ts';
import {freshRot} from '../src/sim/food-preservation.ts';
import type {MaterialPile} from '../src/sim/types.ts';
import type {TradeRequest284,TradeRequests284} from '../src/sim/trade-request-state-284.ts';

/** Declared holder/guard preparation over real map/planet/faction constructors.
 * It does not claim an incident draw, paid production, caravan trip, request
 * command, full current RAW admission, or validation by a fake local World. */
function prepared(){
 const w=registryCamp();(w as {schemaVersion:number}).schemaVersion=284;
 const generated=generateForeignWorldFactions256({version:284,tick:w.tick,tiles:planetTiles(w.planet!),selection:defaultWorldGenerationSettings().factions,population:3,nextFactionId:1,nextSettlementId:1,nextThingId:w.nextId,random:new WorldGenerationRandom(718)});
 if(!generated.ok)throw Error(generated.reason);
 const completed=completeWorldFactionRegistry256({version:284,draft:generated.draft,playerDef:'PlayerColony',name:'Camp témoin',postWorldRandom:new WorldGenerationRandom(718)});
 if(!completed.ok)throw Error(completed.reason);w.worldFactions=completed.registry;w.nextId=generated.nextThingId;
 const faction=w.worldFactions.factions.find(f=>f.def==='OutlanderCivil')!,target=w.worldFactions.settlements.find(s=>s.factionId===faction.id)!;
 if(!target)throw Error('Real civil settlement fixture unavailable');
 w.tick=100;
 const context:TradeRequestsValidationContext284={schemaVersion:284,tick:w.tick,nextId:w.nextId,planet:w.planet,worldFactions:w.worldFactions,worldMaps:w.worldMaps};
 const content=tradeRequestContent284('component')!;
 const request:TradeRequest284={id:1,homeMapId:w.worldMaps!.rootMapId!,settlementId:target.id,factionId:target.factionId,giverId:faction.leaderOwnerId!,tile:target.tile,settlementName:target.name,
  offeredAtCore:1000,offerExpiresAtCore:241001,durationCore:720000,family:content.family,quantity:2,baseMarketValue:content.baseMarketValue,
  wealth:{basis:'known-material-v1',value:50000,items:30000,structures:15000,floors:5000,unpricedPiles:0,unpricedPacked:0,unpricedStructures:0,unpricedPawns:3},rewardBudget:2000,
  options:[],dismissed:false,status:'offered',cleanup:[]};
 const pile=(item:ItemId,quantity:number,optionId:number):MaterialPile=>{
  const p:MaterialPile={id:w.nextId++,kind:ITEM_DEFINITIONS[item].kind,item,quantity,owner:{type:'trade-request284',requestId:1,optionId},...freshRot(item,100),...ITEM_DEFINITIONS[item].kind==='weapon'?{weapon:newWeaponState(item as Parameters<typeof newWeaponState>[0])}:{}};
  if(p.rot)p.rot.rate=0;context.nextId=w.nextId;return p;
 };
 const a=pile('gold',5,1),b=pile('herbal-medicine',3,2);
 request.options=[{id:1,goodwill:0,original:[tradeRewardManifest284(a)],items:[a]},{id:2,goodwill:4,original:[tradeRewardManifest284(b)],items:[b]},{id:3,goodwill:20,original:[],items:[]}];
 const registry:TradeRequests284={revision:1,adoptedAtCore:1000,nextId:2,entries:[request]};
 return {w,context,request,registry,pile,a,b,target};
}
function accept(f:ReturnType<typeof prepared>,optionId=1){
 f.w.tick=f.context.tick=110;
 const cleanup=prepareTradeRewardCleanup284(f.request,f.request.options.filter(o=>o.id!==optionId).map(o=>o.id),1100,'not-chosen');if(!cleanup)throw Error('Prepared unchosen cleanup refused');cleanup.commit();
 Object.assign(f.request,{status:'accepted',acceptedAtCore:1100,expiresAtCore:721100,selectedOptionId:optionId});
}
const valid=(f:ReturnType<typeof prepared>,ids=new Set<number>())=>validateTradeRequests284(f.registry,f.context,ids);

test('offered options own the same original Things once; scalar manifests do not add another owner',()=>{
 const f=prepared(),before=JSON.stringify(f.registry),added:number[]=[],ids={has:()=>false,add:(id:number)=>added.push(id)};
 expect(valid(f)).toEqual([]);expect(validateTradeRequests284(f.registry,f.context,ids)).toEqual([]);
 expect(added).toEqual([f.a.id,f.b.id]);expect(tradeRequestOwnedThings284({schemaVersion:284,tradeRequests284:f.registry})).toEqual([f.a,f.b]);
 expect(tradeRequestOwnedThings284({schemaVersion:283,tradeRequests284:f.registry})).toEqual([]);expect(JSON.stringify(f.registry)).toBe(before);
 const restored=JSON.parse(before);expect(validateTradeRequests284(restored,f.context,new Set())).toEqual([]);expect(JSON.stringify(restored)).toBe(before);
});

test('historical transport rejects future registry presence and reward owner tags throughout envelopes without reading getters',()=>{
 const owner={type:'trade-request284',requestId:1,optionId:1};
 const cases=[{tradeRequests284:undefined},{world:{tradeRequests284:undefined}},{piles:[{owner}]},{structures:{removed:[],upserted:[{cryptosleep:{items:[{owner}]}}]}},{worldMaps:{sites:[{map:{piles:[{owner}]}}]}},{campaignMap:{groups:[{state:{items:[{owner}]}}]}},{worldGroups:{abandonedContents:[{humans:[{items:[{owner}]}]}]}},{worldPawns:{owners:[{items:[{owner}]}]}}];
 for(const raw of cases){expect(validTradeRequestHistorical284(raw,283)).toBe(false);expect(validTradeRequestHistorical284(raw,284)).toBe(true);expect(validTradeRequestHistorical284(raw,285)).toBe(false);}
 let reads=0;const raw={};Object.defineProperty(raw,'tradeRequests284',{enumerable:true,get(){reads++;throw Error('No read');}});
 expect(validTradeRequestHistorical284(raw,283)).toBe(false);expect(reads).toBe(0);
 const cycle:{self?:unknown}={};cycle.self=cycle;expect(validTradeRequestHistorical284(cycle,283)).toBe(false);
 expect(validTradeRequestHistorical284({world:{schemaVersion:283},piles:[],structures:[]},283)).toBe(true);
});

test('closed versions, undefined fields, getters and unknown fields refuse without mutating the namespace',()=>{
 const f=prepared();expect(validateTradeRequests284(undefined,{...f.context,schemaVersion:283},new Set())).toEqual([]);
 for(const schemaVersion of [283,285])expect(validateTradeRequests284(f.registry,{...f.context,schemaVersion},new Set()).length).toBeGreaterThan(0);
 for(const schemaVersion of [283,284])expect(validateTradeRequests284(undefined,{...f.context,schemaVersion,tradeRequests284:undefined},new Set()).length).toBeGreaterThan(0);
 let reads=0;const getter=structuredClone(f.registry);Object.defineProperty(getter.entries[0]!,'options',{enumerable:true,get(){reads++;throw Error('No reward getter');}});
 expect(validateTradeRequests284(getter,f.context,new Set()).length).toBeGreaterThan(0);expect(reads).toBe(0);
 for(const change of [({future285:true}),({adoptedAtCore:1001}),({nextId:1})]){
  const ids=new Set<number>();expect(validateTradeRequests284({...f.registry,...change},f.context,ids).length).toBeGreaterThan(0);expect(ids.size).toBe(0);
 }
 const wrong=structuredClone(f.registry);Object.assign(wrong.entries[0]!,{acceptedAtCore:undefined});expect(validateTradeRequests284(wrong,f.context,new Set()).length).toBeGreaterThan(0);
});

test('duplicate physical owners and original manifests are refused atomically across options and existing owners',()=>{
 const f=prepared(),ids=new Set([f.b.id]);expect(valid(f,ids).length).toBeGreaterThan(0);expect([...ids]).toEqual([f.b.id]);
 const duplicate=structuredClone(f.registry);duplicate.entries[0]!.options[1]!.items=[structuredClone(f.a)];duplicate.entries[0]!.options[1]!.original=[tradeRewardManifest284(f.a)];
 const empty=new Set<number>();expect(validateTradeRequests284(duplicate,f.context,empty).length).toBeGreaterThan(0);expect(empty.size).toBe(0);
 const owner=structuredClone(f.registry);(owner.entries[0]!.options[0]!.items[0]!.owner as {optionId:number}).optionId=2;expect(validateTradeRequests284(owner,f.context,new Set()).length).toBeGreaterThan(0);
});

test('unchosen cleanup prepares without mutation, seals originals, records loss once and preserves the chosen original',()=>{
 const f=prepared(),before=JSON.stringify(f.registry),plan=prepareTradeRewardCleanup284(f.request,[2,3],1100,'not-chosen')!;
 expect(plan.current()).toBe(true);expect(JSON.stringify(f.registry)).toBe(before);
 const owner=f.b.owner;f.b.owner={...owner};expect(plan.current()).toBe(false);expect(()=>plan.commit()).toThrow();f.b.owner=owner;expect(plan.current()).toBe(true);
 plan.commit();expect(f.request.options[0]!.items[0]).toBe(f.a);expect(f.request.options[1]!.items).toEqual([]);
 expect(f.request.cleanup).toEqual([{...tradeRewardManifest284(f.b),optionId:2,atCore:1100,reason:'not-chosen'}]);expect(f.request.status).toBe('offered');expect(f.request.selectedOptionId).toBeUndefined();
 Object.assign(f.request,{status:'accepted',acceptedAtCore:1100,expiresAtCore:721100,selectedOptionId:1});f.context.tick=110;
 expect(valid(f)).toEqual([]);const after=JSON.stringify(f.registry),again=prepareTradeRewardCleanup284(f.request,[2,3],1100,'not-chosen')!;again.commit();expect(JSON.stringify(f.registry)).toBe(after);expect(again.current()).toBe(false);
});

test('offer expiry and accepted timeout clean only their actual retained options with exact causal receipts',()=>{
 for(const mission of [false,true]){
  const f=prepared();if(mission)accept(f);const core=mission?721100:241010,reason=mission?'mission-expired':'offer-expired';f.context.tick=core/10;
  const plan=prepareTradeRewardCleanup284(f.request,mission?[1]:[1,2,3],core,reason)!;expect(plan.current()).toBe(true);plan.commit();
  f.request.status='expired';f.request.closed={atCore:core,reason};const ids=new Set<number>();expect(valid(f,ids)).toEqual([]);expect(ids.size).toBe(0);expect(tradeRequestOwnedThings284({schemaVersion:284,tradeRequests284:f.registry})).toEqual([]);
  const broken=structuredClone(f.registry);broken.entries[0]!.cleanup.pop();expect(validateTradeRequests284(broken,f.context,new Set()).length).toBeGreaterThan(0);
 }
});

test('hostility failure requires real acceptance; an offered request is not silently failed by a guard',()=>{
 const f=prepared();accept(f);f.context.tick=120;prepareTradeRewardCleanup284(f.request,[1],1200,'hostile')!.commit();f.request.status='failed';f.request.closed={atCore:1200,reason:'hostile'};
 const before=JSON.stringify(f.registry);expect(valid(f)).toEqual([]);expect(JSON.stringify(f.registry)).toBe(before);
 const bad=structuredClone(f.registry);delete bad.entries[0]!.acceptedAtCore;delete bad.entries[0]!.expiresAtCore;delete bad.entries[0]!.selectedOptionId;expect(validateTradeRequests284(bad,f.context,new Set()).length).toBeGreaterThan(0);
});

test('successful scalar delivery receipts account for every original without owning the same delivered Thing again',()=>{
 const f=prepared();accept(f);const pawnId=f.w.pawns[0]!.id,sourceId=f.w.nextId++;f.context.nextId=f.w.nextId;f.context.tick=120;f.w.planet!.nextGroupId=2;
 f.a.owner={type:'inventory',pawnId};f.request.options[0]!.items=[];
 Object.assign(f.request,{status:'succeeded',closed:{atCore:1200,reason:'fulfilled'},fulfillment:{atCore:1200,groupId:1,consumed:[{sourceId,id:sourceId,item:'component',quantity:2}],delivered:[{...tradeRewardManifest284(f.a),pawnId}],goodwill:{before:0,afterBonus:12,afterReward:12,bonusRequested:12,rewardRequested:0}}});
 const ids=new Set([f.a.id]);expect(valid(f,ids)).toEqual([]);expect([...ids]).toEqual([f.a.id]);
 const broken=structuredClone(f.registry);broken.entries[0]!.fulfillment!.delivered=[];expect(validateTradeRequests284(broken,f.context,new Set()).length).toBeGreaterThan(0);
 const short=structuredClone(f.registry);short.entries[0]!.fulfillment!.consumed[0]!.quantity=1;expect(validateTradeRequests284(short,f.context,new Set()).length).toBeGreaterThan(0);
});

test('a vanished destination requires its actual destroyed-source proof and a retired home differs from a summary without retired maps',()=>{
 const f=prepared(),old=f.context.worldFactions!.settlements;f.context.worldFactions!.settlements=old.filter(s=>s!==f.target);
 expect(valid(f).length).toBeGreaterThan(0);
 f.context.worldSites263={revision:1,nextId:2,entries:[{kind:'destroyed-settlement',id:1,tile:f.target.tile,factionId:f.target.factionId,createdAtCore:1000,mapId:null,sourceSettlementId:f.target.id}]};
 expect(valid(f)).toEqual([]);f.context.worldSites263.entries[0]!.tile=(f.target.tile+1)%planetTiles(f.w.planet!).length;expect(valid(f).length).toBeGreaterThan(0);f.context.worldSites263.entries[0]!.tile=f.target.tile;
 f.request.destinationLost={atCore:1000,destroyedSiteId:1};expect(valid(f)).toEqual([]);
 f.context.worldFactions!.settlements=old;expect(valid(f).length).toBeGreaterThan(0);f.context.worldFactions!.settlements=old.filter(s=>s!==f.target);
 // The true defeat event retains its scalar proof after MapRemoved removes
 // the destroyed Site. A JSON reload neither resurrects it nor ends the offer.
 f.context.worldSites263.entries=[];const afterRemoval=JSON.stringify(f.registry);
 expect(validateTradeRequests284(JSON.parse(afterRemoval),f.context,new Set())).toEqual([]);expect(JSON.stringify(f.registry)).toBe(afterRemoval);
 f.request.destinationLost.destroyedSiteId=2;expect(valid(f).length).toBeGreaterThan(0);f.request.destinationLost.destroyedSiteId=1;
 const home=f.request.homeMapId;f.context.worldMaps={sites:[],retired:[{id:home,tile:null}]};expect(valid(f)).toEqual([]);
 f.context.worldMaps={sites:[],retired:[]};expect(valid(f).length).toBeGreaterThan(0);
 delete f.context.worldMaps;f.context.maps=[];expect(valid(f)).toEqual([]);
});

test('the current payload guard uses its explicit reward holder and original frozen clock with exact quality manifests',()=>{
 const f=prepared();expect(validatePileRecordShape(f.b as unknown as Record<string,unknown>,{width:1,height:1,tick:100,nextId:f.context.nextId,climate:undefined},284).length).toBeGreaterThan(0);
 const thawed=structuredClone(f.registry);thawed.entries[0]!.options[1]!.items[0]!.rot!.rate=1;expect(validateTradeRequests284(thawed,f.context,new Set()).length).toBeGreaterThan(0);
 const weapon=f.pile('revolver',1,1);f.request.options[0]={id:1,goodwill:0,original:[tradeRewardManifest284(weapon)],items:[weapon]};expect(valid(f)).toEqual([]);
 weapon.weapon!.quality='good';expect(valid(f).length).toBeGreaterThan(0);f.request.options[0]!.original=[tradeRewardManifest284(weapon)];expect(valid(f)).toEqual([]);
});

test('cleanup refuses immutable recipients, changed quantities and partial original holders without consuming anything',()=>{
 const f=prepared(),before=JSON.stringify(f.registry);Object.defineProperty(f.request.options[1]!,'items',{writable:false});
 expect(prepareTradeRewardCleanup284(f.request,[2],1100,'not-chosen')).toBeNull();expect(JSON.stringify(f.registry)).toBe(before);
 Object.defineProperty(f.request.options[1]!,'items',{writable:true});const plan=prepareTradeRewardCleanup284(f.request,[2],1100,'not-chosen')!;f.b.quantity--;
 expect(plan.current()).toBe(false);expect(()=>plan.commit()).toThrow();expect(f.request.cleanup).toEqual([]);
 f.b.quantity++;f.request.options[1]!.items=[];expect(prepareTradeRewardCleanup284(f.request,[2],1100,'not-chosen')).toBeNull();
 expect(prepareTradeRewardCleanup284(f.request,[4],1100,'not-chosen')).toBeNull();
});
