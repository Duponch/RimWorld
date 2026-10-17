/** Transport-only validation of actual terminal animal owners. No World,
 * map, clinical advance or replacement original is constructed here. */
import {validProjectedMemberContexts,sameGroupHeaderValue} from './group-member-origin.ts';
import {validGroupAnimalLossRecord256,registerGroupAnimalLossRows256} from './group-animal-save-256.ts';
import type {World} from './types.ts';
import type {CampaignAnimalLoss256,CampaignMapPresentation,CampaignSummary} from './world-map-state.ts';
import type {NumericMembershipSink} from './numeric-membership.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value')&&Object.getOwnPropertyDescriptor(v,k)!.enumerable===true);
const fields=(v:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&(required.includes(k)||optional.includes(k)));
/** Validate BEFORE any Decoder commit or owner/bed consumption. Only the
 * source header is copied; animal/items/packed retain the real original refs. */
export function validProjectedAnimalLosses256(metadata:object,w:Pick<World,'schemaVersion'|'tick'|'nextId'|'planet'>):boolean {
 const d=Object.getOwnPropertyDescriptor(metadata,'animalLosses');
 if(!d)return !('animalLosses' in metadata);
 if(w.schemaVersion!==256||!Object.hasOwn(d,'value')||d.enumerable!==true||!Array.isArray(d.value)||Object.getPrototypeOf(d.value)!==Array.prototype||d.value.length>w.nextId-1||Reflect.ownKeys(d.value).length!==d.value.length+1)return false;
 const seen=new Set<number>();
 for(let i=0;i<d.value.length;i++){
  const slot=Object.getOwnPropertyDescriptor(d.value,String(i));if(!slot||!Object.hasOwn(slot,'value')||slot.enumerable!==true||!object(slot.value))return false;
  const row=slot.value;if(!fields(row,['reason','groupId','tile','tick','animal','origin','items','memberContext'],['packed']))return false;
  const witness=row.memberContext;
  if(!validProjectedMemberContexts([witness],[row.origin as import('./group-reorganization-state.ts').GroupMemberOrigin],w.tick,w.nextId,w))return false;
  const {memberContext:_,...loss}=row;
  if(!validGroupAnimalLossRecord256(loss,w,w.schemaVersion,origin=>!!witness&&typeof witness==='object'&&'pawnId'in witness&&witness.pawnId===origin.pawnId&&'originMapId'in witness&&witness.originMapId===origin.originMapId&&'context'in witness&&sameGroupHeaderValue(witness.context,origin.context)))return false;
  if(registerGroupAnimalLossRows256([loss],w.nextId,seen).length)return false;
 }
 return true;
}
/** Metadata has already passed the guard above in validRegisteredPresentation
 * or validCampaignSummary. Register physical originals only, once globally. */
export function registerProjectedAnimalLossThings256(metadata:CampaignMapPresentation|CampaignSummary,nextId:number,ids:NumericMembershipSink):string[] {
 return registerGroupAnimalLossRows256(metadata.animalLosses??[],nextId,ids);
}
export function projectedTerminalAnimals256(metadata:CampaignMapPresentation|CampaignSummary):CampaignAnimalLoss256['animal'][] {
 return (metadata.animalLosses??[]).map(row=>row.animal);
}
