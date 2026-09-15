import { passiveCoolerParts } from './passive-cooler-parts';
import { doorParts } from './door-parts';
import { pileSurfaces } from './pile-surfaces';
import { buildingMaterialColor } from './building-material-color';
import type * as THREE from 'three/webgpu';
import type { BoxBatches } from './BoxBatches';
import type { World } from '../sim/types';
import { recreationParts } from './recreation-parts';
import { campfireParts } from './campfire-parts';
import { stonecutterParts } from './stonecutter-parts';
import { footprintCells } from '../sim/definitions';
import { WORLD_SCALE } from '../world/scale';
import type { Placement } from './primitives';

/** Procedural furniture batches rebuilt only when structure content changes. */
export function buildFurniture(world: World, group: THREE.Group, cutaway: boolean, batches: BoxBatches): void {
    const wallHeight = cutaway ? WORLD_SCALE.wallCutawayHeight : WORLD_SCALE.wallHeight;
    const walls: Placement[] = [], wallCaps: Placement[] = [], bedFrames: Placement[] = [], bedding: Placement[] = [], pillows: Placement[] = [], headboards: Placement[] = [], woodParts: Placement[] = [];
    for (const structure of world.structures) {
      const { x, z } = structure;
      const color = buildingMaterialColor(structure.material);
      if (structure.kind === 'wall') {
        walls.push({ x, z, color, y: (wallHeight - 0.09) / 2 }); wallCaps.push({ x, z, color, y: wallHeight - 0.045 });
      } else if (structure.kind === 'bed') {
        const cells = footprintCells(structure), last = cells[cells.length - 1]!;
        const cx = (x + last.x) / 2, cz = (z + last.z) / 2, ry = structure.orientation * Math.PI / 2;
        const length = structure.footprint === 'legacy-single' ? 0.93 : WORLD_SCALE.bedLength;
        bedFrames.push({ color, x: cx, z: cz, y: WORLD_SCALE.bedFrameHeight / 2 + 0.04, sx: WORLD_SCALE.bedWidth, sy: WORLD_SCALE.bedFrameHeight, sz: length, ry });
        bedding.push({ x: cx, z: cz, y: WORLD_SCALE.bedSurfaceHeight - 0.045, sx: WORLD_SCALE.bedWidth - 0.06, sy: 0.14, sz: length - 0.1, ry });
        pillows.push({ x: cx - Math.sin(ry) * length * 0.33, z: cz - Math.cos(ry) * length * 0.33, y: WORLD_SCALE.bedSurfaceHeight + 0.07, sx: 0.6, sy: 0.12, sz: 0.27, ry });
        headboards.push({ color, x: cx - Math.sin(ry) * (length / 2 - 0.05), z: cz - Math.cos(ry) * (length / 2 - 0.05), y: 0.35, sx: WORLD_SCALE.bedWidth, sy: 0.63, sz: 0.08, ry });
      }
    }
    for (const structure of world.structures) {
      if (structure.kind !== 'table' && structure.kind !== 'stool') continue;
      const table = structure.kind === 'table';
      const color = buildingMaterialColor(structure.material,0xa38559);
      const cells = footprintCells(structure), last = cells[cells.length - 1]!;
      const x = (structure.x + last.x) / 2, z = (structure.z + last.z) / 2, ry = structure.orientation * Math.PI / 2;
      const width = table ? WORLD_SCALE.tableWidth : WORLD_SCALE.stoolWidth;
      const length = table ? WORLD_SCALE.tableLength : WORLD_SCALE.stoolWidth;
      const height = table ? WORLD_SCALE.tableHeight : WORLD_SCALE.stoolHeight;
      woodParts.push({ color, x, z, y: height - 0.045, sx: width, sy: 0.09, sz: length, ry });
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
        const lx = dx * (width / 2 - 0.085), lz = dz * (length / 2 - 0.085);
        woodParts.push({ color, x: x + lx * Math.cos(ry) + lz * Math.sin(ry), z: z + lz * Math.cos(ry) - lx * Math.sin(ry), y: (height - 0.09) / 2, sx: 0.09, sy: height - 0.09, sz: 0.09, ry });
      }
    }
    const surfaces=pileSurfaces(world);
    const parcels:Placement[]=[];
    for(const p of world.packed)if(p.owner.type==='ground') {
      const s=surfaces.get(p.owner.z*world.width+p.owner.x),scale=s?.scale??1;
      const x=p.owner.x+(s?.x??0),z=p.owner.z+(s?.z??0),y=s?.y??0;
      parcels.push({x,z,y:y+.24*scale,sx:.64*scale,sy:.48*scale,sz:.64*scale,color:0xb6996c},
        {x,z,y:y+.49*scale,sx:.13*scale,sy:.03*scale,sz:.67*scale,color:buildingMaterialColor(p.building.material,0x6f634e)});
    }
    const fires=campfireParts(world);
    batches.set(group,'campfire-flames',fires.flames,'border',false);
    batches.set(group, 'furniture', [
      ...passiveCoolerParts(world), ...doorParts(world,cutaway), ...fires.base, ...recreationParts(world), ...stonecutterParts(world),
      ...parcels,
      ...woodParts.map(p => ({ ...p, color: p.color ?? 0xa38559 })),
      ...walls.map(p => ({ ...p, sx: 0.96, sy: wallHeight - 0.09, sz: 0.96, color: p.color ?? 0xa6916e })),
      ...wallCaps.map(p => ({ ...p, sx: 1.01, sy: 0.09, sz: 1.01, color: p.color ?? 0xc3af86 })),
      ...bedFrames.map(p => ({ ...p, color: p.color ?? 0x795d41 })), ...bedding.map(p => ({ ...p, color: 0xc7a977 })),
      ...pillows.map(p => ({ ...p, color: 0xe5d8b7 })), ...headboards.map(p => ({ ...p, color: p.color ?? 0x795d41 })),
    ]);
}
