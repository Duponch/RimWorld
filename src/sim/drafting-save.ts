import { hasForcedConsumeMarker,validForcedConsumePawnShape } from './consume-save.ts';
import { DRAFT_QUEUE_LIMIT,sameCell } from './drafting-rules.ts';
import type { World } from './types.ts';
import { draftTurretService } from './mini-turret-reload.ts';
import { validTendShape } from './care-save.ts';

export function validDraftShape(value:unknown,version:number,world:{width:number;height:number;tick:number}):boolean {
  if(value===undefined)return true;
  if(version<53||!value||typeof value!=='object'||Array.isArray(value))return false;
  const d=value as Record<string,unknown>;
  const cell=(v:unknown)=>{if(!v||typeof v!=='object'||Array.isArray(v))return false;const c=v as {x:number;z:number};return Number.isInteger(c.x)&&Number.isInteger(c.z)&&c.x>=0&&c.z>=0&&c.x<world.width&&c.z<world.height;};
  return Object.keys(d).every(k=>['lastActiveTick','target','queue',...(version>=60?['holdFire']:[])].includes(k))&&(d.holdFire===undefined||d.holdFire===true)&&Number.isSafeInteger(d.lastActiveTick)&&Number(d.lastActiveTick)>=0&&Number(d.lastActiveTick)<=world.tick&&(d.target===null||cell(d.target))&&Array.isArray(d.queue)&&d.queue.length<=DRAFT_QUEUE_LIMIT&&d.queue.every(cell);
}
export function validateDrafting(world:World):string[] {
  const errors:string[]=[],claims=new Set<number>();
  for(const p of world.pawns)if(p.draft) {
    const d=p.draft,sleep=p.need?.kind==='sleep'&&p.need.phase==='sleep'&&p.need.bedId===null;
    const service=draftTurretService(world,p),refuge=world.schemaVersion>=193&&!!p.bombRefuge;
    const clinical=world.schemaVersion>=233&&p.tend?.drafted===true;
    const consuming=world.schemaVersion>=234&&hasForcedConsumeMarker(p)&&validForcedConsumePawnShape(p,world.schemaVersion,world);
    const invalidClinical=clinical&&(!validTendShape(p.tend,world.schemaVersion,world)||d.target!==null||d.queue.length>0
      ||p.orders.active!=='tend'||p.orders.queue.length>0||p.priorityWork!==undefined||p.need!==null||p.melee||p.shooting
      ||p.bombRefuge||p.transitExit||p.interruptedCargo);
    const invalidService=service&&(d.target!==null||d.queue.length>0||p.haul!==null&&(p.haul.destination.type!=='turret'||!p.haul.destination.forced)
      ||p.orders.active!==null&&p.orders.active!=='haul'||p.orders.queue.some(o=>typeof o==='number'||!('destination' in o)||o.destination.type!=='turret')
      ||p.priorityWork!==undefined&&p.priorityWork.work!=='haul');
    if(invalidService||invalidClinical||p.state==='dead'||p.state==='downed'||p.jobId!==null||p.haul&&!service||p.cooking||p.equipmentTask||p.ward||p.feed||p.tend&&!clinical||p.rescue||p.recreation.task||p.orders.active!==null&&!service&&!clinical&&!consuming||p.orders.queue.length&&!service&&!clinical&&!consuming||p.priorityWork&&!service&&!clinical&&!consuming||p.need&&!sleep&&!consuming||sleep&&(d.target||d.queue.length)||p.state==='sleeping'&&!sleep||p.path.length&&p.state!=='moving'||!['idle','moving','sleeping',...(service||clinical?['working']:[]),...(consuming?['eating']:[])].includes(p.state))errors.push('Invalid drafted activity.');
    if(clinical&&p.path.length&&!sameCell(p.path.at(-1)!,p.tend!.spot))errors.push('Drafted tending path does not reach its contact cell.');
    if(d.target){const key=d.target.z*world.width+d.target.x;if(claims.has(key))errors.push('Conflicting tactical destination.');claims.add(key);}
    if(p.path.length&&!p.melee?.order&&!p.transitExit&&!service&&!refuge&&!clinical&&!consuming&&(!d.target||!sameCell(p.path.at(-1)!,d.target)))errors.push('Tactical path does not reach its destination.');
    if(!d.target&&!p.melee?.order&&p.state==='moving'&&!p.transitExit&&!service&&!refuge&&!clinical&&!consuming&&p.moveCooldown===0)errors.push('Tactical movement lacks a destination.');
  }
  return errors;
}
