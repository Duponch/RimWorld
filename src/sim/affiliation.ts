import type { Pawn } from './types.ts';
import { prisonBreakActive } from './prison-break-state.ts';

export type FactionId='colony'|'outlaws'|'outlanders';
/** Ownership and hostility are separate questions. Diplomacy is not yet mutable. */
const RELATIONS:Readonly<Record<FactionId,Readonly<Record<FactionId,'friendly'|'neutral'|'hostile'>>>>={
  colony:{colony:'friendly',outlaws:'hostile',outlanders:'neutral'},outlaws:{colony:'hostile',outlaws:'friendly',outlanders:'hostile'},outlanders:{colony:'neutral',outlaws:'hostile',outlanders:'friendly'},
};
/** Faction-only relation, independent of prisoners and involuntary hostility. */
export const factionRelation=(a:FactionId,b:FactionId):'friendly'|'neutral'|'hostile'=>RELATIONS[a][b];
export const factionOf=(p:Pick<Pawn,'faction'>):FactionId=>p.faction??'colony';
export const isColonist=(p:Pick<Pawn,'faction'>):boolean=>factionOf(p)==='colony';
export const isAdmittedGuest=(p:Pick<Pawn,'faction'|'prisoner'|'podRescue'>):boolean=>p.faction==='outlanders'&&!p.prisoner&&p.podRescue?.admittedAt!==undefined;
export const isPlayerPatient=(p:Pick<Pawn,'faction'|'prisoner'>):boolean=>isColonist(p)||!!p.prisoner;
export const isCarePatient=(p:Pick<Pawn,'faction'|'prisoner'|'podRescue'>):boolean=>isPlayerPatient(p)||isAdmittedGuest(p);
type CombatAffiliation=Pick<Pawn,'faction'|'prisoner'>&Partial<Pick<Pawn,'mental'>>;
export const hostileTo=(a:CombatAffiliation,b:CombatAffiliation):boolean=>a!==b&&
  (!(a.prisoner&&b.prisoner&&(prisonBreakActive(a)||prisonBreakActive(b)))&&
  (a.mental?.crisis?.kind==='berserk'||b.mental?.crisis?.kind==='berserk'||prisonBreakActive(a)&&!b.prisoner&&isColonist(b)||prisonBreakActive(b)&&!a.prisoner&&isColonist(a)||!a.prisoner&&!b.prisoner&&RELATIONS[factionOf(a)][factionOf(b)]==='hostile'));
export const assaultTarget=(attacker:Pawn,target:Pawn):boolean=>activeThreat(target)||!!attacker.raid&&!attacker.raid.exiting&&target.state==='sleeping';
export const activeThreat=(p:Pawn):boolean=>p.state!=='downed'&&p.state!=='dead'&&p.state!=='sleeping';
export const distanceSquared=(a:{x:number;z:number},b:{x:number;z:number}):number=>(a.x-b.x)**2+(a.z-b.z)**2;
