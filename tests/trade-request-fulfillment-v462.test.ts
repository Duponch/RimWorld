import {expect,test,beforeAll} from 'vitest';
import {preparedTradeRequestCamp462} from './scenarios/trade-requests-v462.ts';
import {worldGroupContext} from '../src/sim/world-map-context.ts';
import {groupWorld} from '../src/sim/world-map-authority.ts';
import {withGroupExchange,groupReorganizationBalance} from '../src/sim/group-reorganization-balance.ts';
import {groupPhysicalPawns256} from '../src/sim/group-mixed-pawns-256.ts';
import {captureProspectiveGroupMass256} from '../src/sim/group-caravan-mass-256.ts';
import {caravanPawnCapacityGrams256} from '../src/sim/group-animal-capacity-256.ts';
import {tradeRequestContent284} from '../src/sim/trade-request-content-284.ts';
import {tradeRewardManifest284} from '../src/sim/trade-request-holder-284.ts';
import {answerTradeRequest284} from '../src/sim/trade-request-runtime-284.ts';
import {quoteTradeRequestFulfill284,prepareTradeRequestFulfill284} from '../src/sim/trade-request-fulfill-284.ts';
import {newApparelState,type ApparelItem} from '../src/sim/apparel-rules.ts';
import {ITEM_DEFINITIONS,type ItemId} from '../src/sim/items.ts';
import {freshRot} from '../src/sim/food-preservation.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import type {TradeRequest284} from '../src/sim/trade-request-state-284.ts';
import type {MaterialPile} from '../src/sim/types.ts';

beforeAll(()=>{preparedTradeRequestCamp462();},120000);

/** Prepared real registered caravan/faction owners, not a played offer, trip,
 * manufacturing receipt or chosen natural incident. The transaction itself
 * uses the actual acceptance/holder and fulfillment owners below. */
function prepared(optionId=1){
 const f=preparedTradeRequestCamp462(),{w}=f,record=w.worldGroups!.groups.find(r=>r.state.id===f.groupId);
 if(!record||!('members'in record.state)||record.localMapId!==null)throw Error('Original acquired caravan missing');const g=record.state;
 const factions=w.worldFactions!,faction=factions.factions.find(q=>q.id===f.factionId)!,target=factions.settlements.find(s=>s.id===f.settlementId)!;
 if(!target)throw Error('Actual nonhostile settlement missing');
 const relation=factions.relations.find(r=>r.aId===Math.min(factions.playerFactionId,faction.id)&&r.bId===Math.max(factions.playerFactionId,faction.id))!;
 relation.goodwill=66;relation.kind='neutral';g.phase='at-site';g.tile=g.destination=target.tile;g.route=[target.tile];g.segment=null;g.stop={kind:'at-site'};
 const inventory=(item:ItemId,quantity:number,pawnId=groupPhysicalPawns256(g)[0]!.id):MaterialPile=>{
  let first:MaterialPile|undefined;
  while(quantity){const count=Math.min(quantity,ITEM_DEFINITIONS[item].stackLimit),pile:MaterialPile={id:w.nextId++,item,kind:ITEM_DEFINITIONS[item].kind,quantity:count,owner:{type:'inventory',pawnId},...freshRot(item,w.tick),...ITEM_DEFINITIONS[item].kind==='apparel'?{apparel:newApparelState(item as ApparelItem,undefined,284)}:{}};
   first??=pile;g.items.push(pile);g.reorganization=withGroupExchange(g.reorganization!,'received',[pile]);quantity-=count;
  }
  if(!first)throw Error('Positive declared inventory preparation required');return first;
 };
 const lower=inventory('cloth',4),upper=inventory('cloth',6),core=w.tick*10,content=tradeRequestContent284('cloth')!;
 const reward=(item:ItemId,quantity:number):MaterialPile=>{const p:MaterialPile={id:w.nextId++,item,kind:ITEM_DEFINITIONS[item].kind,quantity,owner:{type:'trade-request284',requestId:1,optionId:1},...freshRot(item,w.tick)};if(p.rot)p.rot.rate=0;return p;};
 const gold=reward('gold',100),medicine=reward('herbal-medicine',2);
 const request:TradeRequest284={id:1,homeMapId:record.originMapId,settlementId:target.id,factionId:faction.id,giverId:faction.leaderOwnerId!,tile:target.tile,settlementName:target.name,
  offeredAtCore:core,offerExpiresAtCore:core+300000,durationCore:720000,family:'cloth',quantity:7,baseMarketValue:content.baseMarketValue,
  wealth:{basis:'known-material-v1',value:50000,items:30000,structures:15000,floors:5000,unpricedPiles:0,unpricedPacked:0,unpricedStructures:0,unpricedPawns:g.members.length},rewardBudget:1000,
  options:[{id:1,goodwill:0,original:[gold,medicine].map(tradeRewardManifest284),items:[gold,medicine]},{id:2,goodwill:20,original:[],items:[]}],dismissed:false,status:'offered',cleanup:[]};
 w.tradeRequests284={revision:1,adoptedAtCore:core,nextId:2,entries:[request]};
 expect(answerTradeRequest284(w,{type:'trade-request-answer',requestId:1,optionId}).ok).toBe(true);
 const view=worldGroupContext(w,g.id);if(!view)throw Error('Actual bound group view missing');
 return {...f,g,record,view,faction,target,relation,request,lower,upper,gold,medicine,inventory};
}
function quote(f:ReturnType<typeof prepared>){const q=quoteTradeRequestFulfill284(f.view,1,f.g.id);if(!q.ok)throw Error(q.reason);return q;}

