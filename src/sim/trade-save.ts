import { roundTradeSilver } from './trade-prices.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { isColonist } from './affiliation.ts';
import { isArtMaterial,isArtRecipe } from './art-rules.ts';
import { isFurnitureQuality,sculptureMaxHitPoints } from './furniture-stats.ts';
import type { World } from './types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(n:unknown,min=0,max=Number.MAX_SAFE_INTEGER):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
const keys=(x:Record<string,unknown>,ks:string[])=>Object.keys(x).every(k=>ks.includes(k));
export function validTradeShape(p:Record<string,unknown>,version:number,w:World):boolean {
  const t=p.trade;if(t===undefined)return true;
  return version>=88&&object(t)&&keys(t,['traderId','phase','startedAt'])&&int(t.traderId,1,w.nextId-1)&&int(t.startedAt,0,w.tick)&&['approach','ready'].includes(String(t.phase));
}
export function validateTrade(w:World,version:number):string[] {
  const errors:string[]=[],claimed=new Set<number>();
  if(version<88)return w.trade!==undefined||w.pawns.some(p=>p.trade)||w.piles.some(p=>p.owner.type==='inventory')?['Legacy save contains trade.']:[];
  for(const p of w.pawns)if(p.trade){
    const t=w.pawns.find(t=>t.id===p.trade!.traderId);
    if(!isColonist(p)||p.prisoner||p.draft||p.jobId!==null||p.haul||p.need||p.ward||p.cooking||p.feed||p.tend||p.rescue||p.equipmentTask||p.research||p.firefighting||p.hunting||p.orders.active!==null||p.orders.queue.length||p.recreation.task||p.mental?.crisis||!t?.visitor||t.visitor.role!=='trader'||claimed.has(t.id))errors.push('Invalid trade contact or reservation.');
    claimed.add(p.trade.traderId);
  }
  for(const pile of w.piles)if(pile.owner.type==='inventory'){
    const p=w.pawns.find(p=>p.id===('pawnId' in pile.owner?pile.owner.pawnId:-1));
    if(!p?.visitor||pile.kind==='corpse'||pile.kind==='unfinished')errors.push('Invalid inventory ownership.');
  }
  const ledger:unknown=w.trade;if(ledger===undefined)return errors;
  if(!object(ledger)||!keys(ledger,version>=105?['count','silverPaid','silverReceived','forgone','bought','sold','artBought','artSold','recent']:['count','silverPaid','silverReceived','forgone','bought','sold','recent'])||!int(ledger.count,1)||!int(ledger.silverPaid)||!int(ledger.silverReceived)||!int(ledger.forgone)||!object(ledger.bought)||!object(ledger.sold)||!Array.isArray(ledger.recent)||!ledger.recent.length||ledger.recent.length>80||ledger.recent.length!==Math.min(80,ledger.count))return [...errors,'Invalid trade ledger.'];
  for(const totals of [ledger.bought,ledger.sold])for(const [item,n] of Object.entries(totals))if(!Object.hasOwn(ITEM_DEFINITIONS,item)||item==='silver'||!int(n,1))errors.push('Invalid trade item totals.');
  for(const totals of [ledger.artBought,ledger.artSold])if(totals!==undefined){
    if(version<105||!object(totals))errors.push('Invalid art trade totals.');
    else for(const [kind,n] of Object.entries(totals))if(!isArtRecipe(kind)||!int(n,1))errors.push('Invalid art trade totals.');
  }
  let last=-1,paid=0,received=0,forgone=0;
  const bought:Record<string,number>={},sold:Record<string,number>={},artBought:Record<string,number>={},artSold:Record<string,number>={};
  for(const r of ledger.recent){
    if(!object(r)||!keys(r,['tick','negotiatorId','traderId','silver','forgone','lines'])||!int(r.tick,0,w.tick)||r.tick<last||!int(r.negotiatorId,1,w.nextId-1)||!int(r.traderId,1,w.nextId-1)||r.traderId===r.negotiatorId||!int(r.silver,-Number.MAX_SAFE_INTEGER)||!int(r.forgone)||!Array.isArray(r.lines)||!r.lines.length||r.lines.length>128){errors.push('Invalid trade receipt.');continue;}
    last=r.tick;let balance=0;paid+=Math.max(0,r.silver);received+=Math.max(0,-r.silver);forgone+=r.forgone;
    for(const l of r.lines){
      if(!object(l)){errors.push('Invalid traded line.');continue;}
      if('packedId' in l){
        if(version<105||!keys(l,['packedId','kind','material','quality','damage','art','quantity','unitPrice'])||!int(l.packedId,1,w.nextId-1)||!isArtRecipe(l.kind)||!isArtMaterial(l.material)||!isFurnitureQuality(l.quality)||!int(l.damage,0)||!(l.damage<sculptureMaxHitPoints(l.kind,l.material))||!object(l.art)||!keys(l.art,['authorId','createdAt'])||!int(l.art.authorId,1,w.nextId-1)||!int(l.art.createdAt,0,r.tick)||![-1,1].includes(Number(l.quantity))||typeof l.unitPrice!=='number'||!Number.isFinite(l.unitPrice)||l.unitPrice<=0){errors.push('Invalid traded sculpture line.');continue;}
        balance+=Number(l.quantity)*l.unitPrice;const total=Number(l.quantity)>0?artBought:artSold;total[l.kind]=(total[l.kind]??0)+1;
      }else{
        if(!keys(l,['item','quantity','unitPrice'])||typeof l.item!=='string'||!Object.hasOwn(ITEM_DEFINITIONS,l.item)||l.item==='silver'||!int(l.quantity,-250000,250000)||l.quantity===0||typeof l.unitPrice!=='number'||!Number.isFinite(l.unitPrice)||l.unitPrice<=0){errors.push('Invalid traded line.');continue;}
        balance+=l.quantity*l.unitPrice;const total=l.quantity>0?bought:sold;total[l.item]=(total[l.item]??0)+Math.abs(l.quantity);
      }
    }
    if(!Number.isSafeInteger(Math.round(balance))||roundTradeSilver(balance)!==r.silver-r.forgone||r.forgone>0&&r.silver>0)errors.push('Inconsistent trade receipt balance.');
  }
  const artBoughtTotals=object(ledger.artBought)?ledger.artBought:{},artSoldTotals=object(ledger.artSold)?ledger.artSold:{};
  if(ledger.count<=80&&(paid!==ledger.silverPaid||received!==ledger.silverReceived||forgone!==ledger.forgone||JSON.stringify(Object.entries(bought).sort())!==JSON.stringify(Object.entries(ledger.bought).sort())||JSON.stringify(Object.entries(sold).sort())!==JSON.stringify(Object.entries(ledger.sold).sort())||JSON.stringify(Object.entries(artBought).sort())!==JSON.stringify(Object.entries(artBoughtTotals).sort())||JSON.stringify(Object.entries(artSold).sort())!==JSON.stringify(Object.entries(artSoldTotals).sort())))errors.push('Trade totals disagree with complete history.');
  if(paid>ledger.silverPaid||received>ledger.silverReceived||forgone>ledger.forgone||Object.entries(bought).some(([k,n])=>n>Number((ledger.bought as Record<string,number>)[k]??0))||Object.entries(sold).some(([k,n])=>n>Number((ledger.sold as Record<string,number>)[k]??0))||Object.entries(artBought).some(([k,n])=>n>Number(artBoughtTotals[k]??0))||Object.entries(artSold).some(([k,n])=>n>Number(artSoldTotals[k]??0)))errors.push('Trade history exceeds cumulative totals.');
  return errors;
}
