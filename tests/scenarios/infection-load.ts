import { researchLoad } from './research-load.ts';
import { createMedicalRecord } from '../../src/sim/injury-state.ts';
import { addGroundMaterial } from '../../src/sim/materials.ts';
import type { World } from '../../src/sim/types.ts';

/** Declared performance fixture, not a natural acquisition test. One miner in
 * six starts ill in a physical bed; one researcher in six can provide care.
 * Other research, tailoring, mining and chopping jobs remain unchanged. */
export function infectionLoad(count:number):World {
  const w=researchLoad(count);
  for(let i=1;i<count;i+=6){
    const p=w.pawns[i]!,d=w.pawns[i-1]!;
    const x=p.x,z=p.z+1;
    w.structures.push({id:w.nextId++,kind:'bed',x,z,orientation:0,footprint:'legacy-single',medical:true});
    const bed=w.structures.at(-1)!;
    p.x=x;p.z=z;p.state='resting';p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x,z},medical:'bedrest'};
    p.priorities.patient=1;p.priorities.bedrest=1;p.medicalCare='industrial';
    p.health={...createMedicalRecord(w.tick),infections:{nextId:2,cases:[{id:1,part:'left-arm',bornAt:w.tick,severity:350_000_000,luck:1_000_000}],immunity:200_000_000}};
    d.priorities.doctor=1;d.priorities.research=2;d.skills.medicine.level=8;
    addGroundMaterial(w,'medicine',5,{x:d.x-1,z:d.z},'medicine');
  }
  return w;
}
