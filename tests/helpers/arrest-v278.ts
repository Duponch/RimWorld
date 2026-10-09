import { prisonerUiFixture } from '../scenarios/prison-camp.ts';
import { startSadWander } from '../../src/sim/mental-break.ts';
import { addMaterial,refreshStock } from '../../src/sim/materials.ts';

/** Prepared free adult in a real crisis, with a prison room and physical
 * equipment. No arrest, chance result or prisoner status is precommitted. */
export function arrestCamp(){
  const fixture=prisonerUiFixture(),{world,actorId,patientId,bedId}=fixture;
  const actor=world.pawns.find(p=>p.id===actorId)!,patient=world.pawns.find(p=>p.id===patientId)!;
  const bed=world.structures.find(b=>b.id===bedId)!;bed.prisoner=true;
  Object.assign(patient,{name:'Colon en crise',faction:'colony' as const,state:'idle' as const,hunger:100,rest:100,hostilityResponse:'ignore' as const});
  delete patient.health;delete patient.background;delete actor.background;
  actor.priorities.warden=1;actor.skills.social={level:12,xp:0,dailyXp:0,passion:1};
  startSadWander(world,patient);
  addMaterial(world,'weapon',1,{type:'equipment',pawnId:patient.id},'revolver');
  const weaponId=world.piles.find(p=>p.owner.type==='equipment'&&p.owner.pawnId===patient.id)!.id;
  refreshStock(world);world.events=[];
  return {...fixture,weaponId};
}
