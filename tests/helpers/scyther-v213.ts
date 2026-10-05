import { prepareScytherDemo,SCYTHER_OPPORTUNITY_TICK } from '../../scripts/create-scyther-v213-test-save.ts';
import { applyCommand,stepWorld } from '../../src/sim/engine.ts';
import { validateWorld } from '../../src/sim/serialization.ts';
import type { World } from '../../src/sim/types.ts';

function valid(world:World):void {const errors=validateWorld(world);if(errors.length)throw Error(`Scyther producer at tick ${world.tick}: ${errors.join(' | ')}`);}
/** Actual agenda/entry prefix. Fire remains held and nobody is injured or dead. */
export function producedScytherArrival():World {
  const w=prepareScytherDemo();
  while(w.tick<SCYTHER_OPPORTUNITY_TICK){stepWorld(w);valid(w);}
  if(!w.raids?.mechActive||!w.mechanoids?.length||w.mechanoids.some(m=>m.health)||w.projectiles?.length)
    throw Error('The prepared future opportunity did not produce intact staged Scythers.');
  return w;
}
/** Native salvage starts at a checkpoint obtained through real gun/impact/
 * recovery producers. The prepared public scene never contains this result. */
export function producedScytherNeutralization():World {
  const w=producedScytherArrival();
  for(const s of w.structures.filter(s=>s.turret))if(!applyCommand(w,{type:'turret-hold-fire',structureId:s.id,enabled:false}).ok)throw Error('Prepared gun refused fire release.');
  for(let ticks=0;ticks<2000;ticks++){
    stepWorld(w);valid(w);
    if(w.raids?.last?.mechanoid&&!w.mechanoids?.length&&w.piles.some(p=>p.mechCorpse))return w;
  }
  throw Error('Real defense did not produce a neutralized mechanical group and physical carcass within the bounded prefix.');
}
