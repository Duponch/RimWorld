/** Core 1.6.4871 products; source notes: docs/research/biome-products-reference-v91.md. */
export const BIOME_ITEM_DEFINITIONS = Object.freeze({
  'snow-hare-corpse':Object.freeze({label:'Dépouille de lièvre des neiges',kind:'corpse',stackLimit:1,nutrition:0,maxIngest:0,color:0x9b9981}),
  'snow-hare-meat':Object.freeze({label:'Viande de lièvre des neiges',kind:'food',stackLimit:75,nutrition:5,maxIngest:75,color:0xba6259}),
  'deer-corpse':Object.freeze({label:'Dépouille de cerf',kind:'corpse',stackLimit:1,nutrition:0,maxIngest:0,color:0x9b9981}),
  'deer-meat':Object.freeze({label:'Viande de cerf',kind:'food',stackLimit:75,nutrition:5,maxIngest:75,color:0xba6259}),
  'muffalo-corpse':Object.freeze({label:'Dépouille de mufalo',kind:'corpse',stackLimit:1,nutrition:0,maxIngest:0,color:0x9b9981}),
  'muffalo-meat':Object.freeze({label:'Viande de mufalo',kind:'food',stackLimit:75,nutrition:5,maxIngest:75,color:0xba6259}),
  'gazelle-corpse':Object.freeze({label:'Dépouille de gazelle',kind:'corpse',stackLimit:1,nutrition:0,maxIngest:0,color:0x9b9981}),
  'gazelle-meat':Object.freeze({label:'Viande de gazelle',kind:'food',stackLimit:75,nutrition:5,maxIngest:75,color:0xba6259}),
  'dromedary-corpse':Object.freeze({label:'Dépouille de dromadaire',kind:'corpse',stackLimit:1,nutrition:0,maxIngest:0,color:0x9b9981}),
  'dromedary-meat':Object.freeze({label:'Viande de dromadaire',kind:'food',stackLimit:75,nutrition:5,maxIngest:75,color:0xba6259}),
  'plainleather':Object.freeze({label:'Cuir ordinaire',kind:'textile',stackLimit:75,nutrition:0,maxIngest:0,color:0xa88b63}),
  'plainleather-tribalwear':Object.freeze({label:'Tenue tribale en cuir ordinaire',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xa88b63}),
  'plainleather-shirt':Object.freeze({label:'Chemise en cuir ordinaire',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xa88b63}),
  'plainleather-pants':Object.freeze({label:'Pantalon en cuir ordinaire',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xa88b63}),
  'plainleather-duster':Object.freeze({label:'Cache-poussière en cuir ordinaire',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xa88b63}),
  'plainleather-parka':Object.freeze({label:'Parka en cuir ordinaire',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xa88b63}),
  'bluefur':Object.freeze({label:'Fourrure bleue',kind:'textile',stackLimit:75,nutrition:0,maxIngest:0,color:0x839ac5}),
  'bluefur-tribalwear':Object.freeze({label:'Tenue tribale en fourrure bleue',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0x839ac5}),
  'bluefur-shirt':Object.freeze({label:'Chemise en fourrure bleue',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0x839ac5}),
  'bluefur-pants':Object.freeze({label:'Pantalon en fourrure bleue',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0x839ac5}),
  'bluefur-duster':Object.freeze({label:'Cache-poussière en fourrure bleue',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0x839ac5}),
  'bluefur-parka':Object.freeze({label:'Parka en fourrure bleue',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0x839ac5}),
  'camelhide':Object.freeze({label:'Cuir de chameau',kind:'textile',stackLimit:75,nutrition:0,maxIngest:0,color:0xc3a375}),
  'camelhide-tribalwear':Object.freeze({label:'Tenue tribale en cuir de chameau',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xc3a375}),
  'camelhide-shirt':Object.freeze({label:'Chemise en cuir de chameau',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xc3a375}),
  'camelhide-pants':Object.freeze({label:'Pantalon en cuir de chameau',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xc3a375}),
  'camelhide-duster':Object.freeze({label:'Cache-poussière en cuir de chameau',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xc3a375}),
  'camelhide-parka':Object.freeze({label:'Parka en cuir de chameau',kind:'apparel',stackLimit:1,nutrition:0,maxIngest:0,color:0xc3a375}),
  'agave-fruit':Object.freeze({label:'Fruits d’agave',kind:'food',stackLimit:75,nutrition:5,maxIngest:75,color:0x9fac5c}),
} as const);
export const V91_ITEM_IDS:readonly string[]=Object.freeze(Object.keys(BIOME_ITEM_DEFINITIONS));
export const ANIMAL_MEAT_ITEMS=['hare-meat','snow-hare-meat','deer-meat','muffalo-meat','gazelle-meat','dromedary-meat'] as const;
export const ANIMAL_CORPSE_ITEMS=['hare-corpse','snow-hare-corpse','deer-corpse','muffalo-corpse','gazelle-corpse','dromedary-corpse'] as const;
export const ANIMAL_LEATHER_ITEMS=['light-leather','plainleather','bluefur','camelhide'] as const;
export const isAnimalMeat=(item:string):item is typeof ANIMAL_MEAT_ITEMS[number] => (ANIMAL_MEAT_ITEMS as readonly string[]).includes(item);
export const isAnimalCorpseItem=(item:string):item is typeof ANIMAL_CORPSE_ITEMS[number] => (ANIMAL_CORPSE_ITEMS as readonly string[]).includes(item);
