import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {CARAVAN_INCIDENTS_261,type CaravanStory261,type RetainedArrival261,type RetainedCaravan261,type CaravanBattlefield261} from './caravan-encounter-state-261.ts';
import {validWorldEntryTarget263} from './world-target-access-263.ts';
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value')&&Object.getOwnPropertyDescriptor(v,k)!.enumerable);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&(required.includes(k)||optional.includes(k)));
const dense=(v:unknown,max:number):v is unknown[]=>Array.isArray(v)&&v.length<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.hasOwn(v,i)&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,String(i))!,'value')).every(Boolean);
const incident=(v:unknown)=>typeof v==='string'&&CARAVAN_INCIDENTS_261.some(id=>id===v);
export interface EncounterValidation261 {version:number;atCore:number;tileCount:number;factionIds:ReadonlySet<number>;mapIds:ReadonlySet<number>;siteIds263?:ReadonlySet<number>;settlements:readonly {id:number;factionId:number;postId:number|null;tile:number}[]}
export function validEncounterAdmission261(value:unknown,version:number):boolean {
 return value===undefined||(version===261||(Number(version)===262||isSchema263OrLater(Number(version))))&&plain(value)&&keys(value,['revision'])&&value.revision===1;
}
export function validCaravanStory261(value:unknown,c:EncounterValidation261):value is CaravanStory261|undefined {
 if(value===undefined)return true;
 if((c.version!==261&&(Number(c.version)!==262&&!isSchema263OrLater(Number(c.version))))||!plain(value)||!keys(value,['revision','lastFire','recent'],['lastThreatCore','lastFactionId'])||value.revision!==1||!plain(value.lastFire)||!dense(value.recent,5)||value.recent.length<1)return false;
 const fire=value.lastFire;if(Reflect.ownKeys(fire).length<1||!Reflect.ownKeys(fire).every(k=>incident(k)&&int(fire[k as string],0,c.atCore))||!value.recent.every(v=>incident(v)&&Object.hasOwn(fire,v as string)))return false;
 if(Object.hasOwn(value,'lastThreatCore')&&(!int(value.lastThreatCore,0,c.atCore)||Math.max(Number(value.lastFire.ambush??-1),Number(value.lastFire['manhunter-ambush']??-1))!==value.lastThreatCore))return false;
 if((Object.hasOwn(value.lastFire,'ambush')||Object.hasOwn(value.lastFire,'manhunter-ambush'))&&!Object.hasOwn(value,'lastThreatCore'))return false;
 return !Object.hasOwn(value,'lastFactionId')||int(value.lastFactionId,1)&&c.factionIds.has(value.lastFactionId);
}
export function validRetainedArrival261(value:unknown,c:EncounterValidation261):value is RetainedArrival261 {
 if(value===null)return true;
 if(!plain(value))return false;
 if(value.kind==='enter')return keys(value,['kind','mapId'])&&int(value.mapId)&&c.mapIds.has(value.mapId);
 if(isSchema263OrLater(c.version)&&validWorldEntryTarget263(value))return value.kind==='visit-site'?!!c.siteIds263?.has(value.siteId):c.settlements.some(s=>s.id===value.settlementId&&s.factionId===value.factionId);
 return value.kind==='trade'&&keys(value,['kind','settlementId','factionId','postId'])&&int(value.settlementId,1)&&int(value.factionId,1)&&(value.postId===null||int(value.postId,1))&&c.settlements.some(s=>s.id===value.settlementId&&s.factionId===value.factionId&&(value.postId===null||s.postId===value.postId));
}
/** Stale arrival references remain serializable: they must be refused at the true
 * route boundary, not make a historical destination unreloadable after map loss. */
export function validRetainedArrivalShape261(value:unknown,version=261):value is RetainedArrival261 {
 if(isSchema263OrLater(version)&&validWorldEntryTarget263(value))return true;
 return value===null||plain(value)&&(value.kind==='enter'&&keys(value,['kind','mapId'])&&int(value.mapId)||value.kind==='trade'&&keys(value,['kind','settlementId','factionId','postId'])&&int(value.settlementId,1)&&int(value.factionId,1)&&(value.postId===null||int(value.postId,1)));
}
export function validRetainedCaravan261(v:unknown,c:EncounterValidation261):v is RetainedCaravan261 {
 if(!plain(v)||!keys(v,['passStory','next','destination'])||typeof v.passStory!=='boolean')return false;
 const n=v.next,d=v.destination;
 // The existing route kernel permits one signed overshoot (delta<=16), never
 // clamp it to zero during capture/load or grant paid progress at restoration.
 if(n!==null&&(!plain(n)||!keys(n,['tile','leftFraction','paused'])||!int(n.tile,0,c.tileCount-1)||typeof n.paused!=='boolean'||typeof n.leftFraction!=='number'||!Number.isFinite(n.leftFraction)||Math.fround(n.leftFraction)!==n.leftFraction||n.leftFraction< -16||n.leftFraction>1))return false;
 return d===null||plain(d)&&keys(d,['tile','action'])&&int(d.tile,0,c.tileCount-1)&&validRetainedArrivalShape261(d.action,c.version);
}
export function validCaravanBattlefield261(value:unknown,c:EncounterValidation261):value is CaravanBattlefield261 {
 return (c.version===261||(Number(c.version)===262||isSchema263OrLater(Number(c.version))))&&plain(value)&&keys(value,['revision','kind','won','factionId','retained'])&&value.revision===1&&(value.kind==='ambush'||value.kind==='attacked-caravan')&&typeof value.won==='boolean'&&(value.factionId===null||int(value.factionId,1)&&c.factionIds.has(value.factionId))&&validRetainedCaravan261(value.retained,c);
}
export function validCaravanCaptivity261(value:unknown,c:EncounterValidation261):boolean {
 return value===undefined||(c.version===261||(Number(c.version)===262||isSchema263OrLater(Number(c.version))))&&plain(value)&&keys(value,['factionId','atCore'])&&int(value.factionId,1)&&c.factionIds.has(value.factionId)&&int(value.atCore,0,c.atCore);
}
/** Call before old260 validation/migration and on archived/retired rows too. */
export function historicalEncounterFieldsAbsent261(value:unknown,version:number):boolean {
 return (version===261||(Number(version)===262||isSchema263OrLater(Number(version))))||!value||typeof value!=='object'||!['encounters261','story261','battlefield261','pending261','captivity261','arrival261','encounterBirth261'].some(k=>Object.hasOwn(value,k));
}
