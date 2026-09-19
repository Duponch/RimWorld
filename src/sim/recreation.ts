import { assignmentAt } from './schedule.ts';
import { gainRecreation, RECREATION_DURATION, recreationKind, recreationRandom, type RecreationActivity, type RecreationTask } from './recreation-rules.ts';
import { availablePins, horseshoeCells, recreationSiteValid, recreationSpace } from './recreation-space.ts';
import { reservedServiceCells } from './service-reservations.ts';
import { cellIndex, routeToCell } from './pathfinding.ts';
import type { NeedContext } from './needs.ts';
import type { Pawn, World } from './types.ts';

const labels: Record<RecreationActivity,string> = {horseshoes: 'jouer aux fers à cheval', skygaze: 'observer le ciel'};
/** Search shares the existing bounded navigation budget. No gain in transit,
 * no worker/cargo preemption just because the timetable recommends recreation. */
export function processRecreation(world: World, pawn: Pawn, context: NeedContext, afterWork = false): boolean {
  const joy=pawn.recreation, assignment=assignmentAt(world,pawn);
  if (joy.task) {
    if (assignment==='work' || !recreationSiteValid(world,joy.task)) { context.release(); return false; }
    const task=joy.task;
    if (task.phase==='travel') {
      if(pawn.x!==task.target.x||pawn.z!==task.target.z) {context.move(task.target,true);return true;}
      task.phase='active';pawn.path=[];pawn.state='recreating';
      context.event(`${pawn.name} commence à ${labels[task.activity]}.`);
    }
    pawn.state='recreating';gainRecreation(joy,recreationKind(task.activity));task.elapsed++;
    if(joy.level>99.99||task.elapsed>=RECREATION_DURATION) {
      context.event(`${pawn.name} termine son loisir : ${labels[task.activity]}.`);
      context.release();
    }
    return true;
  }
  if (world.tick<500 || pawn.hunting || pawn.research || pawn.need || pawn.jobId!==null || pawn.haul || pawn.cooking || pawn.needCooldown>0 || pawn.hunger<=20
    || assignment==='work' || assignment==='sleep'&&!afterWork || joy.level >= (assignment==='anything'?35:95)) return false;
  const choices: {activity: RecreationActivity; weight: number}[] = [];
  for(const activity of ['skygaze','horseshoes'] as const) {
    const kind=recreationKind(activity);
    if(!joy.bored[kind]&&(activity!=='horseshoes'||availablePins(world,pawn.id).length))
      choices.push({activity,weight:(activity==='horseshoes'?2.5:1)*Math.max(.001,(1-joy.tolerance[kind]/100)**5)});
  }
  if(!choices.length){pawn.needCooldown=20;return false;}
  const reserved=reservedServiceCells(world,pawn.id);
  while(choices.length) {
    let draw=recreationRandom(world)*choices.reduce((sum,c)=>sum+c.weight,0), index=0;
    for(;index<choices.length-1;index++){draw-=choices[index]!.weight;if(draw<0)break;}
    const {activity}=choices.splice(index,1)[0]!;
    const candidates: RecreationTask[]=[];
    if(activity==='horseshoes') {
      for(const pin of availablePins(world,pawn.id))for(const target of horseshoeCells(pin))
        if(!reserved.has(cellIndex(world,target.x,target.z)))candidates.push({activity,buildingId:pin.id,target,phase:'travel',elapsed:0});
    } else {
      // Local open-air sites replace the reference's region-based random search.
      // Eight rays, three distances: bounded candidates, varied physical trips.
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]])for(const distance of [2,4,6])
        candidates.push({activity,buildingId:null,target:{x:pawn.x+dx!*distance,z:pawn.z+dz!*distance},phase:'travel',elapsed:0});
    }
    const space=recreationSpace(world,activity==='skygaze'?candidates.map(c=>c.target):undefined);
    const valid=candidates.filter(c=>!reserved.has(cellIndex(world,c.target.x,c.target.z))&&recreationSiteValid(world,c,space));
    if(!valid.length)continue;
    // Search all usable destinations as one nearest-goal request; never assume
    // geometrically near means reachable. An inaccessible pin gives no benefit.
    const reach=context.search(new Set(valid.map(c=>cellIndex(world,c.target.x,c.target.z))));
    if(!reach)return true;
    const reachable=valid.flatMap(task=>{const path=routeToCell(world,task.target,reach);return path?[{task,path}]:[];});
    if(!reachable.length)continue;
    const selected=reachable[Math.floor(recreationRandom(world)*reachable.length)]!;
    joy.task=selected.task;pawn.path=selected.path;pawn.state='moving';pawn.planCooldown=0;return true;
  }
  pawn.needCooldown=20;return false;
}
