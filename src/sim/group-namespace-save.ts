import type { World } from './types.ts';

/** Register new real owners after legacy owners have registered themselves.
 * References, geographic IDs and group IDs never enter the Thing namespace. */
export function registerGroupThingIds(w:World,ids:Set<number>):string[] {
  const errors:string[]=[],g=w.group;
  const add=(id:number)=>{if(!Number.isSafeInteger(id)||id<1||id>=w.nextId||ids.has(id))errors.push('Duplicate or invalid group Thing owner.');else ids.add(id);};
  if(g&&'members' in g){for(const p of g.members)add(p.id);for(const i of g.items)add(i.id);}
  for(const loss of w.groupLosses??[]){add(loss.pawn.id);for(const i of loss.items)add(i.id);}
  const legacy=w.scout&&'pawn' in w.scout?w.scout:w.commercialTrip&&'pawn' in w.commercialTrip?w.commercialTrip:undefined;
  const active=g&&'members' in g?g:undefined;
  if(w.pawns.length+Number(!!legacy)+(active?.members.length??0)>w.width*w.height)errors.push('Active group population exceeds the shared admission bound.');
  if(w.piles.length+(legacy?.items.length??0)+(active?.items.length??0)>32768)errors.push('Active group piles exceed the shared admission bound.');
  return errors;
}
