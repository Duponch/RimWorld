import {isColonist} from '../sim/affiliation.ts';
import {workPriority} from '../sim/work-types.ts';
import type {Command,World} from '../sim/types.ts';

export const FIRST_GESTURES_STORAGE_KEY='elsewhere.learning.first-gestures.v1';
export type FirstGestureId='work'|'storage'|'beds'|'cultivation';
export type LearningOrigin='confirmed'|'declared';
export interface FirstGesturesLearningState {
  version:1;enabled:boolean;learned:Partial<Record<FirstGestureId,LearningOrigin>>;
}
export type FirstGestureAction={panel:'work'}|{panel:'architect';mapTools:'zones';tool:'stockpile'|'growing'}|{panel:'architect';category:'furniture';tool:'sleeping-spot'};
export interface FirstGestureLesson {id:FirstGestureId;title:string;instruction:string;action:FirstGestureAction}
export const LESSONS:readonly FirstGestureLesson[]=Object.freeze<FirstGestureLesson[]>([
  {id:'work',title:'Répartir le travail',instruction:'Choisissez une priorité active différente pour un colon libre vivant.',action:{panel:'work'}},
  {id:'storage',title:'Tracer une réserve',instruction:'Tracez un rectangle de réserve accepté sur au moins une case. Les objets seront transportés séparément.',action:{panel:'architect',mapTools:'zones',tool:'stockpile'}},
  {id:'beds',title:'Placer un couchage',instruction:'Placez un couchage au sol accepté. Il ne crée ni toit ni abri.',action:{panel:'architect',category:'furniture',tool:'sleeping-spot'}},
  {id:'cultivation',title:'Tracer une culture',instruction:'Tracez une zone de culture acceptée sur au moins une case. Les semis et la récolte restent à effectuer.',action:{panel:'architect',mapTools:'zones',tool:'growing'}},
]);
const ids:readonly FirstGestureId[]=['work','storage','beds','cultivation'];
const fresh=():FirstGesturesLearningState=>({version:1,enabled:false,learned:{}});
const copy=(state:FirstGesturesLearningState):FirstGesturesLearningState=>({...state,learned:{...state.learned}});
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;

/** Browser knowledge only. Old worlds, initial snapshots and imports never
 * supply learning evidence. Unknown/future local records grant nothing. */
export function parseFirstGesturesLearning(raw:string|null):FirstGesturesLearningState|undefined {
  if(raw===null)return fresh();
  if(typeof raw!=='string'||raw.length>1024)return undefined;
  try{
    const value:unknown=JSON.parse(raw);
    if(!object(value)||Object.keys(value).length!==3||value.version!==1||typeof value.enabled!=='boolean'||!object(value.learned))return undefined;
    const keys=Object.keys(value.learned);
    if(keys.length>ids.length||keys.some(key=>!ids.includes(key as FirstGestureId)||(value.learned as Record<string,unknown>)[key]!=='confirmed'&&(value.learned as Record<string,unknown>)[key]!=='declared'))return undefined;
    return {version:1,enabled:value.enabled,learned:{...value.learned}} as FirstGesturesLearningState;
  }catch{return undefined;}
}

declare const tokenBrand:unique symbol;
export interface FirstGestureToken {readonly [tokenBrand]:true}
export interface FirstGesturesLearningOptions {
  read:()=>string|null;write:(value:string)=>void|boolean;changed?:()=>void;
}
export type FirstGesturesLearning=ReturnType<typeof createFirstGesturesLearning>;

/** prepare precedes the real command; confirm is called only after its promise
 * resolves. A confirmed gesture is knowledge, never future work or production. */
export function createFirstGesturesLearning(options:FirstGesturesLearningOptions){
  let state=fresh(),saved=true,generation=0;
  const pending=new WeakMap<FirstGestureToken,{generation:number;id:FirstGestureId;area:boolean}>();
  try{const initial=parseFirstGesturesLearning(options.read());if(initial)state=initial;else saved=false;}catch{saved=false;}
  const current=()=>ids.find(id=>state.learned[id]===undefined);
  const persist=()=>{
    try{saved=options.write(JSON.stringify(state))!==false;}catch{saved=false;}
    // Presentation observers cannot turn accepted physical commands into failures.
    try{options.changed?.();}catch{/* Knowledge remains committed in RAM. */}
  };
  const cancelPending=()=>{generation++;};
  const learn=(id:FirstGestureId,origin:LearningOrigin)=>{
    if(state.learned[id]!==undefined)return false;
    state={...state,learned:{...state.learned,[id]:origin}};persist();return true;
  };
  return {
    get state(){return copy(state);},get current(){return current();},get saved(){return saved;},
    start(){if(state.enabled)return;state={...state,enabled:true};persist();},
    stop(){cancelPending();if(!state.enabled)return;state={...state,enabled:false};persist();},
    declareCurrentKnown(){const id=current();return state.enabled&&id!==undefined?learn(id,'declared'):false;},
    review(){cancelPending();if(!Object.keys(state.learned).length)return;state={...state,learned:{}};persist();},
    cancelPending,
    prepare(command:Command,world?:World):FirstGestureToken|undefined {
      if(!state.enabled)return undefined;
      let id:FirstGestureId|undefined,area=false;
      if(command.type==='area'){
        id=command.action==='stockpile'?'storage':command.action==='growing'?'cultivation':undefined;area=true;
      }else if(command.type==='designate'&&command.kind==='sleeping-spot')id='beds';
      else if(command.type==='priority'&&Number.isInteger(command.value)&&command.value>0&&command.value<=4&&!state.learned.work){
        const pawn=world?.pawns.find(p=>p.id===command.pawnId);
        if(pawn&&isColonist(pawn)&&!pawn.prisoner&&!pawn.visitor&&!pawn.raid&&!pawn.podRescue&&pawn.state!=='dead'&&!pawn.health?.death&&workPriority(pawn,command.work)!==command.value)id='work';
      }
      if(id===undefined||state.learned[id]!==undefined)return undefined;
      const token=Object.freeze({}) as FirstGestureToken;pending.set(token,{generation,id,area});return token;
    },
    confirm(token:FirstGestureToken|undefined,data?:string):boolean {
      if(!token)return false;
      const proof=pending.get(token);pending.delete(token);
      if(!proof||proof.generation!==generation||!state.enabled)return false;
      let result:Record<string,unknown>|undefined;
      if(data!==undefined){
        if(typeof data!=='string'||data.length>4096)return false;
        try{const parsed:unknown=JSON.parse(data);if(!object(parsed)||parsed.ok===false)return false;result=parsed;}catch{return false;}
      }
      if(proof.area&&(!result||!Number.isSafeInteger(result.affected)||(result.affected as number)<=0))return false;
      return learn(proof.id,'confirmed');
    },
  };
}
