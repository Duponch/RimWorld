import { medicalCamp } from './health.ts';
import type { Mechanoid } from '../../src/sim/mechanoid-state.ts';
import { createMechaMedicalRecord,commitMechanoidImpact } from '../../src/sim/mechanoid-health.ts';
import { addResolvedInjury } from '../../src/sim/injury-state.ts';
import { advanceMechanoidCorpses } from '../../src/sim/mechanoid-corpse.ts';
import type { World } from '../../src/sim/types.ts';

/** Isolated intact mechanical owner: no injury, blow, corpse or raid outcome. */
export function scytherCamp():{world:World;actor:Mechanoid} {
  const world=medicalCamp(2),actor:Mechanoid={id:world.nextId++,mechKind:'scyther',x:18,z:16,state:'idle',heading:0,path:[],moveCooldown:0,planCooldown:0};
  world.mechanoids=[actor];return {world,actor};
}
/** An actual mechanical impact and transfer, used only where the boundary
 * itself is the oracle. Native combat obtains its corpse from real combat. */
export function producedScytherCorpse(world:World,actor:Mechanoid):void {
  const record=createMechaMedicalRecord(world.tick),noDraw=()=>{throw Error('A solid mechanical injury must not draw a biological result.');};
  addResolvedInjury(record,'scyther-right-blade','cut',27000,noDraw);
  addResolvedInjury(record,'scyther-reactor','crack',27000,noDraw);
  if(!commitMechanoidImpact(world,actor,record,{rng:world.rng},world.tick*10))throw Error('Mechanical impact was not committed.');
  advanceMechanoidCorpses(world);
}
