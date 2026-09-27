/** Original presentation for Core-inspired livestock products. New IDs begin
 * in V120; historical V119 saves must not acquire these stacks by migration. */
export const ANIMAL_PRODUCT_ITEM_DEFINITIONS = Object.freeze({
  'muffalo-wool': Object.freeze({label:'Laine de mufalo',kind:'textile',stackLimit:100,nutrition:0,maxIngest:0,color:0xb3c0ba}),
  'muffalo-wool-tribalwear': Object.freeze({label:'Tenue tribale en laine de mufalo',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xb3c0ba}),
  'muffalo-wool-shirt': Object.freeze({label:'Chemise en laine de mufalo',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xb3c0ba}),
  'muffalo-wool-pants': Object.freeze({label:'Pantalon en laine de mufalo',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xb3c0ba}),
  'muffalo-wool-duster': Object.freeze({label:'Cache-poussière en laine de mufalo',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xb3c0ba}),
  'muffalo-wool-parka': Object.freeze({label:'Parka en laine de mufalo',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xb3c0ba}),
} as const);

export const V120_ANIMAL_PRODUCT_ITEMS:readonly string[]=Object.freeze(['milk',...Object.keys(ANIMAL_PRODUCT_ITEM_DEFINITIONS)]);
