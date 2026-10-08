import { EMP_ADAPTATION_CORE_TICKS,empStunDuration } from './emp-rules.ts';
import { empStructureActive,empStructureSupported } from './emp-state.ts';
import { mergeSlowIntervals,travelEnd } from './travel-timing.ts';
import type { LivingTarget } from './combat-target.ts';
import type { Mechanoid } from './mechanoid-state.ts';
import type { Structure,World } from './types.ts';

/** Already-resolved EMP contact. No health, armour, energy or random stream is
 * spent here. A resisted hit leaves every clock and the captured edge intact. */
export function applyEmpEffect(world:World,target:Structure|LivingTarget,damage:number,core:number):boolean {
  const duration=empStunDuration(damage);
  if(world.schemaVersion<208||!duration||!Number.isSafeInteger(core)||core<Math.max(0,(world.tick-1)*10)||core>world.tick*10
    ||!Number.isSafeInteger(core+Math.max(duration,EMP_ADAPTATION_CORE_TICKS)))return false;
  if('mechKind' in target){
    const mech=target as Mechanoid;
    if(!world.mechanoids?.includes(mech)||mech.state==='dead'||mech.state==='downed'||mech.health?.death
      ||mech.emp&&core<mech.emp.adaptedUntilCore)return false;
    const recovery=mech.melee?.strike;
    if(recovery&&recovery.untilCore>core&&!Number.isSafeInteger(recovery.untilCore+duration))return false;
    const until=Math.max(mech.emp?.stunUntilCore??core,core+duration),motion=mech.motion;
    let slowed:typeof motion;
    if(motion&&motion.end>core/10){
      slowed={...motion,stuns:mergeSlowIntervals([...(motion.stuns??[]),{start:Math.max(motion.start,core/10),end:until/10}])};
      slowed.end=travelEnd(slowed);
      if(!Number.isFinite(slowed.end)||slowed.end>world.tick+1000)return false;
    }
    mech.emp={lastAtCore:core,adaptedUntilCore:core+EMP_ADAPTATION_CORE_TICKS,stunUntilCore:until};
    if(recovery&&recovery.untilCore>core)recovery.empPause={ticks:recovery.empPause?.ticks??0,lastAtCore:core};
    if(slowed){mech.motion=slowed;mech.moveCooldown=Math.max(0,slowed.end-world.tick);mech.state='moving';}
    return true;
  }
  if(!('kind' in target))return false;
  const structure=target as Structure;
  if(!world.structures.includes(structure)||!empStructureSupported(structure.kind))return false;
  const prior=structure.emp,active=empStructureActive(structure,core);
  structure.emp={sinceCore:active?prior!.sinceCore:core,untilCore:Math.max(active?prior!.untilCore:core,core+duration)};
  // Core's turret loses acquisition/warmup while its physical burst/recharge
  // remains paused. Close the final-impact publication boundary immediately.
  if(structure.turret){structure.turret.targetKey=null;structure.turret.warmup=null;}
  return true;
}

/** Shared Core scheduler calls this before owners. No actor decision or
 * topology mutation is needed when an EMP interval ends. */
export function advanceEmp(world:World,core=world.tick*10):boolean {
  let changed=false;
  for(const mech of world.mechanoids??[])if(mech.emp&&core>=Math.max(mech.emp.adaptedUntilCore,mech.emp.stunUntilCore)){
    delete mech.emp;changed=true;
  }
  for(const structure of world.structures)if(structure.emp&&core>=structure.emp.untilCore){delete structure.emp;changed=true;}
  // Uninstalling a battery does not preserve a permanent EMP flag. Its clock
  // continues while packed, like its ordinary self discharge.
  for(const packed of world.packed)if(packed.building.emp&&core>=packed.building.emp.untilCore){delete packed.building.emp;changed=true;}
  return changed;
}

/** Downing stops the pawn's EMP stun, not its adaptation. Preserve every
 * elapsed position and the independent historical 45-Core impact suspension. */
export function stopMechanoidEmpStun(mech:Mechanoid,core:number,tick=core/10):void {
  const emp=mech.emp;if(!emp||emp.stunUntilCore<=core)return;
  emp.stunUntilCore=core;
  const motion=mech.motion;if(!motion||motion.end<=core/10||!motion.stuns)return;
  const at=core/10,spans=motion.stuns.flatMap(span=>span.end<=at?[span]:span.start<at?[{start:span.start,end:at}]:[]);
  if(mech.stun&&mech.stun.untilCore>core)spans.push({start:Math.max(motion.start,at),end:mech.stun.untilCore/10});
  if(spans.length)motion.stuns=mergeSlowIntervals(spans);else delete motion.stuns;
  motion.end=travelEnd(motion);mech.moveCooldown=Math.max(0,motion.end-tick);
}
