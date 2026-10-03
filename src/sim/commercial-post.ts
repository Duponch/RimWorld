import { isColonist } from './affiliation.ts';
import { commercialPawnMass,type CommercialMass } from './commercial-mass.ts';
import { COMMERCIAL_MAX_STOCK,COMMERCIAL_RECEIPTS,COMMERCIAL_RESTOCK_TICKS,type CivilianPost,type CommercialBuyLine,type CommercialCommand,type CommercialProduct,type CommercialStockPile } from './commercial-state.ts';
import { biologicalYears } from './human-age.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { copyPileCondition } from './pile-condition.ts';
import { negotiatorRefusal } from './trade-contact.ts';
import { tradeImprovement } from './trade-goods.ts';
import { roundTradeSilver,settlementTradeUnitPrice } from './trade-prices.ts';
import { pileMaxHp } from './thing-damage-rules.ts';
import type { CommandResult,MaterialPile,World } from './types.ts';

export interface CommercialGood {pileId:number;item:CommercialProduct;available:number;unitPrice:number}
export type CommercialQuote={ok:false;reason:string}|{ok:true;signature:string;totalSilver:number;remainingSilver:number;mass:CommercialMass;goods:CommercialGood[];selected:{pileId:number;quantity:number;unitPrice:number}[]};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:readonly string[]):boolean=>Object.keys(v).every(k=>allowed.includes(k));
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const product=(v:unknown):v is CommercialProduct=>v==='medicine'||v==='component';
const reject=(reason:string)=>({ok:false as const,reason});
const MAX_INVENTORY=256;

/** Shape-only check for transport and the bounded stock. No map/registry scan. */
export function validCivilianPostShape(value:unknown,tick:number,nextId=Number.MAX_SAFE_INTEGER):value is CivilianPost {
  if(!object(value)||!keys(value,['stockedAt','rng','generation','stock','transactions','silverReceived','bought','recent'])
    ||!integer(value.stockedAt,0,tick)||!integer(value.rng,1,0xffffffff)||!integer(value.generation,1)
    ||!integer(value.transactions)||!integer(value.silverReceived)||!object(value.bought)||!keys(value.bought,['medicine','component'])
    ||!integer(value.bought.medicine)||!integer(value.bought.component)||!Array.isArray(value.stock)||!value.stock.length||value.stock.length>COMMERCIAL_MAX_STOCK
    ||!Array.isArray(value.recent)||value.recent.length!==Math.min(value.transactions,COMMERCIAL_RECEIPTS))return false;
  const ids=new Set<number>();
  for(const v of value.stock){
    if(!object(v)||!keys(v,['id','kind','item','quantity','damage'])||!integer(v.id,1,nextId-1)||ids.has(v.id)
      ||!(v.item==='silver'||product(v.item))||v.kind!==ITEM_DEFINITIONS[v.item].kind||!integer(v.quantity,1,ITEM_DEFINITIONS[v.item].stackLimit))return false;
    ids.add(v.id);
    if(v.damage!==undefined&&(!integer(v.damage,1)||v.damage>=pileMaxHp(v as unknown as CommercialStockPile)))return false;
  }
  let last=-1,silver=0,medicine=0,component=0;
  for(const r of value.recent){
    if(!object(r)||!keys(r,['tick','pawnId','silver','medicine','component'])||!integer(r.tick,0,tick)||r.tick<last||!integer(r.pawnId,1,nextId-1)
      ||!integer(r.silver,1)||!integer(r.medicine)||!integer(r.component)||r.medicine+r.component===0)return false;
    last=r.tick;silver+=r.silver;medicine+=r.medicine;component+=r.component;
  }
  if(![silver,medicine,component].every(Number.isSafeInteger)||silver>value.silverReceived||medicine>value.bought.medicine||component>value.bought.component)return false;
  if(value.transactions<=COMMERCIAL_RECEIPTS&&(silver!==value.silverReceived||medicine!==value.bought.medicine||component!==value.bought.component))return false;
  return value.transactions!==0||value.silverReceived===0&&value.bought.medicine===0&&value.bought.component===0;
}
/** Registers only this container's item identities in the caller's global set. */
export function validateCivilianPost(w:Pick<World,'tick'|'nextId'|'civilianPost'>,version:number,ids?:Set<number>):string[] {
  const post=w.civilianPost;if(post===undefined)return [];
  if(version<180||!validCivilianPostShape(post,w.tick,w.nextId))return ['Invalid civilian commercial post.'];
  const errors:string[]=[];
  if(ids)for(const pile of post.stock){if(ids.has(pile.id))errors.push('Duplicate civilian post identity.');else ids.add(pile.id);}
  return errors;
}
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
    transactions:old?.transactions??0,silverReceived:old?.silverReceived??0,bought:{medicine:old?.bought.medicine??0,component:old?.bought.component??0},recent:old?structuredClone(old.recent):[]};
  w.nextId=nextId;return true;
}

