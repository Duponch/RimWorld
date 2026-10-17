/** Original Core numeric/DefID data. Insect meat is shared by the three
 * genuine races; corpse identity remains specific and uses its real owner. */
export const CAVE_INSECT_ITEM_DEFINITIONS_256={
 'megascarab-corpse':{label:'Dépouille : mégascarabée',kind:'corpse',stackLimit:1,nutrition:0,maxIngest:0,color:0x8c927b},
 'spelopede-corpse':{label:'Dépouille : spélopède',kind:'corpse',stackLimit:1,nutrition:0,maxIngest:0,color:0x8c927b},
 'megaspider-corpse':{label:'Dépouille : mégaraignée',kind:'corpse',stackLimit:1,nutrition:0,maxIngest:0,color:0x8c927b},
 'megaspider-meat':{label:'Viande d’insecte',kind:'food',stackLimit:75,nutrition:5,maxIngest:75,color:0x9b9f80},
 'insect-jelly':{label:'Gelée d’insecte',kind:'food',stackLimit:75,nutrition:5,maxIngest:75,color:0xb6bf8c},
} as const;
export const CAVE_INSECT_CORPSE_ITEMS_256=['megascarab-corpse','spelopede-corpse','megaspider-corpse'] as const;
export const CAVE_INSECT_ITEM_MASS_256={'megaspider-meat':30,'insect-jelly':25} as const;
export const CAVE_INSECT_ITEM_ROT_256={'megascarab-corpse':2.5,'spelopede-corpse':2.5,'megaspider-corpse':2.5,'megaspider-meat':2} as const;
export const CAVE_INSECT_ITEM_HP_256={'megaspider-meat':60,'insect-jelly':60} as const;
export const CAVE_INSECT_ITEM_FLAMMABILITY_256={'megaspider-meat':.5,'insect-jelly':1} as const;
export const CAVE_INSECT_ITEM_DETERIORATION_256={'megaspider-meat':6,'insect-jelly':6} as const;
export const CAVE_INSECT_ITEM_VALUE_256={'megaspider-meat':.5,'insect-jelly':8} as const;
