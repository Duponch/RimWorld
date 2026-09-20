import { releaseAssignments,releaseWork,planCommandDrops } from './work-release.ts';
import { reconcilePower } from './power.ts';
import type { CommandResult,Job,Structure,World } from './types.ts';

export const canFlickPower=(s:Structure):boolean=>['wood-generator','standing-lamp','cooler','electric-stove','power-switch'].includes(s.kind)&&!!s.power;
export const actualPowerSwitch=(s:Structure):boolean=>s.power?.switchOn!==false;

/** A command queues work. It never switches a circuit from a distance. */
export function requestPowerFlick(world:World,structureId:number,on:boolean):CommandResult {
  const s=world.structures.find(s=>s.id===structureId);
  if(!s||!canFlickPower(s)||typeof on!=='boolean')return {ok:false,code:'invalid-command',reason:'Cet appareil ne possède pas d’interrupteur accessible.'};
  if(world.jobs.some(j=>(j.deconstruction?.structureId??j.furniture?.structureId)===s.id))return {ok:false,code:'occupied',reason:'Un retrait ou déplacement est déjà prévu.'};
  const old=world.jobs.find(j=>j.flick?.structureId===s.id);
  if(old?.flick?.on===on)return {ok:true};
  if(actualPowerSwitch(s)!==on&&!Number.isSafeInteger(world.nextId+1))return {ok:false,code:'invalid-command',reason:'Limite des identités atteinte.'};
  // Reuse the drop planner without changing the refuelling policy. A full floor
  // rejects the new intention before any cargo, job or switch is changed.
  const drops=actualPowerSwitch(s)!==on?planCommandDrops(world,{type:'refuel-policy',structureId:s.id,enabled:false}):new Map();
  if(!drops)return {ok:false,code:'occupied',reason:'Aucune place pour déposer le combustible déjà porté.'};
  if(actualPowerSwitch(s)!==on)for(const p of world.pawns)if(p.haul?.destination.type==='fuel'&&p.haul.destination.structureId===s.id&&!p.haul.destination.forced)releaseWork(world,p,drops);
  if(old)removeFlick(world,old);
  if(actualPowerSwitch(s)!==on)world.jobs.push({id:world.nextId++,kind:'flick',flick:{structureId:s.id,kind:s.kind,on},x:s.x,z:s.z,orientation:s.orientation,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}});
  for(const p of world.pawns)p.planCooldown=0;
  return {ok:true};
}
function removeFlick(world:World,j:Job):void {
  for(const p of world.pawns){if(p.jobId===j.id)releaseAssignments(world,p);p.orders.queue=p.orders.queue.filter(o=>o!==j.id);}
  world.jobs=world.jobs.filter(other=>other!==j);
}
export function reconcilePowerFlicks(world:World):void {
  for(const j of world.jobs.filter(j=>j.flick)){
    const s=world.structures.find(s=>s.id===j.flick!.structureId);
    if(!s||!canFlickPower(s)||actualPowerSwitch(s)===j.flick!.on||world.jobs.some(other=>(other.deconstruction?.structureId??other.furniture?.structureId)===s.id))removeFlick(world,j);
  }
}
/** Fifteen Core ticks at the target. Our ten-Core step commits on the second
 * local tick; no skill, XP, lamp bonus or construction multiplier applies. */
export function advancePowerFlick(world:World,j:Job):boolean {
  const s=world.structures.find(s=>s.id===j.flick?.structureId);
  if(!s||!canFlickPower(s))return true;
  j.progress+=10;
  if(j.progress<15)return false;
  s.power!.switchOn=j.flick!.on;
  if(!j.flick!.on)s.power!.on=false;
  reconcilePower(world);
  return true;
}
export function validatePowerFlicks(world:World,version:number):string[] {
  const errors:string[]=[],seen=new Set<number>();
  for(const j of world.jobs){
    const f=j.flick;
    if(j.kind!=='flick'){if(f!==undefined)errors.push('Unexpected switch job.');continue;}
    if(version<85||!f||typeof f!=='object'||Array.isArray(f)||Object.keys(f).some(k=>!['structureId','kind','on'].includes(k))||!Number.isSafeInteger(f.structureId)||typeof f.on!=='boolean'){errors.push('Invalid switch job.');continue;}
    const s=world.structures.find(s=>s.id===f.structureId);
    if(!s||!canFlickPower(s)||actualPowerSwitch(s)===f.on||seen.has(f.structureId)||s.kind!==f.kind||s.x!==j.x||s.z!==j.z||j.orientation!==s.orientation||j.footprint!=='standard'
      ||j.material!==undefined||j.construction||j.furniture||j.deconstruction||j.repair||j.clearance||j.growingZoneId!==undefined||j.workRemainder!==undefined||![0,10].includes(j.progress)||j.progress>0&&j.reservedBy===null||j.escrow.wood||j.escrow.food
      ||world.jobs.some(other=>(other.deconstruction?.structureId??other.furniture?.structureId)===f.structureId))errors.push('Switch job does not match its device.');
    seen.add(f.structureId);
  }
  return errors;
}
