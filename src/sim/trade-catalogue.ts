import type { ItemId } from './items.ts';

/** Core 1.6.4871 normal-quality values before quality, condition and rounding.
 * Fixed material is part of each existing ItemId; there is no generic price by kind. */
export interface TradeCatalogueEntry {
  readonly baseMarketValue:number;
  readonly healthAffectsPrice:boolean;
  readonly maxHitPoints:number;
  readonly hasQuality:boolean;
  readonly sellPriceFactor:number;
  readonly playerCanBuy:boolean;
  readonly playerCanSell:boolean;
  readonly visitorHandles:boolean;
}
function value(baseMarketValue:number,visitorHandles=false,extra:Partial<TradeCatalogueEntry>={}):TradeCatalogueEntry {
  return Object.freeze({baseMarketValue,healthAffectsPrice:false,maxHitPoints:0,hasQuality:false,sellPriceFactor:1,playerCanBuy:true,playerCanSell:true,visitorHandles,...extra});
}
function gear(baseMarketValue:number,maxHitPoints:number,visitorHandles:boolean,weapon=false,extra:Partial<TradeCatalogueEntry>={}):TradeCatalogueEntry {
  return value(baseMarketValue,visitorHandles,{healthAffectsPrice:true,maxHitPoints,hasQuality:true,sellPriceFactor:weapon?.2:1,...extra});
}
export const TRADE_CATALOGUE:Readonly<Partial<Record<ItemId,TradeCatalogueEntry>>>=Object.freeze({
  silver:value(1,true),wood:value(1.2),steel:value(1.9),cloth:value(1.5,true),'light-leather':value(1.9),component:value(32,true),
  'herbal-medicine':value(10),medicine:value(18,true),'glitterworld-medicine':value(50),
  berries:value(1.2),rice:value(1.1),potato:value(1.1),corn:value(1.1),'hare-meat':value(2),
  'simple-meal':value(15,false,{playerCanSell:false}),'survival-meal':value(24,true),
  'granite-blocks':value(.9,false,{playerCanSell:false}),'limestone-blocks':value(.9,false,{playerCanSell:false}),
  'marble-blocks':value(.9,false,{playerCanSell:false}),'sandstone-blocks':value(.9,false,{playerCanSell:false}),'slate-blocks':value(.9,false,{playerCanSell:false}),
  'cloth-tribalwear':gear(96.48,100,true,false,{playerCanBuy:false}),'cloth-shirt':gear(77.22,100,true),'flak-vest':gear(223.4,200,false),
  revolver:gear(135.4,100,true,true),'bolt-action-rifle':gear(253.2,100,true,true),'plasteel-knife':gear(284.256,280,false,true),
});
export const tradeCatalogueEntry=(item:ItemId):TradeCatalogueEntry|undefined=>TRADE_CATALOGUE[item];
