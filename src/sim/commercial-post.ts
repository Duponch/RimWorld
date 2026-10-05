import { isColonist } from './affiliation.ts';
import { biologicalYears } from './human-age.ts';
import { commercialPawnMass,type CommercialMass } from './commercial-mass.ts';
import { emptyCommercialTextiles,isCommercialTextile,type CommercialTextile,type CommercialProduct,type CommercialBuyLine,type CommercialCommand } from './commercial-state.ts';
import { negotiatorRefusal,tradeImprovement } from './trade-negotiator.ts';
import { validCivilianPostShape } from './commercial-post-rules.ts';
import { quoteOwnerTrade,draftOwnerTrade,type CommercialOwnerContext,type OwnerQuote } from './commercial-owner-kernel.ts';
import type { CommandResult,World } from './types.ts';
import { COMMERCIAL_MAX_STOCK,COMMERCIAL_RESTOCK_TICKS,type CommercialStockPile } from './commercial-state.ts';
import { ITEM_DEFINITIONS } from './items.ts';
export { validCivilianPostShape,validateCivilianPost } from './commercial-post-rules.ts';
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
function random(state:{rng:number}):number {
  let n=state.rng;n^=n<<13;n^=n>>>17;n^=n<<5;state.rng=n>>>0;return state.rng/0x100000000;
}
/** Call only at an authoritative arrival. Expiration is lazy and strict; a
 * read or an exchange never generates stock. Refusal commits no identities. */
export function ensureCommercialPost(w:World):boolean {
  const old=w.civilianPost;
  if(old&&!validCivilianPostShape(old,w.tick,w.nextId))return false;
  if(old&&w.tick-old.stockedAt<=COMMERCIAL_RESTOCK_TICKS)return true;
  if(old&&!Number.isSafeInteger(old.generation+1))return false;
  const state={rng:old?.rng??(((w.seed^0x43a71d9b)>>>0)||1)},stock:CommercialStockPile[]=[];
  let nextId=w.nextId;
  const add=(item:'silver'|CommercialProduct,min:number,max:number):boolean=>{
    let total=min+Math.floor(random(state)*(max-min+1));
    while(total>0){
      if(!integer(nextId,1)||!Number.isSafeInteger(nextId+1)||stock.length>=COMMERCIAL_MAX_STOCK)return false;
      const quantity=Math.min(total,ITEM_DEFINITIONS[item].stackLimit);
      stock.push({id:nextId++,kind:ITEM_DEFINITIONS[item].kind,item,quantity});total-=quantity;
    }
    return true;
  };
  if(!add('silver',800,3000)||!add('component',20,70)||!add('medicine',25,50))return false;
  w.civilianPost={stockedAt:w.tick,rng:state.rng,generation:(old?.generation??0)+1,stock,
    transactions:old?.transactions??0,silverReceived:old?.silverReceived??0,bought:{medicine:old?.bought.medicine??0,component:old?.bought.component??0},recent:old?structuredClone(old.recent):[],
    ...old?.sold?{sold:{...old.sold},silverPaid:old.silverPaid!}:{}};
  w.nextId=nextId;return true;
}

export interface CommercialGood {pileId:number;item:CommercialProduct;available:number;unitPrice:number}
export interface CommercialSellGood {pileId:number;item:CommercialTextile;available:number;unitPrice:number}
export type CommercialQuote={ok:false;reason:string}|{ok:true;signature:string;totalSilver:number;remainingSilver:number;mass:CommercialMass;goods:CommercialGood[];selected:{pileId:number;quantity:number;unitPrice:number}[]};
export type CommercialSellQuote={ok:false;reason:string}|{ok:true;signature:string;totalSilver:number;remainingSilver:number;mass:CommercialMass;goods:CommercialSellGood[];selected:{pileId:number;quantity:number;unitPrice:number}[]};
const reject=(reason:string)=>({ok:false as const,reason});
type ContextResult={ok:true;context:CommercialOwnerContext}|{ok:false;reason:string};
function captureIndividualTrade(w:World):ContextResult {
  const trip=w.commercialTrip,post=w.civilianPost;
  if(!trip||trip.phase!=='at-post'||w.tick>trip.decisionUntil||!post||!validCivilianPostShape(post,w.tick,w.nextId))return reject('Le voyageur doit être arrivé au comptoir civil.');
  const p=trip.pawn;
  if(!isColonist(p)||p.prisoner||p.visitor||p.raid||p.podRescue||p.health?.death||p.age&&biologicalYears(p.age)<18)return reject('Le négociateur doit rester un colon adulte libre et capable.');
  const reason=negotiatorRefusal(p);if(reason)return reject(reason);
  const mass=commercialPawnMass(p,trip.items);if(!mass)return reject('Une possession ne possède pas de masse de voyage admissible.');
  return {ok:true,context:{tick:w.tick,nextId:w.nextId,version:185,scope:'individual',members:[p],negotiator:p,items:trip.items,post,mass,
    ledgerStamp:[trip.cargo,trip.sold,trip.silverEarned,trip.bought,trip.silverPaid],pileCountElsewhere:w.piles.length,inventoryLimit:256}};
}
/** Keep the historical public signature exact. Kernel signatures are internal
 * transaction authority; the individual adapter does not change its API. */
