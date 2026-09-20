import { isColonist } from './affiliation.ts';
import { medicalWorkRefusal } from './health-rules.ts';
import { clearQueuedOrders } from './player-orders.ts';
import { planCommandDrops,releaseWork } from './work-release.ts';
import { inHome } from './repairs.ts';
import { blockedCells,reachableCells,routeToCell,routeCost,canStopAt,workNeighbours,type Reachability } from './pathfinding.ts';
import { fireTouch } from './firefighting.ts';
import { captureCleanliness,type CleanlinessCapture } from './filth-room.ts';
import { FILTH_DEFINITIONS,type FilthRecord } from './filth-rules.ts';
import { FLOOR_DEFINITIONS } from './flooring.ts';
import { thinFilth } from './filth.ts';
import type { NeedContext } from './needs.ts';
import type { Cell,Pawn,World } from './types.ts';

export interface CleaningTask {targets:number[];forced:boolean;phase:'approach'|'clean';progress:number}
export interface CommandCleaning extends Cell {type:'clean-room';pawnId:number}
export interface CleaningProposal {task:CleaningTask;path:Cell[];target:Cell;id:number}
const distance=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const eligible=(w:World,p:Pawn,f:FilthRecord,forced=false)=>inHome(w,f.z*w.width+f.x)&&(forced||w.tick*10-f.grownCore>=600)&&!w.pawns.some(q=>q!==p&&q.cleaning?.targets.includes(f.id));
const able=(p:Pawn)=>isColonist(p)&&!p.prisoner&&!p.draft&&!p.mental?.crisis&&!p.burning&&!medicalWorkRefusal(p);
export const cleaningWanted=(w:World,p:Pawn):boolean=>!!p.priorities.clean&&able(p)&&!!w.filth?.items.some(f=>eligible(w,p,f));
function route(w:World,p:Pawn,f:FilthRecord,reach:Reachability):Cell[]|null {
  const paths=[f,...workNeighbours(f,'mine')].filter(c=>fireTouch(w,c,f)&&canStopAt(w,c,reach)).map(c=>routeToCell(w,c,reach)).filter((v):v is Cell[]=>v!==null);
  paths.sort((a,b)=>routeCost(w,a,reach)-routeCost(w,b,reach)||a.length-b.length);return paths[0]??null;
}
function sameCleaningRoom(w:World,origin:Cell,target:Cell,capture:CleanlinessCapture):boolean {
  const a=capture.topology.at(origin.x,origin.z),b=capture.topology.at(target.x,target.z);
  if(a?.kind==='space'&&b?.kind==='space')return a.id===b.id;
  return !!a&&a.kind==='space'&&b?.kind==='doorway'&&workNeighbours(target).some(c=>{const r=capture.topology.at(c.x,c.z);return r?.kind==='space'&&r.id===a.id;});
}
export function cleaningProposal(w:World,p:Pawn,reach:Reachability):CleaningProposal|undefined {
  if(!cleaningWanted(w,p))return;
  const targets=w.filth!.items.filter(f=>eligible(w,p,f)).sort((a,b)=>distance(a,p)-distance(b,p)||a.id-b.id);
  for(const f of targets){const path=route(w,p,f,reach);if(!path)continue;
    const capture=captureCleanliness(w),near=targets.filter(v=>v!==f&&(v.x-f.x)**2+(v.z-f.z)**2<=30&&sameCleaningRoom(w,f,v,capture)).slice(0,14);
    return {id:f.id,target:{x:f.x,z:f.z},path,task:{targets:[f.id,...near.map(v=>v.id)],forced:false,phase:'approach',progress:0}};
  }
}
export function startCleaning(p:Pawn,proposal:CleaningProposal):void {p.cleaning=proposal.task;p.path=proposal.path;p.state=proposal.path.length?'moving':'working';}
/** Explicit room command: unlike automatic WorkGiver, Core does not enforce
 * the 600-Core aging delay here. It still requires home, room and real access. */
export function applyCleanRoom(w:World,command:CommandCleaning):string|null {
  const p=w.pawns.find(p=>p.id===command.pawnId);if(!p||!able(p))return 'Ce colon ne peut pas nettoyer maintenant.';
  if(!p.priorities.clean)return 'Le nettoyage est désactivé pour ce colon.';
  const capture=captureCleanliness(w),room=capture.room(command);
  if(!room||room.cells.size-room.covered>=300)return 'Choisissez une pièce fermée qui ne soit pas un grand espace à ciel ouvert.';
  const candidates=(w.filth?.items??[]).filter(f=>eligible(w,p,f,true)&&sameCleaningRoom(w,command,f,capture)).sort((a,b)=>distance(a,p)-distance(b,p)||a.id-b.id);
  if(!candidates.length)return 'Aucune salissure disponible dans le foyer de cette pièce.';
  const reach=reachableCells(w,p,blockedCells(w),new Set()),targets=candidates.filter(f=>route(w,p,f,reach)!==null);
  if(!targets.length)return 'Les salissures de cette pièce sont inaccessibles.';
  const drops=planCommandDrops(w,command);if(!drops)return 'La cargaison doit être déposée avant cet ordre.';
  clearQueuedOrders(w,p);delete p.priorityWork;releaseWork(w,p,drops);
  p.cleaning={targets:targets.map(f=>f.id),forced:true,phase:'approach',progress:0};p.path=[];p.planCooldown=0;return null;
}
export function processCleaning(w:World,p:Pawn,context:NeedContext):boolean {
  const task=p.cleaning;if(!task)return false;
  if(!able(p)||!task.forced&&!p.priorities.clean){delete p.cleaning;p.path=[];p.planCooldown=0;if(p.state==='working')p.state='idle';return false;}
  while(task.targets.length){const f=w.filth?.items.find(f=>f.id===task.targets[0]);if(f&&inHome(w,f.z*w.width+f.x))break;task.targets.shift();task.progress=0;p.path=[];}
  const f=w.filth?.items.find(f=>f.id===task.targets[0]);if(!f){delete p.cleaning;p.planCooldown=0;if(p.state==='working')p.state='idle';return false;}
  if(p.moveCooldown>0)return true;
  if(!fireTouch(w,p,f)){
    task.phase='approach';
    if(!p.path.length){const goals=[f,...workNeighbours(f,'mine')].filter(c=>c.x>=0&&c.z>=0&&c.x<w.width&&c.z<w.height&&fireTouch(w,c,f));const reach=context.search(new Set(goals.map(c=>c.z*w.width+c.x)));if(!reach)return true;
      const path=route(w,p,f,reach);if(!path){task.targets.shift();task.progress=0;p.planCooldown=20;if(!task.targets.length){delete p.cleaning;p.state='idle';}return true;}p.path=path;}
    const last=p.path.at(-1);if(last)context.move(last,true);return true;
  }
  p.path=[];p.state='working';task.phase='clean';const floor=w.tiles[f.z*w.width+f.x]!.floor,factor=floor?FLOOR_DEFINITIONS[floor].cleaningTime:1;
  // Preserve the strict Core boundary and discard remainder for each layer.
  for(let core=0;core<10;core++){
    if(task.progress+1/factor>FILTH_DEFINITIONS[f.kind].work){
      if(f.thickness===1&&!Number.isSafeInteger(w.filth!.cleaned+1))return true;
      const complete=f.thickness===1;if(complete)w.filth!.cleaned++;
      thinFilth(w,f);task.progress=0;if(complete)break;
    }else task.progress+=1/factor;
  }
  return true;
}
