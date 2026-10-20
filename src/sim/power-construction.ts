import type { JobKind,ResourceKind } from './types.ts';

/** Core compares harvestWork strictly with Dandelion's 200 Core ticks.
 * The four cultivated plants tie that value; trees and berry bushes exceed it. */
export const conduitKeepsPlant=(kind:JobKind|import('./types.ts').StructureKind,plant:ResourceKind):boolean=>kind==='power-conduit'&&['rice','cotton','potato','corn','haygrass','hops'].includes(plant);
export const powerConstructionSkill=(kind:JobKind):number=>kind==='geothermal-generator'?8:kind==='deep-drill'?4:kind==='ground-scanner'?8:kind==='vitals-monitor'?8:kind==='hydroponics-basin'?4:kind==='heater'?5:kind==='wind-turbine'?4:kind==='solar-generator'?6:0;
