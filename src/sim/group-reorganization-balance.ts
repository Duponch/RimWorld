import {openGroupPackedBalance256,groupPackedBalance256} from './group-packed-balance-256.ts';
import {GROUP_FORAGED_ITEMS_256,emptyGroupForageUnits256,groupForageNetEffects256} from './group-forage-state-256.ts';
import {ITEM_DEFINITIONS,type ItemId} from './items.ts';
import type {MaterialPile} from './types.ts';
import type {GroupState,GroupLoss} from './group-state.ts';
import type {GroupInventoryVector,GroupMemberOrigin,GroupReorganization} from './group-reorganization-state.ts';
type Away=Extract<GroupState,{members:unknown}>;
const limit=BigInt(Number.MAX_SAFE_INTEGER);
const signed=(v:bigint):number=>{if(v < -limit||v>limit)throw Error('Group quantity overflow');return Number(v);};
const unsigned=(v:bigint):number=>{if(v<0n||v>limit)throw Error('Negative or overflowing group inventory');return Number(v);};
const quantity=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
/** Only material inventory owners participate; equipment follows its real Pawn. */
export function groupInventoryVector(items:readonly MaterialPile[]):GroupInventoryVector {
 const totals:GroupInventoryVector={};
 for(const p of items)if(p.owner.type==='inventory'){
  if(!quantity(p.quantity)||p.quantity===0)throw Error('Invalid inventory quantity');
  totals[p.item]=unsigned(BigInt(totals[p.item]??0)+BigInt(p.quantity));
 }
 return totals;
}
/** Historical loading contacts do not enter the post-opening effect vector. */
export function groupNetEffects(g:Away,r?:Pick<GroupReorganization,'pemmicanSinceOpening'|'foodSinceOpening'|'inventoryEffects'>):GroupInventoryVector {
 const l=g.ledger,p=g.provisions,extra=p?undefined:r?.pemmicanSinceOpening;
 const fruits=g.travel?groupForageNetEffects256(g.travel.forage):Object.fromEntries(GROUP_FORAGED_ITEMS_256.map(item=>[item,signed(-BigInt(r?.foodSinceOpening?.consumed[item]??0)-BigInt(r?.foodSinceOpening?.spoiled[item]??0))]));
 return {
  ...r?.inventoryEffects,
  ...fruits,
  'survival-meal':signed(-BigInt(l.foodConsumed)),
  pemmican:signed(-BigInt(p?.pemmicanConsumedUnits??extra?.consumed??0)-BigInt(p?.pemmicanSpoiledUnits??extra?.spoiled??0)),
  silver:signed(BigInt(l.silverEarned)-BigInt(l.silverPaid)),
  cloth:signed(-BigInt(l.sold.cloth)),'muffalo-wool':signed(-BigInt(l.sold['muffalo-wool'])),
  medicine:signed(BigInt(l.bought.medicine)-BigInt(l.medicineUsed)),component:l.bought.component,
 };
}
export function openGroupReorganization(g:Away,losses:readonly GroupLoss[],tick:number,memberOrigins:readonly GroupMemberOrigin[]):GroupReorganization {
 if(g.lastPersonalTick!==tick||!Number.isSafeInteger(tick)||tick<0)throw Error('Unconfirmed group opening');
 const held=[...g.items,...losses.filter(l=>l.groupId===g.id).flatMap(l=>l.items)];
 const packed=openGroupPackedBalance256(g,losses);return {revision:1,openedAt:tick,...packed?{packed}:{},opening:groupInventoryVector(held),effectsAtOpening:groupNetEffects(g),received:{},sent:{},...!g.provisions?{pemmicanSinceOpening:{consumed:0,spoiled:0}}:{},...!g.travel?{foodSinceOpening:{consumed:emptyGroupForageUnits256(),spoiled:emptyGroupForageUnits256()}}:{},memberOrigins:memberOrigins.map(o=>({...o}))};
}
/** Refusal is computed on a draft, before mutating the authoritative counters. */
export function withGroupExchange(r:GroupReorganization,direction:'received'|'sent',items:readonly MaterialPile[]):GroupReorganization {
 const values=groupInventoryVector(items),next={...r[direction]};
 for(const [key,value] of Object.entries(values)){
  const item=key as ItemId;next[item]=unsigned(BigInt(next[item]??0)+BigInt(value!));
 }
 return {...r,[direction]:next};
}
/** No validators below depend on a former map's grid, current selection or area. */
export function validGroupInventoryVector(value:unknown,signedValues=false):value is GroupInventoryVector {
 return record(value)&&Reflect.ownKeys(value).every(k=>typeof k==='string'&&Object.hasOwn(ITEM_DEFINITIONS,k)&&typeof value[k]==='number'&&Number.isSafeInteger(value[k])&&(signedValues||Number(value[k])>=0));
}
export function groupReorganizationBalance(g:Away,r:GroupReorganization,losses:readonly GroupLoss[]):boolean {
 try{
  if(!validGroupInventoryVector(r.opening)||!validGroupInventoryVector(r.effectsAtOpening,true)||!validGroupInventoryVector(r.received)||!validGroupInventoryVector(r.sent))return false;
  if(!groupPackedBalance256(g,r.packed,losses))return false;
  const actual=groupInventoryVector([...g.items,...losses.filter(l=>l.groupId===g.id).flatMap(l=>l.items)]),effects=groupNetEffects(g,r);
  const keys=new Set([...Object.keys(actual),...Object.keys(r.opening),...Object.keys(r.effectsAtOpening),...Object.keys(effects),...Object.keys(r.received),...Object.keys(r.sent)] as ItemId[]);
  for(const item of keys){
   const expected=BigInt(r.opening[item]??0)+BigInt(effects[item]??0)-BigInt(r.effectsAtOpening[item]??0)+BigInt(r.received[item]??0)-BigInt(r.sent[item]??0);
   if(expected<0n||expected>limit||BigInt(actual[item]??0)!==expected)return false;
  }
  return true;
 }catch{return false;}
}