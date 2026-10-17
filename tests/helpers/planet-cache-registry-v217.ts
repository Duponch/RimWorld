/** QA binding to real V407 owners/runtimes, no prepared-away actor or stock. */
import {GroupCampaignRuntime256} from '../../src/sim/group-campaign-runtime-256.ts';
import {GroupCaravanPhysical256} from '../../src/sim/group-caravan-physical-256.ts';
import {createGroupCampaignGeometry256} from '../../src/sim/group-campaign-geometry-256.ts';
import {worldGroupContext} from '../../src/sim/world-map-context.ts';
import type {World} from '../../src/sim/types.ts';
export function actualPlanetGroupRuntime(world:World):GroupCampaignRuntime256 {
 if(!world.worldMaps||!world.worldGroups||!world.planet)throw Error('Expected the admitted registry/planet fixture');
 const runtime=new GroupCampaignRuntime256(createGroupCampaignGeometry256(world),new GroupCaravanPhysical256());runtime.bootstrap(world);return runtime;
}
export function onlyPlanetGroup(world:World) {
 const groups=world.worldGroups?.groups;if(!groups||groups.length!==1)throw Error('Expected exactly one real registry group');return groups[0]!;
}
export function planetGroupValidationView(world:World):World {
 const row=onlyPlanetGroup(world),view=worldGroupContext(world,row.state.id,true);if(!view)throw Error('Missing the real group validation context');return view;
}
export function actualPlanetOrigin(world:World):number {
 const maps=world.worldMaps,id=maps?.selectedMapId;if(!maps||id===undefined||id===null||!maps.sites.some(s=>s.id===id))throw Error('Missing the confirmed source map');return id;
}
