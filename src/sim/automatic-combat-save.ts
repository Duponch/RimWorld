import { automaticPermission } from './automatic-combat-state.ts';
import { hostileTo,isColonist } from './affiliation.ts';
import type { Pawn,World } from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
export function validAutomaticAttack(v:unknown,version:number,tick:number):boolean {
  if(v===undefined)return true;if(version<60||!object(v))return false;
  return v.kind==='draft'?Object.keys(v).length===1:v.kind==='response'&&Object.keys(v).length===3&&int(v.remaining,0,2)&&int(v.until,tick+1,tick+200);
}
export function validAttackMemory(v:unknown,version:number,tick:number):boolean {
  return v===undefined||version>=60&&object(v)&&Object.keys(v).length===2&&int(v.targetId,1)&&int(v.atCore,0,tick*10);
}
export function automaticPost(p:Pawn):boolean {
  return !!p.draft&&!p.draft.queue.length&&(!p.draft.target||p.draft.target.x===p.x&&p.draft.target.z===p.z)&&!p.path.length;
}
export function automaticOwnership(w:World,p:Pawn,targetId:number,kind:'draft'|'response'):boolean {
  return isColonist(p)&&automaticPermission(p,kind)&&w.pawns.some(t=>t.id===targetId&&hostileTo(p,t));
}
