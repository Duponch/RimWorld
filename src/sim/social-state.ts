import { TICKS_PER_DAY,type Pawn } from './types.ts';
import { pawnBody } from './health-rules.ts';

export type SocialKind='chitchat'|'deep-talk';
export interface SocialMemory { otherId:number;kind:SocialKind;at:number;offset:number }
export interface SocialState {
  rng:number; wants?:true;
  last?:{otherId:number;kind:SocialKind;tick:number;initiated:boolean};
  memories:SocialMemory[];
}
export const SOCIAL_LABELS:Readonly<Record<SocialKind,string>>=Object.freeze({'chitchat':'Bavardage','deep-talk':'Discussion approfondie'});
export const DEEP_TALK_DURATION=20*TICKS_PER_DAY;

/** Independent stream: social rolls never perturb mining, medicine or raids. */
export function socialRandom(state:{rng:number}):number {
  let n=state.rng;n^=n<<13;n^=n>>>17;n^=n<<5;state.rng=n>>>0;return state.rng/4294967296;
}
export function socialSeed(seed:number,id:number):number {return (Math.imul(seed^0x6a09e667,1664525)^Math.imul(id,1013904223))>>>0||1;}
export function socialImpact(pawn:Pawn):number {
  const c=pawnBody(pawn).capacities;
  return Math.max(.2,(.82+.0275*(pawn.skills.social?.level??0))*(.1+.9*Math.min(1,c.talking/.95))*(.7+.3*Math.min(1,c.hearing/.95)));
}
/** Stable symmetric affinity; adult ages are not yet modeled (age offset 0).
 * Same asymmetric normal family as Core, independent seed/PRNG, not identical pairs. */
export function socialCompatibility(seed:number,a:number,b:number):number {
  const state={rng:socialSeed(seed,Math.min(a,b))^Math.imul(Math.max(a,b),37)};state.rng=state.rng>>>0||1;
  const n=Math.sqrt(-2*Math.log(Math.max(1/4294967296,socialRandom(state))))*Math.sin(2*Math.PI*socialRandom(state));
  return .3+n*(n>0?1.4:1);
}
export function deepTalkWeight(compatibility:number):number {
  const points=[[-1.5,0],[-.5,.1],[.5,1],[1,1.8],[2,3]] as const;
  if(compatibility<=-1.5)return 0;
  for(let i=1;i<points.length;i++){const [x,y]=points[i]!,[px,py]=points[i-1]!;if(compatibility<=x)return .075*(py+(y-py)*(compatibility-px)/(x-px));}
  return .225;
}
export function memoryOffset(memory:SocialMemory,tick:number):number {
  const age=Math.max(0,tick-memory.at);
  if(memory.kind==='chitchat')return Math.min(10,Math.max(0,memory.offset-Math.floor(age/TICKS_PER_DAY)));
  return memory.offset*Math.max(0,Math.min(1,(DEEP_TALK_DURATION-age)/(DEEP_TALK_DURATION*.3)));
}
function roundOpinion(n:number):number {const lo=Math.floor(n);return n<=0?0:Math.max(1,n-lo===.5?lo+lo%2:Math.round(n));}
export function opinionCauses(pawn:Pawn,otherId:number,tick:number):{kind:SocialKind;count:number;value:number;nextChange:number}[] {
  const memories=pawn.social?.memories.filter(m=>m.otherId===otherId&&memoryOffset(m,tick)>0)??[];
  return (['chitchat','deep-talk'] as const).flatMap(kind=>{
    const group=memories.filter(m=>m.kind===kind).sort((a,b)=>b.at-a.at);if(!group.length)return [];
    const value=roundOpinion(group.reduce((s,m,i)=>s+memoryOffset(m,tick)*(kind==='deep-talk'?.9**i:1),0));
    const nextChange=kind==='chitchat'?group[0]!.at+(Math.floor((tick-group[0]!.at)/TICKS_PER_DAY)+1)*TICKS_PER_DAY:Math.min(...group.map(m=>m.at+DEEP_TALK_DURATION));
    return [{kind,count:group.length,value,nextChange}];
  });
}
export const opinionOf=(pawn:Pawn,otherId:number,tick:number):number=>Math.min(100,opinionCauses(pawn,otherId,tick).reduce((s,c)=>s+c.value,0));

/** Cleanup runs on retained dead actors too. Merging chitchat never refreshes its clock. */
export function expireSocialMemories(pawn:Pawn,tick:number):void {
  const s=pawn.social;if(!s)return;
  for(const m of s.memories)if(m.kind==='chitchat'){
    const days=Math.floor((tick-m.at)/TICKS_PER_DAY);if(days>0){m.offset=Math.max(0,m.offset-days);m.at+=days*TICKS_PER_DAY;}
  }
  if(s.memories.some(m=>memoryOffset(m,tick)<=0))s.memories=s.memories.filter(m=>memoryOffset(m,tick)>0);
}
export function addSocialMemory(state:SocialState,otherId:number,kind:SocialKind,tick:number,impact:number):void {
  const same=state.memories.filter(m=>m.kind===kind&&m.otherId===otherId);
  if(kind==='chitchat'&&same.length){same[0]!.offset+=.66*impact;return;}
  if(kind==='deep-talk'&&same.length>=10)state.memories.splice(state.memories.indexOf(same.reduce((a,b)=>a.at<=b.at?a:b)),1);
  const all=state.memories.filter(m=>m.kind===kind);
  if(all.length>=300)state.memories.splice(state.memories.indexOf(all.reduce((a,b)=>a.at<=b.at?a:b)),1);
  state.memories.push({otherId,kind,at:tick,offset:(kind==='chitchat'?.66:15)*impact});
}
