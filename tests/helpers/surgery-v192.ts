import { medicalCamp } from '../scenarios/health.ts';
import { fixtureBuilding } from '../scenarios/deconstruction.ts';
import { addMaterial,refreshStock } from '../../src/sim/materials.ts';
import { createMedicalRecord } from '../../src/sim/injury-state.ts';
import type { MedicineItem } from '../../src/sim/medicine-rules.ts';

/** Prepared treated member infection, not a proof of natural acquisition.
 * Every bed admission, dose transfer, administration and result remains real.
 * Pure helper: no Vitest or browser dependency for future scene preparation. */
export function surgeryCamp(item:MedicineItem='medicine',size=16) {
  const world=medicalCamp(3,size),[doctor,patient,helper]=world.pawns;
  Object.assign(doctor!,{name:'Chirurgien',x:2,z:3});
  Object.assign(patient!,{name:'Patient',x:4,z:5});
  Object.assign(helper!,{name:'Soignant auxiliaire',x:3,z:6});
  doctor!.skills.medicine={level:8,xp:0,dailyXp:0,passion:0};helper!.skills.medicine={level:8,xp:0,dailyXp:0,passion:0};
  patient!.priorities.patient=1;patient!.priorities.bedrest=3;patient!.medicalCare='best';
  patient!.health=createMedicalRecord(world.tick);
  patient!.health.infections={nextId:2,immunity:0,cases:[{id:1,part:'left-arm',bornAt:world.tick,severity:100_000_000,luck:1_000_000,
    tend:{quality:1000,expiresAtCore:world.tick*10+37500}}]};
  const bed=fixtureBuilding(world,'bed',10,10);Object.assign(bed,{medical:true});
  addMaterial(world,'medicine',3,{type:'ground',x:13,z:3},item);
  const source=world.piles.find(pile=>pile.item===item)!;
  // This deterministic prepared stream yields a successful first operation;
  // it is fixed before simulation, never reset at administration or outcome.
  world.rng=2;refreshStock(world);
  return {world,doctorId:doctor!.id,patientId:patient!.id,helperId:helper!.id,bedId:bed.id,sourceId:source.id,item};
}
