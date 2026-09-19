import { DEEP_TALK_DURATION } from './social-state.ts';
import { TICKS_PER_DAY,type World } from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,lo:number,hi=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const kind=(v:unknown)=>v==='chitchat'||v==='deep-talk';
export function validateSocial(world:World,version:number):string[] {
  const errors:string[]=[],ids=new Set(world.pawns.map(p=>p.id));
  for(const p of world.pawns){
    const s:unknown=p.social;if(s===undefined)continue;
    if(version<70||!object(s)||Object.keys(s).some(k=>!['rng','wants','last','memories'].includes(k))||!integer(s.rng,1,0xffffffff)||s.wants!==undefined&&s.wants!==true||!Array.isArray(s.memories)||s.memories.length>600){errors.push('Invalid social state.');continue;}
    const other=(id:unknown)=>integer(id,1)&&id!==p.id&&ids.has(id);
    const l=s.last;if(l!==undefined&&(!object(l)||Object.keys(l).some(k=>!['otherId','kind','tick','initiated'].includes(k))||!other(l.otherId)||!kind(l.kind)||!integer(l.tick,0,world.tick)||typeof l.initiated!=='boolean'))errors.push('Invalid last interaction.');
    const counts=new Map<string,number>();let chats=0,deep=0;
    for(const m of s.memories){
      if(!object(m)||Object.keys(m).some(k=>!['otherId','kind','at','offset'].includes(k))||!other(m.otherId)||!kind(m.kind)||!integer(m.at,0,world.tick)||typeof m.offset!=='number'||!Number.isFinite(m.offset)||m.offset<=0||m.offset>(m.kind==='chitchat'?Number.MAX_SAFE_INTEGER:20.550000001)||world.tick-m.at>=(m.kind==='chitchat'?TICKS_PER_DAY:DEEP_TALK_DURATION)){errors.push('Invalid social memory.');continue;}
      const key=`${m.otherId}:${m.kind}`,count=(counts.get(key)??0)+1;counts.set(key,count);
      if(count>(m.kind==='chitchat'?1:10))errors.push('Too many social memories for one person.');
      if(m.kind==='chitchat')chats++;else deep++;
    }
    if(chats>300||deep>300)errors.push('Too many social memories of one kind.');
  }
  return errors;
}
