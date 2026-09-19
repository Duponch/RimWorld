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
  if(o!==null&&(!object(o)||!keys(o,['targetId','startedDowned',...(version>=60?['auto']:[]),...(version>=67?['structure']:[])])||!integer(o.targetId,1)||o.structure!==undefined&&(o.structure!==true||o.startedDowned||o.auto!==undefined)||typeof o.startedDowned!=='boolean'||o.auto!==undefined&&(typeof o.auto!=='string'||!['draft','response'].includes(o.auto))))return false;
  if(s===null)return o!==null;
  return object(s)&&keys(s,['targetId','atCore','untilCore','tool','outcome',...(version>=67?['structure']:[])])&&(s.structure===undefined||object(s.structure)&&keys(s.structure,['x','z'])&&integer(s.structure.x,0)&&integer(s.structure.z,0)&&s.outcome==='hit')&&integer(s.targetId,1)&&integer(s.atCore,0,tick*10)&&integer(s.untilCore,tick*10+1)&&s.untilCore-s.atCore===120&&['left-fist','right-fist','head','teeth','grip','barrel','barrel-poke'].includes(String(s.tool))&&['hit','miss','dodge'].includes(String(s.outcome));
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
    if(m.order&&!m.order.structure&&(!world.pawns.some(t=>t.id===m.order!.targetId&&t.id!==p.id&&(isColonist(p)||hostileTo(p,t)))||(m.order.auto?!automaticOwnership(world,p,m.order.targetId,m.order.auto):isColonist(p)&&!p.draft)||p.shooting?.order||(!m.order.auto&&p.draft?.target)||m.order.auto==='draft'&&!automaticPost(p)||p.draft?.queue.length))errors.push('Invalid melee order ownership.');
    if(m.order?.structure&&(!isColonist(p)||!p.draft||p.shooting?.order||p.draft.target||p.draft.queue.length||!world.structures.some(s=>s.id===m.order!.targetId&&(s.kind==='wall'||s.kind==='door'))))errors.push('Invalid barrier melee order.');
    if(m.strike?.structure&&(m.strike.structure.x>=world.width||m.strike.structure.z>=world.height||m.strike.targetId>=world.nextId))errors.push('Invalid barrier recovery position.');
    if(m.strike?.structure){
      const s=world.structures.find(s=>s.id===m.strike!.targetId),c=m.strike.structure;
      if(s&&(s.kind!=='wall'&&s.kind!=='door'||s.x!==c.x||s.z!==c.z)||[world.pawns,world.jobs,world.piles,world.resources].some(items=>items.some(item=>item.id===m.strike!.targetId))||world.packed.some(p=>p.building.id===m.strike!.targetId))errors.push('Barrier recovery conflicts with a live entity.');
    }
    if(m.strike&&(!m.strike.structure&&!world.pawns.some(t=>t.id===m.strike!.targetId&&t.id!==p.id)||(p.motion?.end??0)>world.tick||p.shooting?.stance?.phase==='aim'))errors.push('Invalid melee recovery.');
  }
  return errors;
}
