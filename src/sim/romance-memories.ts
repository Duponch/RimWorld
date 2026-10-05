import { captureRelationshipPeople } from './relationship-namespace.ts';
import { TICKS_PER_DAY,type Pawn,type World } from './types.ts';
import type { RelationshipPeople } from './relationship-state.ts';
import type { MoodThought } from './mood.ts';

export type RomanceMemoryKind='rebuffed-opinion'|'rebuffed-mood'|'failed-opinion'|'failed-low-opinion-mood'|'breakup-opinion'|'breakup-mood';
export interface RomanceMemory {otherId:number;kind:RomanceMemoryKind;at:number}
export type RomanceOpinionKind='rebuffed-opinion'|'failed-opinion'|'breakup-opinion';
export const ROMANCE_MEMORY_DEFINITIONS=Object.freeze({
  'rebuffed-opinion':{days:10,offset:-10,limit:300,perOther:5,multiplier:.9,label:'Tentative repoussée'},
  'failed-opinion':{days:10,offset:-15,limit:300,perOther:5,multiplier:.9,label:'Avance non souhaitée'},
  'breakup-opinion':{days:60,offset:-50,limit:300,perOther:1,multiplier:.75,label:'M’a quitté'},
  'rebuffed-mood':{days:3,offset:-5,limit:5,perOther:5,multiplier:.9,label:'Tentative repoussée par'},
  'failed-low-opinion-mood':{days:3,offset:-3,limit:5,perOther:5,multiplier:.9,label:'Avance non souhaitée de'},
  'breakup-mood':{days:25,offset:-15,limit:2,perOther:2,multiplier:.75,label:'Quitté par'},
} as const);
export const ROMANCE_MEMORY_LIMIT=912;
const opinionKinds:readonly RomanceOpinionKind[]=['rebuffed-opinion','failed-opinion','breakup-opinion'];
const moodKinds:readonly RomanceMemoryKind[]=['rebuffed-mood','failed-low-opinion-mood','breakup-mood'];
export const romanceMemoryDuration=(kind:RomanceMemoryKind):number=>ROMANCE_MEMORY_DEFINITIONS[kind].days*TICKS_PER_DAY;
const oldest=(a:RomanceMemory,b:RomanceMemory)=>a.at<b.at||a.at===b.at&&a.otherId<b.otherId?a:b;

export function expireRomanceMemories(pawn:Pawn,tick:number):void {
  if(!pawn.romanceMemories?.some(memory=>memory.at+romanceMemoryDuration(memory.kind)<=tick))return;
  pawn.romanceMemories=pawn.romanceMemories.filter(memory=>memory.at+romanceMemoryDuration(memory.kind)>tick);
  if(!pawn.romanceMemories.length)delete pawn.romanceMemories;
}
export function addRomanceMemory(pawn:Pawn,otherId:number,kind:RomanceMemoryKind,tick:number):void {
  expireRomanceMemories(pawn,tick);
  const memories=(pawn.romanceMemories ??= []),definition=ROMANCE_MEMORY_DEFINITIONS[kind];
  const removeOldest=(group:RomanceMemory[],limit:number)=>{if(group.length>=limit){const index=memories.indexOf(group.reduce(oldest));if(index>=0)memories.splice(index,1);}};
  removeOldest(memories.filter(m=>m.kind===kind&&m.otherId===otherId),definition.perOther);
  removeOldest(memories.filter(m=>m.kind===kind),definition.limit);
  memories.push({otherId,kind,at:tick});
}
/** Success removes these exact Core definitions for this pair. Attached mood
 * memories have independent clocks and are not removed with an opinion. */