/** Empty selections expose the same current prices as the actual basket. */
export function quoteCommercial(w:World,lines:CommercialBuyLine[]):CommercialQuote {
  const trip=w.commercialTrip,post=w.civilianPost;
  if(!trip||trip.phase!=='at-post'||w.tick>trip.decisionUntil||!post||!validCivilianPostShape(post,w.tick,w.nextId))return reject('Le voyageur doit être arrivé au comptoir civil.');
  const p=trip.pawn;
  if(!isColonist(p)||p.prisoner||p.visitor||p.raid||p.podRescue||p.health?.death||p.age&&biologicalYears(p.age)<18||negotiatorRefusal(p))return reject('Le négociateur doit rester un colon adulte libre et capable.');
  const initial=commercialPawnMass(p,trip.items);if(!initial)return reject('Une possession ne possède pas de masse de voyage admissible.');
  if(!Array.isArray(lines)||lines.length>COMMERCIAL_MAX_STOCK||lines.some(l=>!object(l)||!keys(l,['pileId','quantity'])||!integer(l.pileId,1)||!integer(l.quantity,1))
    ||new Set(lines.map(l=>l.pileId)).size!==lines.length)return reject('Panier commercial invalide.');
  const improvement=tradeImprovement(p),goods:CommercialGood[]=[],selected:{pileId:number;quantity:number;unitPrice:number}[]=[];
  for(const pile of post.stock)if(product(pile.item)){
    const unitPrice=settlementTradeUnitPrice(pile,'buy',improvement);
    if(unitPrice===undefined)return reject('Prix du comptoir indisponible.');
    goods.push({pileId:pile.id,item:pile.item,available:pile.quantity,unitPrice});
  }
  let total=0,addedGrams=0;
  for(const l of lines){
    const good=goods.find(g=>g.pileId===l.pileId);if(!good||l.quantity>good.available)return reject('Le stock du comptoir a changé.');
    total+=good.unitPrice*l.quantity;addedGrams+=l.quantity*(good.item==='medicine'?500:600);
    selected.push({pileId:l.pileId,quantity:l.quantity,unitPrice:good.unitPrice});
  }
  const totalSilver=roundTradeSilver(total),silver=trip.items.filter(i=>i.owner.type==='inventory'&&i.owner.pawnId===p.id&&i.item==='silver').reduce((n,i)=>n+i.quantity,0);
  if(!integer(totalSilver)||!integer(silver))return reject('Montant commercial hors limites.');
  if(totalSilver>silver)return reject('Le voyageur ne porte pas assez d’argent.');
  const mass={grams:initial.grams+addedGrams-totalSilver*8,capacityGrams:initial.capacityGrams};
  if(!integer(mass.grams)||mass.grams>mass.capacityGrams)return reject('Le panier dépasse la charge du voyageur.');
  const signature=JSON.stringify([p.id,post.generation,post.stockedAt,post.stock,trip.items,improvement,selected,totalSilver,mass]);
  return {ok:true,signature,totalSilver,remainingSilver:silver-totalSilver,mass,goods,selected};
}

