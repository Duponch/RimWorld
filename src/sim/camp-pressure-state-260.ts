import type {WorldMapRecord} from './world-map-state.ts';
export interface CampPressure260 {revision:1;raidAtCore:number;notifyAtCore:number|null;alert:boolean;raidsSent:number}
export const CAMP_WARNING_CORE_260=60000,CAMP_FIRST_RAID_CORE_260=240000;
export function newCampPressure260(core:number):CampPressure260|undefined {
 if(!Number.isSafeInteger(core)||core<0||!Number.isSafeInteger(core+CAMP_FIRST_RAID_CORE_260))return;
 return {revision:1,raidAtCore:core+CAMP_FIRST_RAID_CORE_260,notifyAtCore:core+CAMP_WARNING_CORE_260,alert:false,raidsSent:0};
}
/** Absence is historical/unarmed, never a reason to start a timer at load. */
export function validCampPressure260(value:unknown,version:number,kind:WorldMapRecord['kind'],createdAt:number):value is CampPressure260|undefined {
 if(value===undefined)return true;
 if(version<260||!(kind==='camp'||(version===261||version===262)&&kind==='battlefield')||!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return false;
 const d=Object.getOwnPropertyDescriptors(value),keys=['revision','raidAtCore','notifyAtCore','alert','raidsSent'];
 if(Reflect.ownKeys(value).length!==keys.length||!keys.every(k=>Object.hasOwn(d,k)&&Object.hasOwn(d[k]!,'value')&&d[k]!.enumerable))return false;
 const p=value as CampPressure260;
 return p.revision===1&&Number.isSafeInteger(p.raidAtCore)&&p.raidAtCore>=createdAt*10&&Number.isSafeInteger(p.raidsSent)&&p.raidsSent>=0&&
  (p.notifyAtCore===null?p.alert===true:p.alert===false&&Number.isSafeInteger(p.notifyAtCore)&&p.notifyAtCore>=createdAt*10&&p.notifyAtCore<=p.raidAtCore);
}
