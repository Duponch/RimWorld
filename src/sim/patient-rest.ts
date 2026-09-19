import { lyingBlocked } from './disturbance-state.ts';
import { treatmentTarget,healingInjury,urgentTreatment } from './care-rules.ts';
import { medicalWorkRefusal } from './health-rules.ts';
import { rescueBedAvailable } from './medical-beds.ts';
import { routeToCell,type Reachability } from './pathfinding.ts';
import { updatePawnHealth } from './health.ts';
import { releaseWork } from './work-release.ts';
import type { NeedContext } from './needs.ts';
import type { Cell,Pawn,World } from './types.ts';

export function patientWork(p:Pawn):'patient'|'bedrest'|undefined {
  if(treatmentTarget(p)&&p.priorities.patient>0)return 'patient';
  if((healingInjury(p)||treatmentTarget(p))&&p.priorities.bedrest>0)return 'bedrest';
}
export function patientProposal(world:World,pawn:Pawn,reach:Reachability):{work:'patient'|'bedrest';bedId:number;path:Cell[]}|undefined {
  if(lyingBlocked(world,pawn))return;
  let work=patientWork(pawn);if(!work)return;
  if(work==='patient'&&!urgentTreatment(pawn)&&!world.pawns.some(p=>p!==pawn&&p.priorities.doctor>0&&!medicalWorkRefusal(p)&&p.state!=='sleeping'&&p.state!=='resting'&&!p.medicalSleep&&!(p.need?.kind==='sleep'&&p.need.phase==='sleep')&&routeToCell(world,p,reach)!==null)){
    if(pawn.priorities.bedrest===0)return;work='bedrest';
  }
  const beds=world.structures.filter(b=>rescueBedAvailable(world,b,pawn,pawn.id)).sort((a,b)=>
    Number(!a.medical)-Number(!b.medical)||Number(a.id!==pawn.bedId)-Number(b.id!==pawn.bedId)||(a.x-pawn.x)**2+(a.z-pawn.z)**2-(b.x-pawn.x)**2-(b.z-pawn.z)**2||a.id-b.id);
  for(const bed of beds){const path=routeToCell(world,bed,reach);if(path)return {work,bedId:bed.id,path};}
}
export function startPatientRest(world:World,pawn:Pawn,proposal:{work:'patient'|'bedrest';bedId:number;path:Cell[]}):void {
  const bed=world.structures.find(b=>b.id===proposal.bedId)!;
  if(!bed.medical)pawn.bedId=bed.id;
  pawn.need={kind:'sleep',phase:'travel',bedId:bed.id,target:{x:bed.x,z:bed.z},medical:proposal.work};
  pawn.path=proposal.path;pawn.state='moving';pawn.planCooldown=0;
}
/** Lying awake is separate from sleeping. Hunger retains the normal physical
 * meal path; disabled patients will later require the feeding work provider. */
export function processPatientRest(world:World,pawn:Pawn,context:NeedContext):boolean {
  const task=pawn.need;if(task?.kind!=='sleep'||!task.medical)return false;
  const bed=world.structures.find(b=>b.id===task.bedId&&b.kind==='bed');
  const wanted=treatmentTarget(pawn)||(task.medical==='bedrest'&&healingInjury(pawn));
  if(!bed||!rescueBedAvailable(world,bed,pawn,pawn.id)||!wanted||pawn.priorities[task.medical]===0){context.release();return true;}
  if(pawn.x!==task.target.x||pawn.z!==task.target.z){context.move(task.target,true);return true;}
  if(task.phase==='travel'){
    if(pawn.health&&pawn.health.tick<world.tick)updatePawnHealth(world,pawn);
    task.phase='sleep';context.event(`${pawn.name} s'allonge pour ${task.medical==='patient'?'recevoir des soins':'récupérer de ses blessures'}.`);
  }
  pawn.path=[];pawn.state='resting';return true;
}
export function reconcilePatientRest(world:World):void {
  for(const p of world.pawns)if(p.need?.kind==='sleep'&&p.need.medical){
    // Incapacity keeps the physical bed service independently of voluntary
    // Patient/Bed rest work, just as if the patient had been rescued into it.
    if(p.state==='downed'){delete p.need.medical;continue;}
    const work=p.need.medical;
    if(p.priorities[work]===0||!world.structures.some(b=>b.id===(p.need?.kind==='sleep'?p.need.bedId:null))||(!treatmentTarget(p)&&!(work==='bedrest'&&healingInjury(p))))releaseWork(world,p);
  }
}
