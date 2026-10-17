import {validGroupAdditionalFoodEffects256} from './group-animal-food-256.ts';
import {validGroupPackedBalanceShape256} from './group-packed-balance-256.ts';
import {validGroupForageRevision256,validGroupForageUnits256} from './group-forage-state-256.ts';
import type {GroupState} from './group-state.ts';
import type {GroupMemberOrigin,GroupReorganization,GroupTravelRevision} from './group-reorganization-state.ts';
import {validGroupInventoryVector,groupReorganizationBalance} from './group-reorganization-balance.ts';
type Away=Extract<GroupState,{members:unknown}>;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&(required.includes(k)||optional.includes(k)));
const dense=(v:unknown,max:number):v is unknown[]=>Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&v.length<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.hasOwn(v,i)&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,String(i))!,'value')).every(Boolean);
export function validGroupTravel(value:unknown,version:number):value is GroupTravelRevision|undefined {
 return value===undefined||version>=256&&object(value)&&keys(value,['revision','tickDelta','forage'])&&value.revision===1&&int(value.tickDelta,0,15)&&validGroupForageRevision256(value.forage);
}
/** The caller resolves each immutable header to the actual map/archive/group
 * authority. No user-supplied filth boolean is part of this format. */
export function validGroupMemberOrigin(value:unknown,pawnId:number,nextId:number,originAuthority:(origin:GroupMemberOrigin)=>boolean,version=256):value is GroupMemberOrigin {
 return object(value)&&keys(value,['pawnId','originMapId','context'],version===259?['enteredAtAbsCore']:[])&&(!Object.hasOwn(value,'enteredAtAbsCore')||version===259&&int(value.enteredAtAbsCore))&&value.pawnId===pawnId&&int(value.pawnId,1,nextId-1)&&int(value.originMapId)&&object(value.context)&&originAuthority(value as unknown as GroupMemberOrigin);
}
/** Closed shape before the arithmetic or any per-Pawn context is consumed. */
export function validGroupReorganization(value:unknown,g:Away,version:number,tick:number,nextId:number,originAuthority:(origin:GroupMemberOrigin)=>boolean):value is GroupReorganization|undefined {
 if(value===undefined)return true;
 if(version<256||!object(value)||!keys(value,['revision','openedAt','opening','effectsAtOpening','received','sent','memberOrigins'],['birth','pemmicanSinceOpening','foodSinceOpening','packed','inventoryEffects'])||value.revision!==1||!int(value.openedAt,g.departedAt,tick)
  ||!validGroupPackedBalanceShape256(value.packed,nextId)||Object.hasOwn(value,'inventoryEffects')&&!validGroupAdditionalFoodEffects256(value.inventoryEffects)||!validGroupInventoryVector(value.opening)||!validGroupInventoryVector(value.effectsAtOpening,true)||!validGroupInventoryVector(value.received)||!validGroupInventoryVector(value.sent)
  ||!dense(value.memberOrigins,g.members.length)||value.memberOrigins.length!==g.members.length)return false;
 const ids=new Set<number>();
 for(const entry of value.memberOrigins){if(!object(entry)||!int(entry.pawnId,1,nextId-1)||ids.has(entry.pawnId)||!g.members.some(p=>object(p)&&p.id===entry.pawnId)||!validGroupMemberOrigin(entry,entry.pawnId,nextId,originAuthority,version))return false;ids.add(entry.pawnId);}
 if(g.provisions){if(Object.hasOwn(value,'pemmicanSinceOpening'))return false;}
 else {const p=value.pemmicanSinceOpening;if(!object(p)||!keys(p,['consumed','spoiled'])||!int(p.consumed)||!int(p.spoiled))return false;}
 if(g.travel){if(Object.hasOwn(value,'foodSinceOpening'))return false;}
 else {const f=value.foodSinceOpening;if(!object(f)||!keys(f,['consumed','spoiled'])||!validGroupForageUnits256(f.consumed)||!validGroupForageUnits256(f.spoiled))return false;}
 const birth=value.birth;
 if(birth!==undefined&&(!object(birth)||!keys(birth,['kind','parentGroupId','at'])||birth.kind!=='split'||!int(birth.parentGroupId,1)||birth.parentGroupId===g.id||birth.at!==g.startedAt||birth.at!==g.departedAt||birth.at!==value.openedAt))return false;
 return true;
}
export function validGroupReorganizationCommand(value:unknown,version:number):boolean {
 if(version<256||!object(value))return false;
 if(value.type==='group-split')return keys(value,['type','groupId','memberIds','inventory'],['packedIds','animalIds'])&&(!Object.hasOwn(value,'animalIds')||dense(value.animalIds,Number.MAX_SAFE_INTEGER)&&value.animalIds.every(id=>int(id,1))&&new Set(value.animalIds).size===value.animalIds.length)&&(!Object.hasOwn(value,'packedIds')||dense(value.packedIds,Number.MAX_SAFE_INTEGER)&&value.packedIds.every(id=>int(id,1))&&new Set(value.packedIds).size===value.packedIds.length)&&int(value.groupId,1)&&dense(value.memberIds,Number.MAX_SAFE_INTEGER)&&value.memberIds.length>0&&value.memberIds.every(id=>int(id,1))&&new Set(value.memberIds).size===value.memberIds.length
  &&dense(value.inventory,Number.MAX_SAFE_INTEGER)&&value.inventory.every(l=>object(l)&&keys(l,['pileId','quantity'])&&int(l.pileId,1)&&int(l.quantity,1))&&new Set(value.inventory.map(l=>(l as {pileId:number}).pileId)).size===value.inventory.length;
 return value.type==='group-merge'&&keys(value,['type','groupIds'])&&dense(value.groupIds,Number.MAX_SAFE_INTEGER)&&value.groupIds.length>=2&&value.groupIds.every(id=>int(id,1))&&new Set(value.groupIds).size===value.groupIds.length;
}
export {groupReorganizationBalance};