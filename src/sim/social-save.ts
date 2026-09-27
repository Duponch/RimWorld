import { DEEP_TALK_DURATION } from './social-state.ts';
import { TICKS_PER_DAY,type World } from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,lo:number,hi=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const interactionKind=(v:unknown,version:number)=>v==='chitchat'||v==='deep-talk'||version>=86&&v==='rapport'||version>=125&&(v==='slight'||v==='insult')||version>=134&&v==='kind-words';
const memoryKind=(v:unknown,version:number)=>interactionKind(v,version)||version>=125&&(v==='fight-cathartic'||v==='fight-angering');
const validOffset=(kind:unknown,offset:unknown):boolean=>typeof offset==='number'&&Number.isFinite(offset)&&(
  kind==='slight'?offset<0&&offset>=-6.850000001:
  kind==='insult'?offset<0&&offset>=-20.550000001:
  kind==='fight-cathartic'?offset===38:
  kind==='fight-angering'?offset===-22:
  offset>0&&offset<=(kind==='chitchat'?Number.MAX_SAFE_INTEGER:kind==='rapport'?2.740000001:20.550000001));
export function validateSocial(world:World,version:number):string[] {
  const errors:string[]=[],ids=new Set(world.pawns.map(p=>p.id));
  for(const p of world.pawns){
    const s:unknown=p.social;if(s===undefined)continue;
    if(version<70||!object(s)||Object.keys(s).some(k=>!['rng','wants','last','memories',...(version>=125?['fight']:[])].includes(k))||!integer(s.rng,1,0xffffffff)||s.wants!==undefined&&s.wants!==true||!Array.isArray(s.memories)||s.memories.length>(version>=134?2400:version>=125?2100:version>=86?900:600)){errors.push('Invalid social state.');continue;}
    const other=(id:unknown)=>integer(id,1)&&id!==p.id&&ids.has(id);
    const l=s.last;if(l!==undefined&&(!object(l)||Object.keys(l).some(k=>!['otherId','kind','tick','initiated'].includes(k))||!other(l.otherId)||!interactionKind(l.kind,version)||!integer(l.tick,0,world.tick)||typeof l.initiated!=='boolean'))errors.push('Invalid last interaction.');
    const fight=s.fight;
    if(fight!==undefined){
      if(version<125||!object(fight)||Object.keys(fight).some(k=>!['opponentId','startedAt'].includes(k))||!other(fight.opponentId)||!integer(fight.startedAt,0,world.tick))errors.push('Invalid social fight.');
      else {
        const opponent=world.pawns.find(q=>q.id===fight.opponentId),reply=opponent?.social?.fight;
        if(!reply||reply.opponentId!==p.id||reply.startedAt!==fight.startedAt)errors.push('Non-reciprocal social fight.');
      }
    }
    const counts=new Map<string,number>();let chats=0,deep=0,rapport=0,kindWords=0,slight=0,insult=0,cathartic=0,angering=0;
    for(const m of s.memories){
      if(!object(m)||Object.keys(m).some(k=>!['otherId','kind','at','offset'].includes(k))||!other(m.otherId)||!memoryKind(m.kind,version)||!integer(m.at,0,world.tick)||!validOffset(m.kind,m.offset)||world.tick-m.at>=(m.kind==='chitchat'?TICKS_PER_DAY:DEEP_TALK_DURATION)){errors.push('Invalid social memory.');continue;}
      const key=`${m.otherId}:${m.kind}`,count=(counts.get(key)??0)+1;counts.set(key,count);
      if(count>(m.kind==='chitchat'?1:m.kind==='rapport'?50:m.kind==='fight-cathartic'||m.kind==='fight-angering'?5:10))errors.push('Too many social memories for one person.');
      if(m.kind==='chitchat')chats++;else if(m.kind==='rapport')rapport++;else if(m.kind==='kind-words')kindWords++;else if(m.kind==='slight')slight++;else if(m.kind==='insult')insult++;else if(m.kind==='fight-cathartic')cathartic++;else if(m.kind==='fight-angering')angering++;else deep++;
    }
    if(chats>300||deep>300||rapport>300||kindWords>300||slight>300||insult>300||cathartic>300||angering>300)errors.push('Too many social memories of one kind.');
  }
  return errors;
}
