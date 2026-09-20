import { medicalWorkRefusal } from './health-rules.ts';
import { isColonist } from './affiliation.ts';
import { captureReason } from './capture.ts';
import { rescueBedAvailable } from './medical-beds.ts';
import { wantsRescue } from './rescue.ts';
import type { World } from './types.ts';
import type { TravelSegment } from './movement.ts';

const sameEdge=(a:TravelSegment|null|undefined,b:TravelSegment|null|undefined):boolean=>!a||!b?!a&&!b:
  a.start===b.start&&a.end===b.end&&a.terrainDelay===b.terrainDelay&&a.speedFactor===b.speedFactor&&a.from.x===b.from.x&&a.from.z===b.from.z&&a.to.x===b.to.x&&a.to.z===b.to.z
  &&(a.stagger?.length??0)===(b.stagger?.length??0)&&(!a.stagger||a.stagger.every((s,i)=>s.start===b.stagger![i].start&&s.end===b.stagger![i].end))
  &&(a.stuns?.length??0)===(b.stuns?.length??0)&&(!a.stuns||a.stuns.every((s,i)=>s.start===b.stuns![i].start&&s.end===b.stuns![i].end));

export function validRescueShape(value:unknown,version:number):boolean {
  if(version<46||!value||typeof value!=='object'||Array.isArray(value))return false;
  const t=value as Record<string,unknown>,id=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0;
  return Object.keys(t).every(k=>['patientId','bedId','phase',...(version>=86?['capture']:[])].includes(k))&&id(t.patientId)&&id(t.bedId)&&(t.phase==='approach'||t.phase==='carry')&&(t.capture===undefined||version>=86&&t.capture===true);
}
/** Shapes have passed first. Cross-references must describe a single physical
 * person, never a second actor or a resource owned by the rescuer. */
export function validateRescues(world:World):string[] {
  const errors:string[]=[],patients=new Set<number>(),beds=new Set<number>();
  for(const actor of world.pawns)if(actor.rescue){
    const t=actor.rescue,patient=world.pawns.find(p=>p.id===t.patientId),bed=world.structures.find(b=>b.id===t.bedId);
    if(!patient||patient===actor||(t.capture?!!captureReason(world,actor,patient,true):!wantsRescue(patient))||patient.rescue||patients.has(t.patientId))errors.push('Invalid or duplicate rescue patient.');
    if(!bed||!patient||!rescueBedAvailable(world,bed,patient,actor.id,!!t.capture)||beds.has(t.bedId))errors.push('Invalid or duplicate rescue bed.');
    patients.add(t.patientId);beds.add(t.bedId);
    if(!isColonist(actor)||actor.prisoner||medicalWorkRefusal(actor)||(t.capture?actor.orders.active!=='rescue':(patient?.prisoner?actor.priorities.warden:actor.priorities.doctor)===0&&actor.orders.active!=='rescue'))errors.push('Invalid rescue or capture authority.');
    if(actor.jobId!==null||actor.need||actor.tend||actor.ward||actor.feed||actor.haul||actor.cooking||actor.recreation.task||actor.interruptedCargo||actor.state!=='moving')errors.push('Rescue conflicts with actor activity.');
    if(patient&&t.phase==='carry'){
      if(patient.x!==actor.x||patient.z!==actor.z||patient.moveCooldown!==actor.moveCooldown||!sameEdge(patient.motion,actor.motion))errors.push('Carried patient does not share carrier edge.');
      if(patient.need||patient.path.length||patient.medicalSleep)errors.push('Carried patient still uses a service.');
    }
  }
  return errors;
}
