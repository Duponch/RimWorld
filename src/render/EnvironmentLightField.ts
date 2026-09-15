import { LocalLightCache } from '../sim/local-light';
import { RoomTopologyCache, type RoomTopology } from '../sim/room-topology';
import type { World } from '../sim/types';

/** Renderer-owned derived field. Reads are snapshot work, never frame work.
 * Do not rely on array identity: fixtures and checkpoint consumers may mutate
 * objects in place. Only meaningful changes replace the upload data. */
export class EnvironmentLightField {
  private readonly rooms = new RoomTopologyCache();
  private readonly lights = new LocalLightCache();
  private previousLight?: Float32Array;
  private previousTopology?:RoomTopology;
  private roofKey = '';
  width = 0;
  height = 0;
  data = new Uint8Array(4);
  revision = 0;
  /** Conservative bounds, including the filtering fringe and exposed faces. */
  readonly bounds = { minX: 1, minZ: 1, maxX: 0, maxZ: 0 };

  update(world: World): boolean {
    const topology = this.rooms.read(world), light = this.lights.read(world, topology);
    const roofs = world.roofing?.constructed ?? [], roofKey = roofs.join(',');
    // Opacity also feeds wall-side shading: it can change outside the lamps'
    // influence while LocalLightCache correctly keeps the same light array.
    if (this.width === world.width && this.height === world.height && this.previousLight === light && this.previousTopology===topology && this.roofKey === roofKey) return false;
    const size = world.width * world.height;
    if (this.width !== world.width || this.height !== world.height) this.data = new Uint8Array(size * 4);
    const data = this.data, bounds = this.bounds;
    bounds.minX = world.width; bounds.minZ = world.height; bounds.maxX = bounds.maxZ = -1;
    const include = (i: number) => {
      const x = i % world.width, z = Math.floor(i / world.width);
      bounds.minX = Math.min(bounds.minX, x - 1.1); bounds.minZ = Math.min(bounds.minZ, z - 1.1);
      bounds.maxX = Math.max(bounds.maxX, x + 1.1); bounds.maxZ = Math.max(bounds.maxZ, z + 1.1);
    };
    for (let i = 0; i < size; i++) {
      data[i * 4] = Math.round(light[i]! * 510);
      if (data[i * 4]) include(i);
      data[i * 4 + 1] = 0;
      data[i * 4 + 2] = topology.at(i % world.width, Math.floor(i / world.width))?.kind === 'space' ? 0 : 255;
      data[i * 4 + 3] = 255;
    }
    for (const i of roofs) { data[i * 4 + 1] = 255; include(i); }
    this.width = world.width; this.height = world.height;
    this.previousLight = light;this.previousTopology=topology; this.roofKey = roofKey; this.revision++;
    return true;
  }
}
