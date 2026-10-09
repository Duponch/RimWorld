import { surgeryCamp } from './surgery-v192.ts';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials.ts';
import type { MedicineItem } from '../../src/sim/medicine-rules.ts';
import type { WoodenPartKind,WoodenPartSite } from '../../src/sim/artificial-parts-types.ts';

/** Prepared healed stump and supplies, never a played amputation. The native
 * caller still performs bed admission, collection, anesthesia and surgery.
 * No Vitest/browser dependency, command, tick or validation is run here. */
export function woodenSurgeryCamp(implant:WoodenPartKind='peg-leg',part:WoodenPartSite='left-leg',item:MedicineItem='medicine',size=16){
  const camp=surgeryCamp(item,size),{world}=camp;
  const patient=world.pawns.find(p=>p.id===camp.patientId)!;
  delete patient.health!.infections;
  patient.health!.missing=[{part,bornAt:world.tick,tended:true}];
  addGroundMaterial(world,'wood',1,{x:13,z:5},'wood');
  const woodSourceId=world.piles.find(p=>p.item==='wood')!.id;
  refreshStock(world);
  return {...camp,implant,part,woodSourceId};
}
