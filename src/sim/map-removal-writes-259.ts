import type {RemovedMapAreaPlan} from './pawn-map-areas.ts';
/** Only preflighted area/bed alias writes in this ONE removal transaction. */
export interface MapRemovalWrite259 {object:object;key:string;present:boolean;value?:unknown}
export function areaRemovalWrites259(plan:RemovedMapAreaPlan):MapRemovalWrite259[]{return plan.updates.flatMap(u=>[...u.next?[{object:u.pawn,key:'mapAreas',present:true,value:u.next}]:[],...u.clearAlias?[{object:u.pawn,key:'allowedAreaId',present:false},{object:u.pawn,key:'allowedAreaReturn',present:false}]:[]]);}
export function removalWritesMutable259(writes:readonly MapRemovalWrite259[]):boolean{return writes.every(w=>{const d=Object.getOwnPropertyDescriptor(w.object,w.key);return d?Object.hasOwn(d,'value')&&(w.present?d.writable===true:d.configurable===true):!w.present||Object.isExtensible(w.object);});}
export function removalWritesApplied259(writes:readonly MapRemovalWrite259[]):boolean{return writes.every(w=>{const d=Object.getOwnPropertyDescriptor(w.object,w.key);return w.present?!!d&&d.enumerable===true&&Object.hasOwn(d,'value')&&Object.is(d.value,w.value):!d;});}
/** Identity/descriptor seal over ORIGINAL links, allowing only the declared
 * writes after their actual phase. Same-value actor/item/health replacement
 * still fails. Unlinked old objects and new area records remain sealed too. */
export function sealRemovalOriginal259(value:object,areas:readonly MapRemovalWrite259[],beds:readonly MapRemovalWrite259[]):(phase:0|1|2)=>boolean{
 const seen=new Set<object>(),links:{owner:object;keys:PropertyKey[];descriptors:PropertyDescriptor[]}[]=[],todo=[value];
 // Seal each desired object value as well, so a mutated areaPlan.next is
 // never blessed later. Other actors are not pulled into this holder's seal.
 for(const w of [...areas,...beds])if(w.value&&typeof w.value==='object')todo.push(w.value);
 while(todo.length){const owner=todo.pop()!;if(seen.has(owner))continue;seen.add(owner);const keys=Reflect.ownKeys(owner),descriptors=keys.map(k=>{const d=Object.getOwnPropertyDescriptor(owner,k)!;if(!Object.hasOwn(d,'value'))throw Error('Actual removal source must be data-only');return d;});links.push({owner,keys,descriptors});for(const d of descriptors)if(d.value&&typeof d.value==='object')todo.push(d.value);}
 return phase=>{const writes=phase===0?[]:phase===1?areas:[...areas,...beds],byObject=new Map<object,Map<string,MapRemovalWrite259>>();for(const w of writes){let fields=byObject.get(w.object);if(!fields){fields=new Map();byObject.set(w.object,fields);}fields.set(w.key,w);}
  return links.every(({owner,keys,descriptors})=>{const fields=byObject.get(owner),expected=keys.filter(k=>!(typeof k==='string'&&fields?.get(k)?.present===false));for(const [key,w] of fields??[])if(w.present&&!expected.includes(key))expected.push(key);const actual=Reflect.ownKeys(owner);if(actual.length!==expected.length||actual.some((k,i)=>k!==expected[i]))return false;
   return expected.every(k=>{const d=Object.getOwnPropertyDescriptor(owner,k)!,w=typeof k==='string'?fields?.get(k):undefined;if(w)return Object.hasOwn(d,'value')&&d.enumerable===true&&Object.is(d.value,w.value);const before=descriptors[keys.indexOf(k)]!;return Object.hasOwn(d,'value')&&d.enumerable===before.enumerable&&d.writable===before.writable&&d.configurable===before.configurable&&Object.is(d.value,before.value);});});
 };
}
