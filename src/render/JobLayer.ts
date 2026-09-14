import type * as THREE from 'three/webgpu';
import type { BoxBatches } from './BoxBatches';
import type { Placement } from './primitives';
import type { World } from '../sim/types';
import { footprintCells } from '../sim/definitions';
import { jobDuration } from '../sim/farming';
import { WORLD_SCALE } from '../world/scale';

/** Existing instanced batches carry plans, frames and removal markers. */
export function buildJobMarkers(world: World, group: THREE.Group, cutaway: boolean, batches: BoxBatches): void {
    const wallHeight = cutaway ? WORLD_SCALE.wallCutawayHeight : WORLD_SCALE.wallHeight;
    const orders: Placement[] = [], blueprints: Placement[] = [], frames: Placement[] = [], progress: Placement[] = [];
    for (const job of world.jobs) {
      const cells = footprintCells(job), last = cells[cells.length - 1]!;
      for (const cell of cells) orders.push({ x: cell.x, y: 0.032, z: cell.z, color: job.status === 'active' ? 0xe7c17a : 0x99cfc3 });
      if (job.kind === 'chop' || job.kind === 'harvest' || job.kind === 'cut' || job.kind === 'sow') continue;
      if(job.kind==='deconstruct') {
        const targetKind=job.deconstruction!.kind;
        const y=(targetKind==='wall'?wallHeight:targetKind==='table'?WORLD_SCALE.tableHeight:targetKind==='horseshoes'?WORLD_SCALE.horseshoeHeight:targetKind==='stool'?WORLD_SCALE.stoolHeight:WORLD_SCALE.bedSurfaceHeight)+.06;
        for(const cell of cells)for(const ry of [-Math.PI/4,Math.PI/4])frames.push({x:cell.x,z:cell.z,y,sx:.85,sy:.05,sz:.08,ry,color:0xd77855});
        continue;
      }
      const x = (job.x + last.x) / 2, z = (job.z + last.z) / 2, ry = job.orientation * Math.PI / 2;
      const height = job.kind === 'horseshoes' ? WORLD_SCALE.horseshoeHeight : job.kind === 'wall' ? wallHeight : job.kind === 'table' ? WORLD_SCALE.tableHeight : job.kind === 'stool' ? WORLD_SCALE.stoolHeight : WORLD_SCALE.bedSurfaceHeight;
      const width = job.kind === 'horseshoes' ? 0.12 : job.kind === 'wall' ? 0.92 : job.kind === 'table' ? WORLD_SCALE.tableWidth : job.kind === 'stool' ? WORLD_SCALE.stoolWidth : WORLD_SCALE.bedWidth;
      const length = job.kind === 'horseshoes' ? 0.12 : job.kind === 'table' ? WORLD_SCALE.tableLength : job.kind === 'stool' ? WORLD_SCALE.stoolWidth : job.kind === 'bed' && job.footprint !== 'legacy-single' ? WORLD_SCALE.bedLength : 0.92;
      blueprints.push({ x, z, y: height / 2, sx: width, sy: height, sz: length, ry });
      if (job.construction === 'frame') {
        // Four low corner posts distinguish a supplied frame from a bare plan.
        for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
          const lx = dx * (width / 2 - 0.06), lz = dz * (length / 2 - 0.06);
          frames.push({ x: x + lx * Math.cos(ry) + lz * Math.sin(ry), z: z + lz * Math.cos(ry) - lx * Math.sin(ry), y: 0.2, sx: 0.09, sy: 0.4, sz: 0.09 });
        }
      }
      const fraction = Math.floor(job.progress / jobDuration(world,job) * 20) / 20;
      if (fraction > 0) progress.push({ x, z, y: height * fraction / 2, sx: width - 0.06, sy: height * fraction, sz: length - 0.06, ry });
    }
    batches.set(group, 'job-orders', orders.map(p => ({ ...p, sx: 0.9, sy: 0.025, sz: 0.9 })), 'overlay', false);
    batches.set(group, 'job-plans', blueprints.map(p => ({ ...p, color: 0xa7dbc9 })), 'wire', false);
    batches.set(group, 'job-solids', [...frames.map(p => ({ ...p, color: p.color??0x9f7e52 })), ...progress.map(p => ({ ...p, color: 0xa6916e }))]);
  }

