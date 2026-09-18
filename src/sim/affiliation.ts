import type { Pawn } from './types.ts';

export type FactionId='colony'|'outlaws';
/** Ownership and hostility are separate questions. Diplomacy is not yet mutable. */
const RELATIONS:Readonly<Record<FactionId,Readonly<Record<FactionId,'friendly'|'hostile'>>>>={
  colony:{colony:'friendly',outlaws:'hostile'},outlaws:{colony:'hostile',outlaws:'friendly'},
};
export const factionOf=(p:Pick<Pawn,'faction'>):FactionId=>p.faction??'colony';
export const isColonist=(p:Pick<Pawn,'faction'>):boolean=>factionOf(p)==='colony';
export const hostileTo=(a:Pick<Pawn,'faction'>,b:Pick<Pawn,'faction'>):boolean=>RELATIONS[factionOf(a)][factionOf(b)]==='hostile';
export const activeThreat=(p:Pawn):boolean=>p.state!=='downed'&&p.state!=='dead'&&p.state!=='sleeping';
export const distanceSquared=(a:{x:number;z:number},b:{x:number;z:number}):number=>(a.x-b.x)**2+(a.z-b.z)**2;
