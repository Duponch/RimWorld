import { tendingReason } from './tending.ts';
import { treatmentTarget,healingInjury } from './care-rules.ts';
import { canStandAt } from './furniture-travel.ts';
import type { World } from './types.ts';

export function validTendShape(value:unknown,version:number,w:World):boolean {
  if(version<47||!value||typeof value!=='object'||Array.isArray(value))return false;
  const t=value as Record<string,unknown>,s=t.spot as Record<string,unknown>;
  const int=(n:unknown,min:number,max=Number.MAX_SAFE_INTEGER)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
  return Object.keys(t).every(k=>['patientId','spot','phase','progress','duration'].includes(k))&&int(t.patientId,1)
    &&!!s&&typeof s==='object'&&Object.keys(s).every(k=>k==='x'||k==='z')&&int(s.x,0,w.width-1)&&int(s.z,0,w.height-1)
    &&(t.phase==='approach'||t.phase==='tend')&&int(t.progress,0,5999)
    &&(t.duration===undefined?t.phase==='approach'&&t.progress===0:int(t.duration,1,6000)&&Number(t.progress)<Number(t.duration));
}
export function validateCare(world:World):string[] {
  const errors:string[]=[],patients=new Set<number>();
  for(const d of world.pawns){
    if(d.state==='resting'&&!(d.need?.kind==='sleep'&&d.need.medical&&d.need.phase==='sleep'))errors.push('Medical rest without a physical bed service.');
    if(d.need?.kind==='sleep'&&d.need.medical&&(d.need.bedId===null||d.priorities[d.need.medical]===0))errors.push('Invalid medical bed intent.');
    if(d.need?.kind==='sleep'&&d.need.medical&&!treatmentTarget(d)&&!(d.need.medical==='bedrest'&&healingInjury(d)))errors.push('Medical rest without an eligible condition.');
    if(!d.tend)continue;
    const t=d.tend,p=world.pawns.find(p=>p.id===t.patientId);
    if(tendingReason(world,d,p,true)||d.priorities.doctor===0&&d.orders.active!=='tend'||patients.has(t.patientId))errors.push('Invalid or duplicate tending reservation.');
    patients.add(t.patientId);
    if(!p||Math.abs(t.spot.x-p.x)+Math.abs(t.spot.z-p.z)!==1||!canStandAt(world,t.spot))errors.push('Tending place is not accessible at the bedside.');
    if(t.phase==='tend'&&(d.state!=='working'||d.moveCooldown>0||d.x!==t.spot.x||d.z!==t.spot.z||d.path.length)||t.phase==='approach'&&d.state!=='moving')errors.push('Invalid tending phase/position.');
    if(d.recreation.task||d.feed||d.rescue||d.need||d.haul||d.cooking||d.jobId!==null)errors.push('Tending conflicts with another activity.');
  }
  return errors;
}
