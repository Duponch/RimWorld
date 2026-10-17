/** One scalar family from the campaign UniqueIDsManager, separate from Things.
 * Neither helper is a load migration or an allocator inferred from survivors. */
import type {CampaignState} from './world-map-state.ts';
import {registeredMapForValidation} from './world-map-context.ts';
export interface HiveLordIds256 {nextId:number}
export function constructCampaignLordIds256():HiveLordIds256 {return {nextId:0};}
export function captureCampaignLordIds256(root:CampaignState):HiveLordIds256 {
 const d=root.worldMaps&&Object.getOwnPropertyDescriptor(root.worldMaps,'nextLordId');
 if(root.schemaVersion!==256||!d||!Object.hasOwn(d,'value')||d.enumerable!==true||!Number.isInteger(d.value)||d.value<0||d.value>=2147483646)throw Error('Actual persisted Lord counter is absent or exhausted; no load fallback is permitted');
 return {nextId:d.value};
}
export function validateCampaignHiveLordIds256(root:CampaignState):string[] {
 const ids=new Set<number>(),next=root.worldMaps?.nextLordId;
 for(const row of root.worldMaps?.sites??[]){const w=registeredMapForValidation(root,row.id);if(!w)return ['Missing actual map in Lord ownership'];for(const lord of [...(w.wildlife?.hiveLords??[]),...Array.from(new Set((w.mechanoids??[]).flatMap(m=>m.temple?[m.temple.group]:[]))).map(id=>({id}))]){if(root.schemaVersion!==256||typeof next!=='number'||!Number.isInteger(next)||next<1||!Number.isInteger(lord.id)||lord.id<0||lord.id>=next||ids.has(lord.id))return ['Invalid or duplicated campaign Lord identity'];ids.add(lord.id);}}
 return [];
}
