import { automaticOwnership,automaticPost } from './automatic-combat-save.ts';
import { hostileTo,isColonist } from './affiliation.ts';
import type { World } from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
export function validMeleeShape(value:unknown,version:number,tick:number):boolean {
  if(value===undefined)return true;
  if(version<59||!object(value)||!keys(value,['order','strike'])||value.order===null&&value.strike===null)return false;
  const o=value.order,s=value.strike;
  if(o!==null&&(!object(o)||!keys(o,['targetId','startedDowned',...(version>=60?['auto']:[])])||!integer(o.targetId,1)||typeof o.startedDowned!=='boolean'||o.auto!==undefined&&(typeof o.auto!=='string'||!['draft','response'].includes(o.auto))))return false;
  if(s===null)return o!==null;
  return object(s)&&keys(s,['targetId','atCore','untilCore','tool','outcome'])&&integer(s.targetId,1)&&integer(s.atCore,0,tick*10)&&integer(s.untilCore,tick*10+1)&&s.untilCore-s.atCore===120&&['left-fist','right-fist','head','teeth','grip','barrel','barrel-poke'].includes(String(s.tool))&&['hit','miss','dodge'].includes(String(s.outcome));
}
export function validStunShape(value:unknown,version:number,tick:number):boolean {
  if(value===undefined)return true;
  return version>=59&&object(value)&&keys(value,['sinceCore','untilCore'])&&integer(value.sinceCore,0,tick*10)&&integer(value.untilCore,tick*10+1,tick*10+45)&&value.untilCore-value.sinceCore>=45;
}
export function validateMelee(world:World):string[] {
  const errors:string[]=[];
  for(const p of world.pawns) {
    if(p.stun&&p.state==='dead')errors.push('Dead actor cannot be stunned.');
    const m=p.melee;if(!m)continue;
    if(m.order?.auto&&m.order.startedDowned)errors.push('Automatic melee cannot start on a downed target.');
    if(['dead','downed','sleeping','eating','working','resting','recreating'].includes(p.state)||p.need||p.jobId!==null||p.haul||p.cooking||p.rescue||p.tend||p.feed||p.equipmentTask||p.flee||p.recreation.task||p.orders.active!==null||p.orders.queue.length||p.priorityWork)errors.push('Melee conflicts with another activity.');
    if(m.order&&(!world.pawns.some(t=>t.id===m.order!.targetId&&t.id!==p.id&&(isColonist(p)||hostileTo(p,t)))||(m.order.auto?!automaticOwnership(world,p,m.order.targetId,m.order.auto):isColonist(p)&&!p.draft)||p.shooting?.order||(!m.order.auto&&p.draft?.target)||m.order.auto==='draft'&&!automaticPost(p)||p.draft?.queue.length))errors.push('Invalid melee order ownership.');
    if(m.strike&&(!world.pawns.some(t=>t.id===m.strike!.targetId&&t.id!==p.id)||(p.motion?.end??0)>world.tick||p.shooting?.stance?.phase==='aim'))errors.push('Invalid melee recovery.');
  }
  return errors;
}
