import { describe,expect,it } from 'vitest';
import { ITEM_DEFINITIONS,type ItemId } from '../src/sim/items.ts';
import { pileMarketValue,roundTradeSilver,tradeHealthFactor,tradeRefusal,tradeUnitPrice } from '../src/sim/trade-prices.ts';
import { generateVisitorStock,VISITOR_CLOTHING_POOL,VISITOR_RANGED_POOL,VISITOR_SHIRT_CLOTH_CHANCE,visitorSelectionWeight } from '../src/sim/trade-stock.ts';
import type { MaterialPile } from '../src/sim/types.ts';

const pile=(item:ItemId,extra:Partial<MaterialPile>={}):MaterialPile=>({id:101,item,kind:ITEM_DEFINITIONS[item].kind,quantity:1,owner:{type:'ground',x:1,z:1},...extra});
describe('small visitor economy: physical stock, condition and actual buying categories',()=>{
  it('values fixed material, quality and condition before reference rounding; commodities keep their value',()=>{
    const gun=pile('revolver',{weapon:{quality:'normal',hitPoints:100}});
    expect(pileMarketValue(gun)).toBeCloseTo(135.4);
    expect(tradeUnitPrice(gun,'buy',0)).toBe(190);
    expect(tradeUnitPrice(gun,'sell',0)).toBeCloseTo(16.248);
    const rifle=pile('bolt-action-rifle',{weapon:{quality:'normal',hitPoints:100}});
    expect(pileMarketValue(rifle)).toBe(255);
    expect(tradeUnitPrice(rifle,'buy',.15)).toBe(303);
    expect(tradeUnitPrice(rifle,'sell',.15)).toBeCloseTo(35.19);
    expect(pileMarketValue({...rifle,weapon:{quality:'normal',hitPoints:50}})).toBeCloseTo(25.32);
    expect(pileMarketValue({...rifle,weapon:{quality:'excellent',hitPoints:100}})).toBe(380);
    expect(pileMarketValue(pile('plasteel-knife',{weapon:{quality:'normal',hitPoints:280}}))).toBe(285);
    expect(pileMarketValue(pile('cloth-shirt',{apparel:{quality:'normal',hitPoints:100}}))).toBeCloseTo(77.22);
    expect(pileMarketValue(pile('cloth-tribalwear',{apparel:{quality:'normal',hitPoints:100}}))).toBeCloseTo(96.48);
    expect(pileMarketValue(pile('flak-vest',{apparel:{quality:'normal',hitPoints:200}}))).toBe(225);
    for(const item of ['cloth','wood','berries','medicine'] as const)expect(pileMarketValue(pile(item,{damage:45}))).toBe(pileMarketValue(pile(item)));
    for(const [hp,value] of [[0,0],[.5,.1],[.6,.5],[.9,1],[1,1]])expect(tradeHealthFactor(hp)).toBeCloseTo(value);
    expect(pileMarketValue(pile('legacy-portion'))).toBeUndefined();
    expect(pileMarketValue(pile('revolver'))).toBeUndefined();
  });
  it('keeps currency at one, rounds a net basket once, and preserves spread at the best negotiation limit',()=>{
    const money=pile('silver');
    expect(tradeUnitPrice(money,'buy',.395)).toBe(1);expect(tradeUnitPrice(money,'sell',.395)).toBe(1);
    expect([2.5,3.5,-2.5,-3.5].map(roundTradeSilver)).toEqual([2,4,-2,-4]);
    const cloth=pile('cloth'),buy=tradeUnitPrice(cloth,'buy',.395)!,sell=tradeUnitPrice(cloth,'sell',.395)!;
    expect(buy).toBeGreaterThan(sell);
    expect(roundTradeSilver(buy*20-sell*10)).toBe(13);
    expect(tradeUnitPrice(cloth,'buy',NaN)).toBeUndefined();
    expect(tradeUnitPrice(cloth,'sell',.4)).toBeUndefined();
    expect(tradeUnitPrice(cloth,'buy',0,.1)).toBeCloseTo(2.31);
    expect(tradeUnitPrice(cloth,'sell',0,.1)).toBeCloseTo(.81);
  });
  it('refuses real category exclusions, sell-only apparel, rotten and unsupported goods without a universal fallback',()=>{
    for(const item of ['silver','component','survival-meal','medicine','cloth'] as const)expect(tradeRefusal(pile(item),'sell',0)).toBeUndefined();
    for(const item of ['wood','steel','rice','hare-meat','light-leather','herbal-medicine','glitterworld-medicine','simple-meal','granite-blocks','legacy-chunk'] as const)expect(tradeRefusal(pile(item),'sell',0)).toBeTruthy();
    const tribal=pile('cloth-tribalwear',{apparel:{quality:'normal',hitPoints:100}});
    expect(tradeRefusal(tribal,'sell',0)).toBeUndefined();expect(tradeRefusal(tribal,'buy',0)).toBeTruthy();
    expect(tradeRefusal(pile('flak-vest',{apparel:{quality:'normal',hitPoints:200}}),'sell',0)).toBeTruthy();
    expect(tradeRefusal(pile('plasteel-knife',{weapon:{quality:'normal',hitPoints:280}}),'sell',0)).toBeTruthy();
    expect(tradeRefusal(pile('cloth',{quantity:0}),'sell',0)).toBeTruthy();
  });
  it('preplans finite inventory deterministically; missing categories never increase supported selection weights',()=>{
    const first=generateVisitorStock(12345,100,101,700),copy=structuredClone(first);
    expect(generateVisitorStock(12345,100,101,700)).toEqual(copy);
    expect(first.nextId).toBe(101+first.piles.length);
    expect(new Set(first.piles.map(p=>p.id)).size).toBe(first.piles.length);
    const counts=(p:readonly MaterialPile[],item:ItemId)=>p.filter(p=>p.item===item).reduce((sum,p)=>sum+p.quantity,0);
    for(let n=1;n<=128;n++){
      const plan=generateVisitorStock(Math.imul(n,1013904223)>>>0,100,101,700);
      expect(counts(plan.piles,'silver')).toBeGreaterThanOrEqual(50);expect(counts(plan.piles,'silver')).toBeLessThanOrEqual(250);
      expect(counts(plan.piles,'component')).toBeLessThanOrEqual(5);
      expect(counts(plan.piles,'survival-meal')).toBeGreaterThanOrEqual(3);expect(counts(plan.piles,'survival-meal')).toBeLessThanOrEqual(6);
      expect(counts(plan.piles,'medicine')).toBeGreaterThanOrEqual(1);expect(counts(plan.piles,'medicine')).toBeLessThanOrEqual(6);
      expect(counts(plan.piles,'cloth')).toBe(0);expect(counts(plan.piles,'plasteel-knife')).toBe(0);expect(counts(plan.piles,'cloth-tribalwear')).toBe(0);
      for(const p of plan.piles){expect(p.owner).toEqual({type:'inventory',pawnId:100});expect(p.quantity).toBeLessThanOrEqual(ITEM_DEFINITIONS[p.item].stackLimit);expect(tradeRefusal(p,'buy',700)).toBeUndefined();if(p.weapon||p.apparel)expect(['normal','good','excellent','masterwork']).toContain((p.weapon??p.apparel)!.quality);}
    }
    expect(VISITOR_RANGED_POOL).toHaveLength(25);expect(VISITOR_CLOTHING_POOL).toHaveLength(22);
    for(const pool of [VISITOR_RANGED_POOL,VISITOR_CLOTHING_POOL]){
      const total=pool.reduce((n,p)=>n+visitorSelectionWeight(p.value),0),supported=pool.filter(p=>p.item).reduce((n,p)=>n+visitorSelectionWeight(p.value),0);
      expect(supported/total).toBeLessThan(.15);
    }
    expect(VISITOR_SHIRT_CLOTH_CHANCE).toBeCloseTo(1.4/3.875);
    expect(()=>generateVisitorStock(1,1,Number.MAX_SAFE_INTEGER,0)).toThrow();
    expect(first).toEqual(copy);
  });
});
