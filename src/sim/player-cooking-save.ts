import type { World } from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
/** Initial gathered/placed reservations only; a queued cook cannot hold items. */
export function validCookingOrder(value:unknown,world:World):boolean {
  if(!record(value)||Object.keys(value).length!==1||!record(value.cooking))return false;
  const c=value.cooking,cell=(x:unknown)=>record(x)&&integer(x.x,0,world.width-1)&&integer(x.z,0,world.height-1);
  if(Object.keys(c).some(k=>!['stationId','billId','spot','actionCell','phase','ingredients','progress','productId','storageId'].includes(k))
    ||!integer(c.stationId,1)||!integer(c.billId,1)||!cell(c.spot)||!cell(c.actionCell)||c.phase!=='gather'||c.progress!==0||c.productId!==null||c.storageId!==null||!Array.isArray(c.ingredients)||c.ingredients.length<1||c.ingredients.length>10)return false;
  const ids=new Set<number>();let total=0;
  for(const i of c.ingredients) {
    if(!record(i)||!integer(i.pileId,1)||!integer(i.quantity,1,10)||!['rice','berries'].includes(String(i.item))||!['source','placed'].includes(String(i.stage))||!cell(i.cell)||ids.has(Number(i.pileId))||Object.keys(i).some(k=>!['pileId','item','quantity','stage','cell'].includes(k)))return false;
    ids.add(Number(i.pileId));total+=Number(i.quantity);
  }
  return total===10;
}
