import { hygieneUiFixture } from './hygiene-ui';
import { enclosedRoom } from './cleanliness';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials';
import { addFilth } from '../../src/sim/filth';
import { createMedicalRecord } from '../../src/sim/injury-state';
import { exposeFoodPoisoning } from '../../src/sim/food-poisoning';
import { reconcilePawnHealth } from '../../src/sim/health';

/** A bounded clinical control for visible interactions. The natural colony
 * journey supplies its own kitchen, corpses and risks without this setup. */
export function hygieneNativeFixture(){
  const result=hygieneUiFixture(),w=result.world;
  const actor=w.pawns.find(p=>p.id===result.actorId)!,patient=w.pawns.find(p=>p.id!==actor.id&&p.state!=='dead')!;
  actor.priorities.haul=0;actor.priorities.clean=0;
  const room=enclosedRoom(w,{x:8,z:8});
  addGroundMaterial(w,'wood',40,{x:13,z:12},'wood');
  const dirty={x:11,z:11};addFilth(w,dirty,'vomit',3);const dirtId=w.filth!.items[0]!.id;
  patient.health=createMedicalRecord(w.tick);patient.health.foodPoisoning=exposeFoodPoisoning(undefined,'filthy-kitchen','simple-meal',w.tick);
  patient.health.foodPoisoning.severity=239000;patient.health.foodPoisoning.vomit={remainingCore:450,cell:{x:patient.x,z:patient.z}};
  reconcilePawnHealth(w,patient);refreshStock(w);
  return {...result,patientId:patient.id,dirty,dirtId,room,floorFrom:{x:9,z:9},floorTo:{x:11,z:10}};
}
