import { adoptFluIncidents } from '../../src/sim/flu-incidents';
import { adoptMiscIncidents } from '../../src/sim/cassandra-misc';
import { enableVisitors } from '../../src/sim/visitors';
import { adoptColonyEconomy } from '../../src/sim/colony-economy';
import { crashlandedProfile } from '../../src/sim/game-profile';
import { enableCassandraRaids } from '../../src/sim/cassandra-raids';
import { adoptEnvironment } from '../../src/sim/environment-step';
import { createPlantLife } from '../../src/sim/plant-life';
import { initializeWildFlora } from '../../src/sim/wild-flora';
import { resolveSite, type BiomeSite } from '../../src/sim/site';
import type { World } from '../../src/sim/types';

/** Declared prepared biome context for typed flora. This is not a historical
 * player save or a simulated arrival; its plants start observation now. */
export function prepareConstructionFlora(world:World):void {
  world.site=resolveSite(world.seed,{biome:'temperate-forest',hilliness:'flat'});
  world.scenario={id:'crashlanded',revision:2,landing:{x:8,z:10}};
  if(!world.gameProfile){
    world.gameProfile=crashlandedProfile();enableCassandraRaids(world);
    adoptFluIncidents(world);adoptMiscIncidents(world);enableVisitors(world,true);adoptColonyEconomy(world);
  }
  if(!world.climate&&!adoptEnvironment(world))throw Error('Prepared biome climate could not be adopted');
  for(const plant of world.resources)if(plant.species&&!plant.plantLife)plant.plantLife=createPlantLife(world,plant);
  if(!world.flora)initializeWildFlora(world,world.site as BiomeSite);
  else world.flora.capacity=Math.max(world.flora.capacity,world.resources.filter(p=>p.species).length);
}
