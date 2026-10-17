/** QA-only refinements for literal historical fixtures, never migrations. */
import type {World,StructureKind,JobKind} from '../../src/sim/types.ts';
import type {LegacyPlanetState,PlanetState} from '../../src/sim/planet-state.ts';
import type {WildFloraState} from '../../src/sim/wild-flora.ts';
import {JOB_DURATION} from '../../src/sim/definitions.ts';
export type LegacyPlanetWorld=World&{planet:LegacyPlanetState};
export function assertLegacyPlanet<T extends {planet?:PlanetState}>(world:T):asserts world is T&{planet:LegacyPlanetState} {
 if(!world.planet||world.planet.revision===3)throw Error('Expected the actual historical Planet1/2 fixture');
}
export function legacyPlanet(world:{planet?:PlanetState}):LegacyPlanetState {
 assertLegacyPlanet(world);return world.planet;
}
export function legacyFlora(world:Pick<World,'flora'>):WildFloraState {
 const flora=world.flora;if(!flora||flora.revision!==1)throw Error('Expected the actual historical flora revision1');return flora;
}
export function legacyCampaignMap(world:Pick<World,'campaignMap'>) {
 const map=world.campaignMap;if(!map||map.revision!==undefined)throw Error('Expected the actual historical two-map presentation');return map;
}
export function legacySite(world:Pick<World,'site'>) {
 const site=world.site;if(!site||site.revision===3)throw Error('Expected the actual historical local Site1/2');return site;
}
export type BuildableFixtureKind=Extract<StructureKind,JobKind>;
export function isBuildableFixtureKind(kind:StructureKind):kind is BuildableFixtureKind {return Object.hasOwn(JOB_DURATION,kind);}
