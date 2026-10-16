import type { GroupCommand } from './group-state.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=1,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const exact=(v:Record<string,unknown>,keys:readonly string[])=>Reflect.ownKeys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const dense=(v:unknown,max:number):v is unknown[]=>Array.isArray(v)&&v.length<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.hasOwn(v,i)).every(Boolean);
const members=(v:unknown)=>dense(v,8)&&v.length>0&&v.every(id=>integer(id))&&new Set(v).size===v.length;
const lines=(v:unknown)=>dense(v,64)&&v.every(l=>object(l)&&exact(l,['pileId','quantity'])&&integer(l.pileId)&&integer(l.quantity))&&new Set(v.map(l=>(l as {pileId:number}).pileId)).size===v.length;
export function validGroupCommand(v:unknown,version=254):v is GroupCommand {
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
