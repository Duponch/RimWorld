/** A local held inventory's biological clock comes from its ACTUAL holder,
 * never an item claim, knowledge row or caller-supplied permission. Full held
 * owner and namespace guards remain mandatory at the RAW/Decoder frontier. */
import type {World} from './types.ts';
const data=(v:unknown,k:string):unknown=>{if(!v||typeof v!=='object')return;const d=Object.getOwnPropertyDescriptor(v,k);return d&&Object.hasOwn(d,'value')?d.value:undefined;};
export function heldDuckInventoryClock256(world:Partial<Pick<World,'wildlife'>>,pile:unknown,version:number,fallback:number):number {
 if(version<256)return fallback;const owner=data(pile,'owner');
 if(data(owner,'type')!=='inventory')return fallback;const id=data(owner,'pawnId');
 if(typeof id!=='number'||!Number.isSafeInteger(id)||id<1)return fallback;
 const flyers=data(data(world,'wildlife'),'flyers');if(!Array.isArray(flyers))return fallback;
 let clock:number|undefined;
 for(let i=0;i<flyers.length;i++){
  const holder=data(flyers,String(i));if(data(data(holder,'animal'),'id')!==id)continue;
  const tick=data(holder,'personalTick');if(clock!==undefined||typeof tick!=='number'||!Number.isSafeInteger(tick)||tick<0||tick>fallback)return fallback;
  clock=tick;
 }
 return clock??fallback;
}
