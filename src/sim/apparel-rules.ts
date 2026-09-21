import { apparelCompatible, apparelCoverage, type ApparelCoverage, type ArmorPiece, type ArmorRatings } from './armor.ts';
import { QUALITY_LABELS, WEAPON_QUALITIES, type WeaponQuality } from './equipment-rules.ts';
import { partMissing } from './injury-state.ts';
import type { ItemId } from './items.ts';
import type { MaterialPile, Pawn, World } from './types.ts';

export const APPAREL_MATERIALS = ['cloth', 'light-leather'] as const;
export type ApparelMaterial = typeof APPAREL_MATERIALS[number];
export const APPAREL_FAMILIES = ['tribalwear', 'shirt', 'pants', 'duster', 'parka'] as const;
export type ApparelFamily = typeof APPAREL_FAMILIES[number];

export interface ApparelMaterialDefinition {
  readonly label: string;
  readonly color: number;
  readonly armor: ArmorRatings;
  readonly coldInsulation: number;
  readonly heatInsulation: number;
}
export const APPAREL_MATERIAL_DEFINITIONS: Readonly<Record<ApparelMaterial, ApparelMaterialDefinition>> = Object.freeze({
  cloth: Object.freeze({label:'tissu',color:0xd8c8a2,armor:Object.freeze({sharp:.36,blunt:0,heat:.18}),coldInsulation:18,heatInsulation:18}),
  'light-leather': Object.freeze({label:'cuir léger',color:0xad8a61,armor:Object.freeze({sharp:.54,blunt:.14,heat:1.5}),coldInsulation:12,heatInsulation:12}),
});

interface ApparelFamilyDefinition {
  readonly label: string;
  readonly hitPoints: number;
  readonly equipTicks: number;
  readonly coverage: ApparelCoverage;
  readonly armorFactor: number;
  readonly coldFactor: number;
  readonly heatFactor: number;
}
export const APPAREL_FAMILY_DEFINITIONS: Readonly<Record<ApparelFamily, ApparelFamilyDefinition>> = Object.freeze({
  tribalwear: Object.freeze({label:'Tenue tribale',hitPoints:100,equipTicks:9,coverage:apparelCoverage(['skin'],['torso','legs']),armorFactor:.2,coldFactor:.55,heatFactor:.55}),
  shirt: Object.freeze({label:'Chemise',hitPoints:100,equipTicks:9,coverage:apparelCoverage(['skin'],['torso','neck','shoulders','arms']),armorFactor:.2,coldFactor:.26,heatFactor:.1}),
  pants: Object.freeze({label:'Pantalon',hitPoints:100,equipTicks:12,coverage:apparelCoverage(['skin'],['legs']),armorFactor:.2,coldFactor:.2,heatFactor:.08}),
  duster: Object.freeze({label:'Cache-poussière',hitPoints:200,equipTicks:18,coverage:apparelCoverage(['shell'],['torso','neck','shoulders','arms','legs']),armorFactor:.3,coldFactor:.6,heatFactor:.85}),
  parka: Object.freeze({label:'Parka',hitPoints:180,equipTicks:18,coverage:apparelCoverage(['shell'],['torso','neck','shoulders','arms']),armorFactor:.2,coldFactor:2,heatFactor:0}),
});

export interface ApparelDefinition {
  readonly label: string;
  readonly hitPoints: number;
  readonly equipTicks: number;
  readonly color: number;
  readonly coverage: ApparelCoverage;
  readonly ratings: ArmorRatings;
  readonly moveOffset: number;
  readonly family?: ApparelFamily;
  readonly material?: ApparelMaterial;
  readonly coldInsulation: number;
  readonly heatInsulation: number;
}
const textileDefinition = (family: ApparelFamily, material: ApparelMaterial): ApparelDefinition => {
  const garment=APPAREL_FAMILY_DEFINITIONS[family],stuff=APPAREL_MATERIAL_DEFINITIONS[material];
  return Object.freeze({
    label:`${garment.label} en ${stuff.label}`,
    hitPoints:garment.hitPoints,equipTicks:garment.equipTicks,color:stuff.color,coverage:garment.coverage,
    ratings:Object.freeze({sharp:stuff.armor.sharp*garment.armorFactor,blunt:stuff.armor.blunt*garment.armorFactor,heat:stuff.armor.heat*garment.armorFactor}),
    moveOffset:0,family,material,coldInsulation:stuff.coldInsulation*garment.coldFactor,heatInsulation:stuff.heatInsulation*garment.heatFactor,
  });
};

export type ApparelItem='cloth-tribalwear'|'cloth-shirt'|'light-leather-tribalwear'|'light-leather-shirt'|'cloth-pants'|'light-leather-pants'|'cloth-duster'|'light-leather-duster'|'cloth-parka'|'light-leather-parka'|'flak-vest';
/** Existing cloth ids stay canonical so old saves and reservations retain identity. */
export const APPAREL:Readonly<Record<ApparelItem,ApparelDefinition>> = Object.freeze({
  'cloth-tribalwear': textileDefinition('tribalwear','cloth'),
  'cloth-shirt': textileDefinition('shirt','cloth'),
  'light-leather-tribalwear': textileDefinition('tribalwear','light-leather'),
  'light-leather-shirt': textileDefinition('shirt','light-leather'),
  'cloth-pants': textileDefinition('pants','cloth'),
  'light-leather-pants': textileDefinition('pants','light-leather'),
  'cloth-duster': textileDefinition('duster','cloth'),
  'light-leather-duster': textileDefinition('duster','light-leather'),
  'cloth-parka': textileDefinition('parka','cloth'),
  'light-leather-parka': textileDefinition('parka','light-leather'),
  'flak-vest': Object.freeze({label:'Gilet pare-balles',hitPoints:200,equipTicks:30,color:0x626d65,coverage:apparelCoverage(['middle'],['torso','neck']),ratings:Object.freeze({sharp:1,blunt:.36,heat:.27}),moveOffset:-.12,coldInsulation:1,heatInsulation:0}),
});

