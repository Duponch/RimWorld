import { WEAPON_QUALITIES,type WeaponQuality } from './equipment-rules.ts';
import { pileDamage,pileMaxHp,structureMaxHp } from './thing-damage-rules.ts';
import { SCHEMA_VERSION,TICKS_PER_DAY,type MaterialPile,type Structure } from './types.ts';
import { isPerishable,ROT_DAYS,rotAge } from './food-preservation.ts';
import { ITEM_DEFINITIONS } from './items.ts';

export interface StorageConditions {
  allowFresh?:boolean;
  allowRotten?:boolean;
  quality?:{min:WeaponQuality;max:WeaponQuality};
  hitPoints?:{min:number;max:number};
}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const rangeKeys=(v:Record<string,unknown>):boolean=>Object.keys(v).length===2&&Object.hasOwn(v,'min')&&Object.hasOwn(v,'max');
const qualityRank=(v:unknown):number=>typeof v==='string'?(WEAPON_QUALITIES as readonly string[]).indexOf(v):-1;
const percent=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=100;
/** Validates only these optional settings, so ordinary zone/command fields
 * retain their own validators. Absence preserves historical storage rules. */
export function validStorageConditions(value:unknown,version:number=SCHEMA_VERSION):boolean {
  if(!record(value))return false;
  for(const key of ['allowFresh','allowRotten'])if(Object.hasOwn(value,key)&&(version<219||typeof value[key]!=='boolean'&&value[key]!==undefined))return false;
  const q=value.quality,h=value.hitPoints;
  if(version<176)return q===undefined&&h===undefined;
  return (q===undefined||record(q)&&rangeKeys(q)&&qualityRank(q.min)>=0&&qualityRank(q.max)>=qualityRank(q.min))
    &&(h===undefined||record(h)&&rangeKeys(h)&&percent(h.min)&&percent(h.max)&&h.min<=h.max);
}
type Subject=MaterialPile|Structure;
const isPile=(s:Subject):s is MaterialPile=>'item' in s;
function subjectQuality(s:Subject):WeaponQuality|undefined {
  return isPile(s)?s.apparel?.quality??s.weapon?.quality:s.quality;
}
/** Core GenMath.RoundedHundredth uses Mathf.Round (ties to even), with
 * single-precision arithmetic at the division and multiplication boundaries. */
function hitPointsPercent(s:Subject):number|undefined {
  const max=isPile(s)?pileMaxHp(s):structureMaxHp(s);
  if(max<=0)return;
  const hp=max-(isPile(s)?pileDamage(s):s.damage??0);
  const ratio=Math.max(0,Math.min(1,Math.fround(hp/max))),scaled=Math.fround(ratio*100);
  const floor=Math.floor(scaled),fraction=scaled-floor;
  return fraction===.5?floor+(floor%2):Math.round(scaled);
}
/** Quality and HP are independent of category/item permissions. A subject
 * lacking the corresponding Core capability ignores that range. */
export function storageConditionAccepts(zone:StorageConditions,subject:Subject,tick?:number):boolean {
  if(zone.allowFresh===false||zone.allowRotten===false){
    const freshness=storageFreshness(subject,tick);
    if(freshness==='fresh'&&zone.allowFresh===false||freshness==='rotten'&&zone.allowRotten===false)return false;
  }
  if(zone.quality){
    const quality=subjectQuality(subject);
    if(quality!==undefined){
      const rank=qualityRank(quality);
      if(rank<qualityRank(zone.quality.min)||rank>qualityRank(zone.quality.max))return false;
    }
  }
  if(zone.hitPoints){
    const hp=hitPointsPercent(subject);
    // Integer percentages are equivalent to the Core rounded hundredth's
    // IncludesEpsilon(1e-5) at these integer-percent filter boundaries.
    if(hp!==undefined&&(hp<zone.hitPoints.min||hp>zone.hitPoints.max))return false;
  }
  return true;
}
/** Bounded equivalence class for condition-sensitive storage caches. Neither
 * identity, owner, quantity nor unrounded damage affects filter acceptance. */
export function storageConditionKey(subject:Subject,tick?:number,includeFreshness=false):string {
  const pile=isPile(subject),quality=qualityRank(subjectQuality(subject)),hp=hitPointsPercent(subject);
  const key=`${pile?subject.kind:'furniture'}:${pile?subject.item:subject.kind}:${quality}:${hp??'-'}`;
  return includeFreshness?`${key}:${storageFreshness(subject,tick)??'-'}`:key;
}
/** Core Fresh also matches ingestible non-drugs without CompRottable. Rotten
 * matches retained corpses, never food whose rot stage destroys the stack.
 * Mechanical bodies/furniture have neither capability. */
export function storageFreshness(subject:Subject,tick?:number):'fresh'|'rotten'|undefined {
  if(!isPile(subject))return;
  if(subject.kind==='corpse'){
    const threshold=subject.item==='human-corpse'?2.5*TICKS_PER_DAY:isPerishable(subject.item)?ROT_DAYS[subject.item]*TICKS_PER_DAY:undefined;
    if(threshold===undefined)return;
    return rotAge(subject,tick??subject.rot?.atTick??0)>=threshold?'rotten':'fresh';
  }
  if(isPerishable(subject.item)||ITEM_DEFINITIONS[subject.item].nutrition>0)return 'fresh';
}
