import { isAdmittedGuest } from './affiliation.ts';
import { processDraftSleep,type NeedContext } from './needs.ts';
import { processMedicalGuestNeeds } from './medical-guest-needs.ts';
import { hasReachableCell,routeToCell } from './pathfinding.ts';
import type { Cell,Pawn,World } from './types.ts';

/** Guest medical intentions reuse actual services, never colonial work. */
export function processPodRescuePatient(w:World,p:Pawn,ctx:NeedContext):boolean {
  if(!p.podRescue||p.prisoner)return false;
  if(isAdmittedGuest(p)){if(processMedicalGuestNeeds(w,p,ctx))return true;}
  else if(processDraftSleep(w,p,ctx))return true;
  if(p.need||p.interruptedCargo||p.burning)return true;
  p.bedId=null;delete p.bedSlot;
  const target=p.path.at(-1);
  if(target){ctx.move(target,true);return true;}
  if(p.planCooldown>0){p.state='idle';return true;}
  const edges:Cell[]=[];
  for(let x=0;x<w.width;x++)edges.push({x,z:0},{x,z:w.height-1});
  for(let z=1;z<w.height-1;z++)edges.push({x:0,z},{x:w.width-1,z});
  const goals=new Set(edges.map(c=>c.z*w.width+c.x)),reach=ctx.search(goals);
  if(!reach)return true;
  const field='kind' in reach?reach.resolve(goals):reach;
  const exit=edges.filter(c=>hasReachableCell(field,c.z*w.width+c.x)).sort((a,b)=>
    field.costs[a.z*w.width+a.x]!-field.costs[b.z*w.width+b.x]!||a.z-b.z||a.x-b.x)[0];
  const path=exit&&routeToCell(w,exit,field);
  p.planCooldown=20;p.path=path??[];p.state=path?.length?'moving':'idle';
  if(exit&&path?.length)ctx.move(exit,true);
  return true;
}
