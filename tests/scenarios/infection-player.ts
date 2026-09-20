import { rescueEncounter } from './encounter.ts';
import { encounterDecisions } from './encounter-player.ts';
import { fixtureBuilding } from './deconstruction.ts';
import { defaultSchedule } from '../../src/sim/schedule.ts';
import { newDoorState } from '../../src/sim/door-rules.ts';
import { activeThreat, isColonist } from '../../src/sim/affiliation.ts';
import { queryOrderOptions } from '../../src/sim/player-orders.ts';
import type { World } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';

/** Prepared clinic and controlled combatants, all initially healthy. The shot,
 * injury, delayed infection, consumption and recovery must occur in gameplay.
 * Nothing modifies disease rolls or inserts a medical condition. */
export function infectionCamp(seed=11):World {
  const w=rescueEncounter();w.seed=seed;w.rng=seed;
  for(const [i,p] of w.pawns.slice(0,3).entries()) {
    p.name=['Ada','Noé','Mina'][i]!;p.schedule=defaultSchedule();p.priorities.bedrest=1;
    p.priorities.patient=1;p.priorities.doctor=0;
  }
  w.pawns[2]!.skills.medicine={level:8,xp:0,dailyXp:0,passion:1};
  for(const [i,x] of [5,8,11].entries()){
    const bed=fixtureBuilding(w,'bed',x,25);if(i===0)Object.assign(bed,{medical:true});
  }
  for(let z=23;z<=29;z++)for(let x=2;x<=13;x++)if(x===2||x===13||z===23||z===29) {
    const door=x===7&&z===23,s=fixtureBuilding(w,door?'door':'wall',x,z);
    Object.assign(s,{material:'wood',...(door?{door:newDoorState(w.tick)}:{})});
  }
  w.roofing={constructed:[],build:[],remove:[],cursor:0};
  for(let z=23;z<=29;z++)for(let x=2;x<=13;x++)w.roofing.constructed.push(z*w.width+x);
  return w;
}

export function infectionSummary(w:World) {
  return {tick:w.tick,medicine:w.piles.filter(p=>p.kind==='medicine').reduce((n,p)=>n+p.quantity,0),
    food:w.piles.filter(p=>p.kind==='food').reduce((n,p)=>n+p.quantity,0),
    pawns:w.pawns.map(p=>({id:p.id,name:p.name,state:p.state,hunger:p.hunger,rest:p.rest,
      position:{x:p.x,z:p.z},bed:p.need?.kind==='sleep'?p.need.bedId:null,
      injuries:p.health?.injuries.length??0,bloodLoss:p.health?.bloodLoss??0,
      infection:p.health?.infections??null,care:p.tend??null,doctor:p.priorities.doctor,
      medicalXp:p.skills.medicine.xp}))};
}

/** The same commands are playable in the browser. Defense remains active if
 * the retained enemy recovers; no pawn is deleted to protect the care journey. */
export function infectionDecisions(w:World):Decision[] {
  const doctor=w.pawns[2]!,reserve=w.pawns[1]!;
  // A defeated sentry remains a real injured person and can recover. Resume
  // defense after the first rescue without waiting for a second casualty.
  if(doctor.priorities.doctor===1&&w.pawns.some(p=>!isColonist(p)&&activeThreat(p))&&reserve.state!=='dead'&&reserve.state!=='downed') {
    if(!reserve.draft)return [{reason:'La sentinelle se relève : mobiliser de nouveau la réserve.',command:{type:'draft',pawnIds:[reserve.id],enabled:true}}];
    if(reserve.draft.holdFire)return [{reason:'Protéger la convalescence contre une reprise du combat.',command:{type:'fire-at-will',pawnIds:[reserve.id],enabled:true}}];
    return [];
  }
  const combat=encounterDecisions(w);if(combat.length)return combat;
  if(w.pawns.some(p=>!isColonist(p)&&activeThreat(p)))return [];
  if(doctor.priorities.doctor!==1)return [{reason:'La menace est neutralisée : confier les secours et les soins à la médecin.',command:{type:'priority',pawnId:doctor.id,work:'doctor',value:1}}];
  const patient=w.pawns[0]!;
  if(doctor.tend||doctor.rescue||doctor.feed||doctor.need||doctor.orders.active!==null||doctor.orders.queue.length||doctor.mental?.crisis||doctor.state==='dead'||doctor.state==='downed')return [];
  const option=queryOrderOptions(w,doctor.id,patient).find(o=>o.enabled&&o.tendPatientId===patient.id);
  return option?[{reason:'Prioriser le soin disponible au chevet du patient.',command:{type:'order-tend',pawnId:doctor.id,patientId:patient.id,queue:false}}]:[];
}
