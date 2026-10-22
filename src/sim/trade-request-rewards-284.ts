import {ITEM_DEFINITIONS,type ItemId} from './items.ts';
import {newApparelState,isApparelItem} from './apparel-rules.ts';
import {newWeaponState,isWeaponItem} from './equipment-rules.ts';
import {freshRot} from './food-preservation.ts';
import {pileMarketValue} from './trade-prices.ts';
import {healthRandom} from './health.ts';
import {tradeRequestGoodwill284} from './trade-request-rules-284.ts';
import {tradeRequestContent284,TRADE_REQUEST_CONTENT_284,type TradeRequestFamily284} from './trade-request-content-284.ts';
import type {TradeRewardOption284,TradeRewardThing284} from './trade-request-state-284.ts';
import type {MaterialPile} from './types.ts';

/** Original finite content adapter: existing manufactured goods and resources,
 * normal quality. Core's full weighted reward tables, books and Reward_Pawn
 * remain separate content work, never merchant stock or ItemStash rewards. */
export const TRADE_REQUEST_REWARD_ITEMS_284:readonly ItemId[]=Object.freeze([
 'component','advanced-component','medicine','glitterworld-medicine','survival-meal','plasteel','uranium','gold','jade',
 'prosthetic-arm','prosthetic-leg','revolver','bolt-action-rifle','emp-launcher','plasteel-knife',
 'flak-vest','flak-helmet','recon-helmet','recon-armor','cloth-shirt','cloth-pants','cloth-duster','cloth-parka',
]);
const FILLERS:readonly ItemId[]=['silver','gold','uranium','jade','plasteel'];
const familyOf=(item:ItemId)=>TRADE_REQUEST_CONTENT_284.find(d=>d.items.includes(item))?.family??item;
export const tradeRewardThingSummary284=(p:MaterialPile):TradeRewardThing284=>({id:p.id,item:p.item,quantity:p.quantity,
 ...p.weapon||p.apparel?{quality:(p.weapon??p.apparel)!.quality}:{}});
function make(item:ItemId,quantity:number,id:number,requestId:number,optionId:number,tick:number):MaterialPile {
 const fresh=freshRot(item,tick);if(fresh.rot)fresh.rot.rate=0;
 return {id,item,kind:ITEM_DEFINITIONS[item].kind,quantity,owner:{type:'trade-request284',requestId,optionId},...fresh,
  ...isWeaponItem(item)?{weapon:newWeaponState(item)}:isApparelItem(item)?{apparel:newApparelState(item,undefined,284)}:{}};
}
/** Rejected alternatives never allocate a physical identity. All accepted
 * originals are created here once and retained through acceptance/load. */
export function draftTradeRequestRewards284(input:{requestId:number;family:TradeRequestFamily284;budget:number;goodwill:number;allowGoodwill:boolean;nextId:number;tick:number;rng:number}):
 {options:TradeRewardOption284[];nextId:number;rng:number}|undefined {
 const budget=Math.max(250,input.budget),random={rng:input.rng},draw=()=>healthRandom(random),options:TradeRewardOption284[]=[],used=new Set<string>();let nextId=input.nextId;
 if(!Number.isFinite(budget)||budget>1000000||!Number.isSafeInteger(nextId)||nextId<1)return;
 if(input.allowGoodwill&&input.goodwill<=92){options.push({id:1,goodwill:tradeRequestGoodwill284(budget,input.goodwill,draw()),original:[],items:[]});used.add('goodwill');}
 const banned=tradeRequestContent284(input.family)!.items;
 for(let attempt=0;options.length<3&&attempt<30;attempt++){
  const optionId=options.length+1,candidates=TRADE_REQUEST_REWARD_ITEMS_284.filter(item=>!banned.includes(item)&&
   (pileMarketValue(make(item,1,nextId,input.requestId,optionId,input.tick))??Infinity)<=budget*1.3);
  if(!candidates.length)break;
  const item=candidates[Math.floor(draw()*candidates.length)]!,probe=make(item,1,nextId,input.requestId,optionId,input.tick),unit=pileMarketValue(probe)!;
  const count=probe.weapon||probe.apparel?1:Math.max(1,Math.floor(budget*(.7+.6*draw())/unit));
  const lines:{item:ItemId;quantity:number}[]=[{item,quantity:count}];let value=unit*count;
  const remaining=budget-value;
  if(remaining>=200||value<budget*.7){
   // The native filler path does not carry the requested-Def ban.
   const affordable=FILLERS.filter(i=>{const v=pileMarketValue(make(i,1,nextId,input.requestId,optionId,input.tick));return v!==undefined&&remaining/v>=15;});
   if(affordable.length){const filler=affordable[Math.floor(draw()*affordable.length)]!,price=pileMarketValue(make(filler,1,nextId,input.requestId,optionId,input.tick))!,exact=remaining/price,floor=Math.floor(exact),quantity=floor+(draw()<exact-floor?1:0);if(quantity>0){lines.push({item:filler,quantity});value+=quantity*price;}}
  }
  if(value<budget*.7||value>budget*1.3)continue;
  const signature=[...new Set(lines.map(l=>familyOf(l.item)))].sort().join('|');if(used.has(signature))continue;
  const stacks=lines.reduce((sum,l)=>sum+Math.ceil(l.quantity/ITEM_DEFINITIONS[l.item].stackLimit),0);
  if(stacks>64||!Number.isSafeInteger(nextId+stacks))continue;
  const items:MaterialPile[]=[];
  for(const line of lines){let remaining=line.quantity;while(remaining){const quantity=Math.min(remaining,ITEM_DEFINITIONS[line.item].stackLimit);items.push(make(line.item,quantity,nextId++,input.requestId,optionId,input.tick));remaining-=quantity;}}
  used.add(signature);options.push({id:optionId,goodwill:0,original:items.map(tradeRewardThingSummary284),items});
 }
 return options.length?{options,nextId,rng:random.rng}:undefined;
}
