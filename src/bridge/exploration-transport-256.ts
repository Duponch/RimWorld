import {isSchema256Or257} from '../sim/schema-compatibility-257.ts';
/** Door-reference witnesses are transport metadata only. They never enter World
 * or a save, and are captured from actual owners in the worker. */
import {heldDuckAnimal256} from '../sim/duck-owner-capture-256.ts';
import {validateDuckFlyers256} from '../sim/duck-flyer-save-256.ts';
import {actualExplorationAffiliation256,captureActualExplorationApproachers256} from '../sim/exploration-actors-256.ts';
import type {ExplorationApproacher256,ResolveExplorationApproacher256} from '../sim/exploration-door-256.ts';
import {explorationEnabled256} from '../sim/exploration-state-256.ts';
import type {World} from '../sim/types.ts';
const key='explorationApproachers';
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function datum(v:object,k:string):{present:boolean;ok:boolean;value:unknown}{
 const d=Object.getOwnPropertyDescriptor(v,k);return d?{present:true,ok:Object.hasOwn(d,'value')&&d.enumerable===true,value:Object.hasOwn(d,'value')?d.value:undefined}:{present:k in v,ok:!(k in v),value:undefined};
}
function references(w:World):number[]|undefined {
 if(!Array.isArray(w.structures))return;
 const ids=new Set<number>();
 for(const s of w.structures){
  if(!plain(s))return;const door=datum(s,'door');if(!door.ok)return;
  if(!door.present)continue;if(!plain(door.value))return;
  const ref=datum(door.value,'explorationApproacherId');if(!ref.ok)return;
  if(!ref.present)continue;
  if(!explorationEnabled256(w)||(typeof s.kind!=='string'||!['door','fence-gate','autodoor'].includes(s.kind))||typeof ref.value!=='number'||!Number.isSafeInteger(ref.value)||ref.value<1||ref.value>=w.nextId)return;
  ids.add(ref.value);
 }
 return [...ids].sort((a,b)=>a-b);
}
function rows(packet:object,version:number):ExplorationApproacher256[]|null|undefined {
 const field=datum(packet,key);if(!field.ok)return;
 if(!field.present)return null;
 if(!isSchema256Or257(version)||!Array.isArray(field.value)||Object.getPrototypeOf(field.value)!==Array.prototype)return;
 const values=field.value;if(Reflect.ownKeys(values).length!==values.length+1)return;
 const out:ExplorationApproacher256[]=[];let last=0;
 for(let i=0;i<values.length;i++){
  const cell=datum(values,String(i));if(!cell.ok||!cell.present||!plain(cell.value))return;
  const r=cell.value;if(Reflect.ownKeys(r).length!==3)return;
  const id=datum(r,'id'),player=datum(r,'playerOwned'),host=datum(r,'hostPlayer');
  if(!id.ok||!id.present||!player.ok||!player.present||!host.ok||!host.present||typeof id.value!=='number'||!Number.isSafeInteger(id.value)||id.value<=last||typeof player.value!=='boolean'||typeof host.value!=='boolean')return;
  last=id.value;out.push({id:id.value,playerOwned:player.value,hostPlayer:host.value});
 }
 return out;
}
/** Descriptor admission precedes spread/structured cloning of a packet. */
export function validExplorationTransportEnvelope256(packet:object,version:number):boolean {return rows(packet,version)!==undefined;}
export function captureExplorationTransport256(actual:World,view:World):ExplorationApproacher256[]|undefined {
 const ids=references(view);if(!ids)throw Error('Invalid actual exploration door references');if(!ids.length)return;
 let resolve:ResolveExplorationApproacher256|undefined;
 return ids.map(id=>{
  const local=view.pawns.find(p=>p.id===id)??(Array.isArray(view.wildlife?.animals)?view.wildlife.animals.find(a=>a.id===id):undefined)??heldDuckAnimal256(view,id)??(Array.isArray(view.mechanoids)?view.mechanoids.find(a=>a.id===id):undefined);
  const row=local?actualExplorationAffiliation256(local):(resolve??=captureActualExplorationApproachers256(actual))(id);
  if(!row)throw Error('Missing actual exploration door approach owner');
  return {id:row.id,playerOwned:row.playerOwned,hostPlayer:row.hostPlayer};
 });
}
export function prepareExplorationTransport256(packet:object,w:World):{ok:true;resolve:ResolveExplorationApproacher256}|{ok:false}{
 const refs=references(w),values=rows(packet,w.schemaVersion);if(!refs||values===undefined||Object.hasOwn(w,key))return {ok:false};
 if(!refs.length)return values===null?{ok:true,resolve:()=>undefined}:{ok:false};
 if(!values||values.length!==refs.length||validateDuckFlyers256(w,w.schemaVersion).length)return {ok:false};
 const byId=new Map<number,ExplorationApproacher256>();
 for(let i=0;i<refs.length;i++){
  const id=refs[i]!,row=values[i]!;if(row.id!==id||id>=w.nextId)return {ok:false};
  const local=w.pawns.find(p=>p.id===id)??(Array.isArray(w.wildlife?.animals)?w.wildlife.animals.find(a=>a.id===id):undefined)??heldDuckAnimal256(w,id)??(Array.isArray(w.mechanoids)?w.mechanoids.find(a=>a.id===id):undefined);
  if(local){const real=actualExplorationAffiliation256(local);if(real.playerOwned!==row.playerOwned||real.hostPlayer!==row.hostPlayer)return {ok:false};}
  else if(w.resources.some(v=>v.id===id)||w.piles.some(v=>v.id===id)||w.structures.some(v=>v.id===id)||w.jobs.some(v=>v.id===id)||w.packed.some(v=>v.building.id===id))return {ok:false};
  byId.set(id,Object.freeze(row));
 }
 return {ok:true,resolve:id=>byId.get(id)};
}
