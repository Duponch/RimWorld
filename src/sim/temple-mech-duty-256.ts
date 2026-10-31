import {isCorePhysicalSchema297} from './physical-schema-297.ts';
import {effectiveCore297,validationCore297} from './core-phase-297.ts';
import {mechRaidGroup261} from './mechanical-raid-groups-261.ts';
import {sleepingSiteMech263,siteMechanicalDuty263} from './world-site-mechanoids-263.ts';
import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Temple-only sleep/assault membership over existing mechanical originals.
 * Pool and assault planning are declared provisional adaptations; no raid is
 * scheduled and no native Pawn/Lord constructor receipt is manufactured. */
import type {World,Cell} from './types.ts';
import type {Mechanoid} from './mechanoid-state.ts';
import {foggedCell256} from './exploration-state-256.ts';
export interface TempleMechDuty256 {group:number;madeAtCore:number;awakeAtCore:number|null;goal:Cell|null}
export const mechanicalOrder256=(m:Mechanoid)=>m.raid??m.temple??m.site263;
export function mechanicalDuty256(w:World,m:Mechanoid){
 if(m.site263)return siteMechanicalDuty263(w,m);
 if(m.temple)return m.temple.awakeAtCore===null?undefined:{phase:'assault' as const};
 const group=mechRaidGroup261(w,m.raid?.group);return group?.members.includes(m.id)?group:undefined;
}
/** Historical public predicate also guards distinct Site sleepers in existing
 * combat consumers. The actual Temple wake/defog authority below stays literal. */
export const sleepingTempleMech256=(m:Mechanoid)=>m.temple?.awakeAtCore===null||sleepingSiteMech263(m);
export function wakeTempleMechGroup256(w:World,member:Mechanoid,atCore:number):void {
 const duty=member.temple;if(!duty||duty.awakeAtCore!==null)return;
 if(!isSchema256Or257(w.schemaVersion)||!w.mechanoids?.includes(member)||!Number.isSafeInteger(atCore)||atCore<duty.madeAtCore||(isCorePhysicalSchema297(Number(w.schemaVersion))?atCore!==effectiveCore297(w):atCore<Math.max(duty.madeAtCore,(w.tick-1)*10,0)||atCore>w.tick*10))throw Error('Invalid actual Temple mechanical wake');
 for(const m of w.mechanoids)if(m.temple?.group===duty.group){m.temple={...m.temple,awakeAtCore:atCore,goal:null};m.path=[];m.planCooldown=0;}
 w.events.push({tick:w.tick,type:'command',message:'Les mécanoïdes du temple s’éveillent et commencent leur assaut.'});
 if(w.events.length>80)w.events.splice(0,w.events.length-80);
}
/** Invoke only after the real fog transaction, including initial Fog1500. */
export function wakeUnfoggedTempleMechs256(w:World):void {
 if(!isSchema256Or257(w.schemaVersion)||!w.exploration)return;
 for(const m of w.mechanoids??[])if(m.temple?.awakeAtCore===null&&m.state!=='dead'&&!foggedCell256(w,m.z*w.width+m.x))wakeTempleMechGroup256(w,m,isCorePhysicalSchema297(Number(w.schemaVersion))?effectiveCore297(w):w.tick*10);
}
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export function validTempleMechField256(v:unknown,version:number,tick:number,coreNow297?:number):boolean {
 const core=validationCore297(version,tick,coreNow297);if(isCorePhysicalSchema297(version)&&!Number.isSafeInteger(core))return false;
 if(!v||typeof v!=='object')return false;const d=Object.getOwnPropertyDescriptor(v,'temple');
 if(!d)return !('temple'in v);
 if(!isSchema256Or257(version)||!Object.hasOwn(d,'value')||!d.enumerable||!d.value||typeof d.value!=='object'||Object.getPrototypeOf(d.value)!==Object.prototype)return false;
 const t=d.value as Record<string,unknown>,names=['group','madeAtCore','awakeAtCore','goal'];
 if(Reflect.ownKeys(t).length!==names.length||!names.every(k=>{const p=Object.getOwnPropertyDescriptor(t,k);return !!p&&Object.hasOwn(p,'value')&&p.enumerable;}))return false;
 if(!integer(t.group,0,2147483645)||!integer(t.madeAtCore,0,core)||!(t.awakeAtCore===null||integer(t.awakeAtCore,t.madeAtCore,core)))return false;
 const goal=t.goal;if(goal!==null&&(!goal||typeof goal!=='object'||Object.getPrototypeOf(goal)!==Object.prototype||Reflect.ownKeys(goal).length!==2||!['x','z'].every(k=>{const p=Object.getOwnPropertyDescriptor(goal,k);return !!p&&Object.hasOwn(p,'value')&&p.enumerable&&integer(p.value);})))return false;
 const m=v as Mechanoid;
 return !('raid'in v)&&(t.awakeAtCore!==null||Array.isArray(m.path)&&!m.path.length&&!m.motion&&!m.melee&&!m.ranged&&['idle','dead','downed'].includes(m.state)&&goal===null);
}
export function validateTempleMechGroups256(w:World):string[] {
 const next=w.worldMaps?.nextLordId??(w.campaignMap?.revision===2?w.campaignMap.nextLordId:undefined),groups=new Map<number,TempleMechDuty256>();
 for(const m of w.mechanoids??[]){if(!validTempleMechField256(m,w.schemaVersion,w.tick,isCorePhysicalSchema297(Number(w.schemaVersion))?effectiveCore297(w):undefined))return ['Invalid actual Temple mechanical group'];const t=m.temple;if(!t)continue;
  if(!integer(next,1,2147483646)||t.group>=next||t.goal&&(t.goal.x>=w.width||t.goal.z>=w.height))return ['Invalid actual Temple mechanical group'];
  const prior=groups.get(t.group);if(prior&&(prior.madeAtCore!==t.madeAtCore||prior.awakeAtCore!==t.awakeAtCore))return ['Inconsistent Temple mechanical wake state'];groups.set(t.group,t);
  if(w.wildlife?.hiveLords?.some(l=>l.id===t.group))return ['Temple mechanical and insect groups alias'];
 }
 return [];
}
