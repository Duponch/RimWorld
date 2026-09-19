import { apparelCompatible, apparelCoverage, type ArmorPiece } from './armor.ts';
import { QUALITY_LABELS, WEAPON_QUALITIES, type WeaponQuality } from './equipment-rules.ts';
import { partMissing } from './injury-state.ts';
import type { ItemId } from './items.ts';
import type { MaterialPile, Pawn, World } from './types.ts';

/** Deliberately two obtainable profiles, not the future textile catalogue.
 * Fixed cloth is part of the shirt identity; flak is a manufactured composite. */
export const APPAREL = Object.freeze({
  'cloth-shirt': Object.freeze({label:'Chemise en tissu',hitPoints:100,equipTicks:9,color:0xd8c8a2,coverage:apparelCoverage(['skin'],['torso','neck','shoulders','arms']),ratings:Object.freeze({sharp:.072,blunt:0,heat:.036}),moveOffset:0}),
  'flak-vest': Object.freeze({label:'Gilet pare-balles',hitPoints:200,equipTicks:30,color:0x626d65,coverage:apparelCoverage(['middle'],['torso','neck']),ratings:Object.freeze({sharp:1,blunt:.36,heat:.27}),moveOffset:-.12}),
});
export type ApparelItem=keyof typeof APPAREL;
export interface ApparelState { quality:WeaponQuality;hitPoints:number;forbidden?:true }
export const isApparelItem=(item:ItemId):item is ApparelItem=>Object.hasOwn(APPAREL,item);
export const apparelDefinition=(pile:MaterialPile)=>APPAREL[pile.item as ApparelItem];
export const wornApparel=(world:World,pawn:Pawn):MaterialPile[]=>world.piles.filter(p=>p.owner.type==='apparel'&&p.owner.pawnId===pawn.id);
export const apparelLabel=(pile:MaterialPile):string=>`${apparelDefinition(pile).label} (${QUALITY_LABELS[pile.apparel!.quality]})`;
export const newApparelState=(item:ApparelItem):ApparelState=>({quality:'normal',hitPoints:APPAREL[item].hitPoints});
export const hasApparelParts=(pawn:Pawn,pile:MaterialPile):boolean=>apparelDefinition(pile).coverage.parts.some(p=>!pawn.health||!partMissing(pawn.health,p));
export const conflictsWith=(a:MaterialPile,b:MaterialPile):boolean=>!apparelCompatible(apparelDefinition(a).coverage,apparelDefinition(b).coverage);
export const apparelDuration=(world:World,pawn:Pawn,pile:MaterialPile,action:'wear'|'remove'):number=>apparelDefinition(pile).equipTicks+(action==='wear'?wornApparel(world,pawn).filter(p=>conflictsWith(p,pile)).reduce((n,p)=>n+apparelDefinition(p).equipTicks,0):0);
const factors=[.6,.8,1,1.15,1.3,1.45,1.8];
export function armorPiece(pile:MaterialPile):ArmorPiece {
  const d=apparelDefinition(pile),factor=factors[WEAPON_QUALITIES.indexOf(pile.apparel!.quality)]!;
  return {id:pile.id,hitPoints:pile.apparel!.hitPoints,coverage:d.coverage,ratings:{sharp:Math.min(2,d.ratings.sharp*factor),blunt:Math.min(2,d.ratings.blunt*factor),heat:Math.min(2,d.ratings.heat*factor)}};
}
/** Relative Core base speed effect; retain the game's existing travel calibration. */
export function apparelMoveFactor(world:World,pawn:Pawn):number {
  let offset=0;for(const p of world.piles)if(p.owner.type==='apparel'&&p.owner.pawnId===pawn.id)offset+=apparelDefinition(p).moveOffset;
  return Math.max(.01,(4.6+offset)/4.6);
}
