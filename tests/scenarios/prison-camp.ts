import { medicalCamp,controlledInjury } from './health.ts';
import { fixtureBuilding } from './deconstruction.ts';
import { newDoorState } from '../../src/sim/door-rules.ts';
import { BLOOD_UNIT } from '../../src/sim/injury-rules.ts';
import { reconcilePawnHealth } from '../../src/sim/health.ts';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials.ts';
import { createPrisonerState } from '../../src/sim/prisoner-state.ts';
import type { Structure,World } from '../../src/sim/types.ts';

export interface PrisonUiFixture {world:World;actorId:number;patientId:number;bedId:number}

/** Controlled clinical checkpoint, not an assault played from a new colony.
 * Blood loss provides a temporary collapse without amputating either leg.
 * The room, supplies and characters are preparation; capture and care are actions. */
export function prisonerUiFixture():PrisonUiFixture {
  const world=medicalCamp(3,32);
  world.events=[];delete world.raids;delete world.arrivals;delete world.heatwaves;delete world.wildlife;
  world.roofing={constructed:[],build:[],remove:[],cursor:0};
  for(const [i,pawn] of world.pawns.entries()){
    pawn.id=i+1;pawn.priorities.warden=0;pawn.hostilityResponse='ignore';pawn.medicalCare='industrial';
    pawn.hunger=100;pawn.rest=100;pawn.mood=80;pawn.memories=[];
  }
  const [actor,doctor,patient]=world.pawns;
  Object.assign(actor!,{name:'Geôlier témoin',x:18,z:10});
  actor!.skills.social={level:12,xp:0,dailyXp:0,passion:1};
  Object.assign(doctor!,{name:'Médecin témoin',x:18,z:13});
  doctor!.skills.medicine.level=10;
  Object.assign(patient!,{name:'Assaillant témoin',x:20,z:10,faction:'outlaws',hunger:22});
  delete patient!.hostilityResponse;
  controlledInjury(world,patient!,'torso',3000,'bruise');
  patient!.health!.bloodLoss=Math.round(.65*BLOOD_UNIT);reconcilePawnHealth(world,patient!);
  for(let z=8;z<=12;z++)for(let x=8;x<=12;x++)if(x===8||x===12||z===8||z===12){
    const kind=x===8&&z===10?'door':'wall',structure:Structure=fixtureBuilding(world,kind,x,z);
    structure.material='wood';if(kind==='door')structure.door=newDoorState(world.tick);
  }
  const bed=fixtureBuilding(world,'bed',10,10);
  addGroundMaterial(world,'food',12,{x:16,z:14},'survival-meal');
  addGroundMaterial(world,'medicine',6,{x:17,z:14},'medicine');
  refreshStock(world);
  return {world,actorId:actor!.id,patientId:patient!.id,bedId:bed.id};
}

/** Recruitment boundary only: already captured, healthy and nearly persuaded.
 * Resistance progress is explicitly prepared, never attributed to a long pilot. */
export function recruitmentUiFixture():PrisonUiFixture {
  const fixture=prisonerUiFixture(),{world,actorId,patientId,bedId}=fixture;
  const actor=world.pawns.find(p=>p.id===actorId)!,patient=world.pawns.find(p=>p.id===patientId)!,bed=world.structures.find(s=>s.id===bedId)!;
  bed.prisoner=true;patient.bedId=bed.id;patient.x=bed.x;patient.z=bed.z;patient.state='idle';
  patient.hunger=100;delete patient.health;patient.prisoner=createPrisonerState(world,patient);patient.prisoner.resistance=.01;
  actor.x=9;actor.z=10;actor.priorities.warden=0;
  world.events=[];
  return fixture;
}
