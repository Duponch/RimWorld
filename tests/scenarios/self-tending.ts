import { medicalCamp,controlledInjury } from './health.ts';
import type { World } from '../../src/sim/types.ts';

export function selfTendingCamp(count=1,size=32):World {
  const w=medicalCamp(count,size);
  for(let i=0;i<w.pawns.length;i++){
    const p=w.pawns[i]!;Object.assign(p,{x:3+i%10*3,z:3+Math.floor(i/10)*3,hunger:90,rest:90});
    p.skills.medicine={level:8,xp:0,dailyXp:0,passion:0};p.priorities.doctor=1;
    controlledInjury(w,p,'left-arm',5000,'cut');controlledInjury(w,p,'right-arm',4000,'bruise');
  }
  return w;
}