test('the same read-only quote works on SIM authority and public groupWorld projection without drawing RNG or allocating an ID',()=>{
 const f=prepared(),before=serializeWorld(f.w),rng=f.w.rng,next=f.w.nextId,q=quote(f);
 expect(q.consumed).toEqual([{pileId:f.upper.id,item:'cloth',quantity:6},{pileId:f.lower.id,item:'cloth',quantity:1}]);
 const decoded=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(f.w,0,1)));expect(decoded.status).toBe('applied');
 if(decoded.status!=='applied')throw Error('Actual public snapshot refused');const view=groupWorld(decoded.world,f.g.id);if(!view)throw Error('Public selected group missing');
 const projected=quoteTradeRequestFulfill284(view,1,f.g.id);expect(projected.ok).toBe(true);if(projected.ok)expect(projected.quote).toBe(q.quote);
 expect(quoteTradeRequestFulfill284(f.view,1,f.g.id)).toEqual(q);expect(serializeWorld(f.w)).toBe(before);expect(f.w.rng).toBe(rng);expect(f.w.nextId).toBe(next);
});

test('complete delivery consumes the native reverse inventory order, reserves one fragment ID and transfers the same chosen originals once',()=>{
 const f=prepared(),q=quote(f),next=f.w.nextId,otherPiles=JSON.stringify(f.w.piles),otherGroups=f.w.worldGroups!.groups.filter(r=>r!==f.record).map(r=>JSON.stringify(r)),posts=JSON.stringify(f.w.worldGroups!.posts),ledger=JSON.stringify(f.g.ledger);
 const p=prepareTradeRequestFulfill284(f.view,1,f.g.id,q.quote);expect(p.ok).toBe(true);if(!p.ok)throw Error(p.reason);p.commit();
 expect(f.lower.quantity).toBe(3);expect(f.g.items.find(i=>i.id===f.lower.id)).toBe(f.lower);expect(f.g.items.some(i=>i.id===f.upper.id)).toBe(false);expect(f.w.nextId).toBe(next+1);
 expect(f.request.fulfillment?.consumed).toEqual([{sourceId:f.upper.id,id:f.upper.id,item:'cloth',quantity:6},{sourceId:f.lower.id,id:next,item:'cloth',quantity:1}]);
 expect(f.request.options[0]!.items).toEqual([]);for(const reward of [f.gold,f.medicine]){expect(f.g.items.find(i=>i.id===reward.id)).toBe(reward);expect(reward.owner.type).toBe('inventory');}
 expect(f.medicine.rot?.atTick).toBe(f.w.tick);expect(f.medicine.rot?.progress).toBe(0);expect(f.medicine.rot?.rate??1).toBeGreaterThanOrEqual(0);
 expect(f.request).toMatchObject({status:'succeeded',closed:{atCore:f.w.tick*10,reason:'fulfilled'}});expect(f.request.fulfillment?.goodwill).toEqual({before:66,afterBonus:78,afterReward:78,bonusRequested:12,rewardRequested:0});expect(f.relation.kind).toBe('ally');
 expect(groupReorganizationBalance(f.g,f.g.reorganization!,f.w.worldGroups!.losses)).toBe(true);expect(JSON.stringify(f.g.ledger)).toBe(ledger);expect(JSON.stringify(f.w.piles)).toBe(otherPiles);expect(JSON.stringify(f.w.worldGroups!.posts)).toBe(posts);expect(f.w.worldGroups!.groups.filter(r=>r!==f.record).map(r=>JSON.stringify(r))).toEqual(otherGroups);
 const done=serializeWorld(f.w);expect(p.current()).toBe(false);expect(()=>p.commit()).toThrow();expect(prepareTradeRequestFulfill284(f.view,1,f.g.id,q.quote).ok).toBe(false);expect(serializeWorld(f.w)).toBe(done);expect(validateWorld(f.w)).toEqual([]);expect(deserializeWorld(done)).toEqual(f.w);
});