export interface ApparelState {
  quality:WeaponQuality;
  hitPoints:number;
  /** Required on V90 textile products; absent remains the neutral legacy cloth representation. */
  material?:ApparelMaterial;
  forbidden?:true;
  /** Manual orders can protect a worn garment from automatic replacement. */
  forced?:true;
}

const ITEM_BY_FAMILY: Readonly<Record<ApparelFamily, Readonly<Record<ApparelMaterial, ApparelItem>>>> = Object.freeze({
  tribalwear:Object.freeze({cloth:'cloth-tribalwear','light-leather':'light-leather-tribalwear'}),
  shirt:Object.freeze({cloth:'cloth-shirt','light-leather':'light-leather-shirt'}),
  pants:Object.freeze({cloth:'cloth-pants','light-leather':'light-leather-pants'}),
  duster:Object.freeze({cloth:'cloth-duster','light-leather':'light-leather-duster'}),
  parka:Object.freeze({cloth:'cloth-parka','light-leather':'light-leather-parka'}),
});
export const apparelItemFor=(family:ApparelFamily,material:ApparelMaterial):ApparelItem=>ITEM_BY_FAMILY[family][material];
export const isApparelMaterial=(value:unknown):value is ApparelMaterial=>typeof value==='string'&&APPAREL_MATERIALS.includes(value as ApparelMaterial);
export const isApparelFamily=(value:unknown):value is ApparelFamily=>typeof value==='string'&&APPAREL_FAMILIES.includes(value as ApparelFamily);
export const isApparelItem=(item:ItemId):item is ApparelItem=>Object.hasOwn(APPAREL,item);
export const apparelDefinition=(pile:MaterialPile):ApparelDefinition=>APPAREL[pile.item as ApparelItem];
export const apparelMaterial=(pile:Pick<MaterialPile,'item'|'apparel'>):ApparelMaterial|undefined=>pile.apparel?.material??APPAREL[pile.item as ApparelItem]?.material;
export const apparelFamily=(item:ApparelItem):ApparelFamily|undefined=>APPAREL[item].family;
export const wornApparel=(world:World,pawn:Pawn):MaterialPile[]=>world.piles.filter(p=>p.owner.type==='apparel'&&p.owner.pawnId===pawn.id);
export const apparelLabel=(pile:MaterialPile):string=>`${apparelDefinition(pile).label} (${QUALITY_LABELS[pile.apparel!.quality]})`;
export const newApparelState=(item:ApparelItem,material:ApparelMaterial|undefined=APPAREL[item].material):ApparelState=>material===undefined
  ? {quality:'normal',hitPoints:APPAREL[item].hitPoints}
  : {quality:'normal',hitPoints:APPAREL[item].hitPoints,material};
export const hasApparelParts=(pawn:Pawn,pile:MaterialPile):boolean=>apparelDefinition(pile).coverage.parts.some(p=>!pawn.health||!partMissing(pawn.health,p));
export const conflictsWith=(a:MaterialPile,b:MaterialPile):boolean=>!apparelCompatible(apparelDefinition(a).coverage,apparelDefinition(b).coverage);
export const apparelDuration=(world:World,pawn:Pawn,pile:MaterialPile,action:'wear'|'remove'):number=>apparelDefinition(pile).equipTicks+(action==='wear'?wornApparel(world,pawn).filter(p=>conflictsWith(p,pile)).reduce((n,p)=>n+apparelDefinition(p).equipTicks,0):0);
const factors=[.6,.8,1,1.15,1.3,1.45,1.8];
export const apparelQualityFactor=(quality:WeaponQuality):number=>factors[WEAPON_QUALITIES.indexOf(quality)]!;
export function armorPiece(pile:MaterialPile):ArmorPiece {
  const d=apparelDefinition(pile),factor=apparelQualityFactor(pile.apparel!.quality);
  return {id:pile.id,hitPoints:pile.apparel!.hitPoints,coverage:d.coverage,ratings:{sharp:Math.min(2,d.ratings.sharp*factor),blunt:Math.min(2,d.ratings.blunt*factor),heat:Math.min(2,d.ratings.heat*factor)}};
}
export function apparelInsulation(pile:MaterialPile):Readonly<{cold:number;heat:number}> {
  const d=apparelDefinition(pile),factor=[.8,.9,1,1.1,1.2,1.5,1.8][WEAPON_QUALITIES.indexOf(pile.apparel?.quality??'normal')]!;
  return {cold:d.coldInsulation*factor,heat:d.heatInsulation*factor};
}
/** Relative Core base speed effect; retain the game's existing travel calibration. */
export function apparelMoveFactor(world:World,pawn:Pawn):number {
  let offset=0;for(const p of world.piles)if(p.owner.type==='apparel'&&p.owner.pawnId===pawn.id)offset+=apparelDefinition(p).moveOffset;
  return Math.max(.01,(4.6+offset)/4.6);
}
