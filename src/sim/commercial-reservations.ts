import type { World } from './types.ts';

/** Remaining ground sources only. Already collected inventory is a different
 * owner and cannot be claimed a second time by map work. */
export function commercialReservedQuantity(w:World,pileId:number,exceptPawn?:number):number {
  const t=w.commercialTrip;
  if(t?.phase!=='loading'||t.pawnId===exceptPawn)return 0;
  let quantity=0;
  for(let i=t.cursor;i<t.manifest.length;i++){
    const source=t.manifest[i]!;
    if(source.sourcePileId===pileId&&source.carriedPileId===undefined)quantity+=source.quantity;
  }
  return quantity;
}
export function commercialReservedSources(w:World,exceptPawn?:number):ReadonlyMap<number,number> {
  const quantities=new Map<number,number>(),t=w.commercialTrip;
  if(t?.phase!=='loading'||t.pawnId===exceptPawn)return quantities;
  for(let i=t.cursor;i<t.manifest.length;i++){
    const source=t.manifest[i]!;
    if(source.carriedPileId===undefined)quantities.set(source.sourcePileId,(quantities.get(source.sourcePileId)??0)+source.quantity);
  }
  return quantities;
}