test('the bonus and chosen goodwill apply in two stages without receiving cleaned nonchosen objects or touching merchant counters',()=>{
 const f=prepared(2),q=quote(f),rng=f.w.rng,next=f.w.nextId,ledger=JSON.stringify(f.g.ledger);expect(q.rewards).toEqual([]);
 const p=prepareTradeRequestFulfill284(f.view,1,f.g.id,q.quote);if(!p.ok)throw Error(p.reason);p.commit();
 expect(f.request.fulfillment?.goodwill).toEqual({before:66,afterBonus:78,afterReward:98,bonusRequested:12,rewardRequested:20});expect(f.relation).toMatchObject({goodwill:98,kind:'ally'});expect(f.w.rng).toBe(rng);expect(f.w.nextId).toBe(next+1);expect(JSON.stringify(f.g.ledger)).toBe(ledger);
 expect(f.g.items.some(i=>i.id===f.gold.id||i.id===f.medicine.id)).toBe(false);expect(f.request.cleanup.map(p=>p.id)).toEqual([f.gold.id,f.medicine.id]);
});

test('wrong group, wrong settlement, movement, unconfirmed frontier, hostilities and exact expiry refuse the entire operation without mutation',()=>{
 const f=prepared(),q=quote(f),before=serializeWorld(f.w);
 expect(quoteTradeRequestFulfill284(f.view,1,f.g.id+100).ok).toBe(false);
 const cases:[()=>void,()=>void][]=[
  [()=>{f.g.phase='travelling';},()=>{f.g.phase='at-site';}],
  [()=>{f.g.tile++;},()=>{f.g.tile--;}],
  [()=>{f.g.lastPersonalTick--;},()=>{f.g.lastPersonalTick++;}],
  [()=>{f.relation.kind='hostile';f.relation.goodwill=-80;},()=>{f.relation.kind='neutral';f.relation.goodwill=66;}],
  [()=>{f.request.expiresAtCore=f.w.tick*10;},()=>{f.request.expiresAtCore=f.w.tick*10+f.request.durationCore;}],
 ];
 for(const [change,restore]of cases){change();const changed=JSON.stringify(f.w);expect(quoteTradeRequestFulfill284(f.view,1,f.g.id).ok).toBe(false);expect(prepareTradeRequestFulfill284(f.view,1,f.g.id,q.quote).ok).toBe(false);expect(JSON.stringify(f.w)).toBe(changed);restore();}
 expect(serializeWorld(f.w)).toBe(before);
});

