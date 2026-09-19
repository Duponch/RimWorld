import type { MaterialKind, MaterialPile, Pawn, World } from './types.ts';

/** Runtime content, not an exhaustive reference catalogue. Values and unresolved
 * rules are tracked in docs/development/food-items.md. Nutrition uses integer
 * hundredths here; the actor's 0..100 meter represents one nutrition unit. */
export const ITEM_DEFINITIONS = Object.freeze({
  'unfinished-shirt':Object.freeze({label:'Chemise inachevée',kind:'unfinished',stackLimit:1,nutrition:0,maxIngest:0,color:0xd8c8a2}),
  'unfinished-tribalwear':Object.freeze({label:'Tenue tribale inachevée',kind:'unfinished',stackLimit:1,nutrition:0,maxIngest:0,color:0xd8c8a2}),
  'cloth-tribalwear':Object.freeze({label:'Tenue tribale en tissu',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xd8c8a2}),
  cloth: Object.freeze({label:'Tissu',kind:'textile',stackLimit:75,nutrition:0,maxIngest:0,color:0xe4ddc8}),
  'cloth-shirt':Object.freeze({label:'Chemise en tissu',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xd8c8a2}),
  'flak-vest':Object.freeze({label:'Gilet pare-balles',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0x626d65}),
  revolver:Object.freeze({label:'Revolver',kind:'weapon',stackLimit:1,nutrition:0,maxIngest:0,color:0x606b72}),
  'herbal-medicine':Object.freeze({label:'Plantes médicinales',kind:'medicine',stackLimit:25,nutrition:0,maxIngest:0,color:0x7d985c}),
  medicine:Object.freeze({label:'Médicaments',kind:'medicine',stackLimit:25,nutrition:0,maxIngest:0,color:0x91c6cc}),
  'glitterworld-medicine':Object.freeze({label:'Médicaments avancés',kind:'medicine',stackLimit:25,nutrition:0,maxIngest:0,color:0xbcdce6}),
  'granite-blocks': Object.freeze({label:'Blocs de granite',kind:'blocks',stackLimit:75,nutrition:0,maxIngest:0,color:0x99958d}),
  'limestone-blocks': Object.freeze({label:'Blocs de calcaire',kind:'blocks',stackLimit:75,nutrition:0,maxIngest:0,color:0xafad8b}),
  'marble-blocks': Object.freeze({label:'Blocs de marbre',kind:'blocks',stackLimit:75,nutrition:0,maxIngest:0,color:0xc5c4b5}),
  'sandstone-blocks': Object.freeze({label:'Blocs de grès',kind:'blocks',stackLimit:75,nutrition:0,maxIngest:0,color:0xb99d76}),
  'slate-blocks': Object.freeze({label:'Blocs de ardoise',kind:'blocks',stackLimit:75,nutrition:0,maxIngest:0,color:0x737f83}),
  component: Object.freeze({label:'Composants',kind:'component',stackLimit:50,nutrition:0,maxIngest:0,color:0xbe914c}),
  steel: Object.freeze({label:'Acier',kind:'steel',stackLimit:75,nutrition:0,maxIngest:0,color:0x839399}),
  'granite-chunk': Object.freeze({label:'Fragment de granite',kind:'chunk',stackLimit:1,nutrition:0,maxIngest:0,color:0x99958d}),
  'limestone-chunk': Object.freeze({label:'Fragment de calcaire',kind:'chunk',stackLimit:1,nutrition:0,maxIngest:0,color:0xafad8b}),
  'marble-chunk': Object.freeze({label:'Fragment de marbre',kind:'chunk',stackLimit:1,nutrition:0,maxIngest:0,color:0xc5c4b5}),
  'sandstone-chunk': Object.freeze({label:'Fragment de grès',kind:'chunk',stackLimit:1,nutrition:0,maxIngest:0,color:0xb99d76}),
  'slate-chunk': Object.freeze({label:'Fragment d’ardoise',kind:'chunk',stackLimit:1,nutrition:0,maxIngest:0,color:0x737f83}),
  'legacy-chunk': Object.freeze({label:'Fragment historique non typé',kind:'chunk',stackLimit:1,nutrition:0,maxIngest:0,color:0x899182}),
  wood: Object.freeze({ label: 'Bois', kind: 'wood', stackLimit: 75, nutrition: 0, maxIngest: 0, color: 0x896841 }),
  berries: Object.freeze({ label: 'Baies', kind: 'food', stackLimit: 75, nutrition: 5, maxIngest: 75, color: 0xb96f63 }),
  rice: Object.freeze({ label: 'Riz', kind: 'food', stackLimit: 75, nutrition: 5, maxIngest: 75, color: 0xd9c695 }),
  'simple-meal': Object.freeze({ label: 'Repas simple', kind: 'food', stackLimit: 10, nutrition: 90, maxIngest: 1, color: 0xe4b274 }),
  'survival-meal': Object.freeze({ label: 'Repas de survie', kind: 'food', stackLimit: 10, nutrition: 90, maxIngest: 1, color: 0xc7b96b }),
  'legacy-portion': Object.freeze({ label: 'Portion historique', kind: 'food', stackLimit: 75, nutrition: 35, maxIngest: 1, color: 0xba745a }),
} as const);
export type ItemId = keyof typeof ITEM_DEFINITIONS;
export const legacyItem = (kind: MaterialKind): ItemId => kind==='unfinished'?missingEquipmentType():kind==='textile'?'cloth':kind==='apparel'||kind==='weapon'?missingEquipmentType():kind==='medicine'?missingMedicineType():kind==='component'?'component':kind==='blocks'?missingBlockType(): kind === 'steel' ? 'steel' : kind === 'wood' ? 'wood' : kind === 'chunk' ? 'legacy-chunk' : 'legacy-portion';
export const nutritionOf = (pile: MaterialPile): number => ITEM_DEFINITIONS[pile.item].nutrition * pile.quantity;
export function availableNutrition(world: World): number {
  return world.piles.reduce((sum, pile) => sum + (pile.owner.type === 'job' ? 0 : nutritionOf(pile)), 0) / 100;
}
/** Unity's midpoint-to-even rounding, used by the reference stack calculation. */
function roundEven(value: number): number {
  const lower = Math.floor(value), fraction = value - lower;
  return fraction === 0.5 ? lower + lower % 2 : Math.round(value);
}
export function mealQuantity(pawn: Pawn, pile: MaterialPile, available: number): number {
  const item = ITEM_DEFINITIONS[pile.item];
  if (!item.nutrition || available <= 0) return 0;
  return Math.min(available, item.maxIngest, Math.max(1, roundEven((100 - pawn.hunger) / item.nutrition)));
}

export function adultHungerFactor(level: number): number {
  return level <= 0 ? 0 : level < 12 ? 0.25 : level < 24 ? 0.5 : 1;
}

function missingBlockType():never {throw new Error('Stone blocks require an explicit ItemId.');}

function missingMedicineType():never {throw new Error('Medicine requires an explicit ItemId.');}

function missingEquipmentType():never {throw new Error('Equipment producers require an explicit item.');}
