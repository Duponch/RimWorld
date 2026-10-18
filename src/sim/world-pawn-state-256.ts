import type {Mechanoid} from './mechanoid-state.ts';
import type {MechanoidKind} from './mechanoid-definition.ts';
import {constructNativeWorldPawnOrder256,type NativeWorldPawnOrder256} from './native-world-pawn-order-256.ts';
import type {Pawn,MaterialPile} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {PackedFurniture} from './furniture-rules.ts';
import type {CampaignState,WorldGroupRecord} from './world-map-state.ts';
/** Reference in the real captor's KidnappedPawnsTracker; never Guest ownership. */
export interface WorldPawnCaptivity261 {factionId:number;atCore:number}
/** Prospective foreign birth off-map, copied from the actual pending encounter. */
export interface WorldPawnEncounterBirth261 {groupId:number;tile:number;atCore:number;kind:'ambush'|'meeting'|'demand'}
interface WorldPawnCommon256 {
 factionId:number|null;
 originMapId:number|null;context:WorldGroupRecord['context'];
 /** Actual observation/biological frontier; mothballed clinical tick may precede it. */
 clockCore:number;enteredAtAbsCore:number;
 /** Actual exclusive transfer after a previously captured CaravanMember entry. */
 entryKind259?:'caravan-exit';
 /** True physical map ExitMap, distinct from caravan entry or MapRemoved. */
 entryKind261?:'map-exit';
 /** Real start of suspended held components, never an invented entry date. */
 heldAtCore259?:number;mode:'active'|'mothballed'|'dead';
 captivity261?:WorldPawnCaptivity261;
 encounterBirth261?:WorldPawnEncounterBirth261;
 /** True Thing.Destroy(Vanish), distinct from clinical death. */
 destroyed?:true;
 /** Actual PassedToWorld situation, never inferred for older rows. */
 free?:true;
 /** Captured true SpawnSetup, never visibility or absent-history inference. */
 everSeenByPlayer?:true;
 keepForever?:true;startingPawnLeftBehind?:true;everColonist?:true;
 items:MaterialPile[];packed:PackedFurniture[];
}
export type WorldPawnOwner256=WorldPawnCommon256&({kind:'human';actor:Pawn}|{kind:'animal';actor:WildAnimal}|{kind:'mechanical';actor:Mechanoid;mechanicalTimersAtCore259:number});
/** Scalar receipt after actual Destroy(Vanish)/Discard, never a living owner. */
export interface DiscardedMechanical259 {id:number;mechKind:MechanoidKind;factionId:number;originMapId:number;enteredAtAbsCore:number;discardedAtCore:number}
export interface WorldPawnsState256 {revision:1;atCore:number;lastSuccessfulCore:number;currentRate:number;owners:WorldPawnOwner256[];heldCaskets259?:import('./world-pawn-casket-259.ts').HeldWorldCasket259[];nativeOrder?:NativeWorldPawnOrder256;discardedMechanical259?:DiscardedMechanical259[]}
export type WorldPawnCampaign256=CampaignState&{worldPawns?:WorldPawnsState256};
/** Actual campaign birth only. Never called by load, migration or first abandon. */
export function initialWorldPawns256(atCore=0):WorldPawnsState256 {
 if(atCore!==0)throw Error('WorldPawns birth requires the true new campaign frontier');
 return {revision:1,atCore:0,lastSuccessfulCore:0,currentRate:1,owners:[]};
}
/** Explicit future native World constructor only. Existing adapted factories
 * keep initialWorldPawns256 and receive NO inferred slot history. */
export function initialNativeWorldPawns256(birth:NativeWorldPawnOrder256['birth']):WorldPawnsState256 {return {...initialWorldPawns256(birth.atCore),nativeOrder:constructNativeWorldPawnOrder256(birth)};}
export const deadWorldPawn256=(row:WorldPawnOwner256):boolean=>row.actor.state==='dead'||!!row.actor.health?.death;
/** Native Dead cohort includes Destroyed; this never asserts clinical death. */
export const terminalWorldPawn256=(row:WorldPawnOwner256):boolean=>row.destroyed===true||deadWorldPawn256(row);

/** Worker original preflight, not admission of a JSON shape or MAIN snapshot. */
export function mutableWorldPawnOriginal256(actor:object):boolean {
 return Object.isExtensible(actor)&&Reflect.ownKeys(actor).every(k=>{const d=Object.getOwnPropertyDescriptor(actor,k)!;return Object.hasOwn(d,'value')&&d.configurable===true&&d.writable===true;});
}
