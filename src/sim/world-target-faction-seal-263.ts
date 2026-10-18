import {plainWorldPawnData256} from './world-pawn-save-256.ts';
import type {WorldFactionRegistry256} from './world-faction-state.ts';
/** Only the small actual faction authority spread by target entry. This is a
 * reference seal, not a copied World, validator or new ownership registry. */
export function captureTargetFactionSeal263(f:WorldFactionRegistry256):()=>boolean {
 const relations=f.relations,relationRefs=relations.slice(),rows=f.factions,rowRefs=rows.slice(),settlements=f.settlements,settlementRefs=settlements.slice(),leaders=f.leaders,leaderRefs=leaders.slice(),ideology=f.noExpansionIdeoIds,before=JSON.stringify(f);
 const owners=leaders.map(l=>({leader:l,pawn:l.pawn,items:l.items,itemRefs:l.items.slice(),itemOwners:l.items.map(p=>p.owner),packed:l.packed,packRefs:l.packed.slice(),packBuildings:l.packed.map(p=>p.building),packOwners:l.packed.map(p=>p.owner)}));
 return ()=>f.noExpansionIdeoIds===ideology&&f.relations===relations&&relations.length===relationRefs.length&&relations.every((r,i)=>r===relationRefs[i])&&f.factions===rows&&rows.length===rowRefs.length&&rows.every((r,i)=>r===rowRefs[i])&&f.settlements===settlements&&settlements.length===settlementRefs.length&&settlements.every((r,i)=>r===settlementRefs[i])&&f.leaders===leaders&&leaders.length===leaderRefs.length&&leaders.every((r,i)=>r===leaderRefs[i])&&owners.every(o=>o.leader.pawn===o.pawn&&o.leader.items===o.items&&o.items.length===o.itemRefs.length&&o.items.every((p,i)=>p===o.itemRefs[i]&&p.owner===o.itemOwners[i])&&o.leader.packed===o.packed&&o.packed.length===o.packRefs.length&&o.packed.every((p,i)=>p===o.packRefs[i]&&p.building===o.packBuildings[i]&&p.owner===o.packOwners[i]))&&plainWorldPawnData256(f)&&JSON.stringify(f)===before;
}
