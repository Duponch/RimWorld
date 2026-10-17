import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Guards add no geyser/timer during old migration or load. */
import type {LocalGeysers256} from './local-geyser-state-256.ts';
const plain=(v:unknown):v is object=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function own(v:object,k:string):{present:boolean;valid:boolean;value:unknown}{const d=Object.getOwnPropertyDescriptor(v,k);return d?{present:true,valid:Object.hasOwn(d,'value')&&d.enumerable===true,value:Object.hasOwn(d,'value')?d.value:undefined}:{present:k in v,valid:!(k in v),value:undefined};}
const integer=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export function validLocalGeyserState256(value:unknown,width:number,height:number,tick:number,nextId:number):value is LocalGeysers256 {
 if(!integer(width,2,400)||!integer(height,2,400)||!integer(tick,0,Math.floor(Number.MAX_SAFE_INTEGER/10))||!integer(nextId,1,2147483647))return false;
 if(!plain(value)||Reflect.ownKeys(value).length!==3||!['revision','atTick','items'].every(k=>own(value,k).valid&&own(value,k).present)||own(value,'revision').value!==1||own(value,'atTick').value!==tick)return false;
 const a=own(value,'items').value;if(!Array.isArray(a)||Reflect.ownKeys(a).length!==a.length+1||a.length>width*height)return false;
 let last=0;const cells=new Set<number>();
 for(let i=0;i<a.length;i++){const d=own(a,String(i)),g=d.value;if(!d.valid||!d.present||!plain(g)||Reflect.ownKeys(g).length!==5)return false;
  const fields=['id','x','z','ticksUntilSpray','sprayTicksLeft'];if(!fields.every(k=>own(g,k).valid&&own(g,k).present))return false;
  const id=own(g,'id').value,x=own(g,'x').value,z=own(g,'z').value,wait=own(g,'ticksUntilSpray').value,left=own(g,'sprayTicksLeft').value;
  if(!integer(id,last+1,Math.min(nextId-1,2147483647))||!integer(x,0,width-2)||!integer(z,0,height-2)||!integer(wait,0,2000)||!integer(left,0,500)||(left>0?wait!==0:wait===0))return false;
  last=id;for(const c of [z*width+x,z*width+x+1,(z+1)*width+x,(z+1)*width+x+1]){if(cells.has(c))return false;cells.add(c);}
 }return true;
}
/** Full RAW admission supplies actual local Site3 and shared identity frontier.
 * All identity collisions with other real owners are checked centrally too. */
export function validLocalGeyserHeader256(raw:unknown,version:number,width:number,height:number,tick:number,nextId:number,site3:boolean):boolean {
 if(!plain(raw))return false;const d=own(raw,'geysers');if(!d.valid)return false;
 if(version<=255||!site3)return !d.present;
 return isSchema256Or257(version)&&d.present&&validLocalGeyserState256(d.value,width,height,tick,nextId);
}
/** Called after the shape guard, on the same global validation namespace used
 * by real pawns, structures, resources, piles and inactive local owners. */
export function registerGeyserIdentities256(state:LocalGeysers256,ids:{has(id:number):boolean;add(id:number):unknown}):boolean {
 const incoming=new Set<number>();for(const g of state.items){if(ids.has(g.id)||incoming.has(g.id))return false;incoming.add(g.id);}for(const id of incoming)ids.add(id);return true;
}
