import type { DestructionLedger } from './barriers.ts';
import type { ItemId } from './items.ts';
import type { ResourceKind,World } from './types.ts';

/** Prospective neutral losses, independent of recipe salvage and FireLedger.
 * Plan all additions before retiring a pile, body or plant. */
export function neutralLossPlan(w:World,changes:{items?:Partial<Record<ItemId,number>>;resources?:Partial<Record<ResourceKind,number>>;woodPotentialLost?:number}):DestructionLedger|null {
  if(w.schemaVersion<193)return null;
  const next:DestructionLedger={...w.destroyed,count:w.destroyed?.count??0,lost:{...w.destroyed?.lost}};
  for(const field of ['items','resources'] as const){
    const delta=changes[field];if(!delta)continue;
    const values:Record<string,number>={...next[field]};
    for(const [key,quantity] of Object.entries(delta)){
      if(typeof quantity!=='number'||!Number.isSafeInteger(quantity)||quantity<=0||!Number.isSafeInteger((values[key]??0)+quantity))return null;
      values[key]=(values[key]??0)+quantity;
    }
    if(Object.keys(values).length)next[field]=values;
  }
  if(changes.woodPotentialLost){
    if(!Number.isSafeInteger(changes.woodPotentialLost)||changes.woodPotentialLost<0||!Number.isSafeInteger((next.woodPotentialLost??0)+changes.woodPotentialLost))return null;
    next.woodPotentialLost=(next.woodPotentialLost??0)+changes.woodPotentialLost;
  }
  return next;
}
