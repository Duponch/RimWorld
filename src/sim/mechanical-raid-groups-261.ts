import type {World} from './types.ts';
import type {MechanoidRaidGroup} from './mechanoid-raid-state.ts';
/** These are the actual independent owners, never a temporary active-slot swap. */
export const mechRaidGroups261=(w:Pick<World,'raids'>):MechanoidRaidGroup[]=>[...w.raids?.mechActive?[w.raids.mechActive]:[],...Array.isArray(w.raids?.extraMechActive261)?w.raids.extraMechActive261:[]].sort((a,b)=>a.id-b.id);
export const mechRaidGroup261=(w:Pick<World,'raids'>,id:number|undefined):MechanoidRaidGroup|undefined=>id===undefined?undefined:w.raids?.mechActive?.id===id?w.raids.mechActive:Array.isArray(w.raids?.extraMechActive261)?w.raids.extraMechActive261.find(g=>g?.id===id):undefined;
export const multiRaid261=(w:World):boolean=>w.schemaVersion===261&&(w.raids?.extraActive261!==undefined||w.raids?.extraMechActive261!==undefined);
/** Call only at a successful actual prospective mechanical admission. */
export function beginMechanicalMulti261(w:World):void {
 const s=w.raids!;s.extraMechActive261??=[];
 if(s.extraResults261===undefined)s.extraResults261=s.last?[structuredClone(s.last)]:[];
}
