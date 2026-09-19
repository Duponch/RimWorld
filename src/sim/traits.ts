import type { Pawn,World } from './types.ts';

/** A small Core subset with actual consumers, not a complete pawn generator.
 * IDs are persisted; descriptions and derived factors are not. */
export const TRAITS = Object.freeze({
  optimist:Object.freeze({label:'Optimiste',group:'mood',mood:6,learning:0,breakOffset:0,description:'Humeur naturelle : +6 points à la cible, sans gain instantané.'}),
  pessimist:Object.freeze({label:'Pessimiste',group:'mood',mood:-6,learning:0,breakOffset:0,description:'Humeur naturelle : −6 points à la cible.'}),
  steadfast:Object.freeze({label:'Résolu',group:'nerves',mood:0,learning:0,breakOffset:-9,description:'Seuil de crise mineure réduit de 9 points ; seuils majeur et extrême proportionnels.'}),
  nervous:Object.freeze({label:'Nerveux',group:'nerves',mood:0,learning:0,breakOffset:8,description:'Seuil de crise mineure augmenté de 8 points ; ne diminue pas directement l’humeur.'}),
  'fast-learner':Object.freeze({label:'Apprentissage rapide',group:'learning',mood:0,learning:.75,breakOffset:0,description:'Apprentissage général : 175 %. Passion et saturation quotidienne se multiplient ensuite ; oubli inchangé.'}),
  'slow-learner':Object.freeze({label:'Apprentissage lent',group:'learning',mood:0,learning:-.75,breakOffset:0,description:'Apprentissage général : 25 %. Aucun ralentissement direct du travail ; oubli inchangé.'}),
});
export type TraitId=keyof typeof TRAITS;
export type TraitBearer=Pick<Pawn,'traits'>;
export const globalLearningFactor=(pawn:TraitBearer):number=>1+(pawn.traits?.reduce((sum,id)=>sum+TRAITS[id].learning,0)??0);
export const minorBreakThreshold=(pawn:TraitBearer):number=>35+(pawn.traits?.reduce((sum,id)=>sum+TRAITS[id].breakOffset,0)??0);
/** Core derives major/extreme from the modified minor threshold. Do not add the
 * trait offset separately to all three historical 35/20/5 boundaries. */
export function breakThresholds(pawn:TraitBearer):readonly [number,number,number] {
  const minor=minorBreakThreshold(pawn);return [minor,minor*4/7,minor/7];
}
export function validTraits(value:unknown,version:number):boolean {
  if(value===undefined)return true; // Neutral legacy/person with no authored traits.
  if(version<69||!Array.isArray(value)||value.length<1||value.length>3)return false;
  const groups=new Set<string>();
  for(const id of value){if(typeof id!=='string'||!Object.hasOwn(TRAITS,id))return false;const group=TRAITS[id as TraitId].group;if(groups.has(group))return false;groups.add(group);}
  return true;
}
/** Authored scenario profiles, deliberately not Core's trait frequencies or
 * biographies. Each call owns a new array; no RNG, no changes to existing saves. */
export function startingTraits(index:number):TraitId[] {
  return index%3===0?['optimist','fast-learner']:index%3===1?['steadfast','slow-learner']:['pessimist','nervous'];
}
/** Only new ordinary camps. The terrain/fixture factory remains neutral. */
export function initializeCampTraits(world:World):void {
  world.pawns.forEach((pawn,index)=>{if(pawn.traits===undefined)pawn.traits=startingTraits(index);});
}
