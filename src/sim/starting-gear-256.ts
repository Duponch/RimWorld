/** Necessary fixed Crashlanded supplies, resolved from Core4871. This is an
 * item-admission fence, not a recipe, permission grant or gift to old saves.
 * The named helmet carries actual Plasteel facts, never the old Steel item. */
export const CORE_STARTING_APPAREL_256=['flak-pants','plasteel-flak-helmet'] as const;
export const isCoreStartingApparel256=(item:unknown):item is typeof CORE_STARTING_APPAREL_256[number]=>item==='flak-pants'||item==='plasteel-flak-helmet';
