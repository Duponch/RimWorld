import type { JobKind,ResourceKind } from './types.ts';

/** Core compares harvestWork strictly with Dandelion's 200 Core ticks.
 * The four cultivated plants tie that value; trees and berry bushes exceed it. */
export const conduitKeepsPlant=(kind:JobKind,plant:ResourceKind):boolean=>kind==='power-conduit'&&['rice','cotton','potato','corn'].includes(plant);
export const powerConstructionSkill=(kind:JobKind):number=>kind==='solar-generator'?6:0;
