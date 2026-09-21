import { apparelCompatible } from './armor.ts';
import { APPAREL, APPAREL_FAMILIES, APPAREL_MATERIALS, type ApparelFamily, type ApparelItem, type ApparelMaterial, type ApparelState } from './apparel-rules.ts';
import { WEAPON_QUALITIES, type WeaponQuality } from './equipment-rules.ts';

export type ApparelTemperatureNeed='neutral'|'cold'|'heat';
export interface ApparelPolicy {
  readonly id:number;
  readonly label:string;
  readonly allowedItems:readonly ApparelItem[];
  readonly allowedMaterials:readonly ApparelMaterial[];
  readonly minQuality:WeaponQuality;
  readonly maxQuality:WeaponQuality;
  readonly minHitPointsPercent:number;
  readonly maxHitPointsPercent:number;
}
/** Small integration boundary: callers project world piles into these values. */
export interface ApparelPolicyGarment {
  readonly id:number;
  readonly item:ApparelItem;
  readonly apparel:ApparelState;
}
export interface ApparelPolicyCandidate extends ApparelPolicyGarment {
  readonly stored:boolean;
  readonly reachable:boolean;
  readonly reserved:boolean;
  readonly burning?:boolean;
}
export type ApparelReplacementChoice=
  |Readonly<{action:'remove';wornId:number;reason:'policy'}>
  |Readonly<{action:'wear';candidateId:number;replaceIds:readonly number[];gain:number}>;

const qualities=WEAPON_QUALITIES as readonly WeaponQuality[];
export const DEFAULT_APPAREL_POLICY:ApparelPolicy=Object.freeze({
  id:1,label:'Tout vêtement',allowedItems:Object.freeze(Object.keys(APPAREL) as ApparelItem[]),allowedMaterials:APPAREL_MATERIALS,
  minQuality:'awful',maxQuality:'legendary',minHitPointsPercent:0,maxHitPointsPercent:1,
});
export const TEXTILE_APPAREL_POLICY:ApparelPolicy=Object.freeze({
  ...DEFAULT_APPAREL_POLICY,id:2,label:'Tenue entretenue',minHitPointsPercent:.51,
});
export interface ApparelPolicyRegistry {apparelPolicies:ApparelPolicy[];nextApparelPolicyId:number}
const clonePolicy=(policy:ApparelPolicy):ApparelPolicy=>({...policy,allowedItems:[...policy.allowedItems],allowedMaterials:[...policy.allowedMaterials]});
export const createDefaultApparelPolicyRegistry=():ApparelPolicyRegistry=>({apparelPolicies:[clonePolicy(DEFAULT_APPAREL_POLICY),clonePolicy(TEXTILE_APPAREL_POLICY)],nextApparelPolicyId:3});

export function validApparelPolicy(policy:ApparelPolicy):boolean {
  return !!policy&&Number.isSafeInteger(policy.id)&&policy.id>0&&typeof policy.label==='string'&&policy.label.length>0
    &&Array.isArray(policy.allowedItems)&&new Set(policy.allowedItems).size===policy.allowedItems.length&&policy.allowedItems.every(i=>Object.hasOwn(APPAREL,i))
    &&Array.isArray(policy.allowedMaterials)&&new Set(policy.allowedMaterials).size===policy.allowedMaterials.length&&policy.allowedMaterials.every(m=>APPAREL_MATERIALS.includes(m))
    &&qualities.includes(policy.minQuality)&&qualities.includes(policy.maxQuality)&&qualities.indexOf(policy.minQuality)<=qualities.indexOf(policy.maxQuality)
    &&Number.isFinite(policy.minHitPointsPercent)&&Number.isFinite(policy.maxHitPointsPercent)&&policy.minHitPointsPercent>=0&&policy.maxHitPointsPercent<=1&&policy.minHitPointsPercent<=policy.maxHitPointsPercent;
}
export function apparelPolicyAllows(policy:ApparelPolicy,garment:ApparelPolicyGarment):boolean {
  if(!validApparelPolicy(policy)||!garment||!Object.hasOwn(APPAREL,garment.item))return false;
  const definition=APPAREL[garment.item],quality=qualities.indexOf(garment.apparel.quality),percent=garment.apparel.hitPoints/definition.hitPoints;
  const material=garment.apparel.material??definition.material;
  return policy.allowedItems.includes(garment.item)&&(material===undefined||policy.allowedMaterials.includes(material))
    &&quality>=qualities.indexOf(policy.minQuality)&&quality<=qualities.indexOf(policy.maxQuality)&&percent>=policy.minHitPointsPercent&&percent<=policy.maxHitPointsPercent;
}

