import { addMaterial,refreshStock } from '../../src/sim/materials.ts';
import { createMedicalRecord,reconcileMedicalDeath } from '../../src/sim/injury-state.ts';
import { reconcilePawnHealth } from '../../src/sim/health.ts';
import { BLOOD_UNIT } from '../../src/sim/injury-rules.ts';
import { advanceHumanCorpses } from '../../src/sim/human-corpses.ts';
import { medicalCamp } from './health.ts';

/** Explicit clinical preparation for grouped boundaries and native controls.
 * This is not the natural V88 colony and does not claim a played death. */
export function funeralFixture(blocked=false){
  const w=medicalCamp(3),actor=w.pawns[0]!,other=w.pawns[1]!,body=w.pawns[2]!;
  actor.priorities.haul=1;other.priorities.haul=1;actor.priorities.build=1;
  Object.assign(actor,{x:13,z:16});Object.assign(other,{x:14,z:16});Object.assign(body,{x:18,z:16});
  if(blocked)addMaterial(w,'wood',1,{type:'ground',x:body.x,z:body.z},'wood');
  body.health=createMedicalRecord(w.tick);body.health.bloodLoss=BLOOD_UNIT;
  reconcileMedicalDeath(body.health);reconcilePawnHealth(w,body);
  advanceHumanCorpses(w);refreshStock(w);return {w,actor,other,body};
}
export function hygieneUiFixture(){
  const {w,actor,other,body}=funeralFixture();other.priorities.haul=0;
  return {world:w,actorId:actor.id,bodyPawnId:body.id,graveCell:{x:25,z:16}};
}
