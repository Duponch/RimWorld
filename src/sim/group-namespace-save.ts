import {isMinifiedTree} from './tree-transfer-state.ts';
import type { World } from './types.ts';
import type { NumericMembershipSink } from './numeric-membership.ts';
import { civilianAwayCounts } from './civilian-away.ts';

/** Register new real owners after legacy owners have registered themselves.
 * References, geographic IDs and group IDs never enter the Thing namespace. */
export function registerGroupThingIds(w:World,ids:NumericMembershipSink):string[] {
  const errors:string[]=[],g=w.group;
  const add=(id:number)=>{if(!Number.isSafeInteger(id)||id<1||id>=w.nextId||ids.has(id))errors.push('Duplicate or invalid group Thing owner.');else ids.add(id);};
  if(g&&'members' in g){for(const p of g.members)add(p.id);for(const a of g.animalOwners?.members??[])add(a.id);for(const i of g.items){add(i.id);if(i.owner.type==='inventory'&&g.animalOwners?.members.some(a=>a.id===('pawnId'in i.owner?i.owner.pawnId:undefined))&&isMinifiedTree(i)){if(!i.innerResource)errors.push('Missing animal-contained tree original.');else add(i.innerResource.id);}}for(const p of g.packed??[]){add(p.building.id);if(w.schemaVersion>=258){for(const b of p.building.bills??[])add(b.id);for(const id of p.building.shelf?.cells??[])add(id);}}}
  for(const loss of w.groupLosses??[]){add(loss.pawn.id);for(const i of loss.items)add(i.id);for(const p of loss.packed??[]){add(p.building.id);if(w.schemaVersion>=258){for(const b of p.building.bills??[])add(b.id);for(const id of p.building.shelf?.cells??[])add(id);}}}
  const away=civilianAwayCounts(w);
  if(w.pawns.length+away.people>w.width*w.height)errors.push('Active group population exceeds the shared admission bound.');
  if(w.piles.length+away.piles>32768)errors.push('Active group piles exceed the shared admission bound.');
  return errors;
}
