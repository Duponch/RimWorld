import type {World} from './types.ts';
import type {PreparingGroup} from './group-capture.ts';
import {validGroupBedrollLoadingField256} from './group-bedroll-loading-256.ts';
const data=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
/** Inactive projection has references only. Full RAW binds every receipt to
 * its actual physical package; neither branch manufactures a missing owner. */
export function validPreparingGroupPacked256(g:PreparingGroup,w:World,version:number,referencesOnly:boolean):boolean {
 const d=Object.getOwnPropertyDescriptor(g,'bedrollLoading');if(!d)return true;if(version<256||!Object.hasOwn(d,'value')||!d.enumerable||!data(d.value)||Reflect.ownKeys(d.value).length!==2||d.value.revision!==1||!Array.isArray(d.value.manifest)||Object.getPrototypeOf(d.value.manifest)!==Array.prototype||Reflect.ownKeys(d.value.manifest).length!==d.value.manifest.length+1||d.value.manifest.length>w.nextId-1)return false;
 const ids=new Set<number>();let pending=false;for(let i=0;i<d.value.manifest.length;i++){const desc=Object.getOwnPropertyDescriptor(d.value.manifest,String(i));if(!desc||!Object.hasOwn(desc,'value')||!data(desc.value))return false;const r=desc.value;if(Reflect.ownKeys(r).length!==3||!Number.isSafeInteger(r.structureId)||Number(r.structureId)<1||Number(r.structureId)>=w.nextId||ids.has(Number(r.structureId))||!g.memberIds.includes(Number(r.carrierId))||typeof r.loaded!=='boolean')return false;ids.add(Number(r.structureId));if(!r.loaded)pending=true;else if(pending)return false;if(g.phase==='gathering'&&r.loaded)return false;}
 return !(g.phase==='leaving'&&pending)&&(referencesOnly||validGroupBedrollLoadingField256(g,w,version));
}