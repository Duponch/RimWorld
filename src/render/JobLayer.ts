import { isFoodWorkstation } from '../sim/food-workstations';
import type * as THREE from 'three/webgpu';
import { isRoofJob } from '../sim/roof-rules';
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
    for (const job of world.jobs.filter(j=>!isRoofJob(j))) {
      const cells = footprintCells(job);
      for (const cell of cells) orders.push({ x: cell.x, y: 0.032, z: cell.z, color: job.status === 'active' ? 0xe7c17a : 0x99cfc3 });
      if(job.kind==='repair')continue;
      if(job.kind==='mine') {for(const ry of [-Math.PI/4,Math.PI/4])frames.push({x:job.x,z:job.z,y:3.65,sx:.6,sy:.035,sz:.08,ry,color:0xeac27d});continue;}
      if (job.kind === 'chop' || job.kind === 'harvest' || job.kind === 'cut' || job.kind === 'sow') continue;
      if(job.kind==='deconstruct'||job.kind==='uninstall') {
        const targetKind=(job.deconstruction??job.furniture)!.kind;
        const y=((isFoodWorkstation(targetKind)||targetKind==='research-bench'||targetKind==='tailor-bench'||targetKind==='stonecutter')?WORLD_SCALE.stonecutterHeight:(targetKind==='wall'||targetKind==='cooler')?wallHeight:targetKind==='table'?WORLD_SCALE.tableHeight:targetKind==='horseshoes'?WORLD_SCALE.horseshoeHeight:targetKind==='stool'?WORLD_SCALE.stoolHeight:WORLD_SCALE.bedSurfaceHeight)+.06;
        for(const cell of cells)for(const ry of [-Math.PI/4,Math.PI/4])frames.push({x:cell.x,z:cell.z,y,sx:.85,sy:.05,sz:.08,ry,color:job.kind==='uninstall'?0xd9b66c:0xd77855});
        continue;
      }
      const kind=job.furniture?.kind??job.kind;
      const x=cells.reduce((n,c)=>n+c.x,0)/cells.length,z=cells.reduce((n,c)=>n+c.z,0)/cells.length,ry=job.orientation*Math.PI/2;
      const height = (isFoodWorkstation(kind)||kind==='research-bench'||kind==='tailor-bench'||kind==='stonecutter')?WORLD_SCALE.stonecutterHeight:kind === 'horseshoes' ? WORLD_SCALE.horseshoeHeight : (kind === 'wall'||kind==='cooler') ? wallHeight : kind === 'table' ? WORLD_SCALE.tableHeight : kind === 'stool' ? WORLD_SCALE.stoolHeight : WORLD_SCALE.bedSurfaceHeight;
      const width = (isFoodWorkstation(kind)||kind==='research-bench'||kind==='tailor-bench'||kind==='stonecutter')?WORLD_SCALE.stonecutterWidth:kind === 'horseshoes' ? 0.12 : (kind === 'wall'||kind==='cooler') ? 0.92 : kind === 'table' ? WORLD_SCALE.tableWidth : kind === 'stool' ? WORLD_SCALE.stoolWidth : WORLD_SCALE.bedWidth;
      const length = kind==='research-bench'?1.8:(isFoodWorkstation(kind)||kind==='tailor-bench'||kind==='stonecutter')?WORLD_SCALE.stonecutterDepth:kind === 'horseshoes' ? 0.12 : kind === 'table' ? WORLD_SCALE.tableLength : kind === 'stool' ? WORLD_SCALE.stoolWidth : kind === 'bed' && job.footprint !== 'legacy-single' ? WORLD_SCALE.bedLength : 0.92;
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
