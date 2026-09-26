import { WEAPON_QUALITIES } from './equipment-rules.ts';
import { ticksUntilRot } from './food-preservation.ts';
import { tradeCatalogueEntry } from './trade-catalogue.ts';
import type { MaterialPile } from './types.ts';

/** Directions are always from the player's point of view. */
export type TradeDirection='buy'|'sell';
const qualityFactors=[.5,.75,1,1.25,1.5,2.5,5] as const;
const qualityGains=[Infinity,Infinity,Infinity,500,1000,2000,3000] as const;
/** Unity/financial reference midpoint-to-even; apply once to the net basket. */
export function roundTradeSilver(amount:number):number {
  const lower=Math.floor(amount),part=amount-lower;
  return part===.5?lower+(Math.abs(lower)%2):Math.round(amount);
}
export function tradeHealthFactor(fraction:number):number {
  const hp=Math.max(0,Math.min(1,fraction));
  if(hp<=.5)return hp*.2;
  if(hp<=.6)return .1+(hp-.5)*4;
  if(hp<.9)return .5+(hp-.6)*(5/3);
  return 1;
}
export function pileMarketValue(pile:MaterialPile):number|undefined {
  const entry=tradeCatalogueEntry(pile.item);if(!entry)return undefined;
  let value=entry.baseMarketValue;
  if(entry.hasQuality){
    const state=pile.weapon??pile.apparel;if(!state)return undefined;
    const index=WEAPON_QUALITIES.indexOf(state.quality);if(index<0||!Number.isFinite(state.hitPoints))return undefined;
    value+=Math.min(value*(qualityFactors[index]!-1),qualityGains[index]!);
    if(entry.healthAffectsPrice)value*=tradeHealthFactor(state.hitPoints/entry.maxHitPoints);
  }
  return value>200?roundTradeSilver(value/5)*5:value;
}
/** Pricing is separate from permission, source reachability and the atomic transfer.
 * The caller must also check tradeRefusal and current physical availability. */
export function tradeUnitPrice(pile:MaterialPile,direction:TradeDirection,improvement:number,priceLoss=0):number|undefined {
  const marketValue=pileMarketValue(pile),entry=tradeCatalogueEntry(pile.item);
  if(marketValue===undefined||!entry||!Number.isFinite(improvement)||!Number.isFinite(priceLoss)||improvement<0||improvement>.395||priceLoss<0||priceLoss>1)return undefined;
  if(pile.item==='silver')return 1;
  const roundUnit=(n:number)=>n>99.5?roundTradeSilver(n):n;
  const buy=roundUnit(Math.max(.5,marketValue*1.4*(1+priceLoss)*(1-improvement)));
  if(direction==='buy')return buy;
  return Math.min(buy,roundUnit(Math.max(.01,marketValue*.6*entry.sellPriceFactor*(1-priceLoss)*(1+improvement))));
}
/** Only authored sculptures have the Art tag in the delivered visitor profile.
 * The room value routine already applies stuff, work, quality, HP and Core's
 * market-value rounding. Selling then uses the sculpture's 1.10 factor. */
export function sculptureTradeUnitPrice(value:number,direction:TradeDirection,improvement:number):number|undefined {
  if(!Number.isFinite(improvement)||improvement<0||improvement>.395)return undefined;
  if(!Number.isFinite(value)||value<=0)return undefined;
  const roundUnit=(n:number)=>n>99.5?roundTradeSilver(n):n;
  const buy=roundUnit(Math.max(.5,value*1.4*(1-improvement)));
  return direction==='buy'?buy:Math.min(buy,roundUnit(Math.max(.01,value*.6*1.1*(1+improvement))));
}
/** Only the small outlander visitor profile is delivered, not every merchant type. */
export function tradeRefusal(pile:MaterialPile,direction:TradeDirection,tick:number):string|undefined {
  const entry=tradeCatalogueEntry(pile.item);
  if(!entry)return 'Cet objet n’a pas de profil commercial disponible.';
  if(pile.quantity<=0||ticksUntilRot(pile,tick)<=0)return 'Cet objet n’est plus disponible.';
  if(direction==='sell'&&!entry.playerCanSell)return 'Cet objet ne peut pas être revendu.';
  if(direction==='buy'&&!entry.playerCanBuy)return 'Cet objet n’est pas vendu par les marchands.';
  if(!entry.visitorHandles)return 'Ce visiteur ne commerce pas cette catégorie d’objets.';
  if(pileMarketValue(pile)===undefined)return 'L’état de cet objet ne permet pas de calculer son prix.';
  return undefined;
}
