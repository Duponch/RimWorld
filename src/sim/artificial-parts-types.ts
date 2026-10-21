export type WoodenPartKind='peg-leg'|'wooden-hand'|'wooden-foot';
export type WoodenPartSite=`${'left'|'right'}-${'leg'|'hand'|'foot'}`;
export type ArtificialPartKind=WoodenPartKind|import('./prosthetic-content-273.ts').ProstheticItem273;
export type ArtificialPartSite=WoodenPartSite|`${'left'|'right'}-shoulder`;
export interface ArtificialPart {part:ArtificialPartSite;kind:ArtificialPartKind;installedAt:number}
