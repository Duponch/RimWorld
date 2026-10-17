/** Core4871 resolved generated floors. This is not an Architecte catalogue. */
export const ANCIENT_GENERATED_FLOORS_256=['ancient-tile','ancient-concrete'] as const;
export type AncientGeneratedFloor256=typeof ANCIENT_GENERATED_FLOORS_256[number];
export const isAncientGeneratedFloor256=(value:unknown):value is AncientGeneratedFloor256=>value==='ancient-tile'||value==='ancient-concrete';
export const ANCIENT_GENERATED_FLOOR_FACTS_256=Object.freeze({
 'ancient-tile':Object.freeze({defId:'AncientTile',cleanliness:.2,cleaningTime:.6,beauty:0,marketValue:0,workToBuild:1,pathCostCore:0,flammability:0,fertility:0,removeWorkCore:200,leavings:0}),
 'ancient-concrete':Object.freeze({defId:'AncientConcrete',cleanliness:0,cleaningTime:.8,beauty:-1,marketValue:0,workToBuild:1,pathCostCore:0,flammability:0,fertility:0,removeWorkCore:200,leavings:0}),
});
