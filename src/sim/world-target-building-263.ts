import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {prisonBreakActive} from './prison-break-state.ts';
import {isColonist,activeThreat} from './affiliation.ts';
import type {World,Structure,Pawn} from './types.ts';
/** Only the actual original catalogue built by the two263 generators. This
 * does not add an owner subsystem or broaden historical structure formats. */
export const TARGET_BUILDING_KINDS_263=['wall','door','bed','table','stool','shelf','mini-turret','solar-generator','battery','power-conduit','sandbags'] as const;
const kind=(v:unknown)=>typeof v==='string'&&(TARGET_BUILDING_KINDS_263 as readonly string[]).includes(v);
export function validTargetBuildingFactionShape263(v:unknown,version:number):boolean {
 if(!isSchema263OrLater(version)||!v||typeof v!=='object'||Array.isArray(v)||!kind(Object.getOwnPropertyDescriptor(v,'kind')?.value))return false;
 const d=Object.getOwnPropertyDescriptor(v,'factionId');return !!d&&Object.hasOwn(d,'value')&&d.enumerable===true&&(d.value===null||typeof d.value==='number'&&Number.isSafeInteger(d.value)&&d.value>0);
}
export function targetBuilding263(w:Pick<World,'schemaVersion'>,s:Structure):boolean {return isSchema263OrLater(Number(w.schemaVersion))&&kind(s.kind)&&Object.hasOwn(s,'factionId');}
export function targetBuildingPlayerUse263(w:Partial<Pick<World,'schemaVersion'|'worldFactions'>>,s:Structure):boolean {return !(kind(s.kind)&&Object.hasOwn(s,'factionId')&&(w.schemaVersion===undefined||isSchema263OrLater(Number(w.schemaVersion))))||!!w.worldFactions&&s.factionId===w.worldFactions.playerFactionId;}
/** Core Building.ClaimableBy delegates to Thing's actual faction's potential
 * tool-user threats; its check is not a fabricated win bit or a map-wide
 * guarantee. Current humans are the declared existing tool-user catalogue. */
export function targetBuildingCanClaim263(w:Pick<World,'schemaVersion'|'worldFactions'|'structures'|'pawns'>,s:Structure):boolean {
 if(!targetBuilding263(w,s)||!w.structures.includes(s)||!w.worldFactions||s.factionId===w.worldFactions.playerFactionId)return false;
 if(s.factionId===null)return true;
 if(!w.worldFactions.factions.some(f=>f.id===s.factionId))return false;
 return !w.pawns.some(p=>p.worldAffiliation259?.factionId===s.factionId&&!p.prisoner&&activeThreat(p));
}
export function targetBuildingCanDeconstruct263(w:Pick<World,'schemaVersion'|'worldFactions'|'structures'|'pawns'>,s:Structure):boolean {return targetBuildingPlayerUse263(w,s)||targetBuildingCanClaim263(w,s);}
/** Undefined delegates exactly to the historical door policy. Current human
 * released prisoners, factionless doors, own/nonhostile faction match GenAI.
 * Foreign structures never inherit 'colonist opens every door'. */
export function targetDoorCanOpen263(w:World,p:Pawn,s:Structure):boolean|undefined {
 if(s.kind!=='door'||!targetBuilding263(w,s))return;
 if(p.prisoner?.releasedAt!==undefined||prisonBreakActive(p))return true;
 if(s.factionId===null)return true;
 const f=w.worldFactions;if(!f)return false;
 const own=p.worldAffiliation259?.factionId??(isColonist(p)?f.playerFactionId:null),host=p.worldAffiliation259?.hostFactionId;
 if(p.prisoner&&host===s.factionId)return false;
 if(own===s.factionId)return true;
 if(own===null)return false;
 const relation=f.relations.find(r=>r.aId===Math.min(own,s.factionId!)&&r.bId===Math.max(own,s.factionId!));return !!relation&&relation.kind!=='hostile';
}
/** Full FK check after the ordinary structure shape/support/IDs guards.
 * Packed current buildings must be actually claimed by the player first. */
export function validTargetBuildingOwners263(w:Pick<World,'schemaVersion'|'worldFactions'|'structures'|'packed'>&Partial<Pick<World,'pawns'>>,version:number):boolean {
 // This is only the V263 target-building FK domain. Older closed structure
 // and packed schemas still reject future faction fields before migration;
 // they must not be made to possess the later packed domain just to reach it.
 if(version<263)return true;
 for(const s of [...w.structures,...w.packed.map(p=>p.building)])if(validTargetBuildingFactionShape263(s,version)){
  if(s.factionId!==null&&!w.worldFactions?.factions.some(f=>f.id===s.factionId))return false;
  if(w.packed.some(p=>p.building===s)&&s.factionId!==w.worldFactions?.playerFactionId)return false;
 }
 if(isSchema263OrLater(version)&&(w.pawns??[]).some(p=>p.bedId!==null&&w.structures.some(s=>s.id===p.bedId&&!targetBuildingPlayerUse263(w,s))))return false;
 return true;
}
