import type {Structure,World} from './types.ts';
import type {EscapeCampaign298} from './ship-escape-state-298.ts';

/** Runtime-only capture minted by prepareShipLaunch298. These exact references
 * and origin scalars are never accepted from a command, snapshot or RAW field.
 * Capture is not proof that the private session started or became due: the Root
 * coordinator must separately validate the exact session token/epoch. */
export interface ShipEscapeLaunchCapture298 {
 readonly owner:EscapeCampaign298;
 /** Initial capture/proof witness only. Map promotion may replace this view.
  * At due, resolve mapId on the SAME owner, never the selected map, and then
  * compare originalRoot by reference in that actual current map context. */
 readonly world:World;
 readonly originalRoot:Structure;
 readonly mapId:number;readonly computerId:number;
 readonly startedAt:number;readonly startedAtCore298:number;
 readonly originKind298:'registered-map'|'monomap';readonly originTile298:number|null;
}

/** Internal actual-owner selection. A missing ID/array entry, exception or
 * absent map NEVER creates a known-destroyed proof. The Root implementation
 * must attest genuine destruction of this originally accepted computer.
 * Despawn without destruction is not this proof. An accepted replacement
 * invalidates the separate session; no old original is rebound after LOAD. */
export type ShipEscapeDueRoot298=
 |{kind:'network';world:World;originalRoot:Structure;current():boolean}
 |{kind:'known-destroyed';current():boolean};
/** INTERNAL Root factory, never supplied on command/snapshot wire. No default
 * selection, fake destruction receipt or array-only physical retirement.
 * prepareDueRoot is a proposed closed seam, NOT an implemented authority. It
 * resolves capture.mapId on capture.owner, not capture.world or the selected
 * map, then attests the exact captured original (or its genuine destruction).
 * physicalCore298 is the actual committed frontier. current seals source
 * phase, original body/context/reciprocal aliases and cached projections.
 * False adoption has ZERO writes; true owns complete immediate retirement,
 * preserves embarked originals and does not clinically destroy/salvage them. */
export interface ShipEscapePhysicalServices298 {
 prepareDueRoot(owner:EscapeCampaign298,capture:ShipEscapeLaunchCapture298,physicalCore298:number):{ok:false;reason:string}|{ok:true;source:ShipEscapeDueRoot298};
 prepareRemoval(world:World,parts:readonly Structure[],physicalCore298:number):{ok:false;reason:string}|{ok:true;current():boolean;adopt():boolean};
}
export function prepareShipEscapePhysical298(world:World,parts:readonly Structure[],physicalCore298:number,services:ShipEscapePhysicalServices298){
 if(!parts.length)return {ok:false as const,reason:'Un retrait physique réel exige sa sélection non vide.'};
 const plan=services.prepareRemoval(world,parts,physicalCore298);if(!plan.ok)return plan;
 if(!plan.current())return {ok:false as const,reason:'Le retrait physique est immuable, incomplet ou périmé.'};
 let used=false;
 return {ok:true as const,current:()=>!used&&plan.current(),adopt():boolean{if(used)return false;const accepted=plan.adopt();if(accepted)used=true;return accepted;}};
}
