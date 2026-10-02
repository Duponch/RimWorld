import { deathMemoryDuration,type DeathMemoryKind } from './bereavement.ts';
import type { World } from './types.ts';
import { isColonist } from './affiliation.ts';

const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value:unknown,min:number,max=Number.MAX_SAFE_INTEGER):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;

/** A sparse, prospective record: past deaths never acquire a thought on load. */
export function validBereavement(value:unknown,pawnId:number,version:number,world:Pick<World,'pawns'|'tick'>):boolean {
  if(value===undefined)return true;
  if(version<170||!Array.isArray(value)||value.length<1||value.length>10)return false;
  const observer=world.pawns.find(pawn=>pawn.id===pawnId);
  // A recipient can die later and retain its past memories until expiration.
  if(!observer||!isColonist(observer)||observer.prisoner)return false;
  const seen=new Set<number>();let friends=0,rivals=0;
  for(const memory of value){
    if(!object(memory)||Object.keys(memory).length!==4||Object.keys(memory).some(key=>!['otherId','kind','at','opinion'].includes(key))
      ||!integer(memory.otherId,1)||memory.otherId===pawnId||seen.has(memory.otherId)
      ||(memory.kind!=='friend-died'&&memory.kind!=='rival-died')
      ||!integer(memory.at,0,world.tick)||!integer(memory.opinion,-100,100))return false;
    const deceased=world.pawns.find(pawn=>pawn.id===memory.otherId);
    if(!deceased||deceased.state!=='dead'||!deceased.health?.death||memory.at<deceased.health.death.tick)return false;
    const kind=memory.kind as DeathMemoryKind;
    if(kind==='friend-died'?(memory.opinion as number)<20:(memory.opinion as number)>-20)return false;
    if(memory.at+deathMemoryDuration(kind)<=world.tick)return false;
    seen.add(memory.otherId);
    if(kind==='friend-died')friends++;else rivals++;
    if(friends>5||rivals>5)return false;
  }
  return true;
}
