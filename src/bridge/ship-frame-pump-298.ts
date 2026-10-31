import {SHIP_FRAME_BATCH_LIMIT_298,SHIP_FRAME_MAXIMUM_DELTA_298,type ShipLightRequest298,type ShipFrameRequest298,type ShipRuntimeResponse298} from './ship-countdown-wire-298.ts';

export interface ShipClientCountdownState298 {
 readonly ownerEpoch:number;readonly generation:number;readonly active:boolean;readonly feeding:boolean;readonly suspended:boolean;
 readonly outcome:'idle'|'waiting'|'cancelling'|'cancelled'|'departed'|'refused'|'unknown';readonly reason?:string;
}
export interface ShipLaunchResult298 {readonly ok:true;readonly ownerEpoch:number;readonly generation:number;readonly active:true}
const positive=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
const natural=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const field=(v:object,k:string)=>{const d=Object.getOwnPropertyDescriptor(v,k);return d?.enumerable===true&&Object.hasOwn(d,'value')?d.value:undefined;};
function plain(v:unknown,required:readonly string[],optional:readonly string[]=[]):v is Record<string,unknown>{
 return !!v&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype&&required.every(k=>Object.hasOwn(v,k)&&Object.getOwnPropertyDescriptor(v,k)?.enumerable===true&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'))
  &&Reflect.ownKeys(v).every(k=>typeof k==='string'&&(required.includes(k)||optional.includes(k))&&Object.getOwnPropertyDescriptor(v,k)?.enumerable===true&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
}

/** Pure local transport state. Identity is the actual host Worker object, not
 * an epoch supplied by a caller. No World, timer, Promise, clock or posting. */
export function createShipFramePump298<Identity extends object>(){
 let worker:Identity|undefined,ownerEpoch=0,generation=0,active=false,blocked=false,sequence=0,revision=0;
 let outcome:ShipClientCountdownState298['outcome']='idle',reason:string|undefined,cold:object|undefined;
 let flight:{sequence:number;count:number}|undefined,cancelling:{ownerEpoch:number;generation:number;reason:'menu'|'front'|'transport'}|undefined;
 const queue:number[]=[]; // Includes the flight: one TOTAL unacknowledged512 budget.
 const bound=(source:Identity)=>source===worker;
 const feeding=()=>!!worker&&ownerEpoch>0&&active&&!blocked&&!cold&&!cancelling;
 const clear=()=>{queue.length=0;flight=undefined;active=false;blocked=false;sequence=0;};
 const set=(next:ShipClientCountdownState298['outcome'],message?:string)=>{outcome=next;reason=message;revision++;};
 const abort=(message:string)=>{clear();cold=undefined;cancelling=undefined;blocked=true;set('unknown',message);};
 const cancel=(source:Identity,why:'menu'|'front'|'transport'):ShipLightRequest298|undefined=>{
  if(!bound(source)||!positive(ownerEpoch)||cancelling)return;
  const old={ownerEpoch,generation,reason:why};clear();cancelling=old;set(why==='transport'?'unknown':'cancelling',why==='transport'?'La continuité des frames a été interrompue.':undefined);
  return {type:'ship-cancel-298',...old};
 };
 const nextBatch=():ShipFrameRequest298|undefined=>{
  if(!active||blocked||flight||cancelling||!queue.length)return;
  if(!positive(sequence+1)){abort('La séquence terminale est épuisée.');return;}
  flight={sequence:sequence+1,count:queue.length};
  return {type:'ship-frame-298',ownerEpoch,generation,sequence:flight.sequence,deltas:queue.slice(0,flight.count)};
 };
 const adoptOwner=(source:Identity,next:number):boolean=>{
  if(!bound(source)||!positive(next)||next<ownerEpoch)return false;
  if(next===ownerEpoch)return true;
  clear();cold=undefined;cancelling=undefined;ownerEpoch=next;generation=0;set('idle');return true;
 };
 return {
  get ownerEpoch(){return ownerEpoch;},get generation(){return generation;},get revision(){return revision;},get feeding(){return feeding();},
  state():ShipClientCountdownState298{return {ownerEpoch,generation,active,feeding:feeding(),suspended:active&&!feeding(),outcome,...reason?{reason}:{}};},
  bindWorker(next:Identity|undefined):void {clear();worker=next;ownerEpoch=0;generation=0;cold=undefined;cancelling=undefined;set('idle');},
  adoptOwner,
  acceptLaunch(source:Identity,input:unknown):ShipLaunchResult298|undefined {
   if(!bound(source)||!plain(input,['ok','ownerEpoch','generation','active'])||input.ok!==true||input.active!==true||input.ownerEpoch!==ownerEpoch||!positive(input.generation)||input.generation<=generation||cancelling?.reason==='transport')return;
   clear();cancelling=undefined;generation=input.generation;active=true;set('waiting');return {ok:true,ownerEpoch,generation,active:true};
  },
  /** One opaque cold ticket per reserved ordinary Request. Kept while the old
   * flight drains; a real owner/Worker replacement invalidates it. */
  beginCold(source:Identity):object {
   if(!bound(source)||cold)throw Error('Une frontière terminale attend déjà sa décision.');cold=Object.freeze({});revision++;return cold;
  },
  isCurrentCold(source:Identity,ticket:object):boolean{return bound(source)&&cold===ticket;},
  drained(source:Identity,ticket:object):boolean{return bound(source)&&cold===ticket&&!flight&&!queue.length&&!cancelling;},
  finishCold(source:Identity,ticket:object):boolean {if(!bound(source)||cold!==ticket)return false;cold=undefined;revision++;return true;},
  feed(source:Identity,delta:number):ShipLightRequest298|undefined {
   if(!bound(source)||!feeding())return;
   if(typeof delta!=='number'||!Number.isFinite(delta)||delta<0||queue.length>=SHIP_FRAME_BATCH_LIMIT_298)return cancel(source,'transport');
   queue.push(Math.fround(Math.min(delta,SHIP_FRAME_MAXIMUM_DELTA_298)));return nextBatch();
  },
  cancel,
  abortUnknown(source:Identity,message:string):void {if(bound(source))abort(message);},
  /** Called only at the explicit end of a real preparation, never on a timer
   * or each frame. Retry preserves the SAME sequence and original values. */
  resumeAfterPreparation(source:Identity):ShipFrameRequest298|undefined {
   if(!bound(source)||!active||!blocked||!flight||cancelling)return;
   blocked=false;set('waiting');return {type:'ship-frame-298',ownerEpoch,generation,sequence:flight.sequence,deltas:queue.slice(0,flight.count)};
  },
  /** undefined = stale/unrecognised, so host must not post OR wake a drain.
   * null = consumed current reply with no next message. */
  receive(source:Identity,input:ShipRuntimeResponse298):ShipLightRequest298|null|undefined {
   if(!bound(source)||!input||typeof input!=='object')return;
   if(field(input,'type')==='ship-frame-ack-298'&&input.type==='ship-frame-ack-298'){
    if(!plain(input,['type','ownerEpoch','generation','sequence','accepted','active','outcome'],['departureId','reason'])||!flight||cancelling||input.ownerEpoch!==ownerEpoch||input.generation!==generation||input.sequence!==flight.sequence||typeof input.accepted!=='boolean'||typeof input.active!=='boolean'||!['waiting','departed','refused','unknown'].includes(input.outcome)||input.reason!==undefined&&typeof input.reason!=='string')return;
    if(input.outcome==='unknown'){abort(input.reason??'Le résultat du countdown reste inconnu.');return null;}
    if(!input.accepted){
     if(input.outcome!=='refused')return;
     if(input.active){blocked=true;set('refused',input.reason);return null;}
     clear();set('refused',input.reason);return null;
    }
    if(input.outcome==='waiting'&&!input.active||input.outcome!=='waiting'&&input.active||input.outcome==='departed'&&!positive(input.departureId))return;
    queue.splice(0,flight.count);sequence=flight.sequence;flight=undefined;
    if(input.outcome==='waiting'){blocked=false;return nextBatch()??null;}
    clear();set(input.outcome,input.reason);return null;
   }
   if(field(input,'type')!=='ship-countdown-state-298'||input.type!=='ship-countdown-state-298'||!plain(input,['type','ownerEpoch','generation','active','outcome'],['reason'])||!cancelling||typeof input.active!=='boolean'||input.active||!natural(input.generation)||input.reason!==undefined&&typeof input.reason!=='string')return;
   const prior=cancelling;
   if(prior.reason==='transport'&&input.outcome==='unknown'&&positive(input.ownerEpoch)&&input.ownerEpoch>prior.ownerEpoch&&input.generation===0){adoptOwner(source,input.ownerEpoch);set('unknown',input.reason);return null;}
   if(input.ownerEpoch!==ownerEpoch||input.ownerEpoch!==prior.ownerEpoch||input.generation<generation||input.generation<prior.generation||!['cancelled','refused','unknown'].includes(input.outcome)||input.outcome==='cancelled'&&input.generation<=prior.generation)return;
   clear();generation=input.generation;cancelling=undefined;set(input.outcome,input.reason);return null;
  },
 };
}
