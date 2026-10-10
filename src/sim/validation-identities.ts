import type { World } from './types.ts';
import { NumericMembership } from './numeric-membership.ts';
import type {OwnedValidationResourceReader} from './owned-validation-resources.ts';

export interface ValidationIdentityMembership { has(id:number):boolean }
type PackedIdentity={readonly building:{readonly id:number}};

function captureMapIds(world:World,resources?:OwnedValidationResourceReader):ValidationIdentityMembership {
  const ids=new NumericMembership();
  if(!resources){
    // RAW reads every collection reference before iterating any collection.
    // Keep that order (including getters/throws) exactly as before.
    for(const collection of [world.pawns,world.resources,world.structures,world.jobs,world.piles,world.stockpiles])
      for(const owner of collection)ids.add(owner.id);
    return ids;
  }
  for(const owner of world.pawns)ids.add(owner.id);
  const resourceIds=resources.ids(world);
  if(!resourceIds)for(const owner of world.resources)ids.add(owner.id);
  for(const collection of [world.structures,world.jobs,world.piles,world.stockpiles])
    for(const owner of collection)ids.add(owner.id);
  return resourceIds?{has:id=>ids.has(id)||resourceIds.has(id)}:ids;
}

/** Read-only context of one native SnapshotDecoder adoption. It records only
 * membership: shape, duplicate, ownership and version guards still run at
 * their historical sites. It must not survive that adoption or span writers.
 * Standalone/raw validators do not create or use this context. */
export class ValidationIdentityContext {
  private mapIds?:ValidationIdentityMembership;
  private readonly world:World;
  private readonly resources?:OwnedValidationResourceReader;

  constructor(world:World,resources?:OwnedValidationResourceReader) {this.world=world;this.resources=resources;}

  resourceRecords(world:World):boolean|undefined {
    return world===this.world?this.resources?.records(world):undefined;
  }

  hydro(world:World):ValidationIdentityMembership {
    // A context supplied for another World cannot lend it captured identities.
    if(world!==this.world)return captureMapIds(world);
    return this.mapIds??=captureMapIds(world,this.resources);
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