/** Piecewise durability utility keeps damaged garments useful while strongly
 * preferring sound replacements. Inputs outside [0,1] are clamped. */
export function apparelHitPointsUtility(percent:number):number {
  const p=Math.max(0,Math.min(1,percent)),points:[[number,number],[number,number]][]=[[[0,0],[.2,.1]],[[.2,.1],[.5,.6]],[[.5,.6],[.7,.85]],[[.7,.85],[1,1]]];
  const segment=points.find(([[x],[x2]])=>p>=x&&p<=x2)??points[points.length-1]!;
  const [[x,y],[x2,y2]]=segment;return y+(y2-y)*(p-x)/(x2-x);
}
const qualityUtility=(quality:WeaponQuality)=>[.55,.75,1,1.16,1.32,1.5,1.8][qualities.indexOf(quality)]!;
export function apparelPolicyScore(garment:ApparelPolicyGarment,need:ApparelTemperatureNeed='neutral'):number {
  const d=APPAREL[garment.item],hp=apparelHitPointsUtility(garment.apparel.hitPoints/d.hitPoints),protection=d.ratings.sharp*.45+d.ratings.blunt*.25+d.ratings.heat*.1;
  const thermal=need==='cold'?d.coldInsulation*.02:need==='heat'?d.heatInsulation*.02:0;
  return (1+protection+thermal)*qualityUtility(garment.apparel.quality)*hp;
}

/** Chooses one deterministic action. Stable ids resolve equal scores; callers
 * reserve and execute the returned action transactionally in the world. */
export function chooseApparelReplacement(policy:ApparelPolicy,worn:readonly ApparelPolicyGarment[],candidates:readonly ApparelPolicyCandidate[],need:ApparelTemperatureNeed='neutral',minimumGain=.05):ApparelReplacementChoice|null {
  if(!validApparelPolicy(policy)||!Number.isFinite(minimumGain)||minimumGain<0)throw new RangeError('Invalid apparel replacement request');
  const all=[...worn,...candidates],ids=new Set<number>();for(const g of all){
    const definition=APPAREL[g.item],material=g.apparel.material??definition?.material;
    if(!Number.isSafeInteger(g.id)||g.id<=0||ids.has(g.id)||!definition||!Number.isSafeInteger(g.apparel.hitPoints)||g.apparel.hitPoints<=0||g.apparel.hitPoints>definition.hitPoints||!qualities.includes(g.apparel.quality)||material!==definition.material)throw new RangeError('Invalid apparel garment');
    ids.add(g.id);
  }
  const remove=[...worn].filter(g=>!g.apparel.forced&&!apparelPolicyAllows(policy,g)).sort((a,b)=>a.id-b.id)[0];
  if(remove)return {action:'remove',wornId:remove.id,reason:'policy'};
  const choices:{candidateId:number;replaceIds:number[];gain:number;score:number}[]=[];
  for(const candidate of candidates){
    if(!candidate.stored||!candidate.reachable||candidate.reserved||candidate.burning||candidate.apparel.forbidden||!apparelPolicyAllows(policy,candidate))continue;
    const conflicts=worn.filter(g=>!apparelCompatible(APPAREL[g.item].coverage,APPAREL[candidate.item].coverage));
    if(conflicts.some(g=>g.apparel.forced))continue;
    const score=apparelPolicyScore(candidate,need),gain=score-conflicts.reduce((n,g)=>n+apparelPolicyScore(g,need),0);
    if(gain>=minimumGain)choices.push({candidateId:candidate.id,replaceIds:conflicts.map(g=>g.id).sort((a,b)=>a-b),gain,score});
  }
  choices.sort((a,b)=>b.gain-a.gain||b.score-a.score||a.candidateId-b.candidateId);
  const choice=choices[0];return choice?{action:'wear',candidateId:choice.candidateId,replaceIds:choice.replaceIds,gain:choice.gain}:null;
}

/** Convenience constructor for adapters that already know family and material. */
export const policyAllowsFamily=(policy:ApparelPolicy,family:ApparelFamily,material:ApparelMaterial):boolean=>APPAREL_FAMILIES.includes(family)&&policy.allowedItems.some(i=>APPAREL[i].family===family)&&policy.allowedMaterials.includes(material);
