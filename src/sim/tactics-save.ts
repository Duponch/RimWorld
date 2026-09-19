import { hostileTo,isColonist } from './affiliation.ts';
import type { World } from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export function validTacticsShape(value:unknown,version:number,world:World):boolean {
  if(value===undefined)return true;
  if(version<61||!object(value)||Object.keys(value).length!==3||!Object.keys(value).every(k=>['targetId','post','reviewAtCore'].includes(k))||!integer(value.reviewAtCore,0,world.tick*10+550)||value.targetId!==null&&!integer(value.targetId,1))return false;
  const post=value.post;
  return post===null||object(post)&&Object.keys(post).length===2&&integer(post.x,0,world.width-1)&&integer(post.z,0,world.height-1);
}
export function validateTactics(world:World):string[] {
  const errors:string[]=[],claims=new Set<number>();
  for(const p of world.pawns)if(p.draft?.target)claims.add(p.draft.target.z*world.width+p.draft.target.x);
  for(const p of world.pawns) {
    const t=p.tactics;if(!t)continue;
    if(isColonist(p)||t.targetId!==null&&!world.pawns.some(q=>q.id===t.targetId&&hostileTo(p,q)))errors.push('Invalid tactical mandate or target.');
    if(t.targetId===null&&(t.reviewAtCore!==0||t.post||p.path.length||p.shooting?.order||p.melee?.order)||['dead','downed','sleeping'].includes(p.state)&&(t.targetId!==null||t.post))errors.push('Inactive tactical actor retains engagement.');
    if(t.post){const key=t.post.z*world.width+t.post.x;if(claims.has(key))errors.push('Duplicate tactical post.');claims.add(key);}
    if(p.path.length&&!p.melee&&(t.post===null||p.path.at(-1)!.x!==t.post.x||p.path.at(-1)!.z!==t.post.z))errors.push('Tactical path misses its post.');
    if(p.shooting?.order&&p.shooting.order.targetId!==t.targetId||p.melee?.order&&p.melee.order.targetId!==t.targetId||p.melee?.order&&t.post)errors.push('Tactical attack differs from its engagement.');
    if(p.shooting?.order&&(!t.post||p.x!==t.post.x||p.z!==t.post.z)||p.path.length&&(p.shooting?.stance||p.melee?.strike))errors.push('Tactical firing post or recovery conflicts with movement.');
  }
  return errors;
}
