import {SnapshotDecoder,type SnapshotValidationContext,type SnapshotMessage,type SnapshotAdoption} from './snapshots.ts';
import type {World} from '../sim/types.ts';
import {captureHumanOwners,type HumanOwnershipCapture} from '../sim/human-owners.ts';
import { PowerParentValidationCache, type PowerParentIndex } from '../sim/power-parent-validation.ts';
import { createOwnedValidationGeometryOwner, type OwnedGeometryReuseWitness } from '../sim/owned-validation-geometry.ts';
import { createOwnedValidationResourceOwner, type OwnedResourceBaseReuseWitness, type OwnedResourceReuseWitness } from '../sim/owned-validation-resources.ts';
import { createOwnedDeteriorationOwner } from '../sim/deterioration-save.ts';
import { createOwnedSleepingProvenanceOwner } from '../sim/human-sleeping-spot-save.ts';
import { createOwnedMarshTransportOwner } from '../sim/marsh.ts';

/** Decoder owned by the fixed MAIN client and read-only presentation consumers.
 * Save/RAW admission keeps SnapshotDecoder and its complete validation. */
export class PresentationSnapshotDecoder extends SnapshotDecoder {
  readonly #resourceOwner = createOwnedValidationResourceOwner();
  readonly #geometryOwner = createOwnedValidationGeometryOwner();
  readonly #deteriorationOwner = createOwnedDeteriorationOwner();
  readonly #sleepingProvenanceOwner = createOwnedSleepingProvenanceOwner();
  readonly #marshOwner = createOwnedMarshTransportOwner();
  override adopt(packet: SnapshotMessage<true>,acceptExtra?:(view:World)=>boolean): SnapshotAdoption {
    this.#resourceOwner.discard();
    this.#geometryOwner.discard();
    this.#deteriorationOwner.discard();
    this.#sleepingProvenanceOwner.discard();
    this.#marshOwner.discard();
    try {
      const result = super.adopt(packet,acceptExtra);
      if (result.status === 'applied') this.#resourceOwner.commit(result.world);
      else this.#resourceOwner.discard();
      if (result.status === 'applied') this.#geometryOwner.commit(result.world);
      else this.#geometryOwner.discard();
      if (result.status === 'applied') this.#deteriorationOwner.commit(result.world);
      else this.#deteriorationOwner.discard();
      if (result.status === 'applied') this.#sleepingProvenanceOwner.commit(result.world);
      else this.#sleepingProvenanceOwner.discard();
      if (result.status === 'applied') this.#marshOwner.commit(result.world);
      else this.#marshOwner.discard();
      return result;
    } catch (error) {
      this.#resourceOwner.discard();
      this.#geometryOwner.discard();
      this.#deteriorationOwner.discard();
      this.#sleepingProvenanceOwner.discard();
      this.#marshOwner.discard();
      throw error;
    }
  }
  protected override validateDeteriorationTransport(next:World,structureReuse?:OwnedGeometryReuseWitness):boolean {
    return this.#deteriorationOwner.validate(next,structureReuse);
  }
  protected override validateHumanSleepingSpotTransport(next:World,structureReuse?:OwnedGeometryReuseWitness):boolean {
    return this.#sleepingProvenanceOwner.validate(next,structureReuse);
  }
  protected override validateMarshTransport(next:World,changedTiles?:readonly number[],resourceReuse?:OwnedResourceReuseWitness,baseReuse?:OwnedResourceBaseReuseWitness):string[] {
    return baseReuse?this.#marshOwner.validateBase(next,changedTiles,baseReuse):this.#marshOwner.validate(next,changedTiles,resourceReuse);
  }
  protected override createValidationContext(next: World, resourceReuse?: OwnedResourceReuseWitness, geometryReuse?: OwnedGeometryReuseWitness, baseReuse?:OwnedResourceBaseReuseWitness): SnapshotValidationContext {
    const raw = new PowerParentValidationCache();
    const geometry = this.#geometryOwner.prepare(next, geometryReuse, baseReuse?this.#resourceOwner.prepareBase(next,baseReuse):this.#resourceOwner.prepare(next, resourceReuse));
    let parents: PowerParentIndex | undefined;
    // Nothing escapes this validation context or survives a later adoption.
    let humanOwners:HumanOwnershipCapture|undefined;
    return {
      humanOwners:{read(world:World){return world===next?(humanOwners??=captureHumanOwners(next)):captureHumanOwners(world);}},
      powerParents: { read(world: World): PowerParentIndex {
        if (world !== next) return raw.read(world);
        return parents ??= raw.read(world);
      } },
      geometry,
      resourceFacts: geometry.resourceFacts,
    };
  }
}
