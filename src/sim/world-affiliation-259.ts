import type {Pawn,World} from './types.ts';
import type {WorldFactionRegistry256} from './world-faction-state.ts';
/** Actual instances, on the same original. Absence is literal old authority. */
export interface WorldAffiliation259 {revision:1;factionId:number|null;hostFactionId:number|null;guestStatus:'Guest'|'Prisoner'}
const data=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.getOwnPropertyDescriptor(v,k)?.enumerable===true&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const id=(v:unknown):v is number|null=>v===null||typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
export function validWorldAffiliation259(value:unknown):value is WorldAffiliation259 {return data(value)&&Reflect.ownKeys(value).length===4&&['revision','factionId','hostFactionId','guestStatus'].every(k=>Object.hasOwn(value,k))&&value.revision===1&&id(value.factionId)&&id(value.hostFactionId)&&['Guest','Prisoner'].includes(String(value.guestStatus))&&(value.guestStatus!=='Prisoner'||value.hostFactionId!==null);}
/** Current status only; a dormant former dossier never runs prisoner drivers. */
export const currentPrisoner259=(p:Pick<Pawn,'prisoner'|'worldAffiliation259'>):boolean=>p.worldAffiliation259?p.worldAffiliation259.guestStatus==='Prisoner':!!p.prisoner;
export function actualPlayerOwner259(p:Pawn,playerFactionId:number):boolean {const a=p.worldAffiliation259;return (a?a.factionId===playerFactionId&&a.hostFactionId===null&&a.guestStatus!=='Prisoner':(p.faction??'colony')==='colony'&&!p.prisoner&&!p.visitor)&&p.state!=='dead'&&!p.health?.death;}
export function validWorldAffiliationForeignKeys259(p:Pawn,factions:WorldFactionRegistry256|undefined):boolean {const a=p.worldAffiliation259;return !a||!!factions&&[a.factionId,a.hostFactionId].every(id=>id===null||factions.factions.some(f=>f.id===id))&&((p.faction??'colony')==='colony')===(a.factionId===factions.playerFactionId);}
/** Called only by a real new person producer with its chosen actual instance. */
export function bindBornHumanFaction259(w:Pick<World,'worldFactions'>&{schemaVersion:number},p:Pawn,factionId:number|null):boolean {
 if((Number(w.schemaVersion)!==259&&Number(w.schemaVersion)!==260&&(Number(w.schemaVersion)!==261&&(Number(w.schemaVersion)!==262&&Number(w.schemaVersion)!==263))))return true;
 if(!w.worldFactions||factionId!==null&&!w.worldFactions.factions.some(f=>f.id===factionId)||p.worldAffiliation259||p.prisoner||p.prisonerHistory259)return false;
 p.worldAffiliation259={revision:1,factionId,hostFactionId:null,guestStatus:'Guest'};return true;
}
/** Only the actual capture commit may call this, after creating its real
 * PrisonerState. Loading/reorganisation never recaptures or rolls resistance. */
export function commitCapturedGuest259(w:Pick<World,'schemaVersion'|'worldFactions'>,p:Pawn):void {
 if((Number(w.schemaVersion)!==259&&Number(w.schemaVersion)!==260&&(Number(w.schemaVersion)!==261&&(Number(w.schemaVersion)!==262&&Number(w.schemaVersion)!==263)))||!p.worldAffiliation259)return;
 if(!w.worldFactions||!p.prisoner||!validWorldAffiliationForeignKeys259(p,w.worldFactions))throw Error('Actual prisoner instance authority absent');
 p.worldAffiliation259={...p.worldAffiliation259,hostFactionId:w.worldFactions.playerFactionId,guestStatus:'Prisoner'};delete p.prisonerHistory259;
}
/** True SetGuestStatus(null), not Caravan.Clear. Move, never clone, the actual
 * dossier so every historical pawn.prisoner reader still means CURRENT captive. */
export function clearActualGuest259(p:Pawn):void {
 if(!p.worldAffiliation259)throw Error('Actual guest instance authority absent');
 if(p.prisoner){p.prisonerHistory259=p.prisoner;delete p.prisoner;}
 p.worldAffiliation259={...p.worldAffiliation259,hostFactionId:null,guestStatus:'Guest'};
}
/** Structural gate shared by map, away, lost and WorldPawn record admission. */
export function validWorldAffiliationFields259(raw:Record<string,unknown>,version:number):boolean {
 const a=Object.getOwnPropertyDescriptor(raw,'worldAffiliation259'),h=Object.getOwnPropertyDescriptor(raw,'prisonerHistory259');
 if(!a&&!h)return !('worldAffiliation259'in raw)&&!('prisonerHistory259'in raw);
 if((version!==259&&version!==260&&(version!==261&&(Number(version)!==262&&Number(version)!==263)))||!a||!Object.hasOwn(a,'value')||!a.enumerable||!validWorldAffiliation259(a.value))return false;
 if(!h&&'prisonerHistory259'in raw)return false;
 if(h&&(!Object.hasOwn(h,'value')||!h.enumerable||!data(h.value)))return false;
 const active=Object.getOwnPropertyDescriptor(raw,'prisoner');
 return a.value.guestStatus==='Prisoner'?!!active&&Object.hasOwn(active,'value')&&active.enumerable===true&&active.value!==undefined&&!h:!active&&!('prisoner'in raw);
}

/** The actual provisional incident producer owns this deterministic selection.
 * Missing intended Def is not a fabricated factionless Pawn. */
export function bornFactionForDef259(w:Pick<World,'schemaVersion'|'worldFactions'>,def:import('./world-faction-catalog.ts').WorldFactionDef256):number|undefined {return w.worldFactions?.factions.find(f=>f.def===def)?.id;}
export function commitJoinedPlayer259(w:Pick<World,'schemaVersion'|'worldFactions'>,p:Pawn):void {
 if((Number(w.schemaVersion)!==259&&Number(w.schemaVersion)!==260&&(Number(w.schemaVersion)!==261&&(Number(w.schemaVersion)!==262&&Number(w.schemaVersion)!==263)))||!p.worldAffiliation259)return;
 if(!w.worldFactions)throw Error('Actual player faction absent');
 if(p.prisoner){p.prisonerHistory259=p.prisoner;delete p.prisoner;}
 p.worldAffiliation259={revision:1,factionId:w.worldFactions.playerFactionId,hostFactionId:null,guestStatus:'Guest'};
}

/** The same real rescue/admission act that creates its existing receipt owns
 * this host change. No ordinary visitor acquires travel permission. */
export function commitMedicalGuest259(w:Pick<World,'schemaVersion'|'worldFactions'>,p:Pawn):void {
 if((Number(w.schemaVersion)!==259&&Number(w.schemaVersion)!==260&&(Number(w.schemaVersion)!==261&&(Number(w.schemaVersion)!==262&&Number(w.schemaVersion)!==263)))||!p.worldAffiliation259)return;
 if(!w.worldFactions||p.prisoner)throw Error('Actual medical guest authority absent');
 p.worldAffiliation259={...p.worldAffiliation259,hostFactionId:w.worldFactions.playerFactionId,guestStatus:'Guest'};
}
