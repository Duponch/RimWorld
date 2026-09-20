import { pawnBody } from './health-rules.ts';
import { reservedSource } from './materials.ts';
import { adjacent,blockedCells,reachableCells,routeToJob } from './pathfinding.ts';
import { tradeRefusal,tradeUnitPrice } from './trade-prices.ts';
import { tradingAtContact } from './trade-contact.ts';
import type { MaterialPile,Pawn,World } from './types.ts';
import type { TradeLine } from './trade-state.ts';

export interface TradeGood { pile:MaterialPile; side:'buy'|'sell'; available:number; unitPrice:number; refusal?:string }
export function tradeImprovement(p:Pawn):number {
  const c=pawnBody(p).capacities;
  return Math.min(.395,Math.max(0,.015*(p.skills.social?.level??0)*(.1+.9*Math.min(1,c.talking/.95))*(.1+.9*Math.min(1,c.hearing/.8))));
}
export function tradeGoods(w:World,p:Pawn,t:Pawn):{goods:TradeGood[];silver:MaterialPile[];merchantSilver:MaterialPile[]} {
  const improvement=tradeImprovement(p),goods:TradeGood[]=[],silver:MaterialPile[]=[],merchantSilver:MaterialPile[]=[];
  const home=new Set(w.home??[]),zones=new Set(w.stockpiles.map(z=>z.z*w.width+z.x));
  let reach:ReturnType<typeof reachableCells>|undefined;
  for(const pile of w.piles) {
    const held=pile.owner.type==='inventory'&&pile.owner.pawnId===t.id&&!t.visitor?.personalFoodIds.includes(pile.id);
    const o=pile.owner,colonial=o.type==='ground'&&(home.has(o.z*w.width+o.x)||zones.has(o.z*w.width+o.x));
    if(!held&&!colonial)continue;
    const available=held?pile.quantity:Math.max(0,pile.quantity-reservedSource(w,pile.id));
    if(!available)continue;
    if(colonial&&o.type==='ground'&&!adjacent(t,o)){
      reach??=reachableCells(w,t,blockedCells(w),new Set());
      if(routeToJob(w,o,reach,true)===null)continue;
    }
    if(pile.item==='silver'){(held?merchantSilver:silver).push({...pile,quantity:available});continue;}
    const side=held?'buy':'sell',refusal=tradeRefusal(pile,side,w.tick),unitPrice=tradeUnitPrice(pile,side,improvement);
    goods.push({pile,side,available,unitPrice:unitPrice??0,...refusal?{refusal}:unitPrice===undefined?{refusal:'Objet non négociable.'}:{}});
  }
  return {goods,silver,merchantSilver};
}
export const roundTradeBalance=(n:number):number=>{const low=Math.floor(n);return n-low===.5?low+Math.abs(low%2):Math.round(n);};
export function quoteTrade(w:World,pawnId:number,traderId:number,lines:TradeLine[]) {
  const reject=(reason:string)=>({ok:false as const,reason});
  const p=w.pawns.find(p=>p.id===pawnId),t=w.pawns.find(p=>p.id===traderId);
  if(!p||!t||!tradingAtContact(w,p,t))return reject('Le négociateur doit rejoindre le marchand et rester disponible.');
  if(!Array.isArray(lines)||!lines.length||lines.length>128
    ||lines.some(l=>!l||!Number.isSafeInteger(l.pileId)||!Number.isSafeInteger(l.quantity)||l.quantity===0||Math.abs(l.quantity)>250000)||new Set(lines.map(l=>l.pileId)).size!==lines.length)return reject('Panier invalide.');
  const stock=tradeGoods(w,p,t),selected: {good:TradeGood;quantity:number}[]=[];
  let net=0;
  for(const line of lines){
    const g=stock.goods.find(g=>g.pile.id===line.pileId);
    if(!g||g.refusal||Math.abs(line.quantity)>g.available||(line.quantity>0)!==(g.side==='buy'))return reject(g?.refusal??'Le stock ou une réservation a changé.');
    selected.push({good:g,quantity:line.quantity});net+=line.quantity*g.unitPrice;
  }
  net=roundTradeBalance(net);
  const silver=stock.silver.reduce((n,x)=>n+x.quantity,0),merchantSilver=stock.merchantSilver.reduce((n,x)=>n+x.quantity,0);
  if(!Number.isSafeInteger(net))return reject('Le montant dépasse les limites du commerce.');
  if(net>silver)return reject('La colonie ne dispose pas d’assez d’argent accessible dans son foyer ou ses réserves.');
  const forgone=Math.max(0,-net-merchantSilver),paid=Math.max(net,-merchantSilver);
  // Only the participating quantities, condition, capacity-derived prices and
  // available currency form the quote. Unrelated ticks do not stale a basket.
  const signature=JSON.stringify([pawnId,traderId,t.visitor?.group,selected.map(({good:g,quantity})=>[g.pile.id,g.pile.item,g.available,quantity,g.unitPrice,g.pile.weapon,g.pile.apparel,g.pile.damage]),stock.silver.map(s=>[s.id,s.quantity]),stock.merchantSilver.map(s=>[s.id,s.quantity]),net,forgone]);
  return {ok:true as const,p,t,stock,selected,net,paid,forgone,signature};
}
