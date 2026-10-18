import {CARAVAN_ANIMAL_VALUE_DATA_261} from './caravan-animal-value-data-261.ts';
import {animalLifeStage} from './animal-life.ts';
import {trackedAnimalLifeStage256} from './animal-growth-runtime-256.ts';
import {roundTradeSilver} from './trade-prices.ts';
import type {WildAnimal} from './wildlife-state.ts';
const f=Math.fround;
export const ANIMAL_PRICE_CAPACITIES_261=['Consciousness','Moving','Manipulation','Talking','Eating','Sight','Hearing','Breathing','BloodFiltration','BloodPumping','Metabolism'] as const;
export type AnimalPriceCapacity261=typeof ANIMAL_PRICE_CAPACITIES_261[number];
/** Transient evidence only: normal levels decide CapableOf; trade levels exclude
 * hediff capacity modifiers with priceImpact=false. No persisted price cache. */
export interface AnimalPriceClinicalCapture261 {
 summaryHealth:number;
 capacities:Readonly<Record<AnimalPriceCapacity261,{normal:number;forTradePrice:number}>>;
 /** Sum from actual hediff priceOffset/spawnThingOnRemoved facts, never HP. */
 hediffPriceOffset:number;
 /** Actual scenario MarketValue stat factor; Core default is1. */
 scenarioFactor:number;
}
export type AnimalMarketValueResult261={ok:true;value:number}|{ok:false;reason:string};
function refusal(reason:string):AnimalMarketValueResult261{return {ok:false,reason};}
/** PriceUtility and StatWorker arithmetic expressed independently. Sex and
 * chronological age are absent natively; growth/life-stage supplies age effect.
 * Animals have no skills/story/beauty trait. BasePawn.useHitPoints=false, so the
 * MarketValue StatPart_Health does not read their body/injury HP. */
export function calculateAnimalMarketValue261(base:number,stage:'baby'|'juvenile'|'adult',c:AnimalPriceClinicalCapture261):AnimalMarketValueResult261 {
 if(!Number.isFinite(base)||base<=0||!Number.isFinite(c.summaryHealth)||c.summaryHealth<0||c.summaryHealth>1||!Number.isFinite(c.hediffPriceOffset)||!Number.isFinite(c.scenarioFactor)||c.scenarioFactor<0)return refusal('Missing actual animal market-value inputs');
 let factor=f(f(.19999999)+f(f(1-f(.19999999))*f(c.summaryHealth)));
 for(const name of ANIMAL_PRICE_CAPACITIES_261){const v=c.capacities[name];
  if(!v||!Number.isFinite(v.normal)||v.normal<0||!Number.isFinite(v.forTradePrice)||v.forTradePrice<0)return refusal(`Missing animal price capacity ${name}`);
  const capable=v.normal>(name==='Moving'?.15:0),t=Math.min(1,v.forTradePrice);
  factor=f(factor*(capable?f(f(.5)+f(f(.5)*f(t))):f(.6)));
 }
 factor=f(factor*f(stage==='baby'?.4:stage==='juvenile'?.75:1));
 factor=Math.max(f(.1),factor);
 let value=f(f(f(base)*factor)+f(c.hediffPriceOffset));value=f(value*f(c.scenarioFactor));
 if(Math.abs(value)>200)value=f(roundTradeSilver(f(value/5))*5);
 return {ok:true,value:Math.max(0,value)};
}
/** Concrete current-species helper. The supplied clinical capture, if needed,
 * must refer to THIS animal at this operation tick. Absence is a named refusal,
 * never zero value or omission from the demand's animal candidates. */
export function animalMarketValue261(a:WildAnimal,clinical?:AnimalPriceClinicalCapture261):AnimalMarketValueResult261 {
 const data=CARAVAN_ANIMAL_VALUE_DATA_261[a.species];if(!data)return refusal(`Missing animal market-value Def ${a.species}`);
 if(a.state==='dead'||a.health?.death)return refusal(`Animal ${a.id} is dead`);
 const stage=a.growthTracker?trackedAnimalLifeStage256(a.species,a.growthTracker).definition:undefined;
 const life=stage?stage==='AnimalAdult'||stage==='EusocialInsectAdult'?'adult':stage==='AnimalJuvenile'||stage==='EusocialInsectJuvenile'?'juvenile':'baby':animalLifeStage(a);
 if(a.health&&!clinical)return refusal(`Animal ${a.id} needs its actual trade-capacity and hediff-value capture`);
 const healthy=Object.fromEntries(ANIMAL_PRICE_CAPACITIES_261.map(name=>[name,{normal:name==='Manipulation'?data.healthyManipulation:1,forTradePrice:name==='Manipulation'?data.healthyManipulation:1}])) as AnimalPriceClinicalCapture261['capacities'];
 return calculateAnimalMarketValue261(data.baseMarketValue,life,clinical??{summaryHealth:1,capacities:healthy,hediffPriceOffset:0,scenarioFactor:1});
}
