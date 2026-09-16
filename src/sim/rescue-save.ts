import { medicalWorkRefusal } from './health-rules.ts';
import { rescueBedAvailable } from './medical-beds.ts';
import { wantsRescue } from './rescue.ts';
import type { World } from './types.ts';
import type { TravelSegment } from './movement.ts';

const sameEdge=(a:TravelSegment|null|undefined,b:TravelSegment|null|undefined):boolean=>!a||!b?!a&&!b:
  a.start===b.start&&a.end===b.end&&a.terrainDelay===b.terrainDelay&&a.speedFactor===b.speedFactor&&a.from.x===b.from.x&&a.from.z===b.from.z&&a.to.x===b.to.x&&a.to.z===b.to.z;

export function validRescueShape(value:unknown,version:number):boolean {
  if(version<46||!value||typeof value!=='object'||Array.isArray(value))return false;
  const t=value as Record<string,unknown>,id=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0;
  return Object.keys(t).every(k=>['patientId','bedId','phase'].includes(k))&&id(t.patientId)&&id(t.bedId)&&(t.phase==='approach'||t.phase==='carry');
}
/** Shapes have passed first. Cross-references must describe a single physical
 * person, never a second actor or a resource owned by the rescuer. */
export function validateRescues(world:World):string[] {
  const errors:string[]=[],patients=new Set<number>(),beds=new Set<number>();
  for(const actor of world.pawns)if(actor.rescue){
    const t=actor.rescue,patient=world.pawns.find(p=>p.id===t.patientId),bed=world.structures.find(b=>b.id===t.bedId);
    if(!patient||patient===actor||!wantsRescue(patient)||patient.rescue||patients.has(t.patientId))errors.push('Invalid or duplicate rescue patient.');
    if(!bed||!patient||!rescueBedAvailable(world,bed,patient,actor.id)||beds.has(t.bedId))errors.push('Invalid or duplicate rescue bed.');
    patients.add(t.patientId);beds.add(t.bedId);
    if(medicalWorkRefusal(actor)||actor.priorities.doctor===0&&actor.orders.active!=='rescue'||actor.jobId!==null||actor.need||actor.haul||actor.cooking||actor.recreation.task||actor.interruptedCargo||actor.state!=='moving')errors.push('Rescue conflicts with actor activity.');
    if(patient&&t.phase==='carry'){
      if(patient.x!==actor.x||patient.z!==actor.z||patient.moveCooldown!==actor.moveCooldown||!sameEdge(patient.motion,actor.motion))errors.push('Carried patient does not share carrier edge.');
      if(patient.need||patient.path.length||patient.medicalSleep)errors.push('Carried patient still uses a service.');
    }
  }
  return errors;
}