test('only complete eligible inventory counts: mixed shirt materials and one-HP Normal clean pieces count, unknown, tainted, poor and worn do not',()=>{
 const f=prepared(),content=tradeRequestContent284('shirt')!;f.request.family='shirt';f.request.baseMarketValue=content.baseMarketValue;f.request.quantity=3;
 const a=f.inventory('cloth-shirt',1),b=f.inventory('plainleather-shirt',1),unknown=f.inventory('cloth-shirt',1),tainted=f.inventory('cloth-shirt',1),poor=f.inventory('cloth-shirt',1);
 a.apparel!.hitPoints=b.apparel!.hitPoints=1;delete unknown.apparel!.corpseWear284;tainted.apparel!.corpseWear284=true;poor.apparel!.quality='poor';
 const before=JSON.stringify(f.w);expect(quoteTradeRequestFulfill284(f.view,1,f.g.id).ok).toBe(false);expect(JSON.stringify(f.w)).toBe(before);
 const c=f.inventory('bluefur-shirt',1);const q=quote(f);expect(q.available).toBe(3);expect(q.consumed.map(i=>i.pileId)).toEqual([c.id,b.id,a.id]);
 c.owner={type:'apparel',pawnId:f.g.members[0]!.id};expect(quoteTradeRequestFulfill284(f.view,1,f.g.id).ok).toBe(false);
});

test('eligible animal inventories participate in actual physical member order, ahead of a later human inventory',()=>{
 const f=prepared(),a=f.g.animalOwners?.members[0];if(!a||!f.g.animalOwners)throw Error('Original acquired caravan animal missing');
 const originals=groupPhysicalPawns256(f.g);f.g.animalOwners.order=[a.id,...originals.filter(p=>p!==a).map(p=>p.id)];
 const animalCloth=f.inventory('cloth',7,a.id),q=quote(f);expect(groupPhysicalPawns256(f.g)[0]).toBe(a);expect(q.consumed).toEqual([{pileId:animalCloth.id,item:'cloth',quantity:7}]);
 expect(f.g.items.find(p=>p.id===f.upper.id)).toBe(f.upper);
});

test('already overloaded capable carriers still receive whole originals, and each reward uses a fresh current mass capture',()=>{
 const f=prepared();for(const p of groupPhysicalPawns256(f.g))f.inventory('uranium',Math.floor(caravanPawnCapacityGrams256(p)/1000)+80,p.id);
 const oldMass=captureProspectiveGroupMass256(f.g,284)!;expect(oldMass.grams).toBeGreaterThan(oldMass.capacityGrams);const q=quote(f);expect(q.mass.grams).toBeGreaterThan(q.mass.capacityGrams);
 const p=prepareTradeRequestFulfill284(f.view,1,f.g.id,q.quote);if(!p.ok)throw Error(p.reason);p.commit();
 expect(captureProspectiveGroupMass256(f.g,284)).toMatchObject(q.mass);for(const r of q.rewards){const held=f.g.items.filter(i=>i.id===r.id);expect(held).toHaveLength(1);expect(held[0]!.quantity).toBe(r.quantity);expect(held[0]!.owner).toEqual({type:'inventory',pawnId:r.pawnId});}
});

test('same-value original replacement and immutable recipients invalidate the prepared transaction before any real write',()=>{
 const f=prepared(),q=quote(f),p=prepareTradeRequestFulfill284(f.view,1,f.g.id,q.quote);if(!p.ok)throw Error(p.reason);
 f.gold.owner={...f.gold.owner};const before=JSON.stringify(f.w),rng=f.w.rng,next=f.w.nextId;expect(p.current()).toBe(false);expect(()=>p.commit()).toThrow();expect(JSON.stringify(f.w)).toBe(before);expect(f.w.rng).toBe(rng);expect(f.w.nextId).toBe(next);
 const fresh=quote(f);Object.defineProperty(f.lower,'quantity',{value:f.lower.quantity,enumerable:true,writable:false,configurable:true});const frozen=JSON.stringify(f.w);expect(prepareTradeRequestFulfill284(f.view,1,f.g.id,fresh.quote).ok).toBe(false);expect(JSON.stringify(f.w)).toBe(frozen);
});
