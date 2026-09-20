import { finishMentalBreak } from './mental-state.ts';
import { playerInfectionFactor } from './game-profile.ts';
import { resetTactics } from './tactics-state.ts';
import { carrierOf } from './rescue-state.ts';
import { dropIncapacitatedEquipment } from './equipment-state.ts';
import type { BodyAssessment } from './body-capacities.ts';
import { advanceMedical } from './injury-evolution.ts';
import { addResolvedInjury,createMedicalRecord,medicalStatus } from './injury-state.ts';
import { pawnBody,medicallyStopped } from './health-rules.ts';
import { interruptWork,retryInterruptedCargo } from './interrupted-cargo.ts';
import type { BodyPartId } from './body-definition.ts';
import type { InjuryKind } from './injury-rules.ts';
import type { Pawn,World } from './types.ts';
import { malnutritionRate } from './malnutrition.ts';

export function healthRandom(world:Pick<World,'rng'>):number {let n=world.rng;n^=n<<13;n^=n>>>17;n^=n<<5;world.rng=n>>>0;return world.rng/0x100000000;}
function announce(world:World,message:string):void {world.events.push({tick:world.tick,type:'need',message});if(world.events.length>80)world.events.splice(0,world.events.length-80);}

/** Actions stop at this tick. A captured edge finishes as the fall's translation:
 * no new edge, work or ingestion is performed during it (documented 3D choice). */
export function reconcilePawnHealth(world:World,pawn:Pawn,body=pawnBody(pawn)):void {
  if(!pawn.health)return;
  const status=medicalStatus(pawn.health,body);
  if(status!=='mobile') {
    finishMentalBreak(world,pawn,status!=='dead');
    delete pawn.draft;delete pawn.shooting;delete pawn.flee;delete pawn.melee;resetTactics(pawn);if(pawn.raid)pawn.raid.goal=null;delete pawn.stun;
    if(pawn.state!==status) {
      const wasSleeping=pawn.state==='sleeping';
      const bed=pawn.need?.kind==='sleep'&&pawn.need.phase==='sleep'&&pawn.need.bedId!==null?pawn.need:null;
      interruptWork(world,pawn);
      if(status==='downed'&&bed)pawn.need=bed;
      if(status==='downed'&&wasSleeping)pawn.medicalSleep=true;else delete pawn.medicalSleep;
      pawn.collapsePending=false;pawn.restZeroTicks=0;pawn.state=status;
      announce(world,status==='dead'?`${pawn.name} est décédé.`:`${pawn.name} est à terre.`);
    }
    dropIncapacitatedEquipment(world,pawn);return;
  }
  if(pawn.state==='downed') {
    // Releases the medical use of a bed. Ordinary needs may seek it again.
    pawn.need=null;delete pawn.medicalSleep;pawn.state='idle';pawn.planCooldown=0;pawn.needCooldown=0;
    announce(world,`${pawn.name} peut de nouveau se relever.`);
  }
  if(body.capacities.manipulation===0&&(pawn.hunting||pawn.research||pawn.equipmentTask||pawn.jobId!==null||pawn.ward||pawn.feed||pawn.tend||pawn.rescue||pawn.haul||pawn.cooking||pawn.orders.active!==null||pawn.orders.queue.length||pawn.priorityWork))interruptWork(world,pawn);
  if(body.capacities.manipulation===0)delete pawn.shooting;
  dropIncapacitatedEquipment(world,pawn);
}
export function updatePawnHealth(world:World,pawn:Pawn):BodyAssessment|undefined {
  if(world.schemaVersion>=84&&pawn.hunger<=0&&pawn.state!=='dead')pawn.health??=createMedicalRecord(Math.max(0,world.tick-1));
  const record=pawn.health;if(!record)return;
  if(record.death){if(!carrierOf(world,pawn.id)&&pawn.moveCooldown===0)retryInterruptedCargo(world,pawn);return;}
  if(!record.death) {
    const resting=!carrierOf(world,pawn.id)&&pawn.moveCooldown===0&&(pawn.state==='sleeping'||pawn.state==='resting'||pawn.state==='downed');
    const need=pawn.need;
    const bed=resting&&need?.kind==='sleep'&&need.phase==='sleep'&&need.bedId!==null&&world.structures.some(s=>s.id===need.bedId&&s.kind==='bed');
    const nextInfection=record.infections?.nextId??1;
    const sky=pawn.moveCooldown===0&&pawn.state==='recreating'&&pawn.recreation.task?.activity==='skygaze'&&pawn.recreation.task.phase==='active';
    advanceMedical(record,world.tick-record.tick,{phase:pawn.id%60,posture:bed?'bed':resting?'ground':'standing',starving:pawn.hunger<=0,malnutritionRate:world.schemaVersion>=84?malnutritionRate(pawn.id):undefined,infectionChanceFactor:playerInfectionFactor(world,pawn),
      hunger:pawn.hunger,rest:pawn.rest,restingBonus:!!bed||resting&&pawn.state!=='downed'||sky,infectionSeed:(world.seed^Math.imul(pawn.id,0x9e3779b1))>>>0},()=>healthRandom(world));
    for(const infection of record.infections?.cases??[])if(infection.id>=nextInfection)announce(world,`${pawn.name} souffre d’une infection : consultez Santé et organisez des soins réguliers.`);
  }
  const body=pawnBody(pawn);reconcilePawnHealth(world,pawn,body);
  if(medicallyStopped(pawn)&&!carrierOf(world,pawn.id)&&pawn.moveCooldown===0)retryInterruptedCargo(world,pawn);
  return body;
}
/** Called by a damage producer after it has resolved hit selection/protection. */
export function injurePawn(world:World,pawn:Pawn,part:BodyPartId,kind:InjuryKind,severity:number):void {
  if(pawn.state==='dead')return;
  if(!pawn.health||pawn.health.tick<world.tick)updatePawnHealth(world,pawn);
  if(pawn.health?.death)return;
  pawn.health??=createMedicalRecord(world.tick);
  addResolvedInjury(pawn.health,part,kind,severity,()=>healthRandom(world));
  reconcilePawnHealth(world,pawn);
}
