import {enableCassandraRaids} from './cassandra-raids.ts';
import {enableVisitors} from './visitors.ts';
import type {World} from './types.ts';

/** Existing local producers and private calendar streams, one global clock
 * and Thing allocator. Calling this never creates an incident or an actor. */
export function adoptSecondaryIncidents(world:World):void {
  if(world.schemaVersion<242||!world.expeditionSite||world.gameProfile?.storyteller!=='cassandra-partial')return;
  if(!world.raids)enableCassandraRaids(world,true);
  if(!world.visitors)enableVisitors(world,false,true);
}
