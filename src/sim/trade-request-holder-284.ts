import {isSchema284OrLater} from './schema-compatibility-257.ts';
import {plainWorldPawnData256} from './world-pawn-save-256.ts';
import type {MaterialPile} from './types.ts';
import type {TradeRequest284,TradeRequests284,TradeRewardCleanup284,TradeRewardThing284} from './trade-request-state-284.ts';

export const TRADE_REQUEST_MAX_ENTRIES_284=4096;
export const TRADE_REQUEST_MAX_REWARD_STACKS_284=64;
export const TRADE_REQUEST_MAX_CLEANUP_284=192;

/** A description/receipt, never a second physical owner. */
export function tradeRewardManifest284(pile:MaterialPile):TradeRewardThing284 {
 const quality=pile.weapon?.quality??pile.apparel?.quality;
 return {id:pile.id,item:pile.item,quantity:pile.quantity,...quality!==undefined?{quality}:{}};
}
export function sameTradeRewardManifest284(a:TradeRewardThing284,b:TradeRewardThing284):boolean {
 return a.id===b.id&&a.item===b.item&&a.quantity===b.quantity&&a.quality===b.quality;
}

export interface PreparedTradeRewardCleanup284 {current():boolean;commit():void}
const writable=(o:object,key:string)=>{const d=Object.getOwnPropertyDescriptor(o,key);return !!d&&Object.hasOwn(d,'value')&&d.writable===true;};
/** An explicit SIM event prepares cleanup. Admission/reading never calls it.
 * Only the selected option holders and scalar cleanup receipt are written;
 * the caller owns status, choice and deadline transitions in its transaction. */
export function prepareTradeRewardCleanup284(request:TradeRequest284,optionIds:readonly number[],atCore:number,reason:TradeRewardCleanup284['reason']):PreparedTradeRewardCleanup284|null {
 try{
  if(!plainWorldPawnData256(request)||!Number.isSafeInteger(atCore)||atCore<request.offeredAtCore||atCore%10||!['not-chosen','offer-expired','mission-expired','hostile'].includes(reason)
   ||!Array.isArray(optionIds)||!optionIds.length||optionIds.length>3||new Set(optionIds).size!==optionIds.length||optionIds.some(id=>!Number.isInteger(id)||id<1||id>3)
   ||!Array.isArray(request.options)||!Array.isArray(request.cleanup))return null;
  const options=request.options,cleanup=request.cleanup,chosen=options.filter(o=>optionIds.includes(o.id));
  if(chosen.length!==optionIds.length||reason==='not-chosen'&&chosen.some(o=>o.id===request.selectedOptionId))return null;
  const ids=new Set(cleanup.map(r=>r.id)),receipts:TradeRewardCleanup284[]=[];if(ids.size!==cleanup.length)return null;
  for(const option of chosen){
   if(!Array.isArray(option.items)||!Array.isArray(option.original)||option.items.length>TRADE_REQUEST_MAX_REWARD_STACKS_284||option.original.length>TRADE_REQUEST_MAX_REWARD_STACKS_284)return null;
   if(option.items.length?option.items.length!==option.original.length:option.original.some(p=>!cleanup.some(c=>c.optionId===option.id&&sameTradeRewardManifest284(c,p))))return null;
   for(const pile of option.items){
    const owner=pile.owner;if(owner.type!=='trade-request284'||owner.requestId!==request.id||owner.optionId!==option.id||ids.has(pile.id))return null;
    const manifest=tradeRewardManifest284(pile),original=option.original.find(p=>p.id===pile.id);
    if(!original||!sameTradeRewardManifest284(manifest,original))return null;
    ids.add(pile.id);receipts.push({...manifest,optionId:option.id,atCore,reason});
   }
  }
  if(cleanup.length+receipts.length>TRADE_REQUEST_MAX_CLEANUP_284)return null;
  const next=[...cleanup,...receipts],before=JSON.stringify(request),held=chosen.map(o=>({option:o,original:o.original,items:o.items,refs:o.items.slice(),owners:o.items.map(p=>p.owner)}));let used=false;
  const current=()=>!used&&request.options===options&&request.cleanup===cleanup&&plainWorldPawnData256(request)&&JSON.stringify(request)===before
   &&held.every(h=>options.includes(h.option)&&h.option.original===h.original&&h.option.items===h.items&&h.items.length===h.refs.length&&h.items.every((p,i)=>p===h.refs[i]&&p.owner===h.owners[i])&&writable(h.option,'items'))&&writable(request,'cleanup');
  if(!current())return null;
  return {current,commit(){if(!current())throw Error('Actual trade reward holder changed before cleanup');used=true;for(const h of held)if(h.items.length)h.option.items=[];if(receipts.length)request.cleanup=next;}};
 }catch{return null;}
}

/** The caller's existing campaign census visits these originals once. Neither
 * original manifests nor cleanup/delivery receipts reserve another Thing ID. */
export function tradeRequestOwnedThings284(root:{schemaVersion:number;tradeRequests284?:TradeRequests284}):MaterialPile[] {
 if(!isSchema284OrLater(root.schemaVersion))return [];
 return root.tradeRequests284?.entries.flatMap(r=>r.options.flatMap(o=>o.items))??[];
}
