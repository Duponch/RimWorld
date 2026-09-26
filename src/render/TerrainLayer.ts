import { stoneColor } from './stone-palette';
import * as THREE from 'three/webgpu';
import type { World, Terrain } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';
import { clearGroup, type Placement } from './primitives';
import { mergedInstances, noise } from './StaticGeometry';
const scratchColor=new THREE.Color();
export const TERRAIN_COLORS: Record<Terrain, number> = { 'rich-soil':0x665642,gravel:0x999783,'rough-stone':0x899182, grass: 0x81946c, soil: 0xa39b75, rock: 0x899182, water: 0x78a7a4 };
export const ARID_GRASS_COLOR = 0xa69772;

export function buildTerrain(world: World, group: THREE.Group, surface: THREE.Material, water: THREE.Material): void {
    clearGroup(group);
    // Small spatial chunks keep each instance batch independently cullable.
    const chunkSize = WORLD_SCALE.chunkSize;
    for (let cz = 0; cz < world.height; cz += chunkSize) for (let cx = 0; cx < world.width; cx += chunkSize) {
      const tileGroups: Record<Terrain, Placement[]> = { grass: [], soil: [], water: [], rock: [], 'rough-stone':[],'rich-soil':[],gravel:[] };
      const banks: Placement[] = [];
      for (let z = cz; z < Math.min(cz + chunkSize, world.height); z++) for (let x = cx; x < Math.min(cx + chunkSize, world.width); x++) {
        const type = world.tiles[z * world.width + x].terrain;
        // The typed rough floor is already rendered beneath a massif; excavation changes no ground buffers.
        const terrain = type==='rock'?'rough-stone':type;
        const n = noise(x, z, world.seed);
        scratchColor.setHex(terrain==='rough-stone'?stoneColor(world.tiles[z*world.width+x].stone):terrain==='grass'&&world.site?.biome==='arid-shrubland'?ARID_GRASS_COLOR:TERRAIN_COLORS[terrain]).multiplyScalar(0.94 + n * 0.12);
        const color = scratchColor.getHex(), level = terrain === 'water' ? WORLD_SCALE.waterSurface : 0;
        tileGroups[terrain].push({ x, z, y: level, color });
        // Top quads replace six-sided ground cubes; exposed bank and perimeter
        // faces retain the original water drop and the slab join without holes.
        for (const [dx, dz, rotation] of [[1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2], [0, 1, 0], [0, -1, Math.PI]] as const) {
          const nx = x + dx, nz = z + dz;
          const neighbor = nx < 0 || nz < 0 || nx >= world.width || nz >= world.height ? -0.16
            : world.tiles[nz * world.width + nx].terrain === 'water' ? WORLD_SCALE.waterSurface : 0;
          if (neighbor < level) banks.push({ x: x + dx * 0.5, z: z + dz * 0.5, y: (level + neighbor) / 2, sy: level - neighbor, ry: rotation, color });
        }
      }
      mergedInstances(group, [
        { geometry: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), items: [...tileGroups.grass, ...tileGroups.soil, ...tileGroups.rock,...tileGroups['rough-stone'],...tileGroups['rich-soil'],...tileGroups.gravel] },
        { geometry: new THREE.PlaneGeometry(1, 1), items: banks },
      ], surface, false);
      mergedInstances(group, [{ geometry: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), items: tileGroups.water }], water, false);
    }
  }
