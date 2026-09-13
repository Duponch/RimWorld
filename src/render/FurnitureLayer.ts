import * as THREE from 'three/webgpu';
import type { World } from '../sim/types';
import { footprintCells } from '../sim/definitions';
import { WORLD_SCALE } from '../world/scale';
import { clearGroup, instances, material } from './primitives';
import type { Placement } from './primitives';

/** Procedural furniture batches rebuilt only when structure content changes. */
export function buildFurniture(world: World, group: THREE.Group, cutaway: boolean): void {
    clearGroup(group);
    const wallHeight = cutaway ? WORLD_SCALE.wallCutawayHeight : WORLD_SCALE.wallHeight;
    const walls: Placement[] = [], wallCaps: Placement[] = [], bedFrames: Placement[] = [], bedding: Placement[] = [], pillows: Placement[] = [], headboards: Placement[] = [], woodParts: Placement[] = [];
    for (const structure of world.structures) {
      const { x, z } = structure;
      if (structure.kind === 'wall') {
        walls.push({ x, z, y: (wallHeight - 0.09) / 2 }); wallCaps.push({ x, z, y: wallHeight - 0.045 });
      } else if (structure.kind === 'bed') {
        const cells = footprintCells(structure), last = cells[cells.length - 1]!;
        const cx = (x + last.x) / 2, cz = (z + last.z) / 2, ry = structure.orientation * Math.PI / 2;
        const length = structure.footprint === 'legacy-single' ? 0.93 : WORLD_SCALE.bedLength;
        bedFrames.push({ x: cx, z: cz, y: WORLD_SCALE.bedFrameHeight / 2 + 0.04, sx: WORLD_SCALE.bedWidth, sy: WORLD_SCALE.bedFrameHeight, sz: length, ry });
        bedding.push({ x: cx, z: cz, y: WORLD_SCALE.bedSurfaceHeight - 0.045, sx: WORLD_SCALE.bedWidth - 0.06, sy: 0.14, sz: length - 0.1, ry });
        pillows.push({ x: cx - Math.sin(ry) * length * 0.33, z: cz - Math.cos(ry) * length * 0.33, y: WORLD_SCALE.bedSurfaceHeight + 0.07, sx: 0.6, sy: 0.12, sz: 0.27, ry });
        headboards.push({ x: cx - Math.sin(ry) * (length / 2 - 0.05), z: cz - Math.cos(ry) * (length / 2 - 0.05), y: 0.35, sx: WORLD_SCALE.bedWidth, sy: 0.63, sz: 0.08, ry });
      }
    }
    for (const structure of world.structures) {
      if (structure.kind !== 'table' && structure.kind !== 'stool') continue;
      const table = structure.kind === 'table';
      const cells = footprintCells(structure), last = cells[cells.length - 1]!;
      const x = (structure.x + last.x) / 2, z = (structure.z + last.z) / 2, ry = structure.orientation * Math.PI / 2;
      const width = table ? WORLD_SCALE.tableWidth : WORLD_SCALE.stoolWidth;
      const length = table ? WORLD_SCALE.tableLength : WORLD_SCALE.stoolWidth;
      const height = table ? WORLD_SCALE.tableHeight : WORLD_SCALE.stoolHeight;
      woodParts.push({ x, z, y: height - 0.045, sx: width, sy: 0.09, sz: length, ry });
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
        const lx = dx * (width / 2 - 0.085), lz = dz * (length / 2 - 0.085);
        woodParts.push({ x: x + lx * Math.cos(ry) + lz * Math.sin(ry), z: z + lz * Math.cos(ry) - lx * Math.sin(ry), y: (height - 0.09) / 2, sx: 0.09, sy: height - 0.09, sz: 0.09, ry });
      }
    }
    instances(group, new THREE.BoxGeometry(1, 1, 1), material(0xa38559), woodParts);
    instances(group, new THREE.BoxGeometry(0.96, wallHeight - 0.09, 0.96), material(0xa6916e), walls);
    instances(group, new THREE.BoxGeometry(1.01, 0.09, 1.01), material(0xc3af86), wallCaps);
    instances(group, new THREE.BoxGeometry(1, 1, 1), material(0x795d41), bedFrames);
    instances(group, new THREE.BoxGeometry(1, 1, 1), material(0xc7a977), bedding);
    instances(group, new THREE.BoxGeometry(1, 1, 1), material(0xe5d8b7), pillows);
    instances(group, new THREE.BoxGeometry(1, 1, 1), material(0x795d41), headboards);
  }
