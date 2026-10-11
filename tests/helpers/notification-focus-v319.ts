import {createWorld,stepWorld,validateWorld} from '../../src/sim/index';
import {enableRaids,advanceRaids} from '../../src/sim/raids';
import {injurePawn} from '../../src/sim/health';
import {createMedicalRecord} from '../../src/sim/injury-state';
import {HP_UNIT} from '../../src/sim/injury-rules';

/** Private UI scene: declared exposure is prepared. The completed raid and its
 * downed original actor come from ordinary entry, real injuries and adjudication. */
export function notificationFocusCamp(){
  const w=createWorld(319,32,32);w.stockpiles=[];enableRaids(w);w.raids!.nextCheck=1;stepWorld(w);
  const raider=w.pawns.find(p=>p.raid)!;if(!raider)throw Error('V319 ordinary raid did not arrive.');
  injurePawn(w,raider,'left-leg','crush',40*HP_UNIT);injurePawn(w,raider,'right-leg','crush',40*HP_UNIT);advanceRaids(w);
  if(raider.state!=='downed'||w.raids?.active||w.raids?.last?.downed!==1)throw Error('V319 real wounds did not produce the requested downed completed raid.');
  const people=w.pawns.filter(p=>!p.raid).slice(0,2);
  for(const p of people){p.health??=createMedicalRecord(w.tick);p.health.hypothermia=40000000;}
  const errors=validateWorld(w);if(errors.length)throw Error(`V319 invalid prepared notification fixture: ${errors.join('; ')}`);
  return {world:w,people:people.map(p=>p.id).sort((a,b)=>a-b),raiderId:raider.id};
}
