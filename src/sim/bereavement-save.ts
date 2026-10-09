import type { RelationshipPeople } from './relationship-state.ts';
import { deathMemoryDuration,type DeathMemoryKind } from './bereavement.ts';
import type { Pawn, World } from './types.ts';
import { isColonist } from './affiliation.ts';

const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value:unknown,min:number,max=Number.MAX_SAFE_INTEGER):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;

/** A sparse, prospective record: past deaths never acquire a thought on load. */
function validMemories(value:unknown,observer:Pawn|undefined,pawnId:number,version:number,tick:number,deathTick:(id:number)=>number|undefined):boolean {
  if(value===undefined)return true;
  if(version<170||!Array.isArray(value)||value.length<1||value.length>10||!observer||!isColonist(observer)||observer.prisoner&&version<213)return false;
  const seen=new Set<number>();let friends=0,rivals=0;
  for(const memory of value){
    if(!object(memory)||Object.keys(memory).length!==4||Object.keys(memory).some(key=>!['otherId','kind','at','opinion'].includes(key))
      ||!integer(memory.otherId,1)||memory.otherId===pawnId||seen.has(memory.otherId)
      ||(memory.kind!=='friend-died'&&memory.kind!=='rival-died')
      ||!integer(memory.at,0,tick)||!integer(memory.opinion,-100,100))return false;
    const deathAt=deathTick(memory.otherId as number);
    if(deathAt===undefined||memory.at<deathAt)return false;
    const kind=memory.kind as DeathMemoryKind;
    if(kind==='friend-died'?(memory.opinion as number)<20:(memory.opinion as number)>-20)return false;
    if(memory.at+deathMemoryDuration(kind)<=tick)return false;
    seen.add(memory.otherId);
    if(kind==='friend-died')friends++;else rivals++;
    if(friends>5||rivals>5)return false;
  }
  return true;
}

export function validBereavement(value:unknown,pawnId:number,version:number,world:Pick<World,'pawns'|'tick'>,people?:RelationshipPeople):boolean {
  return validMemories(value,world.pawns.find(p=>p.id===pawnId),pawnId,version,world.tick,id=>{
    const known=people?.get(id),p=world.pawns.find(p=>p.id===id);
    return known?.status==='dead'?known.deathAt:p?.state==='dead'?p.health?.death?.tick:undefined;
  });
}
export function validHumanBereavement(value:unknown,observer:Pawn,version:number,tick:number,people:RelationshipPeople):boolean {
  return validMemories(value,observer,observer.id,version,tick,id=>{const p=people.get(id);return p?.status==='dead'?p.deathAt:undefined;});
}