function individualSignature(w:World,q:Extract<OwnerQuote,{ok:true}>):string {
  const trip=w.commercialTrip;if(!trip||trip.phase!=='at-post'||!w.civilianPost)throw Error('Missing individual trade context');
  const post=w.civilianPost,improvement=tradeImprovement(trip.pawn);
  return JSON.stringify(q.direction==='buy'?[trip.pawn.id,post.generation,post.stockedAt,post.stock,trip.items,improvement,q.selected,q.totalSilver,q.mass]:
    [trip.pawn.id,post.generation,post.stockedAt,post.stock,trip.items,trip.cargo,trip.sold,trip.silverEarned,improvement,q.selected,q.totalSilver,q.mass]);
}
function cargoMatches(w:World):boolean {
  const trip=w.commercialTrip;if(!trip||trip.phase!=='at-post')return false;
  const totals=emptyCommercialTextiles();
  for(const pile of trip.items)if(pile.owner.type==='inventory'&&pile.owner.pawnId===trip.pawn.id&&isCommercialTextile(pile.item))totals[pile.item]+=pile.quantity;
  return totals.cloth===(trip.cargo?.cloth??0)-(trip.sold?.cloth??0)&&totals['muffalo-wool']===(trip.cargo?.['muffalo-wool']??0)-(trip.sold?.['muffalo-wool']??0);
}
function quotedIndividual(w:World,lines:CommercialBuyLine[],direction:'buy'|'sell'):{capture:CommercialOwnerContext;quote:OwnerQuote}|{capture:null;quote:Extract<OwnerQuote,{ok:false}>} {
  const captured=captureIndividualTrade(w);if(!captured.ok)return {capture:null,quote:captured};
  if(direction==='sell'){
    const base=quoteOwnerTrade(captured.context,'buy',[]);if(!base.ok)return {capture:null,quote:base};
    if(!cargoMatches(w))return {capture:null,quote:reject('Le fret inventorié ne correspond plus au manifeste.')};
  }
  return {capture:captured.context,quote:quoteOwnerTrade(captured.context,direction,lines)};
}
export function quoteCommercial(w:World,lines:CommercialBuyLine[]):CommercialQuote {
  const {quote}=quotedIndividual(w,lines,'buy');if(!quote.ok)return quote;
  return {ok:true,signature:individualSignature(w,quote),totalSilver:quote.totalSilver,remainingSilver:quote.remainingSilver,mass:quote.mass,goods:quote.goods as CommercialGood[],selected:quote.selected};
}
export function quoteCommercialSell(w:World,lines:CommercialBuyLine[]):CommercialSellQuote {
  const {quote}=quotedIndividual(w,lines,'sell');if(!quote.ok)return quote;
  return {ok:true,signature:individualSignature(w,quote),totalSilver:quote.totalSilver,remainingSilver:quote.remainingSilver,mass:quote.mass,goods:quote.goods as CommercialSellGood[],selected:quote.selected};
}
function applyIndividualTrade(w:World,c:Extract<CommercialCommand,{type:'commercial-buy'|'commercial-sell'}>):CommandResult {
  const direction=c.type==='commercial-buy'?'buy':'sell',fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  if(typeof c.quote!=='string'||!Array.isArray(c.lines)||!c.lines.length)return fail(direction==='buy'?'Choisissez au moins un achat.':'Choisissez au moins une vente.');
  const {capture,quote}=quotedIndividual(w,c.lines,direction);if(!quote.ok)return fail(quote.reason);
  if(c.quote!==individualSignature(w,quote))return fail('Le devis a changé. Vérifiez le panier de nouveau.');
  const original=w.commercialTrip;if(!capture||!original||original.phase!=='at-post'||!w.civilianPost)return fail('Visite commerciale absente.');
  if(direction==='sell'&&(!original.cargo||!original.sold||original.silverEarned===undefined))return fail('Manifeste textile absent.');
  const draft=draftOwnerTrade(capture,quote);if(!draft)return fail('Capacité, identité ou compteurs commerciaux dépassés.');
  // Only containers/counters are replaced. The original human remains the owner.
  const bought={medicine:original.bought.medicine+draft.bought.medicine,component:original.bought.component+draft.bought.component};
  const sold=direction==='sell'?{cloth:original.sold!.cloth+draft.sold.cloth,'muffalo-wool':original.sold!['muffalo-wool']+draft.sold['muffalo-wool']}:original.sold;
  const silverPaid=original.silverPaid+draft.silverPaid,silverEarned=direction==='sell'?original.silverEarned!+draft.silverEarned:original.silverEarned;
  if(![bought.medicine,bought.component,silverPaid,...(sold?[sold.cloth,sold['muffalo-wool']]:[]),...(silverEarned!==undefined?[silverEarned]:[])].every(n=>Number.isSafeInteger(n)&&n>=0))return fail('Capacité ou compteurs commerciaux dépassés.');
  w.commercialTrip={...original,items:draft.items,bought,silverPaid,...(sold?{sold}:{}),...(silverEarned!==undefined?{silverEarned}:{})};
  w.civilianPost=draft.post;w.nextId=draft.nextId;return {ok:true};
}
export function applyCommercialBuy(w:World,c:Extract<CommercialCommand,{type:'commercial-buy'}>):CommandResult {return applyIndividualTrade(w,c);}
export function applyCommercialSell(w:World,c:Extract<CommercialCommand,{type:'commercial-sell'}>):CommandResult {return applyIndividualTrade(w,c);}
