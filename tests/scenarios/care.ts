import { medicalCamp,controlledInjury } from './health.ts';
import { fixtureBuilding } from './deconstruction.ts';
import type { World } from '../../src/sim/types.ts';

export function careCamp(pairs=1,size=32):World {
  const w=medicalCamp(pairs*2,size);
  for(let i=0;i<pairs;i++){
    const d=w.pawns[2*i]!,p=w.pawns[2*i+1]!,x=3+i%10*3,z=3+Math.floor(i/10)*4;
    Object.assign(d,{x,z});Object.assign(p,{x:x+1,z:z+2});
    d.name=`Médecin ${i+1}`;p.name=`Blessé ${i+1}`;d.priorities.doctor=1;p.priorities.patient=1;p.priorities.bedrest=3;
    d.skills.medicine={level:8,xp:0,dailyXp:0,passion:0};
    controlledInjury(w,p,'left-arm',5000,'cut');controlledInjury(w,p,'right-arm',5000,'bruise');
    const bed=fixtureBuilding(w,'bed',x,z+8);Object.assign(bed,{medical:true});
  }
  return w;
}
