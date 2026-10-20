import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
const own=(v:unknown,k:string)=>!!v&&typeof v==='object'&&Object.hasOwn(v,k);
const field=(v:unknown,k:string):unknown=>{if(!v||typeof v!=='object')return undefined;const d=Object.getOwnPropertyDescriptor(v,k);return d&&Object.hasOwn(d,'value')?d.value:undefined;};
const rows=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
/** Small explicit authority frontier, before strict262 validation. No new
 * state/owner/RNG can be granted by migration, even an ownundefined field.
 * This is not a recursive object walker or a looser replacement validator. */
export function historicalWorldSitesAbsent263(raw:unknown,version:number):boolean {
 if(isSchema263OrLater(version))return true;
 const maps=field(raw,'worldMaps'),groups=field(raw,'worldGroups'),factions=field(raw,'worldFactions');
 const local=[raw,field(field(raw,'secondarySite'),'map'),...rows(field(maps,'sites')).map(s=>field(s,'map'))];
 if(local.some(w=>own(w,'worldSites263')||own(w,'worldDefence263')||own(w,'worldSiteThreat263')))return false;
 if(rows(field(maps,'sites')).some(s=>own(s,'target263')))return false;
 if(rows(field(groups,'groups')).some(g=>own(g,'pendingEntry263')))return false;
 return !rows(field(factions,'settlements')).some(s=>own(s,'attack263'));
}
