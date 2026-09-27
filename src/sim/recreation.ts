import { assignmentAt } from './schedule.ts';
import { gainRecreation, RECREATION_DURATION, VISIT_SICK_DURATION, recreationKind, recreationRandom, type RecreationActivity, type RecreationTask } from './recreation-rules.ts';
import { adjacentToTable, availableChessTables, availablePins, chessCells, horseshoeCells, isGatherSpot, nearVisitPatient, recreationSiteValid, recreationSpace, visitablePatient, visitPatient } from './recreation-space.ts';
import { reservedServiceCells } from './service-reservations.ts';
import { isDiningSeat } from './dining.ts';
import { footprintCells } from './definitions.ts';
import { rememberRoomUse } from './room-experience.ts';
import { canSocialize, visitSocialExchange } from './social.ts';
import { urgentMedicalTask, urgentWorkEnabled } from './urgent-care.ts';
import { urgentTreatment } from './care-rules.ts';
import { lyingPatient } from './tending.ts';
import { learnSkill } from './skills.ts';
import { pawnBody } from './health-rules.ts';
import { cellIndex, routeToCell } from './pathfinding.ts';
import type { NeedContext } from './needs.ts';
import type { Pawn, World } from './types.ts';

const labels: Record<RecreationActivity,string> = {horseshoes: 'jouer aux fers à cheval', skygaze: 'observer le ciel', chess:'jouer aux échecs','social-relax':'se détendre ensemble','visit-sick':'rendre visite à un malade'};
const urgentDoctorCall=(world:World,pawn:Pawn):boolean=>urgentWorkEnabled(pawn,'doctor')&&world.pawns.some(p=>p!==pawn&&lyingPatient(p)&&urgentTreatment(p));
/** Search shares the existing bounded navigation budget. No gain in transit,
 * no worker/cargo preemption just because the timetable recommends recreation. */
