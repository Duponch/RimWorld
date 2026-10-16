import {validApparelPolicy,type ApparelPolicy} from './apparel-policy.ts';
import {APPAREL,APPAREL_MATERIALS,type ApparelItem,type ApparelMaterial} from './apparel-rules.ts';
import {SCHEMA_VERSION,type World,type CommandResult} from './types.ts';
import type {WeaponQuality} from './equipment-rules.ts';

export interface ApparelPolicyUpdateCommand {
  type:'apparel-policy-update';policyId:number;
  allowedItems:readonly ApparelItem[];allowedMaterials:readonly ApparelMaterial[];
  minQuality:WeaponQuality;maxQuality:WeaponQuality;
  minHitPointsPercent:number;maxHitPointsPercent:number;
}
const FIELDS=['type','policyId','allowedItems','allowedMaterials','minQuality','maxQuality','minHitPointsPercent','maxHitPointsPercent'];
const fail=():CommandResult=>({ok:false,code:'invalid-command',reason:'Filtres de tenue invalides ou politique inconnue.'});
function denseStrings(value:unknown,max:number):value is string[]{
  return Array.isArray(value)&&value.length<=max&&Reflect.ownKeys(value).length===value.length+1
    &&Array.from({length:value.length},(_,i)=>i).every(i=>Object.hasOwn(value,i)&&typeof value[i]==='string')
    &&new Set(value).size===value.length;
}
const same=(a:readonly string[],b:readonly string[])=>a.length===b.length&&a.every((v,i)=>v===b[i]);

/** No persistent state is introduced. Actual saves migrate to the current
 * schema before commands; historical simulation keeps its literal catalogue.
 * Commit only copied filters, preserving identity, label and every owner/task. */
export function applyApparelPolicyUpdate(world:World,command:ApparelPolicyUpdateCommand):CommandResult {
  try{
    if(world.schemaVersion!==SCHEMA_VERSION||!command||typeof command!=='object'||Reflect.ownKeys(command).length!==FIELDS.length
      ||!FIELDS.every(key=>Object.hasOwn(command,key)))return fail();
    const {type,policyId,allowedItems,allowedMaterials,minQuality,maxQuality,minHitPointsPercent,maxHitPointsPercent}=command;
    if(type!=='apparel-policy-update'||!Number.isSafeInteger(policyId)||policyId<=0)return fail();
    const registry=world.apparelPolicies,index=registry?.findIndex(policy=>policy.id===policyId)??-1;
    if(!registry||index<0||!denseStrings(allowedItems,Object.keys(APPAREL).length)||!denseStrings(allowedMaterials,APPAREL_MATERIALS.length))return fail();
    const previous=registry[index]!;
    const next:ApparelPolicy={...previous,allowedItems:[...allowedItems],allowedMaterials:[...allowedMaterials],minQuality,maxQuality,minHitPointsPercent,maxHitPointsPercent};
    if(!validApparelPolicy(next))return fail();
    if(same(previous.allowedItems,next.allowedItems)&&same(previous.allowedMaterials,next.allowedMaterials)
      &&previous.minQuality===minQuality&&previous.maxQuality===maxQuality
      &&previous.minHitPointsPercent===minHitPointsPercent&&previous.maxHitPointsPercent===maxHitPointsPercent)return {ok:true};
    world.apparelPolicies=registry.map((policy,i)=>i===index?next:policy);
    return {ok:true};
  }catch{return fail();}
}
