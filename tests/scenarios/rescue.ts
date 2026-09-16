import { medicalCamp,controlledInjury } from './health.ts';
import { fixtureBuilding } from './deconstruction.ts';
import type { World } from '../../src/sim/types.ts';

/** A real shared-world passenger, no copy or resource standing in for a person. */
export function rescueCamp(pairs=1,size=32):World {
  const w=medicalCamp(pairs*2,size);
  for(let i=0;i<pairs;i++){
    const doctor=w.pawns[2*i]!,patient=w.pawns[2*i+1]!,x=3+(i%10)*3,z=3+Math.floor(i/10)*4;
    Object.assign(doctor,{x,z});doctor.name=`Secouriste ${i+1}`;doctor.priorities.doctor=1;
    Object.assign(patient,{x:x+1,z:z+2});patient.name=`Patient ${i+1}`;
    controlledInjury(w,patient,'left-leg',30000);controlledInjury(w,patient,'right-leg',30000);
    const bed=fixtureBuilding(w,'bed',x,z+12);Object.assign(bed,{medical:true});
  }
  return w;
}
