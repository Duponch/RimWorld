/** V349 pure extraction, preparation and expiration rules. */
import { FLORA_DEFINITIONS } from './biome-flora.ts';
import type { Resource } from './types.ts';
import { TREE_PACK_LIFETIME,type TreeDefinition,type MinifiedTreePile } from './tree-transfer-state.ts';
const WORK:Readonly<Record<string,number>>={oak:1400,poplar:800,pine:710,birch:800,drago:660,'bamboo':460,'cecropia':510,'cypress':1800,'maple':800,'palm':510,'teak':1800,'willow':800};
/** Explicit clone legacy TreeBase. No species conversion, no source record rewrite. */
export const LEGACY_TREE:Readonly<TreeDefinition>=Object.freeze({label:'Arbre legacy',workCore:800,massGrams:150000,maxHP:200,minimumGrowth:.4,roofBlocked:true});
export function extractTreeDefinition(resource:Pick<Resource,'kind'|'species'>):TreeDefinition|undefined {
  if(resource.kind!=='tree')return;
  if(resource.species===undefined)return LEGACY_TREE;
  const workCore=WORK[resource.species];if(workCore===undefined)return;
  const def=FLORA_DEFINITIONS[resource.species];
  return {label:def.label,workCore,massGrams:resource.species==='bamboo'?75000:150000,maxHP:def.hitPoints,minimumGrowth:def.harvestMinGrowth,roofBlocked:true};
}
export const treeSelectable=(resource:Resource):boolean=>
  !['grass','tall-grass','brambles','moss','astragalus','chokevine','dandelion','low-shrub'].includes(resource.species??'');
export const treeWorkCorePerTick=(speed:number,growth:number):number=>
  Math.max(0,speed)*(3.3-2.3*Math.max(0,Math.min(1,growth)));
/** This is captured preparation work, not a fixed Construction150 duration. */
export const replantDurationCore=(definition:TreeDefinition,speed:number,growth:number):number|undefined=>{
  const rate=treeWorkCorePerTick(speed,growth);return rate>0?Math.max(1,Math.trunc(definition.workCore/rate)):undefined;
};
export const treePackLive=(pile:MinifiedTreePile,tick:number):boolean=>!pile.plantPack.pendingExpiry&&tick<pile.plantPack.expiresAt;
export const treePackDeadline=(tick:number):number=>tick+TREE_PACK_LIFETIME;
const draw=(rng:number):{value:number;rng:number}=>{
  let next=rng;next^=next<<13;next^=next>>>17;next^=next<<5;next>>>=0;
  return {value:next/0x100000000,rng:next};
};
/** Core YieldNow then half-truncate. Private RNG; caller commits after placement. */
export function treeExpiryYield(pile:MinifiedTreePile,rng:number,cropYieldFactor:number):{quantity:number;rng:number}|undefined {
  if(!Number.isFinite(cropYieldFactor)||cropYieldFactor<0)return;
  const tree=pile.innerResource,def=extractTreeDefinition(tree);if(!def)return;
  const growth=tree.growth??1;
  if(tree.blight||growth<=def.minimumGrowth)return {quantity:0,rng};
  const hp=Math.max(0,Math.min(1,1-(tree.damage??0)/def.maxHP));
  const growthFactor=.5+.5*Math.max(0,Math.min(1,(growth-def.minimumGrowth)/(1-def.minimumGrowth)));
  const raw=tree.amount*growthFactor*(.5+.5*hp)*cropYieldFactor,whole=Math.floor(raw);
  // Core GenMath.RoundRandom draws even when the fractional part is zero.
  const roll=draw(rng);
  return {quantity:Math.floor((whole+(roll.value<raw-whole?1:0))*.5),rng:roll.rng};
}
/** The only two possible fixed quantities from the frozen source; no draw. */
export function treeExpiryQuantityRange(pile:MinifiedTreePile):readonly number[] {
  const tree=pile.innerResource,def=extractTreeDefinition(tree);if(!def)return [];
  const growth=tree.growth??1;if(tree.blight||growth<=def.minimumGrowth)return [0];
  const hp=Math.max(0,Math.min(1,1-(tree.damage??0)/def.maxHP));
  const raw=tree.amount*(.5+.5*Math.max(0,Math.min(1,(growth-def.minimumGrowth)/(1-def.minimumGrowth))))*(.5+.5*hp);
  return [Math.floor(Math.floor(raw)*.5),Math.floor(Math.ceil(raw)*.5)];
}
export const treePileMassGrams=(pile:MinifiedTreePile):number|undefined=>extractTreeDefinition(pile.innerResource)?.massGrams;