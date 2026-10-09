export type WoodenPartKind='peg-leg'|'wooden-hand'|'wooden-foot';
export type WoodenPartSite=`${'left'|'right'}-${'leg'|'hand'|'foot'}`;
export interface ArtificialPart {part:WoodenPartSite;kind:WoodenPartKind;installedAt:number}