export function processRecreation(world: World, pawn: Pawn, context: NeedContext, afterWork = false): boolean {
  const joy=pawn.recreation, assignment=assignmentAt(world,pawn);
  if (joy.task) {
    if (assignment==='work' || urgentMedicalTask(pawn) || urgentDoctorCall(world,pawn)
      || joy.task.activity==='visit-sick'&&world.pawns.some(p=>p.id===joy.task!.patientId&&urgentTreatment(p))
      || joy.task.activity==='chess'&&pawnBody(pawn).capacities.manipulation<=0
      || (joy.task.activity==='social-relax'||joy.task.activity==='visit-sick')&&!canSocialize(world,pawn,true)
      || !recreationSiteValid(world,joy.task)) { context.release(); return false; }
    const task=joy.task;
    if (task.phase==='travel') {
      if(pawn.x!==task.target.x||pawn.z!==task.target.z) {context.move(task.target,true);return true;}
      task.phase='active';pawn.path=[];pawn.state='recreating';
      context.event(`${pawn.name} commence à ${labels[task.activity]}.`);
    }
    pawn.state='recreating';gainRecreation(joy,recreationKind(task.activity));
    if(task.activity==='visit-sick') {
      const patient=visitPatient(world,task.patientId!,false);
      if(!patient){context.release();return false;}
      gainRecreation(patient.recreation,'social');
      // The exchange uses the existing directed-memory and social RNG rules.
      if(task.elapsed>0&&task.elapsed%32===0)visitSocialExchange(world,pawn,patient);
    }
    if(task.activity==='social-relax'&&task.elapsed===0||task.activity==='visit-sick'&&task.elapsed===0)rememberRoomUse(world,pawn,'recreation');
    if(task.activity==='chess') {
      pawn.skills.intellectual??={level:0,xp:0,dailyXp:0,passion:0};
      learnSkill(pawn.skills.intellectual,20,pawn); // Core 0.002 XP per tick, ten Core ticks per local tick.
    }
    task.elapsed++;
    if(joy.level>99.99||task.elapsed>=(task.activity==='visit-sick'?VISIT_SICK_DURATION:RECREATION_DURATION)) {
      context.event(`${pawn.name} termine son loisir : ${labels[task.activity]}.`);
      context.release();
    }
    return true;
  }
  if (world.tick<500 || pawn.hunting || pawn.research || pawn.need || pawn.jobId!==null || pawn.haul || pawn.cooking || pawn.burial || pawn.cleaning || pawn.needCooldown>0 || pawn.hunger<=20
    || assignment==='work' || assignment==='sleep'&&!afterWork || joy.level >= (assignment==='anything'?35:95) || urgentMedicalTask(pawn) || urgentDoctorCall(world,pawn)) return false;
  const choices: {activity: RecreationActivity; weight: number}[] = [];
  let pins:ReturnType<typeof availablePins>|undefined,chessTables:ReturnType<typeof availableChessTables>|undefined;
  const socialCapable=canSocialize(world,pawn,true);
  const gathers=socialCapable?world.structures.filter(s=>isGatherSpot(s)&&s.gatherSpot!==false&& (s.kind!=='campfire'||!!s.fuel?.ticks&&s.power?.switchOn!==false)):[];
  const claimedPatients=new Set(world.pawns.flatMap(p=>p.recreation.task?.activity==='visit-sick'&&p.id!==pawn.id?[p.recreation.task.patientId!]:[]));
  const patients=socialCapable?world.pawns.filter(p=>p.id!==pawn.id&&!claimedPatients.has(p.id)&&visitablePatient(world,p)):[];
  for(const activity of ['skygaze','horseshoes','chess','social-relax','visit-sick'] as const) {
    const kind=recreationKind(activity);
    if(!joy.bored[kind]&&(activity!=='horseshoes'||(pins??=availablePins(world,pawn.id)).length)&&(activity!=='chess'||(chessTables??=availableChessTables(world,pawn.id)).length&&pawnBody(pawn).capacities.manipulation>0)
      &&(activity!=='social-relax'||gathers.length)&&(activity!=='visit-sick'||patients.length))
      choices.push({activity,weight:(activity==='horseshoes'?2.5:activity==='chess'?2:activity==='social-relax'?4:activity==='visit-sick'?3:1)*Math.max(.001,(1-joy.tolerance[kind]/100)**5)});
  }
  if(!choices.length){pawn.needCooldown=20;return false;}
  const reserved=reservedServiceCells(world,pawn.id);
  while(choices.length) {
    let draw=recreationRandom(world)*choices.reduce((sum,c)=>sum+c.weight,0), index=0;
    for(;index<choices.length-1;index++){draw-=choices[index]!.weight;if(draw<0)break;}
    const {activity}=choices.splice(index,1)[0]!;
    const candidates: RecreationTask[]=[];
    if(activity==='horseshoes') {
      for(const pin of pins??=availablePins(world,pawn.id))for(const target of horseshoeCells(pin))
        if(!reserved.has(cellIndex(world,target.x,target.z)))candidates.push({activity,buildingId:pin.id,target,phase:'travel',elapsed:0});
    } else if(activity==='chess') {
      const seats=new Map(world.structures.filter(s=>s.kind==='stool'||s.kind==='dining-chair'||s.kind==='armchair').map(s=>[cellIndex(world,s.x,s.z),s]));
      for(const table of chessTables??=availableChessTables(world,pawn.id))for(const target of chessCells(table)) {
        const seat=seats.get(cellIndex(world,target.x,target.z));
        if(seat&&!reserved.has(cellIndex(world,target.x,target.z)))candidates.push({activity,buildingId:table.id,seatId:seat.id,target,phase:'travel',elapsed:0});
      }
    } else if(activity==='social-relax'||activity==='visit-sick') {
      const seats=new Map(world.structures.filter(s=>isDiningSeat(s.kind)).map(s=>[cellIndex(world,s.x,s.z),s]));
      if(activity==='social-relax')for(const spot of gathers) {
        if(spot.kind!=='campfire') {
          const around=new Set<number>();
          for(const part of footprintCells(spot))for(const [dx,dz] of [[0,-1],[1,0],[0,1],[-1,0]])around.add(cellIndex(world,part.x+dx!,part.z+dz!));
          for(const key of around){const seat=seats.get(key);if(seat&&!reserved.has(key)&&adjacentToTable(spot,seat))candidates.push({activity,buildingId:spot.id,seatId:seat.id,target:{x:seat.x,z:seat.z},phase:'travel',elapsed:0});}
        } else for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++)if(dx*dx+dz*dz>0&&dx*dx+dz*dz<=15){
          const target={x:spot.x+dx,z:spot.z+dz},key=cellIndex(world,target.x,target.z),seat=seats.get(key);
          if(!reserved.has(key))candidates.push({activity,buildingId:spot.id,...(seat?{seatId:seat.id}:{}),target,phase:'travel',elapsed:0});
        }
      }
      else for(const patient of patients)for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
        const target={x:patient.x+dx,z:patient.z+dz},key=cellIndex(world,target.x,target.z),seat=seats.get(key);
        if(nearVisitPatient(patient,target)&&!reserved.has(key))candidates.push({activity,buildingId:null,patientId:patient.id,...(seat?{seatId:seat.id}:{}),target,phase:'travel',elapsed:0});
      }
    } else {
      // Local open-air sites replace the reference's region-based random search.
      // Eight rays, three distances: bounded candidates, varied physical trips.
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]])for(const distance of [2,4,6])
        candidates.push({activity,buildingId:null,target:{x:pawn.x+dx!*distance,z:pawn.z+dz!*distance},phase:'travel',elapsed:0});
    }
    const space=recreationSpace(world,activity==='skygaze'?candidates.map(c=>c.target):undefined,activity==='visit-sick');
    const valid=candidates.filter(c=>!reserved.has(cellIndex(world,c.target.x,c.target.z))&&recreationSiteValid(world,c,space));
    if(!valid.length)continue;
    // Search all usable destinations as one nearest-goal request; never assume
    // geometrically near means reachable. An inaccessible pin gives no benefit.
    const reach=context.search(new Set(valid.map(c=>cellIndex(world,c.target.x,c.target.z))));
    if(!reach)return true;
    const reachable=valid.flatMap(task=>{const path=routeToCell(world,task.target,reach);return path?[{task,path}]:[];});
    if(!reachable.length)continue;
    const preferred=(activity==='social-relax'||activity==='visit-sick')&&reachable.some(r=>r.task.seatId!==undefined)?reachable.filter(r=>r.task.seatId!==undefined):reachable;
    const selected=preferred[Math.floor(recreationRandom(world)*preferred.length)]!;
    joy.task=selected.task;pawn.path=selected.path;pawn.state='moving';pawn.planCooldown=0;return true;
  }
  pawn.needCooldown=20;return false;
}
