import { emptyCommercialTextiles,isCommercialTextile,type CommercialTextileTotals,COMMERCIAL_MAX_STOCK,COMMERCIAL_RECEIPTS,type CivilianPost,type CommercialProduct,type CommercialStockPile } from './commercial-state.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { pileMaxHp } from './thing-damage-rules.ts';
import type { World } from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:readonly string[]):boolean=>Object.keys(v).every(k=>allowed.includes(k));
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const product=(v:unknown):v is CommercialProduct=>v==='medicine'||v==='component';
const reject=(reason:string)=>({ok:false as const,reason});
const textileTotals=(v:unknown):v is CommercialTextileTotals=>object(v)&&keys(v,['cloth','muffalo-wool'])&&integer(v.cloth)&&integer(v['muffalo-wool']);

/** Shape-only check for transport and the bounded stock. No map/registry scan. */
export function validCivilianPostShape(value:unknown,tick:number,nextId=Number.MAX_SAFE_INTEGER,version=185):value is CivilianPost {
  if(!object(value)||!keys(value,['stockedAt','rng','generation','stock','transactions','silverReceived','bought','recent',...version>=185?['sold','silverPaid']:[]])
    ||!integer(value.stockedAt,0,tick)||!integer(value.rng,1,0xffffffff)||!integer(value.generation,1)
    ||!integer(value.transactions)||!integer(value.silverReceived)||!object(value.bought)||!keys(value.bought,['medicine','component'])
    ||!integer(value.bought.medicine)||!integer(value.bought.component)||!Array.isArray(value.stock)||!value.stock.length||value.stock.length>COMMERCIAL_MAX_STOCK
    ||!Array.isArray(value.recent)||value.recent.length!==Math.min(value.transactions,COMMERCIAL_RECEIPTS))return false;
  const sales=Object.hasOwn(value,'sold')||Object.hasOwn(value,'silverPaid');
  if(sales&&(!textileTotals(value.sold)||!integer(value.silverPaid,1)||value.sold.cloth+value.sold['muffalo-wool']===0))return false;
  const ids=new Set<number>(),stockTextiles=emptyCommercialTextiles();
  for(const v of value.stock){
    if(!object(v)||!keys(v,['id','kind','item','quantity','damage'])||!integer(v.id,1,nextId-1)||ids.has(v.id)
      ||!(v.item==='silver'||product(v.item)||version>=185&&isCommercialTextile(v.item))||v.kind!==ITEM_DEFINITIONS[v.item].kind||!integer(v.quantity,1,ITEM_DEFINITIONS[v.item].stackLimit))return false;
    ids.add(v.id);
    if(isCommercialTextile(v.item))stockTextiles[v.item]+=v.quantity;
    if(v.damage!==undefined&&(!integer(v.damage,1)||v.damage>=pileMaxHp(v as unknown as CommercialStockPile)))return false;
  }
  let last=-1,silver=0,medicine=0,component=0,silverPaid=0;const sold=emptyCommercialTextiles(),generationSold=emptyCommercialTextiles();
  for(const r of value.recent){
    if(!object(r)||!keys(r,['tick','pawnId','silver','medicine','component',...version>=185?['sold']:[]])||!integer(r.tick,0,tick)||r.tick<last||!integer(r.pawnId,1,nextId-1)
      ||!integer(r.silver,1)||!integer(r.medicine)||!integer(r.component))return false;
    last=r.tick;
    if(Object.hasOwn(r,'sold')){
      if(!sales||!textileTotals(r.sold)||!r.sold.cloth&&!r.sold['muffalo-wool']||r.medicine!==0||r.component!==0)return false;
      silverPaid+=r.silver;sold.cloth+=r.sold.cloth;sold['muffalo-wool']+=r.sold['muffalo-wool'];
      if(r.tick>=value.stockedAt){generationSold.cloth+=r.sold.cloth;generationSold['muffalo-wool']+=r.sold['muffalo-wool'];}
    }else{
      if(r.medicine+r.component===0)return false;
      silver+=r.silver;medicine+=r.medicine;component+=r.component;
    }
  }
  const accumulatedSold=sales?value.sold as CommercialTextileTotals:emptyCommercialTextiles(),paid=sales?value.silverPaid as number:0;
  // Sold textiles stay in this stock until the next generation. Lifetime
  // counters bound it above; retained receipts from this generation bound it
  // below, even after older receipts have fallen out of the finite ledger.
  for(const item of ['cloth','muffalo-wool'] as const)if(stockTextiles[item]>accumulatedSold[item]||stockTextiles[item]<generationSold[item])return false;
  if(![silver,medicine,component,silverPaid,sold.cloth,sold['muffalo-wool']].every(Number.isSafeInteger)||silver>value.silverReceived||medicine>value.bought.medicine||component>value.bought.component
    ||silverPaid>paid||sold.cloth>accumulatedSold.cloth||sold['muffalo-wool']>accumulatedSold['muffalo-wool'])return false;
  if(value.transactions<=COMMERCIAL_RECEIPTS&&(silver!==value.silverReceived||medicine!==value.bought.medicine||component!==value.bought.component
    ||silverPaid!==paid||sold.cloth!==accumulatedSold.cloth||sold['muffalo-wool']!==accumulatedSold['muffalo-wool']))return false;
  return value.transactions!==0||value.silverReceived===0&&value.bought.medicine===0&&value.bought.component===0;
}
/** Registers only this container's item identities in the caller's global set. */
export function validateCivilianPost(w:Pick<World,'tick'|'nextId'|'civilianPost'>,version:number,ids?:Set<number>):string[] {
  const post=w.civilianPost;if(post===undefined)return [];
  if(version<180||!validCivilianPostShape(post,w.tick,w.nextId,version))return ['Invalid civilian commercial post.'];
  const errors:string[]=[];
  if(ids)for(const pile of post.stock){if(ids.has(pile.id))errors.push('Duplicate civilian post identity.');else ids.add(pile.id);}
  return errors;
}