export function removeSuccessfulRomanceMemories(pawn:Pawn,otherId:number):void {
  if(!pawn.romanceMemories)return;
  pawn.romanceMemories=pawn.romanceMemories.filter(m=>m.otherId!==otherId||!['breakup-opinion','failed-opinion','failed-low-opinion-mood'].includes(m.kind));
  if(!pawn.romanceMemories.length)delete pawn.romanceMemories;
}
export interface RomanceOpinionCause {kind:RomanceOpinionKind;count:number;value:number;nextChange:number;label:string;description:string}
export function romanceOpinionCauses(pawn:Pawn,otherId:number,tick:number):RomanceOpinionCause[] {
  return opinionKinds.flatMap(kind=>{
    const definition=ROMANCE_MEMORY_DEFINITIONS[kind],duration=romanceMemoryDuration(kind);
    const memories=(pawn.romanceMemories??[]).filter(m=>m.kind===kind&&m.otherId===otherId&&m.at+duration>tick).sort((a,b)=>b.at-a.at);
    if(!memories.length)return [];
    const value=memories.reduce((sum,m,index)=>sum+definition.offset*Math.min(1,(m.at+duration-tick)/(duration*.3))*definition.multiplier**index,0);
    return [{kind,count:memories.length,value,nextChange:Math.min(...memories.map(m=>m.at+duration)),label:definition.label,
      description:'Souvenir dirigé d’un échange amoureux réel ; son opinion décroît pendant les derniers 30 % de sa durée.'}];
  });
}
export function romanceMoodThoughts(world:World,pawn:Pawn):MoodThought[] {
  if(!pawn.romanceMemories)return [];
  const people=captureRelationshipPeople(world),groups=new Map<string,RomanceMemory[]>();
  for(const m of pawn.romanceMemories){
    if(!moodKinds.includes(m.kind)||m.at+romanceMemoryDuration(m.kind)<=world.tick)continue;
    const label=`${ROMANCE_MEMORY_DEFINITIONS[m.kind].label} ${people.get(m.otherId)?.name??'cette personne'}`,key=`${m.kind}:${label}`;
    const group=groups.get(key)??[];group.push(m);groups.set(key,group);
  }
  return [...groups.values()].map<MoodThought>(group=>{
    group.sort((a,b)=>b.at-a.at||a.otherId-b.otherId);
    const memory=group[0]!,definition=ROMANCE_MEMORY_DEFINITIONS[memory.kind],name=people.get(memory.otherId)?.name??'cette personne';
    return {id:`romance-${memory.kind}-${memory.otherId}`,label:`${definition.label} ${name}${group.length>1?` ×${group.length}`:''}`,
      offset:group.reduce((sum,_m,index)=>sum+definition.offset*definition.multiplier**index,0),kind:'memory',
      expiresAt:Math.min(...group.map(m=>m.at+romanceMemoryDuration(m.kind))),description:'Souvenir amoureux réel ; humeur distincte de l’opinion envers cette personne.'};
  });
}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const integer=(value:unknown,lo:number,hi=Number.MAX_SAFE_INTEGER):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=lo&&value<=hi;
export function validRomanceMemoryShape(value:unknown,version:number,tick:number):value is RomanceMemory[]|undefined {
  if(value===undefined)return true;
  if(version<195||!Array.isArray(value)||!value.length||value.length>ROMANCE_MEMORY_LIMIT)return false;
  const totals=new Map<string,number>(),pairs=new Map<string,number>();
  for(const m of value){
    if(!object(m)||Object.keys(m).length!==3||Object.keys(m).some(k=>!['otherId','kind','at'].includes(k))||!integer(m.otherId,1)
      ||typeof m.kind!=='string'||!Object.hasOwn(ROMANCE_MEMORY_DEFINITIONS,m.kind)||!integer(m.at,0,tick))return false;
    const kind=m.kind as RomanceMemoryKind,definition=ROMANCE_MEMORY_DEFINITIONS[kind];
    if(m.at+romanceMemoryDuration(kind)<=tick)return false;
    const count=(totals.get(kind)??0)+1,key=`${kind}:${m.otherId}`,pairCount=(pairs.get(key)??0)+1;
    totals.set(kind,count);pairs.set(key,pairCount);if(count>definition.limit||pairCount>definition.perOther)return false;
  }
  return true;
}
export function validRomanceMemories(value:unknown,pawnId:number,version:number,world:World,people?:RelationshipPeople):boolean {
  if(!validRomanceMemoryShape(value,version,world.tick))return false;
  if(value===undefined)return true;
  const known=people??captureRelationshipPeople(world);
  return known.has(pawnId)&&value.every(memory=>memory.otherId!==pawnId&&known.has(memory.otherId));
}
