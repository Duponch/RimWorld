import { isColonist } from './affiliation.ts';
import { PEN_ANIMALS, penAccessCells, penRegion } from './animal-pens.ts';
import { readyDoorEntry } from './doors.ts';
import { doorAt } from './door-rules.ts';
import { pawnBody } from './health-rules.ts';
import type { AnimalHandlingTask } from './domestic-state.ts';
import { interruptWork } from './interrupted-cargo.ts';
import { adjacent, blockedCells, routeToJob, type Reachability } from './pathfinding.ts';
import { releaseWork } from './work-release.ts';
import type { NeedContext } from './needs.ts';
import type { Cell, Pawn, World } from './types.ts';
import { animalNavigation, moveAnimal } from './wildlife-navigation.ts';
import { animalBody } from './wildlife-health.ts';
import type { WildAnimal } from './wildlife-state.ts';

export type LeadingTask=AnimalHandlingTask & {kind:'lead';markerId:number};
const key=(world:World,cell:Cell)=>cell.z*world.width+cell.x;
export const livestock=(a:WildAnimal):boolean=>PEN_ANIMALS.includes(a.species);
const usable=(world:World,a:WildAnimal,markerId:number)=>{
  const marker=world.structures.find(s=>s.id===markerId&&s.kind==='pen-marker');
  const region=penRegion(world,markerId);
  return marker?.pen?.accepted.includes(a.species)&&region?.closed&&region.accessible?region:undefined;
};
const handler=(p:Pawn)=>{
  if(!isColonist(p)||p.priorities.handle===0||p.state==='dead'||p.state==='downed'||p.draft||p.mental?.crisis||p.flee||p.interruptedCargo)return false;
  const body=pawnBody(p).capacities;return body.moving>0&&body.manipulation>0;
};
const claimedIds=(world:World)=>new Set(world.pawns.flatMap(p=>[p.animalHandling?.animalId,p.animalCare?.animalId].filter((id):id is number=>id!==undefined)));
function destination(world:World,a:WildAnimal):number|undefined {
  const assigned=a.domestic?.penMarkerId;
  if(assigned&&usable(world,a,assigned))return assigned;
  return world.structures.filter(s=>s.kind==='pen-marker'&&usable(world,a,s.id))
    .sort((x,y)=>(x.x-a.x)**2+(x.z-a.z)**2-((y.x-a.x)**2+(y.z-a.z)**2)||x.id-y.id)[0]?.id;
}
export function leadingWanted(world:World,pawn:Pawn):boolean {
  if(!handler(pawn))return false;
  if(!world.wildlife?.animals.some(a=>a.domestic&&livestock(a)&&a.state!=='dead'&&a.state!=='downed'))return false;
  if(!world.structures.some(s=>s.kind==='pen-marker'))return false;
  const claimed=claimedIds(world);
  return !!world.wildlife?.animals.some(a=>a.domestic&&livestock(a)&&a.state!=='dead'&&a.state!=='downed'&&!claimed.has(a.id)
    &&(()=>{const id=destination(world,a),r=id&&usable(world,a,id);return !!r&&!r.cells.has(key(world,a));})());
}
export interface LeadingProposal {task:LeadingTask;path:Cell[];target:Cell}
export function leadingProposal(world:World,pawn:Pawn,reach:Reachability):LeadingProposal|undefined {
  if(!handler(pawn))return;
  const claimed=claimedIds(world);
  let navigation:ReturnType<typeof animalNavigation>|undefined;
  const animals=(world.wildlife?.animals??[]).filter(a=>a.domestic&&livestock(a)&&a.state!=='dead'&&a.state!=='downed'&&!claimed.has(a.id))
    .sort((a,b)=>(a.x-pawn.x)**2+(a.z-pawn.z)**2-((b.x-pawn.x)**2+(b.z-pawn.z)**2)||a.id-b.id);
  for(const a of animals){
    const markerId=destination(world,a);if(!markerId)continue;
    const region=usable(world,a,markerId);if(!region||region.cells.has(key(world,a)))continue;
    const path=routeToJob(world,a,reach,false);if(!path)continue;
    const goals=penAccessCells(world,markerId);
    if(!goals.length||!(navigation??=animalNavigation(world,true)).route(a,[...goals])?.length)continue;
    return {task:{animalId:a.id,kind:'lead',markerId,phase:'approach',sourcePileId:0,carryPileId:null,quantity:0,step:0,progress:0},path,target:a};
  }
}
export function startLeading(world:World,pawn:Pawn,proposal:LeadingProposal):void {
  const animal=world.wildlife?.animals.find(a=>a.id===proposal.task.animalId);
  if(animal?.domestic)animal.domestic.penMarkerId=proposal.task.markerId;
  pawn.animalHandling=proposal.task;pawn.path=proposal.path;pawn.state=proposal.path.length?'moving':'working';pawn.planCooldown=0;
}
export function processLeading(world:World,pawn:Pawn,task:LeadingTask,ctx:NeedContext):void {
  const animal=world.wildlife?.animals.find(a=>a.id===task.animalId);
  if(!animal?.domestic||!livestock(animal)||animal.state==='dead'||animal.state==='downed'||animal.burning||animal.flee||animal.threat||animal.retaliation||animal.strike||!handler(pawn)) {interruptWork(world,pawn);return;}
  const region=usable(world,animal,task.markerId);
  if(!region){interruptWork(world,pawn);return;}
  if(region.cells.has(key(world,animal))){
    animal.domestic.penMarkerId=task.markerId;animal.path=[];
    // The handler must clear the leaf before it can close. This is still a
    // physical move, so an occupied or blocked landing cell postpones release.
    if(doorAt(world,pawn)){
      const blocked=blockedCells(world),choices=[{x:pawn.x-1,z:pawn.z},{x:pawn.x+1,z:pawn.z},{x:pawn.x,z:pawn.z-1},{x:pawn.x,z:pawn.z+1}];
      const exit=choices.find(c=>c.x>=0&&c.z>=0&&c.x<world.width&&c.z<world.height&&!region.cells.has(key(world,c))&&!blocked[key(world,c)]);
      if(exit){ctx.move(exit,true);return;}
    }
    if(!releaseWork(world,pawn))interruptWork(world,pawn);return;
  }
  if(animal.motion&&animal.motion.end>world.tick)return;
  if(!adjacent(pawn,animal)&&(pawn.x!==animal.x||pawn.z!==animal.z)){task.phase='approach';ctx.move(animal,false);return;}
  if(task.phase!=='lead'){
    animal.path=[];delete animal.meal;animal.nextDecision=world.tick;
    if(!animal.motion||animal.motion.end<=world.tick)animal.state='idle';
  }
  task.phase='lead';pawn.state='working';pawn.path=[];
  if(!animal.path.length){
    if(animal.nextDecision>world.tick)return;
    const goals=penAccessCells(world,task.markerId);
    // One global animal route only when beginning or after a failed edge.
    const path=goals.length?animalNavigation(world,true).route(animal,[...goals]):undefined;
    if(!path?.length){interruptWork(world,pawn);return;}
    animal.path=path;
  }
  const next=animal.path[0]!;
  if(!adjacent(pawn,next)&&!(pawn.x===next.x&&pawn.z===next.z)){ctx.move(next,false);return;}
  if(doorAt(world,next)?.door?.forbidden){animal.path=[];animal.nextDecision=world.tick+100;return;}
  if(!readyDoorEntry(world,pawn,next))return;
  const nav=animalNavigation(world);
  if(!nav.step(animal,next)){animal.path=[];animal.nextDecision=world.tick+100;return;}
  moveAnimal(world,animal,nav.step,animalBody(animal).capacities.moving);
  animal.nextDecision=world.tick;
}
