import {beforeAll,expect,test} from 'vitest';
import {tradeRequestCountDraw284,tradeRequestDuration284,tradeRequestQuantity284,tradeRequestRewardBudget284,TRADE_REQUEST_DAY_284 as DAY} from '../src/sim/trade-request-rules-284.ts';
import {newQuestCalendar263,selectWorldQuest263,advanceWorldQuestCalendar263,notifyTradeRequestBorn284} from '../src/sim/world-quest-calendar-263.ts';
import {prepareTradeRequestBirth284} from '../src/sim/trade-request-producer-284.ts';
import {advanceTradeRequests284,answerTradeRequest284,activeTradeRequest284} from '../src/sim/trade-request-runtime-284.ts';
import {captureTradeRequestAvailability284} from '../src/sim/trade-request-accessibility-284.ts';
import {tradeRequestOwnedThings284} from '../src/sim/trade-request-holder-284.ts';
import {registeredMap,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {previewGenericItinerary261,previewTradeRequestItinerary284} from '../src/sim/group-travel-estimate.ts';
import {planetTicksPerMove} from '../src/sim/planet-navigation.ts';
import {worldGoodwillChange274,worldNaturalGoodwill274} from '../src/sim/world-diplomacy-274.ts';
import {initialWorldGoodwill256} from '../src/sim/world-faction-catalog.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {foggedCell256} from '../src/sim/exploration-state-256.ts';
import {terrainGroundFertility256} from '../src/sim/natural-terrain-runtime-256.ts';
import {createPlantLife} from '../src/sim/plant-life.ts';
import {ITEM_DEFINITIONS} from '../src/sim/items.ts';
import type {Resource,World} from '../src/sim/types.ts';
import {preparedTradeRequestCamp462,TRADE_REQUEST_CAMP_SOURCE_SHA462,TRADE_REQUEST_CAMP_PREPARATION462} from './scenarios/trade-requests-v462.ts';

// The single historical259 migration is explicit and bounded. This warms the
// shared exact284 baseline; subsequent calls restore independent owners.
beforeAll(()=>{preparedTradeRequestCamp462();},120000);

test('quantity uses the inclusive integer500..2500 draw and the abstract shirt value',()=>{
 expect(tradeRequestQuantity284(1,50000,0)).toBe(500);
 expect(tradeRequestQuantity284(1,50000,1-Number.EPSILON)).toBe(2500);
 // floor(2001*.17385)+500=847;847/99.72 rounds to8.
 expect(tradeRequestQuantity284(99.72,50000,.17385)).toBe(8);
 for(const bad of [-1,1,NaN,Infinity])expect(()=>tradeRequestQuantity284(99.72,50000,bad)).toThrow();
 expect(()=>tradeRequestQuantity284(0,50000,0)).toThrow();
});

test('wealth interpolates and quantity rounding changes strictly above100 and200',()=>{
 for(const [wealth,quantity] of [[0,30],[25000,65],[50000,100],[300000,200],[900000,200]])
  expect(tradeRequestQuantity284(5,wealth!,0)).toBe(quantity);
 for(const [unrounded,quantity] of [[100,100],[101,100],[103,105],[200,200],[201,200],[205,200],[215,220]])
  expect(tradeRequestQuantity284(500/unrounded!,50000,0)).toBe(quantity);
});

test('temporary family draws are deterministic scalar reads without consuming a source stream',()=>{
 const source=Object.freeze({rng:123456789,seed:42,core:29050}),before=JSON.stringify(source);
 const a=tradeRequestCountDraw284(source.seed,source.core,'shirt');
 expect(a).toBeGreaterThanOrEqual(0);expect(a).toBeLessThan(1);
 expect(tradeRequestCountDraw284(source.seed,source.core,'shirt')).toBe(a);
 expect(tradeRequestCountDraw284(source.seed,source.core,'cloth')).not.toBe(a);
 expect(tradeRequestCountDraw284(source.seed,source.core+10,'shirt')).not.toBe(a);
 expect(JSON.stringify(source)).toBe(before);
});

test('reward budget keeps its inverse wealth curve and independent1.5..2.1 draw',()=>{
 expect(tradeRequestRewardBudget284(100,10,0,0)).toBeCloseTo(1725);
 expect(tradeRequestRewardBudget284(100,10,50000,0)).toBeCloseTo(1500);
 expect(tradeRequestRewardBudget284(100,10,300000,0)).toBeCloseTo(1275);
 expect(tradeRequestRewardBudget284(100,10,175000,0)).toBeCloseTo(1387.5);
 expect(tradeRequestRewardBudget284(100,10,50000,1-Number.EPSILON)).toBeCloseTo(2100);
});

test('fixed duration draws12..28 days then applies travel minimum once, refusing over28',()=>{
 expect(tradeRequestDuration284(0,0)).toBe(12*DAY);
 expect(tradeRequestDuration284(0,1-Number.EPSILON)).toBe(28*DAY);
 expect(tradeRequestDuration284(10*DAY,0)).toBe(16*DAY);
 expect(tradeRequestDuration284(20*DAY,0)).toBe(27*DAY);
 expect(tradeRequestDuration284(21*DAY,0)).toBeUndefined();
 expect(tradeRequestDuration284(21*DAY,1-Number.EPSILON)).toBeUndefined();
 expect(tradeRequestDuration284(-1,0)).toBeUndefined();
 expect(tradeRequestDuration284(0,1)).toBeUndefined();
 expect(tradeRequestDuration284(NaN,0)).toBeUndefined();
});

const selection={points:0,progress:8,adjustedPopulation:3,hasFreeColonist:true,hasHomeMap:true};
function ticket(){const s=newQuestCalendar263(700000,42,[1,2,3]);s.rng=123456789;return s;}

test('the same pre-existing trade ticket is unsupported before284, with no redistribution or extra draws',()=>{
 // Declared unit calendar state, not a seed search or natural incident claim.
 const old=ticket(),current=ticket();
 expect(selectWorldQuest263(old,selection)).toBeNull();
 expect(selectWorldQuest263(current,{...selection,tradeRequests284:true})).toBe('trade-request');
 expect(old.rng).toBe(current.rng);expect(old.recent).toEqual([]);expect(current.siteOffers).toBe(0);
 // The same weighted draw selects unsupported BanditCamp in this catalogue.
 const bandit=ticket();expect(selectWorldQuest263(bandit,{...selection,points:350,progress:0,tradeRequests284:true})).toBeNull();
 expect(bandit.rng).toBe(current.rng);
 notifyTradeRequestBorn284(current);expect(current.recent).toEqual(['trade-request']);expect(current.siteOffers).toBe(1);
});

test('prospective calendar adoption skips its unknown old opportunity and a due ticket is consumed once',()=>{
 const s=ticket(),rng=s.rng;
 expect(advanceWorldQuestCalendar263(s,701000,{...selection,tradeRequests284:true})).toBeNull();
 expect(s.rng).toBe(rng);expect(s.opportunities).toBe(0);expect(s.pendingCore).toBeNull();
 s.pendingCore=702000;
 expect(advanceWorldQuestCalendar263(s,702000,{...selection,tradeRequests284:true})).toBe('trade-request');
 expect(s.opportunities).toBe(1);expect(s.pendingCore).toBeNull();
 const after=JSON.stringify(s);
 expect(advanceWorldQuestCalendar263(s,702000,{...selection,tradeRequests284:true})).toBeNull();
 expect(JSON.stringify(s)).toBe(after);
});

/** DECLARED finite preparation on the original home:4000cloth in legal
 * ground stacks plus one mature cotton plant on a free, known fertile cell.
 * The stock covers the largest abstract cloth request; the real plant marks
 * that family makeable. By default the separately declared diplomatic
 * preparation below makes an existing nearby faction neutral. Destinations,
 * leaders, geography and RNG stay original. No recipe, family, producer,
 * route or random draw is stubbed.
 * This is not evidence of elapsed growing, manufacture or natural incidence. */
function stockedGeographicCamp(prepareDiplomacy=true){
 const {w}=preparedTradeRequestCamp462(),row=w.worldMaps!.sites.find(s=>s.kind==='settlement'&&s.tile!==null);
 if(!row)throw Error('Acquired original home missing');
 const home=registeredMap(w,row.id);if(!home)throw Error('Original loaded home missing');
 const occupied=new Set<number>();
 for(const s of [...home.structures,...home.jobs])for(const c of footprintCells(s))occupied.add(c.z*home.width+c.x);
 for(const p of [...home.resources,...home.pawns])occupied.add(p.z*home.width+p.x);
 for(const p of home.piles)if(p.owner.type==='ground')occupied.add(p.owner.z*home.width+p.owner.x);
 const cells=home.tiles.flatMap((t,i)=>!occupied.has(i)&&!foggedCell256(home,i)&&terrainGroundFertility256(t)>=.7?[i]:[]);
 const count=Math.ceil(4000/ITEM_DEFINITIONS.cloth.stackLimit);
 if(cells.length<count+1)throw Error('Original known fertile home lacks room for declared finite stock');
 const i=cells[0]!,plant:Resource={id:home.nextId++,kind:'cotton',amount:1,x:i%home.width,z:Math.floor(i/home.width),growth:1,growthTick:home.tick};
 if(home.climate)plant.plantLife=createPlantLife(home,plant,true);
 home.resources=[...home.resources,plant];
 for(let n=0,left=4000;left>0;n++){
  const cell=cells[n+1]!,quantity=Math.min(left,ITEM_DEFINITIONS.cloth.stackLimit);
  home.piles.push({id:home.nextId++,item:'cloth',kind:'textile',quantity,owner:{type:'ground',x:cell%home.width,z:Math.floor(cell/home.width)}});left-=quantity;
 }
 flushRegisteredMap(home);advanceTradeRequests284(w);
 const cloth=captureTradeRequestAvailability284(w,home).get('cloth')!;
 expect(cloth.actual).toBeGreaterThanOrEqual(4000);expect(cloth.makeable).toBe(true);
 if(prepareDiplomacy)prepareNearbyRelation(w);
 return {w,home,row};
}

/** DECLARED operator preparation, not an earned gift or diplomatic success.
 * ROOT's retained native diagnostic manifest2026-10-22T20-33-14-524Z finds
 * actual settlement45/Argile-Rive/tile82061/faction2 at8.921279907226562
 * approximate tiles; nearest neutral civil destination is36.477169036865234.
 * Only the existing faction2 relation is changed through adopted arithmetic:
 * requestedGain80, natural target-130, hostile-80 -> neutral0. No stock,
 * payment, receipt, leader, faction, settlement, home, ID or RNG is invented. */
function prepareNearbyRelation(w:World):void {
 const factions=w.worldFactions!,faction=factions.factions.find(f=>f.id===2),settlement=factions.settlements.find(s=>s.id===45);
 if(!faction||faction.def!=='OutlanderRough'||!settlement||settlement.factionId!==faction.id||settlement.tile!==82061)throw Error('Original diagnosed nearby faction/settlement changed');
 const aId=Math.min(factions.playerFactionId,faction.id),bId=Math.max(factions.playerFactionId,faction.id),relation=factions.relations.find(r=>r.aId===aId&&r.bId===bId);
 if(!relation||relation.goodwill!==-80||relation.kind!=='hostile')throw Error('Original hostile relation changed');
 expect(initialWorldGoodwill256('PlayerColony',faction.def)).toBe(-80);
 const natural=worldNaturalGoodwill274(faction);if(natural===undefined)throw Error('Actual natural goodwill missing');
 const change=worldGoodwillChange274(relation.goodwill,relation.kind,natural,80);
 if(!change||change.goodwillAfter!==0||change.kindAfter!=='neutral')throw Error('Declared finite diplomatic preparation refused');
 const {rng,nextId,planet}=w,settlements=factions.settlements,leaders=factions.leaders;
 relation.goodwill=change.goodwillAfter;relation.kind=change.kindAfter;
 expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(w.planet).toBe(planet);
 expect(factions.settlements).toBe(settlements);expect(factions.leaders).toBe(leaders);
}

test('the original stocked geography refuses when no real nearby settlement is admissible, without mutation',()=>{
 const {w}=stockedGeographicCamp(false),before=JSON.stringify(w);
 expect(prepareTradeRequestBirth284(w)).toEqual({ok:false,reason:'Aucun établissement réel disponible à proximité.'});
 expect(JSON.stringify(w)).toBe(before);
 expect(w.worldFactions!.relations.find(r=>r.aId===2&&r.bId===w.worldFactions!.playerFactionId)).toMatchObject({goodwill:-80,kind:'hostile'});
},120000);

test('a real geographic producer creates original rewards once;3300 route and acceptance deadline stay distinct',()=>{
 expect(TRADE_REQUEST_CAMP_SOURCE_SHA462).toBe('5ff387667bb3933d4b3957c65dd9516c4c3470e13d3c888b2a917878f9778525');
 expect(TRADE_REQUEST_CAMP_PREPARATION462).toContain('No natural journey');
 const {w,home,row}=stockedGeographicCamp(),before=JSON.stringify([w.rng,w.nextId,w.tradeRequests284,home.piles,home.resources]);
 const draft=prepareTradeRequestBirth284(w);if(!draft.ok)throw Error(draft.reason);
 expect(JSON.stringify([w.rng,w.nextId,w.tradeRequests284,home.piles,home.resources])).toBe(before);
 const request=draft.request,availability=captureTradeRequestAvailability284(w,home).get(request.family)!;
 expect(availability.makeable).toBe(true);expect(availability.potential).toBeGreaterThanOrEqual(request.quantity);
 const points=[row.tile!,request.tile],trade=previewTradeRequestItinerary284(home,points),generic=previewGenericItinerary261(home,points);
 if(!trade.ok)throw Error(trade.reason);if(!generic.ok)throw Error(generic.reason);
 expect(planetTicksPerMove({homeCivilCore:0,genericTicksPerMove:3300})).toBe(3300);
 expect(planetTicksPerMove({homeCivilCore:0,genericTicksPerMove:3464})).toBe(3464);
 expect(trade.route).toEqual(generic.route);expect(trade.durationCore).toBeLessThanOrEqual(generic.durationCore);
 expect(request.durationCore).toBeGreaterThanOrEqual(12*DAY);expect(request.durationCore).toBeLessThanOrEqual(28*DAY);
 expect(request.durationCore).toBeGreaterThanOrEqual(Math.ceil(Math.max(trade.durationCore/DAY+6,trade.durationCore/DAY*1.35))*DAY);
 const originals=request.options.flatMap(o=>o.items);expect(originals.length).toBeGreaterThan(0);
 expect(new Set(originals.map(p=>p.id)).size).toBe(originals.length);
 draft.commit();expect(w.tradeRequests284!.entries).toEqual([request]);
 expect(tradeRequestOwnedThings284(w)).toEqual(originals);expect(draft.current()).toBe(false);expect(()=>draft.commit()).toThrow();
 for(const p of originals)expect(p.owner).toMatchObject({type:'trade-request284',requestId:request.id});
 const choice=request.options[0]!,chosen=choice.items.slice(),frozen=JSON.stringify([request.quantity,request.durationCore,request.rewardBudget,choice.original]);
 // Explicit boundary stimulus only: no elapsed travel or colony ticks claimed.
 w.tick=Math.floor((request.offerExpiresAtCore-1)/10);
 expect(answerTradeRequest284(w,{type:'trade-request-answer',requestId:request.id,optionId:choice.id})).toEqual({ok:true});
 expect(request.acceptedAtCore).toBe(w.tick*10);expect(request.expiresAtCore).toBe(w.tick*10+request.durationCore);
 expect(activeTradeRequest284(w,request.id)).toBe(request);expect(choice.items).toEqual(chosen);
 expect(JSON.stringify([request.quantity,request.durationCore,request.rewardBudget,choice.original])).toBe(frozen);
 expect(request.options.filter(o=>o.id!==choice.id).every(o=>o.items.length===0)).toBe(true);
 w.tick=Math.ceil(request.expiresAtCore!/10);advanceTradeRequests284(w);
 expect(activeTradeRequest284(w,request.id)).toBeUndefined();expect(request.closed).toEqual({atCore:w.tick*10,reason:'mission-expired'});
 expect(tradeRequestOwnedThings284(w)).toEqual([]);
 for(const p of originals)expect(request.cleanup.filter(c=>c.id===p.id)).toHaveLength(1);
 const closed=JSON.stringify(request);advanceTradeRequests284(w);expect(JSON.stringify(request)).toBe(closed);
},120000);

test('a changed prepared offer cannot commit, and an unanswered real offer cleans its holders at expiry',()=>{
 const {w}=stockedGeographicCamp(),draft=prepareTradeRequestBirth284(w);if(!draft.ok)throw Error(draft.reason);
 const originalQuantity=draft.request.quantity,before=JSON.stringify([w.rng,w.nextId,w.tradeRequests284]);
 draft.request.quantity++;
 expect(draft.current()).toBe(false);expect(()=>draft.commit()).toThrow();
 expect(JSON.stringify([w.rng,w.nextId,w.tradeRequests284])).toBe(before);
 draft.request.quantity=originalQuantity;expect(draft.current()).toBe(true);draft.commit();
 const request=draft.request,ids=request.options.flatMap(o=>o.items.map(p=>p.id));
 w.tick=Math.ceil(request.offerExpiresAtCore/10);advanceTradeRequests284(w);
 expect(request.status).toBe('expired');expect(request.closed).toEqual({atCore:w.tick*10,reason:'offer-expired'});
 expect(tradeRequestOwnedThings284(w)).toEqual([]);
 expect(request.cleanup.map(p=>p.id).sort((a,b)=>a-b)).toEqual(ids.sort((a,b)=>a-b));
 expect(request.cleanup.every(p=>p.reason==='offer-expired')).toBe(true);
},120000);
