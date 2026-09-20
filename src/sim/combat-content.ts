import { ITEM_DEFINITIONS,type ItemId } from './items.ts';
import type { ResourceKind,StructureKind } from './types.ts';

/** Logical fill, not model height, navigation or the final cover probability.
 * Sources, version limits and decorative-stone decision: combat-world-reference. */
export const STRUCTURE_SHOT_FILL:Readonly<Record<StructureKind,number>>=Object.freeze({grave:0,heater:.4,'wind-turbine':.5,
  'power-conduit':0,'power-switch':0,battery:.4,'solar-generator':.5,
  'fueled-stove':.5,'electric-stove':.5,'butcher-table':.5,
  'butcher-spot':0,
  cooler:1,'research-bench':.5,'tailor-bench':.5,wall:1,door:1,  'crafting-spot':0,'wood-generator':1,stonecutter:.5,bed:.4,table:.4,
  'passive-cooler':.4,stool:.2,campfire:.2,'standing-lamp':.2,horseshoes:0,
});
export const RESOURCE_SHOT_FILL:Readonly<Record<ResourceKind,number>>=Object.freeze({heater:.4,'wind-turbine':.5,
  tree:.25,berries:.2,rice:0,potato:0,corn:0,cotton:0,
  // These small decorative pebbles are not the haulable Core chunks. Their
  // replacement by actual chunks is deferred; don't create invisible cover.
  rock:0,
});
export const FRAME_SHOT_FILL=.2;
export const itemShotFill=(item:ItemId):number=>ITEM_DEFINITIONS[item].kind==='chunk'?.5:0;

/** Relative definition layers for ThingCovered, NOT physical/render heights.
 * A logical OPEN door retains its full fill and definition layer in that test. */
export const SHOT_LAYER=Object.freeze({heater:.4,'wind-turbine':.5,lowPlant:11,door:14,building:15,item:18,pawn:23});
export const structureShotLayer=(kind:StructureKind):number=>kind==='door'?SHOT_LAYER.door:SHOT_LAYER.building;
