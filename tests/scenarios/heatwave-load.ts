import { researchLoad } from './research-load.ts';
import { createMedicalRecord } from '../../src/sim/injury-state.ts';
import { newApparelState } from '../../src/sim/apparel-rules.ts';
import type { World } from '../../src/sim/types.ts';
/** Mixed hot 250² load: real crops/air, work and exposure. Seeded severity is
 * declared stress setup, never the source of the colony/UI proof. */
export function heatwaveLoad(count:number):World {
  const w=researchLoad(count);w.tick=4000;
  w.heatwaves={profile:'camp-heat-v1',rng:42,nextAt:200000,serial:1,active:{start:2000,end:14000}};
  for(const [i,p] of w.pawns.entries())if(i%2===0){
    p.health=createMedicalRecord(w.tick);p.health.heatstroke=340000000;
    const garment=w.piles.find(s=>s.owner.type==='apparel'&&s.owner.pawnId===p.id)!;garment.item='cloth-shirt';garment.apparel=newApparelState('cloth-shirt');
  }
  return w;
}
