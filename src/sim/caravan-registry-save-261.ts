import {validEncounterAdmission261,validCaravanStory261,validCaravanBattlefield261,validRetainedArrivalShape261,type EncounterValidation261} from './caravan-encounter-save-261.ts';
import {validPendingEncounterShape261} from './caravan-pending-save-261.ts';
const own=(v:object,k:string)=>Object.hasOwn(v,k);
const int=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
/** Small envelope guard before any imported local context or owner capture.
 * Caller has already checked registry object/data descriptors. */
export function validMapEncounterFields261(s:Record<string,unknown>,c:EncounterValidation261,projection=false):boolean {
 if(['encounters261','story261','battlefield261'].some(k=>own(s,k)&&s[k]===undefined))return false;
 if(!validEncounterAdmission261(s.encounters261,c.version)||!validCaravanStory261(s.story261,c))return false;
 if(s.story261!==undefined&&!s.encounters261)return false;
 return s.kind==='battlefield'?!!s.encounters261&&(projection||s.visit===null)&&validCaravanBattlefield261(s.battlefield261,c):!own(s,'battlefield261');
}
export function validGroupEncounterFields261(r:Record<string,unknown>,c:EncounterValidation261,nextId:number):boolean {
 if(['retreat261','encounters261','story261','pending261','arrival261'].some(k=>own(r,k)&&r[k]===undefined))return false;
 if(!validEncounterAdmission261(r.encounters261,c.version)||!validCaravanStory261(r.story261,c)||!validPendingEncounterShape261(r.pending261,c.version,nextId,c.atCore))return false;
 if((r.story261!==undefined||r.pending261!==undefined||r.arrival261!==undefined)&&!r.encounters261)return false;
 if(r.pending261!==undefined&&(r.localMapId!==null||r.pending261.atCore!==c.atCore))return false;
 const retreat=r.retreat261;if(retreat!==undefined&&(c.version!==261||!retreat||typeof retreat!=='object'||Array.isArray(retreat)||Object.getPrototypeOf(retreat)!==Object.prototype||Reflect.ownKeys(retreat).some(k=>typeof k!=='string'||!Object.hasOwn(Object.getOwnPropertyDescriptor(retreat,k)!,'value')||Object.getOwnPropertyDescriptor(retreat,k)!.enumerable!==true||k!=='revision'&&k!=='autoJoinable')||!own(retreat,'revision')||(retreat as {revision:unknown}).revision!==1||!r.encounters261||(!!r.state&&typeof r.state==='object'&&'members'in r.state?!own(retreat,'autoJoinable')||(retreat as {autoJoinable:unknown}).autoJoinable!==true:own(retreat,'autoJoinable'))))return false;
 const a=r.arrival261;if(a===undefined)return true;
 if(c.version<261||!a||typeof a!=='object'||Array.isArray(a)||Object.getPrototypeOf(a)!==Object.prototype||Reflect.ownKeys(a).length!==2||!own(a,'tile')||!own(a,'action'))return false;
 const arrival=a as {tile:unknown;action:unknown};return int(arrival.tile,0,c.tileCount-1)&&arrival.action!==null&&validRetainedArrivalShape261(arrival.action);
}
