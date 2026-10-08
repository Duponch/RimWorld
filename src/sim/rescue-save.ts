import { medicalWorkRefusal } from './health-rules.ts';
import { isColonist } from './affiliation.ts';
import { captureReason } from './capture.ts';
import { rescueBedAvailable } from './medical-beds.ts';
import { wantsRescue } from './rescue.ts';
import { patientClaimed } from './care-access.ts';
import { canStandAt } from './furniture-travel.ts';
import { capturePrisonTopology } from './prison-space.ts';
import { carrierOf } from './rescue-state.ts';
import { workPriority } from './work-types.ts';
import type { Cell,World } from './types.ts';
import type { TravelSegment } from './movement.ts';

const sameEdge=(a:TravelSegment|null|undefined,b:TravelSegment|null|undefined):boolean=>!a||!b?!a&&!b:
  a.start===b.start&&a.end===b.end&&a.terrainDelay===b.terrainDelay&&a.speedFactor===b.speedFactor&&a.from.x===b.from.x&&a.from.z===b.from.z&&a.to.x===b.to.x&&a.to.z===b.to.z
  &&(a.stagger?.length??0)===(b.stagger?.length??0)&&(!a.stagger||a.stagger.every((s,i)=>s.start===b.stagger![i].start&&s.end===b.stagger![i].end))
  &&(a.stuns?.length??0)===(b.stuns?.length??0)&&(!a.stuns||a.stuns.every((s,i)=>s.start===b.stuns![i].start&&s.end===b.stuns![i].end));
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const cell=(v:unknown):v is Cell=>object(v)&&Object.keys(v).length===2&&Number.isSafeInteger(v.x)&&Number(v.x)>=0&&Number.isSafeInteger(v.z)&&Number(v.z)>=0;
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;

export function validRescueShape(value:unknown,version:number):boolean {
  if(version<46||!value||typeof value!=='object'||Array.isArray(value))return false;
  const t=value as Record<string,unknown>,id=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0;
  return Object.keys(t).every(k=>['patientId','bedId','phase',...(version>=86?['capture']:[]),...(version>=202?['release']:[])].includes(k))&&id(t.patientId)
    &&(t.release===undefined?id(t.bedId):version>=202&&t.bedId===0&&!Object.hasOwn(t,'capture')&&object(t.release)&&Object.keys(t.release).length===2&&cell(t.release.drop)&&cell(t.release.exit))
    &&(t.phase==='approach'||t.phase==='carry')&&(t.capture===undefined||version>=86&&t.capture===true);
}
/** Shapes have passed first. Cross-references must describe a single physical
 * person, never a second actor or a resource owned by the rescuer. */
export function validateRescues(world:World):string[] {
  const errors:string[]=[],patients=new Set<number>(),beds=new Set<number>();
  for(const actor of world.pawns)if(actor.rescue){
    const t=actor.rescue,patient=world.pawns.find(p=>p.id===t.patientId),bed=world.structures.find(b=>b.id===t.bedId);
    if(t.release){
      const carrier=patient&&carrierOf(world,patient.id);
      if(world.schemaVersion<202||t.bedId!==0||t.capture!==undefined||!patient||patient===actor||!patient.prisoner||patient.prisoner.mode!=='release'||patient.prisoner.releasedAt!==undefined
        ||patient.prisoner.escape||patient.state==='dead'||patient.state==='downed'||patient.health?.death||patient.mental?.crisis||patient.rescue||patients.has(t.patientId)||patientClaimed(world,t.patientId,actor)
        ||carrier&&(t.phase!=='carry'||carrier!==actor))errors.push('Invalid or duplicate prisoner release patient.');
      const {drop,exit}=t.release,inside=(c:Cell)=>cell(c)&&c.x<world.width&&c.z<world.height;
      const map=capturePrisonTopology(world),room=inside(drop)?map.at(drop.x,drop.z):undefined;
      if(!inside(drop)||!inside(exit)||!canStandAt(world,drop)||!canStandAt(world,exit)||room?.kind!=='space'||!room.touchesMapEdge||map.at(exit.x,exit.z)!==room
        ||!(exit.x===0||exit.z===0||exit.x===world.width-1||exit.z===world.height-1))errors.push('Invalid prisoner release destination.');
      // A mobile patient may move after the guard in this tick. Approach
      // retains the last followed cell until travel replans on the next turn.
      if(t.phase==='carry'&&actor.path.length&&!same(actor.path.at(-1)!,drop))errors.push('Invalid prisoner release route.');
      if(!isColonist(actor)||actor.prisoner||medicalWorkRefusal(actor)||actor.draft||actor.mental?.crisis||actor.burning||actor.flee||actor.collapsePending||world.restRules==='legacy'&&actor.rest===0||carrierOf(world,actor.id)
        ||!workPriority(actor,'basic')&&!workPriority(actor,'warden')||actor.orders.active!==null)errors.push('Invalid prisoner release authority.');
    }else{
      if(!patient||patient===actor||(t.capture?!!captureReason(world,actor,patient,true):!wantsRescue(patient,actor.orders.active==='rescue'))||patient.rescue||patients.has(t.patientId))errors.push('Invalid or duplicate rescue patient.');
      if(!bed||!patient||!rescueBedAvailable(world,bed,patient,actor.id,!!t.capture)||beds.has(t.bedId))errors.push('Invalid or duplicate rescue bed.');
      beds.add(t.bedId);
      if(!isColonist(actor)||actor.prisoner||medicalWorkRefusal(actor)||(t.capture?actor.orders.active!=='rescue':(patient?.prisoner?actor.priorities.warden:actor.priorities.doctor)===0&&actor.orders.active!=='rescue'))errors.push('Invalid rescue or capture authority.');
    }
    patients.add(t.patientId);
    if(actor.jobId!==null||actor.need||actor.tend||actor.ward||actor.feed||actor.haul||actor.cooking||actor.recreation.task||actor.interruptedCargo||actor.state!=='moving')errors.push('Rescue conflicts with actor activity.');
    if(patient&&t.phase==='carry'){
      if(patient.x!==actor.x||patient.z!==actor.z||patient.moveCooldown!==actor.moveCooldown||!sameEdge(patient.motion,actor.motion))errors.push('Carried patient does not share carrier edge.');
      if(patient.need||patient.path.length||patient.medicalSleep)errors.push('Carried patient still uses a service.');
    }
  }
  return errors;
}
