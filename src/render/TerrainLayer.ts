import * as THREE from 'three/webgpu';
import type { World, Terrain } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';
import { clearGroup, material, type Placement } from './primitives';
import { mergedInstances, noise } from './StaticGeometry';
const scratchColor=new THREE.Color();
const TERRAIN_COLORS: Record<Terrain, number> = { grass: 0x81946c, soil: 0xa39b75, rock: 0x899182, water: 0x78a7a4 };

export function buildTerrain(world: World, group: THREE.Group, surface: THREE.Material, water: THREE.Material): void {
    clearGroup(group);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(world.width + 0.15, 0.8, world.height + 0.15), material(0x827858));
    slab.position.set((world.width - 1) / 2, -0.56, (world.height - 1) / 2);
    slab.receiveShadow = true;
    group.add(slab);
    // Small spatial chunks keep each instance batch independently cullable.
    const chunkSize = WORLD_SCALE.chunkSize;
    for (let cz = 0; cz < world.height; cz += chunkSize) for (let cx = 0; cx < world.width; cx += chunkSize) {
      const tileGroups: Record<Terrain, Placement[]> = { grass: [], soil: [], water: [], rock: [] };
      const grass: Placement[] = [], massifs: Placement[] = [], banks: Placement[] = [];
      for (let z = cz; z < Math.min(cz + chunkSize, world.height); z++) for (let x = cx; x < Math.min(cx + chunkSize, world.width); x++) {
        const terrain = world.tiles[z * world.width + x].terrain;
        const n = noise(x, z, world.seed);
        scratchColor.setHex(TERRAIN_COLORS[terrain]).multiplyScalar(0.94 + n * 0.12);
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
        if (terrain === 'rock') {
          // Every impassable rock cell has a solid footprint, unlike loose stone.
          const height = 1.7 + noise(Math.floor(x / 4), Math.floor(z / 4), world.seed) * 2.1 + n * 0.25;
          massifs.push({ x, z, y: height / 2, sy: height, color: scratchColor.getHex() });
        }
        if (terrain === 'grass' && n > 0.83) grass.push({ x: x - 0.26, y: 0.09, z: z + 0.22, sy: 0.7 + n, color: n > 0.96 ? 0xd4c58a : 0x96a575, ry: n * 6.28 });
      }
      mergedInstances(group, [
        { geometry: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), items: [...tileGroups.grass, ...tileGroups.soil, ...tileGroups.rock] },
        { geometry: new THREE.PlaneGeometry(1, 1), items: banks },
        { geometry: new THREE.ConeGeometry(0.08, 0.15, 3), items: grass },
        { geometry: new THREE.BoxGeometry(1, 1, 1), items: massifs },
      ], surface);
      mergedInstances(group, [{ geometry: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), items: tileGroups.water }], water, false);
    }
  }
