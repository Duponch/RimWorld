import type {World} from './types.ts';
import type {CampaignState} from './world-map-state.ts';
import {captureLocalMap,registeredMap} from './world-map-context.ts';
/** Ephemeral admission of the existing flush/retirement recipients. It seals
 * actual bindings and descriptors, without traversing/copying terrain or
 * relaxing the holder/area/bed seals. Used only BEFORE the first Reform write. */
export function prepareReformRetirementSurface260(root:CampaignState,map:World,mapId:number,retiring:boolean):()=>boolean {
 const maps=root.worldMaps!,groups=root.worldGroups!,record=maps.sites.find(s=>s.id===mapId)!;
 const surfaces:{object:object;keys:PropertyKey[];descriptors:PropertyDescriptor[]}[]=[],seen=new Set<object>();
 const capture=(object:object)=>{if(seen.has(object))return;seen.add(object);const keys=Reflect.ownKeys(object),descriptors=keys.map(k=>Object.getOwnPropertyDescriptor(object,k)!);surfaces.push({object,keys,descriptors});};
 const writable=(object:object,key:PropertyKey,remove=false)=>{const d=Object.getOwnPropertyDescriptor(object,key);if(d? !Object.hasOwn(d,'value')|| (remove?d.configurable!==true:d.writable!==true):!remove&&!Object.isExtensible(object))throw Error('Reform target is not mutable before admission');capture(object);};
 const array=(a:unknown[])=>{if(!Object.isExtensible(a)||Reflect.ownKeys(a).some(k=>{const d=Object.getOwnPropertyDescriptor(a,k)!;return !Object.hasOwn(d,'value')||d.writable!==true||k!=='length'&&d.configurable!==true;}))throw Error('Reform registry array is not mutable');capture(a);};
 const flush=(source:World,target:object)=>{const local=captureLocalMap(source);for(const key of Object.keys(local))writable(target,key);for(const key of Object.keys(captureLocalMap(target as World)))if(!Object.hasOwn(local,key))writable(target,key,true);};
 // flushRegisteredMap executes even when another live colonist retains Camp.
 const body=mapId===maps.rootMapId?root:record.map!;flush(map,body);
 writable(groups,'events');array(groups.events);
 if(retiring){
  for(const key of ['lostMemories','groups','selectedGroupId','abandonedContents'] as const)writable(groups,key);
  array(groups.abandonedContents);array(maps.retired);
  for(const key of ['sites','rootMapId','selectedMapId'] as const)writable(maps,key);
  capture(maps.sites);for(const s of maps.sites)capture(s);
  if(maps.rootMapId===mapId){
   // Exact existing promotion/clear targets, determined before admission.
   const other=maps.sites.filter(s=>s.id!==mapId).sort((a,b)=>a.id-b.id)[0];
   for(const key of Object.keys(captureLocalMap(root as World)))writable(root,key,true);
   if(other){const next=registeredMap(root,other.id)!;flush(next,other.map!);writable(record,'map');writable(other,'map',true);for(const key of Object.keys(captureLocalMap(next)))writable(root,key);}
  }
 }
 const state=root.worldPawns,registry=root.worldGroups,worldMaps=root.worldMaps;
 return ()=>root.worldPawns===state&&root.worldGroups===registry&&root.worldMaps===worldMaps&&surfaces.every(({object,keys,descriptors})=>{const actual=Reflect.ownKeys(object);return actual.length===keys.length&&actual.every((k,i)=>k===keys[i]&&(()=>{const a=Object.getOwnPropertyDescriptor(object,k)!,b=descriptors[i]!;return a.enumerable===b.enumerable&&a.configurable===b.configurable&&a.writable===b.writable&&a.get===b.get&&a.set===b.set&&Object.is(a.value,b.value);})());});
}
