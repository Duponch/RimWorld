/** Actual generated road edifices, fixed non-Stuff statistics. No recipes are
 * exposed to Architecte by this module and no nominal decorative owner exists. */
import type {WorldGenerationRandom} from './world-generation-random.ts';
import {LOCAL_ROAD_PROP_FACTS_256,type LocalRoadProp256} from './local-road-data-256.ts';
import {roadRoundEven256} from './local-road-path-256.ts';
export interface GeneratedLocalRoadProp256 {
 id:number;kind:LocalRoadProp256;x:number;z:number;
 orientation:0;footprint:'standard';factionId:null;damage?:number;
}
export function isLocalRoadProp256(kind:unknown):kind is LocalRoadProp256 {
 return kind==='ancient-road-barrier'||kind==='ancient-road-lamp';
}
export function createLocalRoadProp256(kind:LocalRoadProp256,id:number,x:number,z:number,
 random:WorldGenerationRandom):GeneratedLocalRoadProp256 {
 if(!isLocalRoadProp256(kind)||!Number.isSafeInteger(id)||id<1||
    !Number.isSafeInteger(x)||!Number.isSafeInteger(z)||x<0||z<0)
  throw Error('Invalid generated road edifice');
 const max=LOCAL_ROAD_PROP_FACTS_256[kind].hitPoints;
 const hp=roadRoundEven256(Math.fround(Math.fround(max)*Math.max(0,Math.min(1,random.float(.5,1.3)))));
 return {id,kind,x,z,orientation:0,footprint:'standard',factionId:null,...(hp<max?{damage:max-hp}:{})};
}
export function localRoadPropMaxHp256(kind:LocalRoadProp256):number {
 return LOCAL_ROAD_PROP_FACTS_256[kind].hitPoints;
}
export function localRoadPropRecipe256(kind:LocalRoadProp256):{
 ingredients:readonly {item:'steel';quantity:number}[];work:number;coreWork:number
} {
 const coreWork=LOCAL_ROAD_PROP_FACTS_256[kind].work;
 return {ingredients:[{item:'steel',quantity:15}],coreWork,work:Math.ceil(coreWork/10)};
}
/** Scalar only; caller owns actual drops/IDs/RNG and transaction. Core
 * RoundRandom consumes one draw even for integer amounts. No HP scaling. */
export function localRoadPropSteelLeavings256(mode:'deconstruct'|'kill'|'vanish',
 random:WorldGenerationRandom):number {
 if(mode==='vanish')return 0;
 const amount=Math.fround(15*Math.fround(mode==='kill'?.25:.5));
 return Math.trunc(amount)+(random.value()<Math.fround(amount%1)?1:0);
}