export function applyCommercialBuy(w:World,c:Extract<CommercialCommand,{type:'commercial-buy'}>):CommandResult {
  if(typeof c.quote!=='string'||!Array.isArray(c.lines)||!c.lines.length)return {ok:false,code:'invalid-command',reason:'Choisissez au moins un achat.'};
  const quote=quoteCommercial(w,c.lines);if(!quote.ok)return {ok:false,code:'invalid-command',reason:quote.reason};
  if(c.quote!==quote.signature)return {ok:false,code:'invalid-command',reason:'Le devis a changé. Vérifiez le panier de nouveau.'};
  const original=w.commercialTrip;if(!original||original.phase!=='at-post'||!w.civilianPost)return {ok:false,code:'invalid-command',reason:'Visite commerciale absente.'};
  const trip=structuredClone(original),post=structuredClone(w.civilianPost);
  let nextId=w.nextId;
  const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  const identity=():number|null=>{if(!integer(nextId,1)||!Number.isSafeInteger(nextId+1))return null;return nextId++;};
  for(const line of quote.selected){
    const pile=post.stock.find(s=>s.id===line.pileId);if(!pile||!product(pile.item))return fail('Marchandise indisponible.');
    let id=pile.id;
    if(line.quantity<pile.quantity){const allocated=identity();if(allocated===null)return fail('Identités commerciales épuisées.');id=allocated;pile.quantity-=line.quantity;}
    else post.stock.splice(post.stock.indexOf(pile),1);
    trip.items.push({...pile,id,quantity:line.quantity,owner:{type:'inventory',pawnId:trip.pawn.id},...copyPileCondition({...pile,owner:{type:'inventory',pawnId:trip.pawn.id}})});
    trip.bought[pile.item]+=line.quantity;post.bought[pile.item]+=line.quantity;
  }
  let payment=quote.totalSilver;
  for(const money of [...trip.items].filter(i=>i.item==='silver'&&i.owner.type==='inventory'&&i.owner.pawnId===trip.pawn.id).sort((a,b)=>a.id-b.id)){
    const quantity=Math.min(payment,money.quantity);if(!quantity)continue;
    let id=money.id;
    if(quantity<money.quantity){const allocated=identity();if(allocated===null)return fail('Identités commerciales épuisées.');id=allocated;money.quantity-=quantity;}
    else trip.items.splice(trip.items.indexOf(money),1);
    post.stock.push({id,kind:money.kind,item:money.item,quantity,...copyPileCondition(money)});
    payment-=quantity;if(!payment)break;
  }
  if(payment)return fail('L’argent embarqué n’est plus disponible.');
  trip.silverPaid+=quote.totalSilver;post.silverReceived+=quote.totalSilver;post.transactions++;
  const purchased={medicine:0,component:0};
  for(const line of quote.selected){const good=quote.goods.find(g=>g.pileId===line.pileId)!;purchased[good.item]+=line.quantity;}
  post.recent.push({tick:w.tick,pawnId:trip.pawn.id,silver:quote.totalSilver,...purchased});
  if(post.recent.length>COMMERCIAL_RECEIPTS)post.recent.splice(0,post.recent.length-COMMERCIAL_RECEIPTS);
  const mass=commercialPawnMass(trip.pawn,trip.items);
  if(w.piles.length+trip.items.length>32768||trip.items.filter(i=>i.owner.type==='inventory').length>MAX_INVENTORY||post.stock.length>COMMERCIAL_MAX_STOCK||!validCivilianPostShape(post,w.tick,nextId)
    ||!mass||mass.grams!==quote.mass.grams||mass.grams>mass.capacityGrams||![trip.silverPaid,trip.bought.medicine,trip.bought.component].every(n=>integer(n)))return fail('Capacité ou compteurs commerciaux dépassés.');
  w.commercialTrip=trip;w.civilianPost=post;w.nextId=nextId;
  return {ok:true};
}
