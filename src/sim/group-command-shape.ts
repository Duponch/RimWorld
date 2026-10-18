import {validGroupCaravanCarryCommand256} from './group-caravan-carry-256.ts';
import {validGroupReorganizationCommand} from './group-reorganization-save.ts';
import type { GroupCommand } from './group-state.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=1,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const exact=(v:Record<string,unknown>,keys:readonly string[])=>Reflect.ownKeys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const dense=(v:unknown,max:number):v is unknown[]=>Array.isArray(v)&&v.length<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.hasOwn(v,i)).every(Boolean);
const members=(v:unknown,max=8)=>dense(v,max)&&v.length>0&&v.every(id=>integer(id))&&new Set(v).size===v.length;
const lines=(v:unknown,max=64)=>dense(v,max)&&v.every(l=>object(l)&&exact(l,['pileId','quantity'])&&integer(l.pileId)&&integer(l.quantity))&&new Set(v.map(l=>(l as {pileId:number}).pileId)).size===v.length;
export function validGroupCommand(v:unknown,version=254):v is GroupCommand {
 if(version>=256&&validGroupCaravanCarryCommand256(v))return true;
 if(version>=260&&object(v)&&v.type==='group-reform'){if(Object.getPrototypeOf(v)!==Object.prototype||Reflect.ownKeys(v).some(k=>typeof k!=='string'||!Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value')))return false;return exact(v,['type','originMapId','memberIds','sources','quote',...Object.hasOwn(v,'destination')?['destination']:[],...Object.hasOwn(v,'packedIds')?['packedIds']:[],...Object.hasOwn(v,'animalIds')?['animalIds']:[]])&&integer(v.originMapId,0)&&members(v.memberIds,Number.MAX_SAFE_INTEGER)&&lines(v.sources,Number.MAX_SAFE_INTEGER)&&typeof v.quote==='string'&&v.quote.length>0&&v.quote.length<=256&&(!Object.hasOwn(v,'destination')||integer(v.destination,0))&&['packedIds','animalIds'].every(k=>!Object.hasOwn(v,k)||dense(v[k],Number.MAX_SAFE_INTEGER)&&(v[k] as unknown[]).every(id=>integer(id))&&new Set(v[k] as unknown[]).size===(v[k] as unknown[]).length);}
 if(object(v)){const type=Object.getOwnPropertyDescriptor(v,'type');if(type&&Object.hasOwn(type,'value')&&(type.value==='group-split'||type.value==='group-merge'))return validGroupReorganizationCommand(v,version);}
 if(version>=256&&object(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'))){
  if(v.type==='group-start')return (!Object.hasOwn(v,'retreat261')||(version===261||(Number(version)===262||Number(version)===263))&&v.retreat261===true)&&exact(v,['type','originMapId','memberIds','destination','sources',...Object.hasOwn(v,'retreat261')?['retreat261']:[],...Object.hasOwn(v,'packedIds')?['packedIds']:[],...Object.hasOwn(v,'animalIds')?['animalIds']:[]])&&(!Object.hasOwn(v,'packedIds')||dense(v.packedIds,Number.MAX_SAFE_INTEGER)&&v.packedIds.every(id=>integer(id))&&new Set(v.packedIds).size===v.packedIds.length)&&(!Object.hasOwn(v,'animalIds')||dense(v.animalIds,Number.MAX_SAFE_INTEGER)&&v.animalIds.every(id=>integer(id))&&new Set(v.animalIds).size===v.animalIds.length)&&integer(v.originMapId,0)&&members(v.memberIds,Number.MAX_SAFE_INTEGER)&&integer(v.destination,0)&&lines(v.sources,Number.MAX_SAFE_INTEGER);
  if(v.type==='group-unload')return exact(v,['type','originMapId','memberIds',...Object.hasOwn(v,'groupId')?['groupId']:[],...Object.hasOwn(v,'animalIds')?['animalIds']:[]])&&(!Object.hasOwn(v,'animalIds')||dense(v.animalIds,Number.MAX_SAFE_INTEGER)&&v.animalIds.every(id=>integer(id))&&new Set(v.animalIds).size===v.animalIds.length)&&integer(v.originMapId,0)&&(!Object.hasOwn(v,'groupId')||integer(v.groupId))&&members(v.memberIds,Number.MAX_SAFE_INTEGER);
 }
 if(version>=255){if(!object(v)||Object.getPrototypeOf(v)!==Object.prototype||Reflect.ownKeys(v).some(k=>typeof k!=='string'||!Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value')))return false;const copy={...v};if(v.type==='planet-adopt')return exact(v,['type']);if(v.type==='group-start'){if(!integer(v.originMapId,0))return false;delete copy.originMapId;}else if(v.type==='group-unload'){if(!integer(v.originMapId,0))return false;delete copy.originMapId;if(Object.hasOwn(v,'groupId')){if(!integer(v.groupId))return false;delete copy.groupId;}}else{if(!integer(v.groupId))return false;delete copy.groupId;}if(copy.type==='group-start'||copy.type==='group-route'){if(!integer(copy.destination,0))return false;const destination=copy.destination;copy.destination=0;return validGroupCommand(copy,254)&&typeof destination==='number';}return validGroupCommand(copy,254);}
  if(!object(v))return false;
  switch(v.type){
    case 'planet-adopt':case 'group-cancel':return exact(v,['type']);
    case 'group-start':return exact(v,['type','memberIds','destination','sources'])&&members(v.memberIds)&&integer(v.destination,0,161)&&lines(v.sources);
    case 'group-pause':return exact(v,['type','paused'])&&typeof v.paused==='boolean';
    case 'group-route':return exact(v,['type','destination'])&&integer(v.destination,0,161);
    case 'group-unload':return exact(v,['type','memberIds'])&&members(v.memberIds);
    case 'group-buy':case 'group-sell':return exact(v,['type','lines','quote'])&&lines(v.lines)&&!!(v.lines as unknown[]).length&&typeof v.quote==='string'&&v.quote.length>0&&v.quote.length<=262144;
    default:return false;
  }
}
