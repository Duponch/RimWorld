import { selfTendingCamp } from './self-tending.ts';
import { controlledInjury } from './health.ts';
import { fixtureBuilding } from './deconstruction.ts';
import type { World } from '../../src/sim/types.ts';

/** One bleeding cut (1.44 blood volume/day), one non-bleeding injury.
 * Only the first treatment is urgent; the second needs a fresh decision. */
export function urgentSelfCamp(count=1,size=32):World {
  const w=selfTendingCamp(count,size);
  for(const p of w.pawns){
    delete p.health;controlledInjury(w,p,'neck',6000,'cut');controlledInjury(w,p,'right-arm',4000,'bruise');
    p.selfTend=true;p.schedule.fill('anything');
  }
  return w;
}
export function urgentBedCamp():World {
  const w=urgentSelfCamp(),p=w.pawns[0]!,bed=fixtureBuilding(w,'bed',p.x,p.z);
  p.bedId=bed.id;p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:p.x,z:p.z},medical:'bedrest'};
  // Treatment eligibility is not the same thing as an existing healing injury.
  p.priorities.bedrest=3;p.state='resting';p.rest=95;
  return w;
}
