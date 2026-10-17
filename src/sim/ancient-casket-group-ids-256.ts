import {isSchema256Or257} from './schema-compatibility-257.ts';
/** The genuine campaign-wide UniqueIDsManager casket-group counter. This is
 * NOT a Thing ID, a per-map index or a history reconstructed from caskets. */
import {registeredMapForValidation} from './world-map-context.ts';
import type {CampaignState} from './world-map-state.ts';
export interface AncientCasketGroupIds256 {nextId:number}
const valid=(n:unknown):n is number=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=2147483646;
/** Only the real new-campaign constructor calls this. Never use on load. */
export function constructAncientCasketGroupIds256():AncientCasketGroupIds256{return {nextId:0};}
export function takeAncientCasketGroupId256(ids:AncientCasketGroupIds256):number {
 if(!valid(ids.nextId)||ids.nextId===2147483646)throw Error('Actual ancient casket group ID space exhausted; no wrap/reuse');
 return ids.nextId++;
}
/** Absence is literal. Own undefined, inherited/accessor and historical future
 * fields are rejected before any value is read. Nothing is installed here. */
export function validAncientCasketGroupIdsEnvelope256(owner:unknown,version:number,planetRevision:unknown):boolean {
 if(!owner||typeof owner!=='object'||Array.isArray(owner))return false;
 const d=Object.getOwnPropertyDescriptor(owner,'nextAncientCasketGroupId');
 if(!d)return !('nextAncientCasketGroupId'in owner);
 return isSchema256Or257(version)&&planetRevision===3&&d.enumerable===true&&Object.hasOwn(d,'value')&&valid(d.value);
}
/** Detached continuation for an unpublished candidate. Refuses a missing
 * authority; it does not infer one from max(groupId) or choose zero. */
export function captureAncientCasketGroupIds256(root:CampaignState):AncientCasketGroupIds256 {
 const maps=root.worldMaps;
 if(!maps||!validAncientCasketGroupIdsEnvelope256(maps,root.schemaVersion,root.planet?.revision)||!Object.hasOwn(maps,'nextAncientCasketGroupId'))throw Error('Actual campaign ancient casket group allocator is absent');
 return {nextId:maps.nextAncientCasketGroupId!};
}
export function validAncientCasketGroupLinks256(rows:readonly unknown[],next:number):boolean {
 if(!valid(next))return false;
 for(const row of rows){if(!row||typeof row!=='object')return false;
  const kind=Object.getOwnPropertyDescriptor(row,'kind');if(!kind||!Object.hasOwn(kind,'value'))return false;
  if(kind.value!=='ancient-cryptosleep-casket')continue;
  const contents=Object.getOwnPropertyDescriptor(row,'casket');if(!contents||!Object.hasOwn(contents,'value')||!contents.value||typeof contents.value!=='object')return false;
  const id=Object.getOwnPropertyDescriptor(contents.value,'groupId');if(!id||!Object.hasOwn(id,'value')||id.value!==-1&&(!valid(id.value)||id.value>=next))return false;
 }
 return true;
}
/** Rare RAW/full admission only; uses existing read-only live-owner views.
 * Older literal256 caskets without this new authority are not enriched. */
export function validateAncientCasketGroupIds256(root:CampaignState):string[] {
 const maps=root.worldMaps;if(!maps)return [];
 if(!validAncientCasketGroupIdsEnvelope256(maps,root.schemaVersion,root.planet?.revision))return ['Invalid or future ancient casket group allocator.'];
 if(!Object.hasOwn(maps,'nextAncientCasketGroupId'))return [];
 const next=maps.nextAncientCasketGroupId!;
 for(const row of maps.sites){const map=registeredMapForValidation(root,row.id);if(!map)return ['Missing original map for casket group admission.'];
  if(!validAncientCasketGroupLinks256(map.structures,next))return ['Ancient casket group is outside the real campaign allocator.'];
 }
 return [];
}
