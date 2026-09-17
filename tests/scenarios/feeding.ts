import { medicalCamp,controlledInjury } from './health.ts';
import { fixtureBuilding } from './deconstruction.ts';
import { tendMissingPart } from '../../src/sim/injury-state.ts';
import { addMaterial,refreshStock } from '../../src/sim/materials.ts';
import type { World } from '../../src/sim/types.ts';

/** Adults already physically rescued, each with a real food source. */
export function feedingCamp(pairs=1,size=32):World {
  const w=medicalCamp(pairs*2,size);
  for(let i=0;i<pairs;i++){
    const d=w.pawns[2*i]!,p=w.pawns[2*i+1]!,x=3+i%10*4,z=3+Math.floor(i/10)*12;
    Object.assign(d,{x,z,hunger:100});Object.assign(p,{x,z:z+8,hunger:24});
    d.name=`Médecin ${i+1}`;p.name=`Patient ${i+1}`;d.priorities.doctor=1;
    controlledInjury(w,p,'left-leg',30000);controlledInjury(w,p,'right-leg',30000);
    for(const m of p.health!.missing)tendMissingPart(p.health!,m.part);
    const bed=fixtureBuilding(w,'bed',p.x,p.z);Object.assign(bed,{medical:true});
    p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:p.x,z:p.z}};
    addMaterial(w,'food',5,{type:'ground',x:x+2,z},'simple-meal');
  }
  refreshStock(w);return w;
}
