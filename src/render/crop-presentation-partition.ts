import { readSnapshotChanges } from '../bridge/snapshot-changes';
import { isResidentCrop, type ResidentCropKind } from './flora-presentation';
import type { Resource, World } from '../sim/types';

type Partition = Record<ResidentCropKind, Resource[]>;
type ReadonlyPartition = Readonly<Record<ResidentCropKind, readonly Resource[]>>;
const emptyPartition = (): Partition => ({ rice: [], potato: [], corn: [], cotton: [] });

/** Only membership is retained. Continuous growth, leaf loss, transforms and
 * upload ranges are still evaluated at every ordinary crop presentation. */
export class CropPresentationPartition {
  private world: World | undefined;
  private partition = emptyPartition();
  private sourceSlots: Array<readonly [ResidentCropKind, number] | undefined> = [];

  // Borrowed for one synchronous batch update; never an exposed historical view.
  read(world: World, reset = false, immutableSnapshot = false): ReadonlyPartition {
    const prior = immutableSnapshot && !reset ? this.world : undefined;
    this.world = immutableSnapshot ? world : undefined;
    const journal = prior ? readSnapshotChanges(prior, world) : undefined;
    const sameResources = prior?.resources === world.resources;
    if (journal && sameResources) return this.partition;
    if (journal && this.sourceSlots.length === world.resources.length &&
      journal.resourceIndices.every(index => {
        const old = this.sourceSlots[index], resource = world.resources[index]!;
        return old ? old[0] === resource.kind : !isResidentCrop(resource);
      })) {
      for (const index of journal.resourceIndices) {
        const slot = this.sourceSlots[index];
        if (slot) this.partition[slot[0]][slot[1]] = world.resources[index]!;
      }
      return this.partition;
    }
    this.partition = emptyPartition();
    this.sourceSlots = new Array(world.resources.length);
    for (let index = 0; index < world.resources.length; index++) {
      const resource = world.resources[index]!;
      if (!isResidentCrop(resource)) continue;
      const kind = resource.kind as ResidentCropKind;
      this.sourceSlots[index] = [kind, this.partition[kind].length];
      this.partition[kind].push(resource);
    }
    return this.partition;
  }
}
