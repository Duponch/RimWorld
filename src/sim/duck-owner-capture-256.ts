/** Actual skyfaller originals. Read-only metadata, never a second animal
 * owner, local World, inherited species proxy or generated identity. */
import type {World} from './types.ts';
import type {DuckFlyer256} from './duck-flyer-state-256.ts';
import type {WildAnimal} from './wildlife-state.ts';
export interface ActualDuckFlyerOwner256 {
 readonly holder:DuckFlyer256;readonly holderId:number;readonly animal:WildAnimal;
 readonly personalTick:number;readonly cell:DuckFlyer256['cell'];readonly kind:DuckFlyer256['kind'];
}
export function captureDuckFlyerOwners256(w:Pick<World,'wildlife'>):ActualDuckFlyerOwner256[] {
 return (w.wildlife?.flyers??[]).map(holder=>({holder,holderId:holder.id,animal:holder.animal,personalTick:holder.personalTick,cell:holder.cell,kind:holder.kind}));
}
export function heldDuckAnimal256(w:Pick<World,'wildlife'>,id:number):WildAnimal|undefined {
 // A pile can be inspected before the complete flyer guard in transport.
 // Read only data descriptors here; malformed owner shapes are refused by
 // that full guard, without invoking an accessor while seeking the original.
 const field=Object.getOwnPropertyDescriptor(w,'wildlife'),wildlife=field&&'value'in field?field.value:undefined;
 const rows=wildlife&&typeof wildlife==='object'?Object.getOwnPropertyDescriptor(wildlife,'flyers'):undefined;
 const flyers=rows&&'value'in rows?rows.value:undefined;if(!Array.isArray(flyers))return;
 let found:WildAnimal|undefined;
 for(let i=0;i<flyers.length;i++){
  const cell=Object.getOwnPropertyDescriptor(flyers,String(i)),f=cell&&'value'in cell?cell.value:undefined;
  const a=f&&typeof f==='object'?Object.getOwnPropertyDescriptor(f,'animal'):undefined,animal=a&&'value'in a?a.value:undefined;
  const identity=animal&&typeof animal==='object'?Object.getOwnPropertyDescriptor(animal,'id'):undefined;
  if(identity&&'value'in identity&&identity.value===id){if(found)return;found=animal as WildAnimal;}
 }
 return found;
}
/** MapPawns.AllPawnsUnspawned includes living contained Pawn originals.
 * MapDeiniter transfers them, not their retired local skyfaller holder.
 * Dead contents/corpses are deliberately NOT reclassified as living WorldPawns.
 * Existing held-Duck guards admit no dead content; this is not a corpse adapter. */
export function captureDuckMapRemovedOwners256(w:Pick<World,'schemaVersion'|'tick'|'wildlife'>):{animal:WildAnimal;clock:number}[] {
 if(w.schemaVersion<256)return [];
 const rows:{animal:WildAnimal;clock:number}[]=[];
 for(const f of w.wildlife?.flyers??[]){
  if(!Number.isSafeInteger(f.personalTick)||f.personalTick<0||f.personalTick>w.tick)throw Error('Invalid real Duck holder personal clock');
  if(f.animal.state==='dead'||f.animal.health?.death)continue;
  rows.push({animal:f.animal,clock:f.personalTick});
 }
 return rows;
}
