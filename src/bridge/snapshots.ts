import type { Resource, Terrain, World } from '../sim/types.ts';

type DynamicWorld = Omit<World, 'tiles' | 'resources'>;
interface ResourceChanges { removed: number[]; upserted: Resource[]; order?: number[] }
interface SnapshotHeader { motion?:import('./motion-tracks.ts').PawnTrack[]; type: 'snapshot'; epoch: number; revision: number; stepMs: number; speed: number }
export type SnapshotMessage = SnapshotHeader & (
  | { kind: 'checkpoint'; world: World }
  | { kind: 'delta'; baseRevision: number; world: DynamicWorld; tiles?: Array<[number, Terrain]>; resources?: ResourceChanges }
);

const equalResource = (a: Resource, b: Resource): boolean => a.id === b.id && a.kind === b.kind
  && a.x === b.x && a.z === b.z && a.amount === b.amount;

/** Transport cache only: never mutates the simulation or contributes to a saved game. */
export class SnapshotEncoder {
  private source: World | undefined;
  private epoch = 0;
  private revision = 0;
  private width = 0;
  private height = 0;
  private terrain: Terrain[] = [];
  private resources = new Map<number, Resource>();
  private resourceOrder: number[] = [];

  /** postMessage must follow synchronously: it owns cloning the returned dynamic state. */
  encode(world: World, stepMs: number, speed: number, checkpoint = false): SnapshotMessage {
    const replacement = world !== this.source || world.width !== this.width || world.height !== this.height;
    if (replacement) { this.epoch++; this.revision = 0; }
    const baseRevision = this.revision++;
    const header: SnapshotHeader = { type: 'snapshot', epoch: this.epoch, revision: this.revision, stepMs, speed };
    if (replacement || checkpoint) {
      this.source = world; this.width = world.width; this.height = world.height;
      this.terrain = world.tiles.map(tile => tile.terrain);
      this.resources = new Map(world.resources.map(resource => [resource.id, { ...resource }]));
      this.resourceOrder = world.resources.map(resource => resource.id);
      return { ...header, kind: 'checkpoint', world };
    }

    const tiles: Array<[number, Terrain]> = [];
    for (let index = 0; index < world.tiles.length; index++) {
      const terrain = world.tiles[index]!.terrain;
      if (this.terrain[index] !== terrain) { tiles.push([index, terrain]); this.terrain[index] = terrain; }
    }
    const upserted: Resource[] = [];
    let orderChanged = world.resources.length !== this.resourceOrder.length;
    for (let index = 0; index < world.resources.length; index++) {
      const resource = world.resources[index]!;
      const previous = this.resources.get(resource.id);
      if (!previous || !equalResource(previous, resource)) upserted.push({ ...resource });
      if (resource.id !== this.resourceOrder[index]) orderChanged = true;
    }
    let changes: ResourceChanges | undefined;
    if (upserted.length || orderChanged) {
      const currentIds = new Set(world.resources.map(resource => resource.id));
      const removed = this.resourceOrder.filter(id => !currentIds.has(id));
      // Deletions and appended entities need no long list of unchanged identities.
      const implicitOrder = this.resourceOrder.filter(id => currentIds.has(id));
      for (const resource of upserted) if (!this.resources.has(resource.id)) implicitOrder.push(resource.id);
      const explicitOrder = implicitOrder.some((id, index) => id !== world.resources[index]?.id);
      changes = { removed, upserted };
      if (explicitOrder) changes.order = world.resources.map(resource => resource.id);
      for (const id of removed) this.resources.delete(id);
      for (const resource of upserted) this.resources.set(resource.id, resource);
      if (orderChanged) this.resourceOrder = world.resources.map(resource => resource.id);
    }
    const { tiles: _tiles, resources: _resources, ...dynamic } = world;
    return { ...header, kind: 'delta', baseRevision, world: dynamic,
      ...(tiles.length ? { tiles } : {}), ...(changes ? { resources: changes } : {}) };
  }
}

export type SnapshotAdoption = { status: 'applied'; world: World; replaced: boolean } | { status: 'stale' } | { status: 'resync'; reason: string };

/** Reuses stable arrays and replaces changed arrays; previous render snapshots remain intact. */
export class SnapshotDecoder {
  private epoch = 0;
  private revision = 0;
  private current: World | undefined;

  adopt(message: SnapshotMessage): SnapshotAdoption {
    const resync = (reason: string): SnapshotAdoption => ({ status: 'resync', reason });
    if (!Number.isSafeInteger(message.epoch) || message.epoch < 1
      || !Number.isSafeInteger(message.revision) || message.revision < 1) return resync('Révision de snapshot invalide.');
    if (message.epoch < this.epoch || (message.epoch === this.epoch && message.revision <= this.revision)) return { status: 'stale' };
    let next: World;
    if (message.kind === 'checkpoint') {
      if (message.world.tiles.length !== message.world.width * message.world.height) return resync('Dimensions du checkpoint invalides.');
      next = message.world;
    } else {
      const previous = this.current;
      if (!previous || message.epoch !== this.epoch || message.baseRevision !== this.revision
        || message.revision !== message.baseRevision + 1) return resync('Snapshot intermédiaire manquant.');
      if (message.world.width !== previous.width || message.world.height !== previous.height
        || message.world.schemaVersion !== previous.schemaVersion) return resync('Le delta appartient à une autre carte.');
      let tiles = previous.tiles;
      if (message.tiles?.length) {
        const touched = new Set<number>();
        for (const [index, terrain] of message.tiles) {
          if (!Number.isInteger(index) || index < 0 || index >= tiles.length || touched.has(index)
            || !['grass', 'soil', 'water', 'rock'].includes(terrain)) return resync('Delta de terrain invalide.');
          touched.add(index);
        }
        tiles = tiles.slice();
        for (const [index, terrain] of message.tiles) tiles[index] = { terrain };
      }
      let resources = previous.resources;
      if (message.resources) {
        const { removed, upserted, order } = message.resources;
        const byId = new Map(resources.map(resource => [resource.id, resource]));
        const touched = new Set<number>();
        for (const id of removed) {
          if (!byId.delete(id) || touched.has(id)) return resync('Suppression de ressource invalide.');
          touched.add(id);
        }
        for (const resource of upserted) {
          if (touched.has(resource.id)) return resync('Ressource modifiée plusieurs fois.');
          touched.add(resource.id); byId.set(resource.id, resource);
        }
        if (order) {
          if (order.length !== byId.size || new Set(order).size !== order.length
            || order.some(id => !byId.has(id))) return resync('Ordre des ressources invalide.');
          resources = order.map(id => byId.get(id)!);
        } else resources = [...byId.values()];
      }
      // Keep the checkpoint's property order for exact JSON/save comparisons.
      next = { ...previous, ...message.world, tiles, resources };
    }
    // Commit only after every patch is checked. A refusal preserves both state and revision.
    const replaced = message.epoch !== this.epoch;
    this.current = next; this.epoch = message.epoch; this.revision = message.revision;
    return { status: 'applied', world: next, replaced };
  }
}
