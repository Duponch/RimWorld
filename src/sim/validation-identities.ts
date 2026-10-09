import type { World } from './types.ts';
import { NumericMembership } from './numeric-membership.ts';

export interface ValidationIdentityMembership { has(id:number):boolean }
type PackedIdentity={readonly building:{readonly id:number}};

function captureMapIds(world:World):ValidationIdentityMembership {
  const ids=new NumericMembership();
  for(const collection of [world.pawns,world.resources,world.structures,world.jobs,world.piles,world.stockpiles])
    for(const owner of collection)ids.add(owner.id);
  return ids;
}

/** Read-only context of one native SnapshotDecoder adoption. It records only
 * membership: shape, duplicate, ownership and version guards still run at
 * their historical sites. It must not survive that adoption or span writers.
 * Standalone/raw validators do not create or use this context. */
export class ValidationIdentityContext {
  private mapIds?:ValidationIdentityMembership;
  private readonly world:World;

  constructor(world:World) {this.world=world;}

  hydro(world:World):ValidationIdentityMembership {
    // A context supplied for another World cannot lend it captured identities.
    if(world!==this.world)return captureMapIds(world);
    return this.mapIds??=captureMapIds(world);
  }

  orbital(world:World,packs:readonly PackedIdentity[]):ValidationIdentityMembership {
    const mapIds=this.hydro(world),extraIds=new Set<number>();
    for(const zone of world.growingZones)extraIds.add(zone.id);
    // The caller's packs include real foreign human possessions as well as
    // map packs. They are deliberately not replaced with world.packed.
    for(const pack of packs)extraIds.add(pack.building.id);
    return {has:(id:number)=>mapIds.has(id)||extraIds.has(id)};
  }
}
