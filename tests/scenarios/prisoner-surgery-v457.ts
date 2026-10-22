import {medicalCamp} from './health.ts';
import {fixtureBuilding} from './deconstruction.ts';
import {createMedicalRecord} from '../../src/sim/injury-state.ts';
import {createPrisonerState} from '../../src/sim/prisoner-state.ts';
import {newDoorState} from '../../src/sim/door-rules.ts';
import {addMaterial,refreshStock} from '../../src/sim/materials.ts';
import {HUMAN_YEAR_TICKS} from '../../src/sim/human-age.ts';
import type {Structure} from '../../src/sim/types.ts';

/** Declared clinical starting property, not a captured/generated battle victim
 * or a played amputation. All subsequent requests, movement, care, consumption,
 * risks and clinical clocks use the real services. No random stream is reset. */
export function prisonerSurgeryCamp457(mode:'missing-leg'|'infected-leg'='missing-leg') {
  const world=medicalCamp(3,32),[doctor,patient,helper]=world.pawns;
  for(const pawn of world.pawns){
    pawn.schedule.fill('anything');pawn.medicalCare='industrial';pawn.hostilityResponse='ignore';
    pawn.age={biologicalTicks:25*HUMAN_YEAR_TICKS,chronologicalTicks:25*HUMAN_YEAR_TICKS};
  }
  Object.assign(doctor!,{name:'Médecin de la prison',x:5,z:10});
  doctor!.skills.medicine={level:20,xp:0,dailyXp:0,passion:0};
  Object.assign(helper!,{name:'Soignant auxiliaire',x:5,z:13});
  helper!.skills.medicine={level:12,xp:0,dailyXp:0,passion:0};
  Object.assign(patient!,{name:'Patient captif',x:12,z:12,faction:'outlaws',state:'idle'});
  delete patient!.hostilityResponse;
  patient!.health=createMedicalRecord(world.tick);
  if(mode==='missing-leg')patient!.health.missing=[{part:'left-leg',bornAt:0,nonFresh:true}];
  else patient!.health.infections={nextId:2,immunity:0,cases:[{id:1,part:'left-leg',bornAt:world.tick,severity:100_000_000,luck:1_000_000,
    tend:{quality:1000,expiresAtCore:world.tick*10+37500}}]};
  patient!.prisoner=createPrisonerState(world,patient!);
  for(let z=8;z<=14;z++)for(let x=8;x<=14;x++)if(x===8||x===14||z===8||z===14){
    const kind=x===8&&z===11?'door':'wall';const wall:Structure=fixtureBuilding(world,kind,x,z);wall.material='wood';
    if(kind==='door')wall.door=newDoorState(world.tick);
  }
  const bed=fixtureBuilding(world,'bed',10,10);Object.assign(bed,{medical:true,prisoner:true});
  const roofs:number[]=[];for(let z=8;z<=14;z++)for(let x=8;x<=14;x++)roofs.push(z*world.width+x);
  world.roofing={constructed:roofs,build:[],remove:[],cursor:0};
  for(const [pawn,x] of [[doctor!,3],[helper!,6]] as const)pawn.bedId=fixtureBuilding(world,'bed',x,16).id;
  const medicineId=world.nextId;addMaterial(world,'medicine',6,{type:'ground',x:6,z:10},'medicine');
  const pieceId=world.nextId;addMaterial(world,'prosthesis',1,{type:'ground',x:6,z:12},'prosthetic-leg');
  for(const x of [6,7])addMaterial(world,'food',10,{type:'ground',x,z:13},'survival-meal');refreshStock(world);
  return {world,doctorId:doctor!.id,patientId:patient!.id,helperId:helper!.id,bedId:bed.id,pieceId,medicineId,
    preparation:{kind:'declared-clinical-start' as const,mode,captivity:'Already detained adult prepared before the first played tick; capture is not claimed.',
      anatomy:mode==='missing-leg'?'Healed exact left-leg absence, prepared; no injury, tend target, anesthesia or incapacity.':'Direct left-leg infection already tended, prepared; subsequent amputation and recovery are real actions.',
      property:'Closed roofed 7x7 prison, one real medical prison bed, two ordinary staff beds, one finite industrial leg, six industrial medicine doses and twenty survival meals.',
      skills:'Medicine20 and12 prepared; all work priorities initially disabled, including Patient/Bed rest; actual Doctor/Warden permissions require commands.',
      random:'Inherited world and prisoner streams; no favorable outcome, stream reset or needs replenishment during play.',fromTick:world.tick}};
}
